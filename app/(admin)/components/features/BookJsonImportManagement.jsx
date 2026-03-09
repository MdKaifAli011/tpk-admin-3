"use client";
import React, { useState, useCallback, useEffect } from "react";
import {
    FaCloudUploadAlt,
    FaFileCode,
    FaSpinner,
    FaCheckCircle,
    FaExclamationCircle,
    FaBook,
} from "react-icons/fa";
import api from "@/lib/api";
import { useToast, ToastContainer } from "../ui/Toast";
import { usePermissions, getBulkImportPermissions, getBulkImportPermissionMessage } from "../../hooks/usePermissions";

const SAMPLE_JSON = {
    book_title: "Physics-2",
    total_pages: 846,
    units: [
        {
            units_name: "Electrostatics",
            unit_number: 18,
            page_start: 7,
            page_end: 28,
            chapters: [
                {
                    name: "Electric Charge",
                    topic_type: "theory",
                    page_start: 7,
                    page_end: 8,
                    topics: [
                        {
                            name: "definition_content and Properties of Charge",
                            page_start: 7,
                            page_end: 7,
                            subtopics: [
                                {
                                    definition: "Charge",
                                    definition_content: "The property associated with matter due to which it produces and experiences electrical and magnetic effects.",
                                    page: 7,
                                },
                                {
                                    definition: "Positive Charge",
                                    definition_content: "Charge acquired by loss of electrons from an atom.",
                                    page: 7,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};

const BookJsonImportManagement = () => {
    const { success, error: showError, toasts, removeToast } = useToast();
    const { role } = usePermissions();
    const importPerms = getBulkImportPermissions(role);

    const [parents, setParents] = useState({ examId: "", subjectId: "" });
    const [dropdownOptions, setDropdownOptions] = useState({ exams: [], subjects: [] });
    const [jsonInput, setJsonInput] = useState("");
    const [file, setFile] = useState(null);
    const [parsed, setParsed] = useState(null);
    const [parseError, setParseError] = useState("");
    const [importStatus, setImportStatus] = useState("idle");
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = React.useRef(null);

    const fetchExams = useCallback(async () => {
        try {
            const res = await api.get("/exam?status=all");
            if (res.data.success) setDropdownOptions((prev) => ({ ...prev, exams: res.data.data }));
        } catch (err) {
            console.error("Failed to fetch exams", err);
        }
    }, []);

    const fetchSubjects = useCallback(async (examId) => {
        if (!examId) return;
        try {
            const res = await api.get(`/subject?examId=${examId}&status=all`);
            if (res.data.success) setDropdownOptions((prev) => ({ ...prev, subjects: res.data.data }));
        } catch (err) {
            console.error("Failed to fetch subjects", err);
        }
    }, []);

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    useEffect(() => {
        if (parents.examId) fetchSubjects(parents.examId);
        else setDropdownOptions((prev) => ({ ...prev, subjects: [] }));
    }, [parents.examId, fetchSubjects]);

    const handleParentChange = (level, value) => {
        setParents((prev) => {
            const next = { ...prev, [level]: value };
            if (level === "examId") next.subjectId = "";
            return next;
        });
    };

    const validateAndParse = (raw) => {
        setParseError("");
        setParsed(null);
        if (!raw || !String(raw).trim()) return;
        try {
            const data = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (!data || typeof data !== "object") {
                setParseError("JSON must be an object");
                return;
            }
            const units = data.units;
            if (!Array.isArray(units) || units.length === 0) {
                setParseError("data.units must be a non-empty array");
                return;
            }
            let unitsCount = 0;
            let chaptersCount = 0;
            let topicsCount = 0;
            let definitionsCount = 0;
            for (const u of units) {
                unitsCount++;
                const chs = u.chapters;
                if (Array.isArray(chs)) {
                    for (const c of chs) {
                        chaptersCount++;
                        const tops = c.topics;
                        if (Array.isArray(tops)) {
                            for (const t of tops) {
                                topicsCount++;
                                const subs = t.subtopics;
                                if (Array.isArray(subs)) definitionsCount += subs.length;
                            }
                        }
                    }
                }
            }
            setParsed({
                book_title: data.book_title,
                total_pages: data.total_pages,
                unitsCount,
                chaptersCount,
                topicsCount,
                definitionsCount,
                data,
            });
        } catch (e) {
            setParseError(e.message || "Invalid JSON");
        }
    };

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.name.toLowerCase().endsWith(".json") && f.type !== "application/json") {
            showError("Please select a .json file");
            return;
        }
        setFile(f);
        setParseError("");
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result;
            setJsonInput(text || "");
            validateAndParse(text || "");
        };
        reader.readAsText(f);
    };

    const handlePasteChange = (e) => {
        const v = e.target.value;
        setJsonInput(v);
        validateAndParse(v);
        setFile(null);
    };

    const loadSample = () => {
        const str = JSON.stringify(SAMPLE_JSON, null, 2);
        setJsonInput(str);
        validateAndParse(str);
        setFile(null);
    };

    const handleImport = async () => {
        if (!importPerms.canImport) {
            showError(getBulkImportPermissionMessage(role));
            return;
        }
        if (!parents.examId || !parents.subjectId) {
            showError("Please select Exam and Subject");
            return;
        }
        if (!parsed?.data) {
            showError("Please provide valid book JSON (upload or paste)");
            return;
        }

        setImportStatus("processing");
        setImportResult(null);

        try {
            const res = await api.post("/bulk-import/book-json", {
                examId: parents.examId,
                subjectId: parents.subjectId,
                data: parsed.data,
            }, { timeout: 300000 });

            if (res.data.success) {
                const d = res.data.data;
                setImportResult(d);
                const msg = [
                    `Created: ${d.totalCreated} items`,
                    `Updated: ${d.totalUpdated} items`,
                    d.detailsUpdated ? `Content saved for ${d.detailsUpdated} definitions` : "",
                ].filter(Boolean).join(". ");
                success(msg);
                setImportStatus("success");
            } else {
                showError(res.data?.message || "Import failed");
                setImportStatus("error");
                setImportResult(res.data?.data || null);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Import failed";
            showError(msg);
            setImportStatus("error");
            setImportResult(err.response?.data?.data || null);
        }
    };

    return (
        <>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <FaBook className="w-6 h-6 text-indigo-600" />
                        <h1 className="text-xl font-semibold text-gray-900">Book JSON Import</h1>
                    </div>
                    <p className="text-xs text-gray-600">
                        Import a book-style JSON with nested structure: <strong>units → chapters → topics → subtopics</strong>.
                        Each subtopic item can have <code className="bg-gray-100 px-1 rounded">definition</code> and <code className="bg-gray-100 px-1 rounded">definition_content</code>.
                        Select Exam and Subject, then upload or paste your JSON and run import.
                    </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Context</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Exam *</label>
                            <select
                                value={parents.examId}
                                onChange={(e) => handleParentChange("examId", e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            >
                                <option value="">Select Exam</option>
                                {dropdownOptions.exams.map((e) => (
                                    <option key={e._id} value={e._id}>{e.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Subject *</label>
                            <select
                                value={parents.subjectId}
                                onChange={(e) => handleParentChange("subjectId", e.target.value)}
                                disabled={!parents.examId}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100"
                            >
                                <option value="">Select Subject</option>
                                {dropdownOptions.subjects.map((s) => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Book JSON</h2>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <label className="cursor-pointer">
                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                                    <FaFileCode /> Upload .json file
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={loadSample}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                            >
                                Load sample structure
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Or paste JSON</label>
                            <textarea
                                value={jsonInput}
                                onChange={handlePasteChange}
                                placeholder='{ "book_title": "...", "total_pages": 846, "units": [ ... ] }'
                                rows={12}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                            />
                        </div>
                        {parseError && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <FaExclamationCircle /> {parseError}
                            </div>
                        )}
                        {parsed && !parseError && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                                    <FaCheckCircle /> Valid structure
                                </div>
                                <ul className="text-sm text-green-700 space-y-1">
                                    {parsed.book_title && <li>Book: {parsed.book_title}</li>}
                                    {parsed.total_pages != null && <li>Total pages: {parsed.total_pages}</li>}
                                    <li>Units: {parsed.unitsCount}</li>
                                    <li>Chapters: {parsed.chaptersCount}</li>
                                    <li>Topics: {parsed.topicsCount}</li>
                                    <li>Definitions: {parsed.definitionsCount}</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {parsed && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">Ready to import</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {parsed.definitionsCount} definitions will be created/updated under the selected Exam & Subject.
                                </p>
                            </div>
                            <button
                                onClick={handleImport}
                                disabled={importStatus === "processing" || !importPerms.canImport}
                                title={!importPerms.canImport ? getBulkImportPermissionMessage(role) : "Start import"}
                                className={`px-6 py-3 rounded-lg font-medium text-sm text-white transition-all flex items-center gap-2
                                    ${importStatus === "processing" || !importPerms.canImport
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-indigo-600 hover:bg-indigo-700 shadow-sm"}`}
                            >
                                {importStatus === "processing" ? (
                                    <><FaSpinner className="animate-spin" /> Importing...</>
                                ) : (
                                    <><FaCloudUploadAlt /> Start Import</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {importResult && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import result</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Units</div>
                                <div className="font-bold text-gray-900">+{importResult.unitsCreated} / ~{importResult.unitsUpdated}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Chapters</div>
                                <div className="font-bold text-gray-900">+{importResult.chaptersCreated} / ~{importResult.chaptersUpdated}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Topics</div>
                                <div className="font-bold text-gray-900">+{importResult.topicsCreated} / ~{importResult.topicsUpdated}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">SubTopics</div>
                                <div className="font-bold text-gray-900">+{importResult.subtopicsCreated} / ~{importResult.subtopicsUpdated}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Definitions</div>
                                <div className="font-bold text-gray-900">+{importResult.definitionsCreated} / ~{importResult.definitionsUpdated}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Content saved</div>
                                <div className="font-bold text-gray-900">{importResult.detailsUpdated ?? 0}</div>
                            </div>
                        </div>
                        {importResult.errors && importResult.errors.length > 0 && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-h-40 overflow-y-auto">
                                <div className="text-sm font-medium text-red-800 mb-2">Errors</div>
                                <ul className="text-xs text-red-700 list-disc pl-5 space-y-1">
                                    {importResult.errors.slice(0, 20).map((e, i) => (
                                        <li key={i}>{e}</li>
                                    ))}
                                    {importResult.errors.length > 20 && (
                                        <li>... and {importResult.errors.length - 20} more</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default BookJsonImportManagement;
