"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    FaCloudUploadAlt,
    FaFileCsv,
    FaDownload,
    FaCheckCircle,
    FaExclamationCircle,
    FaSpinner,
    FaTimes,
    FaFileExport,
} from "react-icons/fa";
import api from "@/lib/api";
import { useToast, ToastContainer } from "../ui/Toast";
import { usePermissions, getBulkImportPermissions, getBulkImportPermissionMessage } from "../../hooks/usePermissions";

// Helper to parse CSV (handling quotes)
const parseCSV = (text) => {
    const result = [];
    let row = [];
    let inQuotes = false;
    let currentValue = "";

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentValue += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            row.push(currentValue.trim());
            currentValue = "";
        } else if ((char === "\r" || char === "\n") && !inQuotes) {
            if (currentValue || row.length > 0) {
                row.push(currentValue.trim());
                result.push(row);
            }
            row = [];
            currentValue = "";
            // Handle \r\n
            if (char === "\r" && nextChar === "\n") i++;
        } else {
            currentValue += char;
        }
    }
    // Add last row
    if (currentValue || row.length > 0) {
        row.push(currentValue.trim());
        result.push(row);
    }

    // Convert to array of objects
    const headers = result[0].map((h) => h.toLowerCase().replace(/\s+/g, ""));
    const data = result.slice(1).map((r) => {
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = r[idx] || "";
        });
        return obj;
    });

    return { headers, data };
};

const IMPORT_TYPES = [
    { value: "exam", label: "Exams", parents: [] },
    { value: "subject", label: "Subjects", parents: ["exam"] },
    { value: "unit", label: "Units", parents: ["exam", "subject"] },
    {
        value: "chapter",
        label: "Chapters",
        parents: ["exam", "subject", "unit"],
    },
    {
        value: "topic",
        label: "Topics",
        parents: ["exam", "subject", "unit", "chapter"],
    },
    {
        value: "subtopic",
        label: "Sub Topics",
        parents: ["exam", "subject", "unit", "chapter", "topic"],
    },
    {
        value: "definition",
        label: "Definitions",
        parents: ["exam", "subject", "unit", "chapter", "topic", "subtopic"],
    },
];

const BulkImportManagement = () => {
    const { success, error: showError, toasts, removeToast } = useToast();

    // Permissions
    const { role } = usePermissions();
    const importPerms = getBulkImportPermissions(role);

    // State
    const [importType, setImportType] = useState("exam");
    const [parents, setParents] = useState({
        examId: "",
        subjectId: "",
        unitId: "",
        chapterId: "",
        topicId: "",
        subTopicId: "",
    });
    const [dropdownOptions, setDropdownOptions] = useState({
        exams: [],
        subjects: [],
        units: [],
        chapters: [],
        topics: [],
        subTopics: [],
    });

    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [importStatus, setImportStatus] = useState("idle"); // idle, processing, success, error
    const [exportStatus, setExportStatus] = useState("idle"); // idle, exporting, success, error
    const [results, setResults] = useState({ success: 0, failed: 0, errors: [] });
    const [showImportModal, setShowImportModal] = useState(false);
    const [importStats, setImportStats] = useState(null); // Detailed import statistics
    const [importProgress, setImportProgress] = useState(0); // Real-time import progress (0-100)
    const [importProgressText, setImportProgressText] = useState(""); // Progress text (e.g., "Processing row 50 of 200")
    const progressIntervalRef = useRef(null); // Reference to progress interval
    const importStartTimeRef = useRef(null); // Track when import started
    const fileInputRef = useRef(null);

    const [importMode, setImportMode] = useState("single"); // single, hierarchical, context-locked

    // --- Fetching Logic for Dropdowns ---
    const fetchExams = useCallback(async () => {
        try {
            const res = await api.get("/exam?status=all");
            if (res.data.success) setDropdownOptions((prev) => ({ ...prev, exams: res.data.data }));
        } catch (err) {
            console.error("Failed to fetch exams");
        }
    }, []);

    const fetchSubjects = useCallback(async (examId) => {
        if (!examId) return;
        try {
            const res = await api.get(`/subject?examId=${examId}&status=all`);
            if (res.data.success) setDropdownOptions((prev) => ({ ...prev, subjects: res.data.data }));
        } catch (err) { console.error(err); }
    }, []);

    const fetchUnits = useCallback(async (examId, subjectId) => {
        if (!subjectId) return;
        try {
            const res = await api.get(`/unit?examId=${examId}&subjectId=${subjectId}&status=all&limit=1000`);
            if (res.data.success) setDropdownOptions((prev) => ({ ...prev, units: res.data.data }));
        } catch (err) { console.error(err); }
    }, []);

    const fetchChapters = useCallback(async (unitId) => {
        if (!unitId) return;
        try {
            const res = await api.get(`/chapter?unitId=${unitId}&status=all&limit=1000`);
            if (res.data.success) setDropdownOptions((prev) => ({ ...prev, chapters: res.data.data }));
        } catch (err) { console.error(err); }
    }, []);

    const fetchTopics = useCallback(async (chapterId) => {
        if (!chapterId) return;
        try {
            const res = await api.get(`/topic?chapterId=${chapterId}&status=all&limit=1000`);
            if (res.data.success) setDropdownOptions((prev) => ({ ...prev, topics: res.data.data }));
        } catch (err) { console.error(err); }
    }, []);

    const fetchSubTopics = useCallback(async (topicId) => {
        if (!topicId) return;
        try {
            const res = await api.get(`/subtopic?topicId=${topicId}&status=all&limit=1000`);
            if (res.data.success) setDropdownOptions((prev) => ({ ...prev, subTopics: res.data.data }));
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    // --- Handle Dropdown Changes ---
    const handleParentChange = (level, value) => {
        setParents((prev) => {
            const newState = { ...prev, [level]: value };

            // Cascade clear
            if (level === 'examId') {
                newState.subjectId = ''; newState.unitId = ''; newState.chapterId = ''; newState.topicId = ''; newState.subTopicId = '';
                fetchSubjects(value);
            }
            if (level === 'subjectId') {
                newState.unitId = ''; newState.chapterId = ''; newState.topicId = ''; newState.subTopicId = '';
                if (value) fetchUnits(newState.examId, value);
            }
            if (level === 'unitId') {
                newState.chapterId = ''; newState.topicId = ''; newState.subTopicId = '';
                if (value) fetchChapters(value);
            }
            if (level === 'chapterId') {
                newState.topicId = ''; newState.subTopicId = '';
                if (value) fetchTopics(value);
            }
            if (level === 'topicId') {
                newState.subTopicId = '';
                if (value) fetchSubTopics(value);
            }

            return newState;
        });
    };

    // --- File Handling ---
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
                showError("Please upload a valid CSV file");
                return;
            }
            setFile(selectedFile);
            setImportStatus("idle");
            setResults({ success: 0, failed: 0, errors: [] });

            // Parse immediately for preview
            const reader = new FileReader();
            reader.onload = (evt) => {
                const text = evt.target.result;
                const { headers, data } = parseCSV(text);
                setHeaders(headers);
                setParsedData(data);
            };
            reader.readAsText(selectedFile);
        }
    };

    const downloadTemplate = () => {
        let headers = [];
        let sampleRows = [];

        if (importMode === "context-locked") {
            // Context-Locked Mode: Simplified structure
            headers = ["unit", "chapter", "topic", "subtopic", "definition"];
            sampleRows = [
                "Mechanics,Motion,Kinematics,Displacement,What is Displacement?",
                "Mechanics,Motion,Kinematics,Velocity,What is Velocity?",
                "Mechanics,Laws of Motion,Newton's Laws,First Law,Newton's First Law",
                "Thermodynamics,Heat Transfer,Conduction,Thermal Conductivity,What is Thermal Conductivity?"
            ];
        } else if (importMode === "hierarchical") {
            // Deep Hierarchy Headers
            const levels = ['exam', 'subject', 'unit', 'chapter', 'topic', 'subtopic', 'definition'];
            const startIndex = levels.indexOf(importType);

            for (let i = startIndex; i < levels.length; i++) {
                headers.push(levels[i]);
            }
            sampleRows = ["Physics,Mechanics,Motion,Kinematics,Displacement,What is Displacement?"];
        } else {
            // Simple Mode headers
            headers = ["name", "orderNumber"];
            if (importType === "chapter") headers.push("weightage", "time", "questions");
            sampleRows = [importType === "chapter" ? "Example Chapter,1,10,60,20" : "Example Item,1"];
        }

        // Create CSV content
        const csvContent = headers.join(",") + "\n" + sampleRows.join("\n");

        // Download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${importMode === 'context-locked' ? 'context_locked_' : importMode === 'hierarchical' ? 'deep_' : ''}${importType}_import_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Export Logic ---
    const handleExport = async () => {
        if (!parents.examId || !parents.subjectId) {
            showError("Please select both Exam and Subject to export data.");
            return;
        }

        setExportStatus("exporting");

        try {
            success("Export started... Please wait while we prepare your data...");

            // Add BOM for Excel UTF-8 compatibility
            const BOM = "\uFEFF";

            const res = await api.post("/bulk-export", {
                examId: parents.examId,
                subjectId: parents.subjectId
            });

            if (res.data.success && res.data.data) {
                const csvContent = res.data.data;
                const totalRows = res.data.count || 0;
                const totalItems = res.data.totalItems || totalRows;
                const unitsCount = res.data.units || 0;
                const chaptersCount = res.data.chapters || 0;
                const topicsCount = res.data.topics || 0;
                const subtopicsCount = res.data.subtopics || 0;
                const definitionsCount = res.data.definitions || 0;
                const processedCount = res.data.processed || totalRows;
                const errorCount = res.data.errors || 0;
                const fileSize = res.data.size || csvContent.length;

                if (totalRows === 0) {
                    showError("No data found to export for the selected criteria.");
                    setExportStatus("idle");
                    return;
                }

                // Add BOM for Excel compatibility
                const csvWithBOM = BOM + csvContent;

                // Create blob with UTF-8 BOM for proper Excel encoding
                const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);

                // Filename: export_ExamName_SubjectName_Date.csv
                const examName = dropdownOptions.exams.find(e => e._id === parents.examId)?.name || "Exam";
                const subjectName = dropdownOptions.subjects.find(s => s._id === parents.subjectId)?.name || "Subject";
                const date = new Date().toISOString().split('T')[0];
                const sanitizedExamName = examName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const sanitizedSubjectName = subjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

                link.setAttribute("download", `Export_${sanitizedExamName}_${sanitizedSubjectName}_${date}.csv`);
                document.body.appendChild(link);
                link.click();

                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);

                const sizeKB = (fileSize / 1024).toFixed(2);
                setExportStatus("success");

                // Show comprehensive success message
                let successMessage = `✅ Export complete! Downloaded ${totalRows.toLocaleString()} total rows (${sizeKB} KB)\n`;
                successMessage += `📦 Breakdown: ${unitsCount} Units, ${chaptersCount} Chapters, ${topicsCount} Topics, ${subtopicsCount} SubTopics, ${definitionsCount} Definitions`;
                if (errorCount > 0) {
                    successMessage += `\n⚠️ ${errorCount} rows had processing warnings`;
                }

                success(successMessage);
                console.log(`✅ Export successful: ${totalRows} total rows (${unitsCount} Units + ${chaptersCount} Chapters + ${topicsCount} Topics + ${subtopicsCount} SubTopics + ${definitionsCount} Definitions), ${sizeKB} KB`);

                // Reset status after 4 seconds (longer to read message)
                setTimeout(() => setExportStatus("idle"), 4000);
            } else {
                setExportStatus("error");
                showError(res.data?.message || "Export failed: No data returned from server");
                setTimeout(() => setExportStatus("idle"), 2000);
            }
        } catch (err) {
            console.error("Export error:", err);
            setExportStatus("error");
            const errorMessage = err.response?.data?.message || err.message || "Export failed. Please try again.";
            showError(errorMessage);
            setTimeout(() => setExportStatus("idle"), 2000);
        }
    };

    // --- Import Logic ---
    const handleImport = async () => {
        // Permission Check
        if (!importPerms.canImport) {
            showError(getBulkImportPermissionMessage(role));
            return;
        }

        // Validate Context based on mode
        if (importMode === "context-locked") {
            // Context-Locked requires Exam and Subject
            if (!parents.examId || !parents.subjectId) {
                showError("Context-Locked mode requires both Exam and Subject to be selected.");
                return;
            }
        } else {
            // Other modes validate based on importType
            const currentTypeConfig = IMPORT_TYPES.find(t => t.value === importType);
            for (const parent of currentTypeConfig.parents) {
                if (!parents[`${parent}Id`]) {
                    showError(`Please select a ${parent} first.`);
                    return;
                }
            }
        }

        if (!parsedData.length) {
            showError("No data found in CSV");
            return;
        }

        setImportStatus("processing");
        setShowImportModal(true); // Show modal during import
        setImportStats(null); // Reset stats
        setImportProgress(0); // Reset progress
        setImportProgressText(`Preparing to import ${parsedData.length} rows...`);
        importStartTimeRef.current = Date.now(); // Track start time

        // Calculate estimated processing time (assuming ~5-10 rows per second average)
        const estimatedRowsPerSecond = 8; // Conservative estimate
        const estimatedTotalTime = Math.max((parsedData.length / estimatedRowsPerSecond) * 1000, 10000); // At least 10 seconds

        // Start progress simulation - update every 200ms for smooth animation
        let currentProgress = 0;
        const progressStep = 100 / (estimatedTotalTime / 200); // Calculate step size

        // Clear any existing interval
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }

        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - importStartTimeRef.current;
            const estimatedProgress = Math.min((elapsed / estimatedTotalTime) * 100, 95); // Cap at 95% until actual completion

            // Calculate estimated rows processed
            const estimatedRowsProcessed = Math.min(
                Math.floor((elapsed / estimatedTotalTime) * parsedData.length),
                parsedData.length - 1
            );

            setImportProgress(estimatedProgress);
            setImportProgressText(
                `Processing row ${estimatedRowsProcessed + 1} of ${parsedData.length}...`
            );
        }, 200); // Update every 200ms

        let successCount = 0;
        let failCount = 0;
        const errorLog = [];

        // Prepare Base Payload from Parents
        const basePayload = {};
        if (importMode !== "context-locked") {
            const currentTypeConfig = IMPORT_TYPES.find(t => t.value === importType);
            currentTypeConfig.parents.forEach(p => {
                basePayload[`${p}Id`] = parents[`${p}Id`];
            });
        }

        try {
            if (importMode === "context-locked") {
                // --- CONTEXT-LOCKED IMPORT ---
                const payload = {
                    examId: parents.examId,
                    subjectId: parents.subjectId,
                    data: parsedData
                };

                // Use extended timeout for bulk imports (5 minutes = 300000ms)
                const res = await api.post('/bulk-import/context-locked', payload, {
                    timeout: 300000 // 5 minutes for large imports
                });

                // Clear progress interval
                if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                }

                if (res.data.success) {
                    const stats = res.data.data;
                    successCount = stats.totalProcessed || (stats.definitionsInserted || 0);
                    failCount = stats.rowsSkipped || 0;
                    if (stats.skipReasons && stats.skipReasons.length) {
                        errorLog.push(...stats.skipReasons);
                    }

                    // Complete progress bar (100%)
                    setImportProgress(100);
                    setImportProgressText(`Completed! Processed ${parsedData.length} rows.`);

                    // Store detailed stats for modal display
                    setImportStats({
                        ...stats,
                        totalProcessed: stats.totalProcessed || (parsedData.length - failCount),
                        errorLog: errorLog.slice(0, 50) // Limit to first 50 errors
                    });

                    // Show success status - modal will display detailed breakdown
                    setImportStatus("success");

                    // Show toast notification (modal will show details)
                    const statsMessage = `✅ Import completed! Click to view details.`;
                    success(statsMessage);
                    console.log(`✅ Import successful:`, stats);

                    // Modal remains open to show results - user can close it manually

                } else {
                    // Import failed - show detailed error
                    failCount = parsedData.length;
                    const errorMsg = res.data.message || res.data.error?.message || "Import failed";
                    errorLog.push(errorMsg);

                    setImportStatus("error");

                    // Provide user-friendly error messages
                    let userFriendlyError = errorMsg;
                    if (errorMsg.includes("duplicate key") || errorMsg.includes("E11000")) {
                        userFriendlyError = "Some data already exists. The system will update existing items and add new ones. This is normal for incremental imports.";
                        // This might not be a complete failure - some data might have been imported
                        console.warn("⚠️ Duplicate key detected - this is expected when adding new data to existing imports");
                    }

                    showError(`❌ Import Failed: ${userFriendlyError}`);

                    // Log full error for debugging
                    console.error("Import API Error:", res.data);

                    // Reset status after 5 seconds
                    setTimeout(() => setImportStatus("idle"), 5000);
                }

            } else if (importMode === "hierarchical") {
                // --- HIERARCHICAL IMPORT ---
                const payload = {
                    startLevel: importType,
                    parents: basePayload,
                    data: parsedData
                };

                // Use extended timeout for bulk imports (5 minutes = 300000ms)
                const res = await api.post('/bulk-import/hierarchical', payload, {
                    timeout: 300000 // 5 minutes for large imports
                });

                if (res.data.success) {
                    const stats = res.data.data;
                    successCount = stats.successCount || 0;
                    failCount = stats.failCount || 0;
                    const totalCreated = stats.totalCreated || 0;
                    const totalUpdated = stats.totalUpdated || 0;
                    const slugsGenerated = stats.slugsGenerated || 0;

                    if (stats.errors && stats.errors.length) errorLog.push(...stats.errors);

                    // Show comprehensive stats
                    let statsMessage = `✅ Hierarchical Import Complete!\n`;
                    if (totalCreated > 0) {
                        statsMessage += `📦 Created: ${totalCreated} items\n`;
                    }
                    if (totalUpdated > 0) {
                        statsMessage += `🔄 Updated: ${totalUpdated} items\n`;
                    }
                    if (slugsGenerated > 0) {
                        statsMessage += `🏷️ Generated: ${slugsGenerated} slugs\n`;
                    }
                    if (failCount > 0) {
                        statsMessage += `⚠️ Failed: ${failCount} rows`;
                    }

                    success(statsMessage);
                    console.log(`✅ Hierarchical import successful:`, stats);
                } else {
                    failCount = parsedData.length;
                    errorLog.push(res.data.message || "Import failed");
                }

            } else {
                // --- SIMPLE IMPORT ---
                const total = parsedData.length;

                for (let i = 0; i < total; i++) {
                    const row = parsedData[i];
                    if (!row.name) continue;

                    try {
                        const payload = {
                            ...basePayload,
                            name: row.name,
                            orderNumber: row.ordernumber,
                            status: "active"
                        };

                        // Type specific fields
                        if (importType === 'chapter') {
                            payload.weightage = row.weightage;
                            payload.time = row.time;
                            payload.questions = row.questions;
                        }

                        const res = await api.post(`/${importType}`, payload);

                        if (res.data.success) {
                            successCount++;
                        } else {
                            failCount++;
                            errorLog.push(`Row ${i + 1} (${row.name}): ${res.data.message}`);
                        }
                    } catch (err) {
                        failCount++;
                        errorLog.push(`Row ${i + 1} (${row.name}): ${err.response?.data?.message || err.message}`);
                    }
                }
            }

            setResults({ success: successCount, failed: failCount, errors: errorLog });

            // Store stats for modal
            if (importMode !== "context-locked") {
                setImportStats({
                    totalCreated: successCount,
                    totalUpdated: 0,
                    totalProcessed: successCount,
                    errorLog: errorLog.slice(0, 50)
                });
            }

            setImportStatus(failCount > 0 ? "error" : "success");
            if (successCount > 0 && importMode !== "context-locked") success(`Successfully imported ${successCount} items!`);
            if (failCount > 0) showError(`Failed to import ${failCount} items.`);

            // Clear progress interval on error or completion
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }

        } catch (err) {
            console.error("❌ Import Error", err);

            // Stop progress updates
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }

            // Check if it's a timeout error
            const isTimeout = err.code === "ECONNABORTED" ||
                err.message?.includes("timeout") ||
                err.message?.includes("TIMEOUT") ||
                err.message?.includes("Request timeout");

            // Extract detailed error message
            let errorMessage = "Import failed";
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data?.error?.message) {
                errorMessage = err.response.data.error.message;
            } else if (err.message) {
                errorMessage = err.message;
            }

            // Handle timeout specifically - import might still be processing
            if (isTimeout) {
                // Timeout occurred - import might still be processing on server
                // Show a message that import is processing and data might be imported
                const timeoutMessage = `⏱️ Request timeout occurred. The import may still be processing in the background.\n\n` +
                    `📝 Note: Large imports can take several minutes. Your data might have been imported successfully.\n\n` +
                    `💡 Please check your data manually or try importing again (the system will update existing items).`;

                showError(timeoutMessage);

                // Set status to show timeout warning (not full error)
                setImportStatus("error");
                setImportStats({
                    totalCreated: 0,
                    totalUpdated: 0,
                    totalProcessed: 0,
                    isTimeout: true,
                    errorLog: [
                        "Request timeout - Import may still be processing in the background.",
                        "Please check your data manually or try importing again.",
                        "The system will update existing items if data already exists."
                    ]
                });

                // Keep modal open longer for timeout so user can read the message
                setTimeout(() => {
                    setShowImportModal(false);
                    setImportStatus("idle");
                }, 15000);
                return;
            }

            // Handle other errors
            setImportStatus("error");

            // Show user-friendly error message
            const userFriendlyError = errorMessage.includes("duplicate key")
                ? "Some data already exists. The system will update existing items and add new ones. Please try again."
                : errorMessage.includes("Validation")
                    ? "Invalid data format. Please check your CSV file."
                    : errorMessage.includes("network") || err.code === "ECONNREFUSED"
                        ? "Network error. Please check your connection and try again."
                        : `Import failed: ${errorMessage}`;

            showError(userFriendlyError);
            setResults({
                success: successCount,
                failed: failCount + parsedData.length,
                errors: [userFriendlyError, ...errorLog]
            });

            // Store error stats for modal
            setImportStats({
                totalCreated: 0,
                totalUpdated: 0,
                totalProcessed: successCount,
                errorLog: [userFriendlyError, ...errorLog].slice(0, 50)
            });

            // Reset status after 10 seconds (keep modal open to show errors)
            setTimeout(() => {
                setShowImportModal(false);
                setImportStatus("idle");
            }, 10000);
        }
    };

    const currentTypeConfig = IMPORT_TYPES.find(t => t.value === importType);

    return (
        <>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <div className="space-y-6">
                {/* Page Header */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900 mb-1">
                                Bulk Import Management
                            </h1>
                            <p className="text-xs text-gray-600">
                                Import bulk data for Exams, Subjects, Units, Chapters, Topics, SubTopics, and Definitions efficiently via CSV upload.
                            </p>
                        </div>
                        <button
                            onClick={downloadTemplate}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                        >
                            <FaDownload className="w-3 h-3" />
                            Download Template
                        </button>
                    </div>
                </div>

                {/* Configuration Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Import Configuration
                    </h2>

                    {/* Mode Switcher */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Import Mode</label>
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                            <button
                                onClick={() => { setImportMode("single"); setFile(null); setParsedData([]); setResults({ success: 0, failed: 0, errors: [] }); setImportStatus("idle"); }}
                                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${importMode === "single" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Single Level
                            </button>
                            <button
                                onClick={() => { setImportMode("context-locked"); setFile(null); setParsedData([]); setResults({ success: 0, failed: 0, errors: [] }); setImportStatus("idle"); }}
                                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${importMode === "context-locked" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                🔒 Context-Locked
                            </button>
                        </div>
                    </div>

                    {/* Import Type - Only for Single Level Mode */}
                    {importMode === "single" && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                What are you importing?
                            </label>
                            <select
                                value={importType}
                                onChange={(e) => {
                                    setImportType(e.target.value);
                                    setFile(null); setParsedData([]); setResults({ success: 0, failed: 0, errors: [] }); setImportStatus("idle");
                                }}
                                className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                {IMPORT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Context-Locked Info */}
                    {importMode === "context-locked" && (
                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 mb-2 text-sm">🔒 Context-Locked Import Mode</h3>
                            <p className="text-xs text-blue-800 mb-2">
                                In this mode, <strong>Exam and Subject are LOCKED</strong>. Your CSV will create:
                            </p>
                            <ul className="text-xs text-blue-700 list-disc pl-5 space-y-1">
                                <li>Multiple Units under the selected Subject</li>
                                <li>Multiple Chapters per Unit</li>
                                <li>Multiple Topics per Chapter</li>
                                <li>Multiple SubTopics per Topic</li>
                                <li>Multiple Definitions per SubTopic</li>
                            </ul>
                            <p className="text-xs text-blue-600 mt-2">
                                ✅ Prevents duplicate data | ✅ Auto-generates slugs | ✅ Maintains strict parent-child relationships
                            </p>
                        </div>
                    )}

                    {/* Context Selectors */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Exam - Always show for context-locked or when required by type */}
                        {(importMode === "context-locked" || currentTypeConfig?.parents.includes("exam")) && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Exam {importMode === "context-locked" && <span className="text-red-500">*</span>}
                                </label>
                                <select
                                    value={parents.examId}
                                    onChange={(e) => handleParentChange("examId", e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                    <option value="">Select Exam</option>
                                    {dropdownOptions.exams.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Subject - Always show for context-locked or when required by type */}
                        {(importMode === "context-locked" || currentTypeConfig?.parents.includes("subject")) && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Subject {importMode === "context-locked" && <span className="text-red-500">*</span>}
                                </label>
                                <select
                                    value={parents.subjectId}
                                    onChange={(e) => handleParentChange("subjectId", e.target.value)}
                                    disabled={!parents.examId}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100"
                                >
                                    <option value="">Select Subject</option>
                                    {dropdownOptions.subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Other levels - Only show for non-context-locked modes */}
                        {importMode !== "context-locked" && currentTypeConfig?.parents.includes("unit") && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Unit</label>
                                <select
                                    value={parents.unitId}
                                    onChange={(e) => handleParentChange("unitId", e.target.value)}
                                    disabled={!parents.subjectId}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100"
                                >
                                    <option value="">Select Unit</option>
                                    {dropdownOptions.units.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                </select>
                            </div>
                        )}

                        {importMode !== "context-locked" && currentTypeConfig?.parents.includes("chapter") && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Chapter</label>
                                <select
                                    value={parents.chapterId}
                                    onChange={(e) => handleParentChange("chapterId", e.target.value)}
                                    disabled={!parents.unitId}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100"
                                >
                                    <option value="">Select Chapter</option>
                                    {dropdownOptions.chapters.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        {importMode !== "context-locked" && currentTypeConfig?.parents.includes("topic") && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Topic</label>
                                <select
                                    value={parents.topicId}
                                    onChange={(e) => handleParentChange("topicId", e.target.value)}
                                    disabled={!parents.chapterId}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100"
                                >
                                    <option value="">Select Topic</option>
                                    {dropdownOptions.topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                </select>
                            </div>
                        )}

                        {importMode !== "context-locked" && currentTypeConfig?.parents.includes("subtopic") && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">SubTopic</label>
                                <select
                                    value={parents.subTopicId}
                                    onChange={(e) => handleParentChange("subTopicId", e.target.value)}
                                    disabled={!parents.topicId}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100"
                                >
                                    <option value="">Select SubTopic</option>
                                    {dropdownOptions.subTopics.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
                                </select>
                            </div>
                        )}
                        {/* Export Action */}
                        {parents.examId && parents.subjectId && (
                            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900">Export Options</h3>
                                    <p className="text-xs text-gray-500 mt-1">Download existing data for the selected Exam and Subject.</p>
                                </div>
                                <button
                                    onClick={handleExport}
                                    disabled={exportStatus === "exporting"}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${exportStatus === "exporting"
                                        ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                        : exportStatus === "success"
                                            ? "bg-green-50 text-green-700 border border-green-200"
                                            : "bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-200 shadow-sm"
                                        }`}
                                >
                                    {exportStatus === "exporting" ? (
                                        <>
                                            <FaSpinner className="animate-spin" size={14} />
                                            Exporting...
                                        </>
                                    ) : exportStatus === "success" ? (
                                        <>
                                            <FaCheckCircle size={14} />
                                            Exported!
                                        </>
                                    ) : (
                                        <>
                                            <FaFileExport size={14} />
                                            Export Data
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Upload CSV File
                    </h2>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".csv"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={importStatus === "processing"}
                        />
                        <FaFileCsv className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        {file ? (
                            <div>
                                <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-gray-700 font-medium text-sm">Click or Drag CSV file here</p>
                                <p className="text-xs text-gray-500 mt-1">Supported format: .csv</p>
                            </div>
                        )}
                    </div>

                    {/* Import Summary & Action */}
                    {parsedData.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Rows Detected</span>
                                    <span className="font-bold text-gray-900">{parsedData.length}</span>
                                </div>
                            </div>

                            {importStatus === 'success' && (
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2 text-green-800 text-sm font-bold mb-1">
                                        <FaCheckCircle /> Import Complete
                                    </div>
                                    <p className="text-sm text-green-700">Successfully imported {results.success} items.</p>
                                    {results.failed > 0 && <p className="text-sm text-red-600 mt-1">Failed: {results.failed}</p>}
                                </div>
                            )}

                            {importStatus === 'error' && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200 max-h-40 overflow-y-auto">
                                    <div className="flex items-center gap-2 text-red-800 text-sm font-bold mb-2">
                                        <FaExclamationCircle /> Import Errors
                                    </div>
                                    <ul className="list-disc pl-5 space-y-1 text-xs text-red-700">
                                        {results.errors.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={handleImport}
                                disabled={!parsedData.length || importStatus === 'processing' || !importPerms.canImport}
                                title={!importPerms.canImport ? getBulkImportPermissionMessage(role) : "Start Import"}
                                className={`w-full py-3 px-4 rounded-lg font-medium text-sm text-white transition-all flex justify-center items-center gap-2
                                    ${!parsedData.length || importStatus === 'processing' || !importPerms.canImport
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-[#0056FF] hover:bg-[#0044CC] shadow-sm hover:shadow-md"}`}
                            >
                                {importStatus === 'processing' ? <FaSpinner className="animate-spin" /> : (!importPerms.canImport ? <FaTimes /> : <FaCloudUploadAlt />)}
                                {importStatus === 'processing' ? "Importing..." : (!importPerms.canImport ? "Import Restricted" : "Start Import")}
                            </button>
                        </div>
                    )}
                </div>

                {/* Data Preview */}
                {parsedData.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="font-semibold text-gray-800 text-sm">Data Preview ({parsedData.length} Rows)</h3>
                        </div>
                        <div className="overflow-x-auto overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-gray-600 border-b border-gray-200 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-medium">#</th>
                                        {headers.map(h => <th key={h} className="px-4 py-3 text-xs font-medium capitalize">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {parsedData.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 font-mono text-xs text-gray-400">{i + 1}</td>
                                            {headers.map(h => (
                                                <td key={h} className="px-4 py-2 text-xs text-gray-700">{row[h]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                            Total {parsedData.length} rows ready for import
                        </div>
                    </div>
                )}
            </div>

            {/* Import Progress/Results Modal with Animation */}
            {showImportModal && (
                <>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            @keyframes fadeIn {
                                from { opacity: 0; }
                                to { opacity: 1; }
                            }
                            @keyframes slideUp {
                                from { transform: translateY(20px); opacity: 0; }
                                to { transform: translateY(0); opacity: 1; }
                            }
                            @keyframes shimmer {
                                0% { transform: translateX(-100%); }
                                100% { transform: translateX(200%); }
                            }
                            .animate-fadeIn {
                                animation: fadeIn 0.3s ease-in-out;
                            }
                            .animate-slideUp {
                                animation: slideUp 0.3s ease-out;
                            }
                        `
                    }} />
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
                        onClick={(e) => {
                            // Only close if clicking backdrop (not modal content)
                            if (e.target === e.currentTarget && importStatus !== "processing") {
                                setShowImportModal(false);
                                setImportStatus("idle");
                                setImportStats(null);
                            }
                        }}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideUp"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between ${importStatus === "processing" ? "bg-blue-50" :
                                importStatus === "success" ? "bg-green-50" :
                                    importStatus === "error" ? "bg-red-50" : "bg-gray-50"
                                }`}>
                                <div className="flex items-center gap-3">
                                    {importStatus === "processing" && (
                                        <FaSpinner className="w-6 h-6 text-blue-600 animate-spin" />
                                    )}
                                    {importStatus === "success" && (
                                        <FaCheckCircle className="w-6 h-6 text-green-600" />
                                    )}
                                    {importStatus === "error" && (
                                        <FaExclamationCircle className="w-6 h-6 text-red-600" />
                                    )}
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {importStatus === "processing" && "Importing Data..."}
                                        {importStatus === "success" && "Import Complete!"}
                                        {importStatus === "error" && "Import Failed"}
                                    </h2>
                                </div>
                                {importStatus !== "processing" && (
                                    <button
                                        onClick={() => {
                                            setShowImportModal(false);
                                            setImportStatus("idle");
                                        }}
                                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                    >
                                        <FaTimes className="w-5 h-5 text-gray-500" />
                                    </button>
                                )}
                            </div>

                            {/* Modal Content */}
                            <div className="overflow-y-auto flex-1 p-6">
                                {importStatus === "processing" && (
                                    <div className="space-y-6">
                                        <div className="text-center py-8">
                                            <FaSpinner className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                                            <p className="text-lg font-semibold text-gray-900 mb-2">
                                                Processing your import...
                                            </p>
                                            <p className="text-sm text-gray-600 mb-4">
                                                {importProgressText || "Please wait while we import your data. This may take a few moments."}
                                            </p>

                                            {/* Real-time Progress Bar */}
                                            <div className="mt-6 space-y-2">
                                                <div className="bg-gray-200 rounded-full h-3 overflow-hidden relative shadow-inner">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 h-full rounded-full transition-all duration-300 ease-out relative"
                                                        style={{
                                                            width: `${importProgress}%`,
                                                            minWidth: importProgress > 0 ? "2%" : "0%"
                                                        }}
                                                    >
                                                        {/* Animated shimmer effect - only show when progress > 0 */}
                                                        {importProgress > 0 && (
                                                            <div
                                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                                                style={{
                                                                    animation: "shimmer 2s infinite",
                                                                    transform: "translateX(-100%)"
                                                                }}
                                                            ></div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-gray-600 px-1">
                                                    <span className="font-medium">Progress</span>
                                                    <span className="font-bold text-blue-600">{Math.round(importProgress)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {importStatus === "success" && importStats && (
                                    <div className="space-y-6">
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {importStats.totalCreated > 0 && (
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FaCheckCircle className="w-5 h-5 text-green-600" />
                                                        <span className="text-sm font-bold text-green-800">Created</span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-green-900">{importStats.totalCreated}</p>
                                                    <p className="text-xs text-green-700 mt-1">New items added</p>
                                                </div>
                                            )}
                                            {importStats.totalUpdated > 0 && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FaSpinner className="w-5 h-5 text-blue-600" />
                                                        <span className="text-sm font-bold text-blue-800">Updated</span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-blue-900">{importStats.totalUpdated}</p>
                                                    <p className="text-xs text-blue-700 mt-1">Existing items updated</p>
                                                </div>
                                            )}
                                            {importStats.slugsGenerated > 0 && (
                                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FaCheckCircle className="w-5 h-5 text-purple-600" />
                                                        <span className="text-sm font-bold text-purple-800">Slugs Generated</span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-purple-900">{importStats.slugsGenerated}</p>
                                                    <p className="text-xs text-purple-700 mt-1">URL-friendly slugs</p>
                                                </div>
                                            )}
                                            {importStats.totalProcessed > 0 && (
                                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FaCheckCircle className="w-5 h-5 text-gray-600" />
                                                        <span className="text-sm font-bold text-gray-800">Processed</span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-gray-900">{importStats.totalProcessed}</p>
                                                    <p className="text-xs text-gray-700 mt-1">Rows processed</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Detailed Breakdown */}
                                        {(importStats.unitsCreated > 0 || importStats.unitsUpdated > 0 ||
                                            importStats.chaptersCreated > 0 || importStats.chaptersUpdated > 0 ||
                                            importStats.topicsCreated > 0 || importStats.topicsUpdated > 0 ||
                                            importStats.subtopicsCreated > 0 || importStats.subtopicsUpdated > 0 ||
                                            importStats.definitionsCreated > 0 || importStats.definitionsUpdated > 0) && (
                                                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                                                    <h3 className="text-sm font-bold text-gray-900 mb-4">Detailed Breakdown</h3>
                                                    <div className="space-y-3">
                                                        {(importStats.unitsCreated > 0 || importStats.unitsUpdated > 0) && (
                                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                                <span className="text-sm text-gray-700 font-medium">Units</span>
                                                                <div className="flex gap-3 text-sm">
                                                                    {importStats.unitsCreated > 0 && <span className="text-green-700 font-bold">+{importStats.unitsCreated}</span>}
                                                                    {importStats.unitsUpdated > 0 && <span className="text-blue-700 font-bold">~{importStats.unitsUpdated}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(importStats.chaptersCreated > 0 || importStats.chaptersUpdated > 0) && (
                                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                                <span className="text-sm text-gray-700 font-medium">Chapters</span>
                                                                <div className="flex gap-3 text-sm">
                                                                    {importStats.chaptersCreated > 0 && <span className="text-green-700 font-bold">+{importStats.chaptersCreated}</span>}
                                                                    {importStats.chaptersUpdated > 0 && <span className="text-blue-700 font-bold">~{importStats.chaptersUpdated}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(importStats.topicsCreated > 0 || importStats.topicsUpdated > 0) && (
                                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                                <span className="text-sm text-gray-700 font-medium">Topics</span>
                                                                <div className="flex gap-3 text-sm">
                                                                    {importStats.topicsCreated > 0 && <span className="text-green-700 font-bold">+{importStats.topicsCreated}</span>}
                                                                    {importStats.topicsUpdated > 0 && <span className="text-blue-700 font-bold">~{importStats.topicsUpdated}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(importStats.subtopicsCreated > 0 || importStats.subtopicsUpdated > 0) && (
                                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                                <span className="text-sm text-gray-700 font-medium">SubTopics</span>
                                                                <div className="flex gap-3 text-sm">
                                                                    {importStats.subtopicsCreated > 0 && <span className="text-green-700 font-bold">+{importStats.subtopicsCreated}</span>}
                                                                    {importStats.subtopicsUpdated > 0 && <span className="text-blue-700 font-bold">~{importStats.subtopicsUpdated}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(importStats.definitionsCreated > 0 || importStats.definitionsUpdated > 0) && (
                                                            <div className="flex justify-between items-center py-2">
                                                                <span className="text-sm text-gray-700 font-medium">Definitions</span>
                                                                <div className="flex gap-3 text-sm">
                                                                    {importStats.definitionsCreated > 0 && <span className="text-green-700 font-bold">+{importStats.definitionsCreated}</span>}
                                                                    {importStats.definitionsUpdated > 0 && <span className="text-blue-700 font-bold">~{importStats.definitionsUpdated}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        {/* Warnings/Errors */}
                                        {importStats.rowsSkipped > 0 && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <FaExclamationCircle className="w-5 h-5 text-yellow-600" />
                                                    <span className="text-sm font-bold text-yellow-800">Skipped Rows</span>
                                                </div>
                                                <p className="text-sm text-yellow-700">
                                                    {importStats.rowsSkipped} row(s) were skipped. Check errors below for details.
                                                </p>
                                            </div>
                                        )}

                                        {/* Error List */}
                                        {importStats.errorLog && importStats.errorLog.length > 0 && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FaExclamationCircle className="w-5 h-5 text-red-600" />
                                                    <span className="text-sm font-bold text-red-800">Errors & Warnings</span>
                                                    <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">
                                                        {importStats.errorLog.length}
                                                    </span>
                                                </div>
                                                <ul className="space-y-1">
                                                    {importStats.errorLog.slice(0, 20).map((error, i) => (
                                                        <li key={i} className="text-xs text-red-700 font-mono bg-white px-2 py-1 rounded border border-red-200">
                                                            {error}
                                                        </li>
                                                    ))}
                                                    {importStats.errorLog.length > 20 && (
                                                        <li className="text-xs text-red-600 italic pt-2">
                                                            ... and {importStats.errorLog.length - 20} more errors
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Success Message */}
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                            <p className="text-sm font-semibold text-green-800 mb-1">
                                                ✅ Import completed successfully!
                                            </p>
                                            <p className="text-xs text-green-700">
                                                You can import more data anytime - new items will be added after existing ones.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {importStatus === "error" && importStats && (
                                    <div className="space-y-4">
                                        {importStats.isTimeout ? (
                                            // Timeout case - show warning (not full error)
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
                                                <div className="text-center mb-4">
                                                    <FaExclamationCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                                                    <p className="text-lg font-bold text-yellow-900 mb-2">⏱️ Request Timeout</p>
                                                    <p className="text-sm text-yellow-800 mb-3">
                                                        The import request timed out, but your data might still be processing in the background.
                                                    </p>
                                                </div>
                                                <div className="bg-white/60 rounded-lg p-4 space-y-2 text-sm">
                                                    <p className="font-semibold text-yellow-900 mb-2">💡 What to do:</p>
                                                    <ul className="list-disc list-inside space-y-1 text-yellow-800">
                                                        <li>Large imports can take several minutes to complete</li>
                                                        <li>Your data may have been imported successfully</li>
                                                        <li>Please check your data manually to verify</li>
                                                        <li>If data is missing, try importing again (system will update existing items)</li>
                                                    </ul>
                                                </div>
                                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                    <p className="text-xs text-blue-800">
                                                        <strong>Note:</strong> The import timeout has been increased to 5 minutes for large files.
                                                        If your file is very large, the import may take longer than 5 minutes.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            // Regular error case
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
                                                <FaExclamationCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                                                <p className="text-lg font-bold text-red-900 mb-2">Import Failed</p>
                                                <p className="text-sm text-red-700">
                                                    {importStats.errorLog?.[0] || "An error occurred during import"}
                                                </p>
                                            </div>
                                        )}

                                        {importStats.errorLog && importStats.errorLog.length > 0 && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FaExclamationCircle className="w-5 h-5 text-red-600" />
                                                    <span className="text-sm font-bold text-red-800">Error Details</span>
                                                </div>
                                                <ul className="space-y-1">
                                                    {importStats.errorLog.slice(0, 30).map((error, i) => (
                                                        <li key={i} className="text-xs text-red-700 font-mono bg-white px-2 py-1 rounded border border-red-200">
                                                            {error}
                                                        </li>
                                                    ))}
                                                    {importStats.errorLog.length > 30 && (
                                                        <li className="text-xs text-red-600 italic pt-2">
                                                            ... and {importStats.errorLog.length - 30} more errors
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            {importStatus !== "processing" && (
                                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setShowImportModal(false);
                                            setImportStatus("idle");
                                            setImportStats(null);
                                            setImportProgress(0);
                                            setImportProgressText("");
                                            if (progressIntervalRef.current) {
                                                clearInterval(progressIntervalRef.current);
                                                progressIntervalRef.current = null;
                                            }
                                        }}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default BulkImportManagement;
