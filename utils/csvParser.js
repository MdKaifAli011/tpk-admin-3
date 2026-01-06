/**
 * CSV Parser Utility Functions
 * Handles CSV parsing and validation for bulk data import
 */

/**
 * Parse CSV text into array of objects
 * @param {string} csvText - CSV file content as text
 * @param {Object} options - Parsing options
 * @returns {Array<Object>} Array of parsed objects
 */
export function parseCSV(csvText, options = {}) {
  const {
    delimiter = ",",
    skipEmptyLines = true,
    trimHeaders = true,
    trimValues = true,
  } = options;

  if (!csvText || !csvText.trim()) {
    throw new Error("CSV text is empty");
  }

  const lines = csvText.split(/\r?\n/).filter((line) => {
    if (skipEmptyLines) {
      return line.trim().length > 0;
    }
    return true;
  });

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Parse header using the same parser to handle quoted headers correctly
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter).map((h) => {
    let header = h.trim();
    // Remove quotes if present
    if ((header.startsWith('"') && header.endsWith('"')) ||
        (header.startsWith("'") && header.endsWith("'"))) {
      header = header.slice(1, -1);
    }
    return trimHeaders ? header.trim() : header;
  });

  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Parse CSV line (handles quoted values and empty fields)
    const values = parseCSVLine(trimmedLine, delimiter);
    
    // Normalize values: ensure we have the correct number of fields
    // If we have fewer values than headers, pad with empty strings
    // If we have more values than headers, truncate (shouldn't happen but handle it)
    while (values.length < headers.length) {
      values.push("");
    }
    if (values.length > headers.length) {
      // Log warning but don't fail - just truncate
      console.warn(
        `Row ${i + 1}: Found ${values.length} columns, expected ${headers.length}. Truncating extra columns.`
      );
      values.splice(headers.length);
    }

    const row = {};
    headers.forEach((header, index) => {
      let value = values[index] || "";
      if (trimValues) {
        value = value.trim();
      }
      // Remove quotes if present (handle both single and double quotes)
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Unescape double quotes ("" -> ")
      value = value.replace(/""/g, '"');
      row[header] = value;
    });

    data.push(row);
  }

  return data;
}

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line - CSV line
 * @param {string} delimiter - Field delimiter
 * @returns {Array<string>} Array of field values
 */
function parseCSVLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = null;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    const isLastChar = i === line.length - 1;

    // Handle quote start
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      // Don't add quote to current value
      continue;
    }

    // Handle quote end or escaped quote
    if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        // Escaped quote (double quote) - add single quote to value
        current += char;
        i++; // Skip next quote
      } else if (nextChar === delimiter || nextChar === undefined || nextChar === "\n" || nextChar === "\r" || isLastChar) {
        // End of quoted field
        inQuotes = false;
        quoteChar = null;
        // Don't add quote to current value
        continue;
      } else {
        // Quote inside quoted field (shouldn't happen in valid CSV, but handle it)
        current += char;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field delimiter found outside quotes - push current field
      values.push(current);
      current = "";
    } else {
      // Regular character
      current += char;
    }
  }

  // Push last value (even if empty)
  // This handles both cases: line ending with delimiter and line not ending with delimiter
  values.push(current);

  // Handle trailing delimiters: if line ends with delimiter(s), add empty field(s)
  // Count consecutive delimiters at the end (ignoring whitespace)
  const trimmedLine = line.trim();
  if (trimmedLine.endsWith(delimiter)) {
    // Count how many consecutive delimiters are at the end
    let trailingDelimiters = 0;
    for (let j = trimmedLine.length - 1; j >= 0; j--) {
      if (trimmedLine[j] === delimiter) {
        trailingDelimiters++;
      } else {
        break;
      }
    }
    
    // When we encounter a delimiter, we push current and reset
    // So if line ends with N delimiters, we've already pushed one empty field
    // We need to add (N-1) more empty fields
    for (let k = 0; k < trailingDelimiters - 1; k++) {
      values.push("");
    }
  }

  return values;
}

/**
 * Validate CSV data against required fields
 * @param {Array<Object>} data - Parsed CSV data
 * @param {Array<string>} requiredFields - Required field names
 * @returns {Object} Validation result with isValid and errors
 */
export function validateCSVData(data, requiredFields = []) {
  const errors = [];

  if (!data || data.length === 0) {
    errors.push("No data found in CSV file");
    return { isValid: false, errors };
  }

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is header, data starts at row 2

    // Check required fields
    requiredFields.forEach((field) => {
      if (!row[field] || row[field].trim() === "") {
        errors.push(`Row ${rowNum}: Missing required field "${field}"`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Convert array of objects to CSV string
 * @param {Array<Object>} data - Array of objects
 * @param {Array<string>} headers - Optional header order
 * @returns {string} CSV string
 */
export function arrayToCSV(data, headers = null) {
  if (!data || data.length === 0) {
    return "";
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Escape values that contain commas, quotes, or newlines
  const escapeValue = (value) => {
    if (value === null || value === undefined) {
      return "";
    }
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Create CSV lines
  const lines = [
    csvHeaders.map(escapeValue).join(","),
    ...data.map((row) =>
      csvHeaders.map((header) => escapeValue(row[header] || "")).join(",")
    ),
  ];

  return lines.join("\n");
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV content as string
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename = "data.csv") {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

