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

  // Strip UTF-8 BOM and normalize unicode so symbols are preserved consistently.
  if (csvText.charCodeAt(0) === 0xfeff) {
    csvText = csvText.slice(1);
  }
  csvText = csvText.normalize("NFC");

  // Parse CSV handling multi-line quoted fields
  // We need to process character by character to handle newlines inside quoted fields
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  let quoteChar = null;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    const isLastChar = i === csvText.length - 1;

    // Handle quote start
    // NOTE: only treat quotes as wrappers when they start a field.
    // This avoids breaking content like "Newton's law" or formula text with apostrophes.
    if ((char === '"' || char === "'") && !inQuotes && currentField.length === 0) {
      inQuotes = true;
      quoteChar = char;
      i++;
      continue;
    }

    // Handle quote end or escaped quote
    if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        // Escaped quote (double quote) - add single quote to value
        currentField += char;
        i += 2; // Skip both quotes
        continue;
      } else if (nextChar === delimiter || nextChar === "\n" || nextChar === "\r" || nextChar === undefined || isLastChar) {
        // End of quoted field - check if we're at end of field
        inQuotes = false;
        quoteChar = null;
        i++;
        continue;
      } else if (nextChar === " " || nextChar === "\t") {
        // Quote followed by whitespace might be end of field (check next non-whitespace)
        let j = i + 1;
        while (j < csvText.length && (csvText[j] === " " || csvText[j] === "\t")) {
          j++;
        }
        if (j >= csvText.length || csvText[j] === delimiter || csvText[j] === "\n" || csvText[j] === "\r") {
          // End of quoted field
          inQuotes = false;
          quoteChar = null;
          i = j;
          continue;
        } else {
          // Quote inside quoted field
          currentField += char;
          i++;
          continue;
        }
      } else {
        // Quote inside quoted field (might be part of content)
        currentField += char;
        i++;
        continue;
      }
    }

    // Handle newline (only end row if not inside quotes)
    if ((char === "\n" || (char === "\r" && nextChar === "\n")) && !inQuotes) {
      // End of row
      if (char === "\r" && nextChar === "\n") {
        i += 2; // Skip \r\n
      } else {
        i++; // Skip \n
      }
      
      // Push current field and row
      currentRow.push(currentField);
      currentField = "";
      
      // Skip empty rows if option is set
      if (skipEmptyLines && currentRow.every(f => !f.trim())) {
        currentRow = [];
        continue;
      }
      
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    // Handle delimiter (only outside quotes)
    if (char === delimiter && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      i++;
      continue;
    }

    // Regular character (including newlines inside quotes)
    currentField += char;
    i++;
  }

  // Push last field and row if any
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 0 && (!skipEmptyLines || !currentRow.every(f => !f.trim()))) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Parse headers
  const headerRow = rows[0];
  const headers = headerRow.map((h) => {
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
  for (let i = 1; i < rows.length; i++) {
    const rowValues = rows[i];
    
    // Normalize values: ensure we have the correct number of fields
    while (rowValues.length < headers.length) {
      rowValues.push("");
    }
    if (rowValues.length > headers.length) {
      // Log warning but don't fail - just truncate
      console.warn(
        `Row ${i + 1}: Found ${rowValues.length} columns, expected ${headers.length}. Truncating extra columns.`
      );
      rowValues.splice(headers.length);
    }

    const row = {};
    headers.forEach((header, index) => {
      let value = rowValues[index] || "";
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

    // Handle quote start only at field start, not apostrophes in content.
    if ((char === '"' || char === "'") && !inQuotes && current.length === 0) {
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
  // Add BOM so Excel reliably opens UTF-8 (special symbols/emojis/languages).
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
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

