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
} from "react-icons/fa";
import api from "@/lib/api";
import { useToast, ToastContainer } from "../ui/Toast";

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
    const [results, setResults] = useState({ success: 0, failed: 0, errors: [] });
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

    // --- Import Logic ---
    const handleImport = async () => {
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

                const res = await api.post('/bulk-import/context-locked', payload);

                if (res.data.success) {
                    const stats = res.data.data;
                    successCount = stats.definitionsInserted || 0;
                    failCount = stats.rowsSkipped || 0;
                    if (stats.skipReasons && stats.skipReasons.length) {
                        errorLog.push(...stats.skipReasons);
                    }

                    // Show detailed stats
                    success(`Import Complete! Units: ${stats.unitsInserted}, Chapters: ${stats.chaptersInserted}, Topics: ${stats.topicsInserted}, SubTopics: ${stats.subtopicsInserted}, Definitions: ${stats.definitionsInserted}`);
                } else {
                    failCount = parsedData.length;
                    errorLog.push(res.data.message || "Import failed");
                }

            } else if (importMode === "hierarchical") {
                // --- HIERARCHICAL IMPORT ---
                const payload = {
                    startLevel: importType,
                    parents: basePayload,
                    data: parsedData
                };

                const res = await api.post('/bulk-import/hierarchical', payload);

                if (res.data.success) {
                    const { successCount: s, failCount: f, errors: e } = res.data.data;
                    successCount = s;
                    failCount = f;
                    if (e && e.length) errorLog.push(...e);
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
            setImportStatus(failCount > 0 ? "error" : "success");
            if (successCount > 0 && importMode !== "context-locked") success(`Successfully imported ${successCount} items!`);
            if (failCount > 0) showError(`Failed to import ${failCount} items.`);

        } catch (err) {
            console.error("Critical Import Error", err);
            setImportStatus("error");
            showError("Critical error during import");
            setResults({ success: successCount, failed: failCount, errors: ["Critical System Error"] });
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
                                onClick={() => { setImportMode("hierarchical"); setFile(null); setParsedData([]); setResults({ success: 0, failed: 0, errors: [] }); setImportStatus("idle"); }}
                                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${importMode === "hierarchical" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Deep Hierarchy
                            </button>
                            <button
                                onClick={() => { setImportMode("context-locked"); setFile(null); setParsedData([]); setResults({ success: 0, failed: 0, errors: [] }); setImportStatus("idle"); }}
                                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${importMode === "context-locked" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                🔒 Context-Locked
                            </button>
                        </div>
                    </div>

                    {/* Import Type / Start Level */}
                    {importMode !== "context-locked" && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {importMode === "hierarchical" ? "Data Starts From Level" : "What are you importing?"}
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
                            {importMode === "hierarchical" && (
                                <p className="text-xs text-blue-600 mt-1">
                                    * CSV should contain columns for {importType} and all levels below it.
                                </p>
                            )}
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
                                disabled={!parsedData.length || importStatus === 'processing'}
                                className={`w-full py-3 px-4 rounded-lg font-medium text-sm text-white transition-all flex justify-center items-center gap-2
                                    ${!parsedData.length || importStatus === 'processing'
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-[#0056FF] hover:bg-[#0044CC] shadow-sm hover:shadow-md"}`}
                            >
                                {importStatus === 'processing' ? <FaSpinner className="animate-spin" /> : <FaCloudUploadAlt />}
                                {importStatus === 'processing' ? "Importing..." : "Start Import"}
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
        </>
    );
};

export default BulkImportManagement;
