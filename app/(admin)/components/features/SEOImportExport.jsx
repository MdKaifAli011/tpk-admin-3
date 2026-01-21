"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    FaCloudUploadAlt,
    FaFileExport,
    FaDownload,
    FaSearch,
    FaCheckCircle,
    FaExclamationCircle,
    FaSpinner,
    FaTrash,
    FaInfoCircle
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useToast, ToastContainer } from "../ui/Toast";

const SEO_LEVELS = [
    { value: "exam", label: "Exams", parents: [] },
    { value: "subject", label: "Subjects", parents: ["examId"] },
    { value: "unit", label: "Units", parents: ["examId", "subjectId"] },
    { value: "chapter", label: "Chapters", parents: ["examId", "subjectId", "unitId"] },
    { value: "topic", label: "Topics", parents: ["examId", "subjectId", "unitId", "chapterId"] },
    { value: "subtopic", label: "Sub Topics", parents: ["examId", "subjectId", "unitId", "chapterId", "topicId"] },
    { value: "definition", label: "Definitions", parents: ["examId", "subjectId", "unitId", "chapterId", "topicId", "subTopicId"] },
];

const SEOImportExport = () => {
    const { success, error: showError, toasts, removeToast } = useToast();

    // Selection state
    const [level, setLevel] = useState("exam");
    const [filters, setFilters] = useState({
        examId: "",
        subjectId: "",
        unitId: "",
        chapterId: "",
        topicId: "",
        subTopicId: "",
    });

    // Options for dropdowns
    const [options, setOptions] = useState({
        exams: [],
        subjects: [],
        units: [],
        chapters: [],
        topics: [],
        subTopics: [],
    });

    // CSV state
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);

    // Fetch initial data
    const fetchExams = useCallback(async () => {
        try {
            const res = await api.get("/exam?status=all&limit=1000");
            if (res.data.success) setOptions(prev => ({ ...prev, exams: res.data.data }));
        } catch (err) { console.error("Exams fetch failed", err); }
    }, []);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    const fetchDropdownData = async (type, parentId, levelKey) => {
        if (!parentId) return;
        try {
            let url = `/${type}?status=all&limit=1000`;
            if (type === 'subject') url += `&examId=${parentId}`;
            else if (type === 'unit') url += `&subjectId=${parentId}`;
            else if (type === 'chapter') url += `&unitId=${parentId}`;
            else if (type === 'topic') url += `&chapterId=${parentId}`;
            else if (type === 'subtopic') url += `&topicId=${parentId}`;

            const res = await api.get(url);
            if (res.data.success) {
                setOptions(prev => ({ ...prev, [levelKey]: res.data.data }));
            }
        } catch (err) { console.error(`${levelKey} fetch failed`, err); }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => {
            const next = { ...prev, [field]: value };

            // Cascade clears
            if (field === "examId") {
                next.subjectId = ""; next.unitId = ""; next.chapterId = ""; next.topicId = ""; next.subTopicId = "";
                fetchDropdownData("subject", value, "subjects");
            } else if (field === "subjectId") {
                next.unitId = ""; next.chapterId = ""; next.topicId = ""; next.subTopicId = "";
                fetchDropdownData("unit", value, "units");
            } else if (field === "unitId") {
                next.chapterId = ""; next.topicId = ""; next.subTopicId = "";
                fetchDropdownData("chapter", value, "chapters");
            } else if (field === "chapterId") {
                next.topicId = ""; next.subTopicId = "";
                fetchDropdownData("topic", value, "topics");
            } else if (field === "topicId") {
                next.subTopicId = "";
                fetchDropdownData("subtopic", value, "subTopics");
            }
            return next;
        });
    };

    const handleExport = async () => {
        // Validate filters for selected level
        const currentLevel = SEO_LEVELS.find(l => l.value === level);
        for (const p of currentLevel.parents) {
            if (!filters[p]) {
                showError(`Please select the parent ${p.replace('Id', '')} first.`);
                return;
            }
        }

        setIsProcessing(true);
        try {
            const res = await api.post("/admin/seo/export", { type: level, filters });
            if (res.data.success && res.data.data) {
                const blob = new Blob([res.data.data], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `SEO_${level}_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                success("Exported successfully!");
            } else if (res.data.count === 0) {
                showError("No data found to export.");
            }
        } catch (err) {
            showError(err.response?.data?.message || "Export failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const parseCSV = (text) => {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return { headers: [], rows: [] };

        const parseRow = (row) => {
            const result = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                    if (inQuotes && row[i + 1] === '"') {
                        current += '"'; i++;
                    } else inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current); current = "";
                } else current += char;
            }
            result.push(current);
            return result;
        };

        const headers = parseRow(lines[0]).map(h => h.trim());
        const rows = lines.slice(1).filter(l => l.trim()).map(line => {
            const cells = parseRow(line);
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = cells[i]?.trim() || "";
            });
            return obj;
        });
        return { headers, rows };
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            const reader = new FileReader();
            reader.onload = (evt) => {
                const { rows } = parseCSV(evt.target.result);
                setParsedData(rows);
            };
            reader.readAsText(f);
        }
    };

    const handleImport = async () => {
        if (!parsedData.length) {
            showError("Please upload a valid CSV first.");
            return;
        }

        // Validate filters for parents
        const currentLevel = SEO_LEVELS.find(l => l.value === level);
        for (const p of currentLevel.parents) {
            if (!filters[p]) {
                showError(`Please select the parent ${p.replace('Id', '')} first.`);
                return;
            }
        }

        setIsProcessing(true);
        setResults(null);

        try {
            const res = await api.post("/admin/seo/import", {
                type: level,
                data: parsedData,
                filters
            });

            if (res.data.success) {
                success(res.data.message);
                setResults(res.data);
            } else {
                showError(res.data.message);
            }
        } catch (err) {
            showError(err.response?.data?.message || "Import failed");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-full mx-auto p-4 space-y-6 animate-in fade-in duration-500">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 mb-1">
                            SEO Metadata Import/Export
                        </h1>
                        <p className="text-xs text-gray-600">
                            Bulk manage SEO titles, meta descriptions, and keywords across all levels of your educational platform.
                        </p>
                    </div>
                </div>
            </div>

            {/* Selection/Configuration Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <FaSearch className="size-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">
                        Level & Hierarchy Selection
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Import/Export Level</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none"
                        >
                            {SEO_LEVELS.map(l => (
                                <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Hierarchy Selection - Always show Exam as it's the root */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Exam</label>
                        <select
                            value={filters.examId}
                            onChange={(e) => handleFilterChange("examId", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-100"
                        >
                            <option value="">Select Exam</option>
                            {options.exams.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                        </select>
                    </div>

                    {/* Conditional Selects Based on Level */}
                    {SEO_LEVELS.find(l => l.value === level).parents.includes("subjectId") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</label>
                            <select
                                value={filters.subjectId}
                                onChange={(e) => handleFilterChange("subjectId", e.target.value)}
                                disabled={!filters.examId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select Subject</option>
                                {options.subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}

                    {SEO_LEVELS.find(l => l.value === level).parents.includes("unitId") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit</label>
                            <select
                                value={filters.unitId}
                                onChange={(e) => handleFilterChange("unitId", e.target.value)}
                                disabled={!filters.subjectId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select Unit</option>
                                {options.units.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                            </select>
                        </div>
                    )}

                    {SEO_LEVELS.find(l => l.value === level).parents.includes("chapterId") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Chapter</label>
                            <select
                                value={filters.chapterId}
                                onChange={(e) => handleFilterChange("chapterId", e.target.value)}
                                disabled={!filters.unitId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select Chapter</option>
                                {options.chapters.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {SEO_LEVELS.find(l => l.value === level).parents.includes("topicId") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Topic</label>
                            <select
                                value={filters.topicId}
                                onChange={(e) => handleFilterChange("topicId", e.target.value)}
                                disabled={!filters.chapterId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select Topic</option>
                                {options.topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                        </div>
                    )}

                    {SEO_LEVELS.find(l => l.value === level).parents.includes("subTopicId") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">SubTopic</label>
                            <select
                                value={filters.subTopicId}
                                onChange={(e) => handleFilterChange("subTopicId", e.target.value)}
                                disabled={!filters.topicId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select SubTopic</option>
                                {options.subTopics.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                    <button
                        onClick={handleExport}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? <FaSpinner className="animate-spin" /> : <FaFileExport />}
                        Export to CSV
                    </button>

                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".csv"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${file ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                        >
                            {file ? file.name : "Choose CSV File"}
                        </button>

                        <button
                            onClick={handleImport}
                            disabled={isProcessing || !file}
                            className="px-4 py-2 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isProcessing ? <FaSpinner className="animate-spin" /> : <FaCloudUploadAlt />}
                            Start Import
                        </button>
                    </div>

                    {parsedData.length > 0 && (
                        <button
                            onClick={() => {
                                setFile(null);
                                setParsedData([]);
                                setResults(null); // optional but recommended

                                // 🔥 THIS LINE FIXES THE BUG
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                }
                            }}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <FaTrash />
                            Clear File
                        </button>
                    )}

                </div>
            </div>

            {/* Results / Preview Section */}
            <div className="grid grid-cols-1 gap-6">
                {results && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-lg border border-green-200 p-6 shadow-sm"
                    >
                        <div className="flex items-center gap-4 mb-4 text-green-700">
                            <FaCheckCircle className="text-2xl" />
                            <div>
                                <h4 className="text-lg font-bold">Import Completed</h4>
                                <p className="text-sm opacity-80">{results.message}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-green-50 p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-green-700">{results.stats.success}</div>
                                <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Created</div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-blue-700">{results.stats.updated}</div>
                                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Updated</div>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-red-700">{results.stats.failed}</div>
                                <div className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Failed</div>
                            </div>
                        </div>

                        {results.errors.length > 0 && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                <h5 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                                    <FaExclamationCircle /> Errors Found ({results.errors.length})
                                </h5>
                                <div className="max-h-40 overflow-y-auto text-xs text-red-600 space-y-1 scrollbar-thin">
                                    {results.errors.map((err, i) => (
                                        <div key={i} className="flex gap-2">
                                            <span className="font-bold opacity-50">•</span>
                                            {err}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {parsedData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                    >
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Data Preview ({parsedData.length} rows)</h4>
                        </div>
                        <div className="overflow-x-auto  scrollbar-thin">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">SEO Title</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Keywords</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {parsedData.slice(0, 50).map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-gray-900 font-medium">{row.Name || row.name || "-"}</td>
                                            <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{row["SEO Title"] || row.seotitle || "-"}</td>
                                            <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{row.Keywords || row.keywords || "-"}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${(row.Status || row.status) === 'publish' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {row.Status || row.status || "draft"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {parsedData.length > 50 && (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-3 text-center text-gray-400 italic bg-gray-50/30">
                                                Showing first 50 of {parsedData.length} rows. Please upload the file to process all data.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Help / Information Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <FaInfoCircle className="text-blue-600" />
                    <h3 className="text-sm font-bold text-gray-900">User Guidelines</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-600 leading-relaxed">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-bold text-gray-800 mb-2">1. Hierarchy Filtering</p>
                        <p>Use the dropdowns to drill down to the specific level. Items will be matched and managed strictly within the selected parent context (e.g., Units within the selected Subject).</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-bold text-gray-800 mb-2">2. Data Override</p>
                        <p>The system automatically overrides existing data if the <strong>ID</strong> or <strong>Name</strong> matches. This allows you to perform incremental updates without creating duplicates.</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-bold text-gray-800 mb-2">3. SEO Metadata</p>
                        <p>This tool updates SEO metadata (Title, Meta Description, Keywords). Ensure fields are within recommended lengths for optimal search engine performance.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SEOImportExport;
