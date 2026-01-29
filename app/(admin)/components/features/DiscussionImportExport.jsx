"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
    FaCloudUploadAlt,
    FaFileExport,
    FaDownload,
    FaCheckCircle,
    FaExclamationCircle,
    FaSpinner,
    FaTrash,
    FaInfoCircle,
    FaSearch,
    FaTimes
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useToast, ToastContainer } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import { usePermissions } from "../../hooks/usePermissions";
import { parseCSV } from "@/utils/csvParser";

const HIERARCHY_LEVELS = [
    { value: "exam", label: "Exam" },
    { value: "subject", label: "Subject" },
    { value: "unit", label: "Unit" },
    { value: "chapter", label: "Chapter" },
    { value: "topic", label: "Topic" },
    { value: "subtopic", label: "SubTopic" },
    { value: "definition", label: "Definition" },
];

const DiscussionImportExport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const fileInputRef = useRef(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const { role } = usePermissions();

    // Preview state
    const [previewData, setPreviewData] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Level selection
    const [selectedLevel, setSelectedLevel] = useState("");
    const [selectedExamId, setSelectedExamId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedUnitId, setSelectedUnitId] = useState("");
    const [selectedChapterId, setSelectedChapterId] = useState("");
    const [selectedTopicId, setSelectedTopicId] = useState("");
    const [selectedSubTopicId, setSelectedSubTopicId] = useState("");
    const [selectedDefinitionId, setSelectedDefinitionId] = useState("");

    // Data for dropdowns
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [units, setUnits] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [subTopics, setSubTopics] = useState([]);
    const [definitions, setDefinitions] = useState([]);

    // Loading states
    const [loadingData, setLoadingData] = useState(false);
    const [hasData, setHasData] = useState(null); // null = not checked, true/false = checked

    // Fetch exams
    const fetchExams = useCallback(async () => {
        try {
            const res = await api.get("/exam?status=all&limit=1000");
            if (res.data.success) setExams(res.data.data || []);
        } catch (err) {
            console.error("Error fetching exams:", err);
        }
    }, []);

    // Fetch subjects
    const fetchSubjects = useCallback(async (examId) => {
        if (!examId) {
            setSubjects([]);
            return;
        }
        try {
            const res = await api.get(`/subject?examId=${examId}&status=all&limit=1000`);
            if (res.data.success) setSubjects(res.data.data || []);
        } catch (err) {
            console.error("Error fetching subjects:", err);
        }
    }, []);

    // Fetch units
    const fetchUnits = useCallback(async (examId, subjectId) => {
        if (!examId || !subjectId) {
            setUnits([]);
            return;
        }
        try {
            const res = await api.get(`/unit?examId=${examId}&subjectId=${subjectId}&status=all&limit=1000`);
            if (res.data.success) setUnits(res.data.data || []);
        } catch (err) {
            console.error("Error fetching units:", err);
        }
    }, []);

    // Fetch chapters
    const fetchChapters = useCallback(async (unitId) => {
        if (!unitId) {
            setChapters([]);
            return;
        }
        try {
            const res = await api.get(`/chapter?unitId=${unitId}&status=all&limit=1000`);
            if (res.data.success) setChapters(res.data.data || []);
        } catch (err) {
            console.error("Error fetching chapters:", err);
        }
    }, []);

    // Fetch topics
    const fetchTopics = useCallback(async (chapterId) => {
        if (!chapterId) {
            setTopics([]);
            return;
        }
        try {
            const res = await api.get(`/topic?chapterId=${chapterId}&status=all&limit=1000`);
            if (res.data.success) setTopics(res.data.data || []);
        } catch (err) {
            console.error("Error fetching topics:", err);
        }
    }, []);

    // Fetch subtopics
    const fetchSubTopics = useCallback(async (topicId) => {
        if (!topicId) {
            setSubTopics([]);
            return;
        }
        try {
            const res = await api.get(`/subtopic?topicId=${topicId}&status=all&limit=1000`);
            if (res.data.success) setSubTopics(res.data.data || []);
        } catch (err) {
            console.error("Error fetching subtopics:", err);
        }
    }, []);

    // Fetch definitions
    const fetchDefinitions = useCallback(async (subTopicId) => {
        if (!subTopicId) {
            setDefinitions([]);
            return;
        }
        try {
            const res = await api.get(`/definition?subTopicId=${subTopicId}&status=all&limit=1000`);
            if (res.data.success) setDefinitions(res.data.data || []);
        } catch (err) {
            console.error("Error fetching definitions:", err);
        }
    }, []);

    // Check if data exists at selected level (same query as export so "has data" matches export result)
    const checkDataExists = useCallback(async () => {
        if (!selectedLevel) {
            setHasData(null);
            return;
        }

        setLoadingData(true);
        try {
            const params = new URLSearchParams();
            params.append("level", selectedLevel);
            if (selectedExamId) params.append("examId", selectedExamId);
            if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
            if (selectedUnitId) params.append("unitId", selectedUnitId);
            if (selectedChapterId) params.append("chapterId", selectedChapterId);
            if (selectedTopicId) params.append("topicId", selectedTopicId);
            if (selectedSubTopicId) params.append("subTopicId", selectedSubTopicId);
            if (selectedDefinitionId) params.append("definitionId", selectedDefinitionId);
            params.append("checkOnly", "1");

            const res = await api.get(`/admin/discussion/export?${params.toString()}`);
            setHasData(res.data.success && res.data.hasData === true);
        } catch (err) {
            console.error("Error checking data:", err);
            setHasData(false);
        } finally {
            setLoadingData(false);
        }
    }, [selectedLevel, selectedExamId, selectedSubjectId, selectedUnitId, selectedChapterId, selectedTopicId, selectedSubTopicId, selectedDefinitionId]);

    // Load initial data
    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    // Cascading effects
    useEffect(() => {
        if (selectedExamId) fetchSubjects(selectedExamId);
        else setSubjects([]);
    }, [selectedExamId, fetchSubjects]);

    useEffect(() => {
        if (selectedExamId && selectedSubjectId) fetchUnits(selectedExamId, selectedSubjectId);
        else setUnits([]);
    }, [selectedExamId, selectedSubjectId, fetchUnits]);

    useEffect(() => {
        if (selectedUnitId) fetchChapters(selectedUnitId);
        else setChapters([]);
    }, [selectedUnitId, fetchChapters]);

    useEffect(() => {
        if (selectedChapterId) fetchTopics(selectedChapterId);
        else setTopics([]);
    }, [selectedChapterId, fetchTopics]);

    useEffect(() => {
        if (selectedTopicId) fetchSubTopics(selectedTopicId);
        else setSubTopics([]);
    }, [selectedTopicId, fetchSubTopics]);

    useEffect(() => {
        if (selectedSubTopicId) fetchDefinitions(selectedSubTopicId);
        else setDefinitions([]);
    }, [selectedSubTopicId, fetchDefinitions]);

    // Check data when selections change
    useEffect(() => {
        if (selectedLevel) {
            const timer = setTimeout(() => {
                checkDataExists();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [selectedLevel, selectedExamId, selectedSubjectId, selectedUnitId, selectedChapterId, selectedTopicId, selectedSubTopicId, selectedDefinitionId, checkDataExists]);

    // Reset selections when level changes
    const handleLevelChange = (level) => {
        setSelectedLevel(level);
        setSelectedExamId("");
        setSelectedSubjectId("");
        setSelectedUnitId("");
        setSelectedChapterId("");
        setSelectedTopicId("");
        setSelectedSubTopicId("");
        setSelectedDefinitionId("");
        setHasData(null);
    };

    // Get selected IDs based on level
    const getSelectedIds = () => {
        const ids = {};
        if (selectedLevel === "exam" && selectedExamId) {
            ids.examId = selectedExamId;
        } else if (selectedLevel === "subject" && selectedExamId && selectedSubjectId) {
            ids.examId = selectedExamId;
            ids.subjectId = selectedSubjectId;
        } else if (selectedLevel === "unit" && selectedExamId && selectedSubjectId && selectedUnitId) {
            ids.examId = selectedExamId;
            ids.subjectId = selectedSubjectId;
            ids.unitId = selectedUnitId;
        } else if (selectedLevel === "chapter" && selectedExamId && selectedSubjectId && selectedUnitId && selectedChapterId) {
            ids.examId = selectedExamId;
            ids.subjectId = selectedSubjectId;
            ids.unitId = selectedUnitId;
            ids.chapterId = selectedChapterId;
        } else if (selectedLevel === "topic" && selectedExamId && selectedSubjectId && selectedUnitId && selectedChapterId && selectedTopicId) {
            ids.examId = selectedExamId;
            ids.subjectId = selectedSubjectId;
            ids.unitId = selectedUnitId;
            ids.chapterId = selectedChapterId;
            ids.topicId = selectedTopicId;
        } else if (selectedLevel === "subtopic" && selectedExamId && selectedSubjectId && selectedUnitId && selectedChapterId && selectedTopicId && selectedSubTopicId) {
            ids.examId = selectedExamId;
            ids.subjectId = selectedSubjectId;
            ids.unitId = selectedUnitId;
            ids.chapterId = selectedChapterId;
            ids.topicId = selectedTopicId;
            ids.subTopicId = selectedSubTopicId;
        } else if (selectedLevel === "definition" && selectedExamId && selectedSubjectId && selectedUnitId && selectedChapterId && selectedTopicId && selectedSubTopicId && selectedDefinitionId) {
            ids.examId = selectedExamId;
            ids.subjectId = selectedSubjectId;
            ids.unitId = selectedUnitId;
            ids.chapterId = selectedChapterId;
            ids.topicId = selectedTopicId;
            ids.subTopicId = selectedSubTopicId;
            ids.definitionId = selectedDefinitionId;
        }
        return ids;
    };

    // Check if selection is complete
    const isSelectionComplete = useMemo(() => {
        if (!selectedLevel) return false;
        if (selectedLevel === "exam") return !!selectedExamId;
        if (selectedLevel === "subject") return !!selectedExamId && !!selectedSubjectId;
        if (selectedLevel === "unit") return !!selectedExamId && !!selectedSubjectId && !!selectedUnitId;
        if (selectedLevel === "chapter") return !!selectedExamId && !!selectedSubjectId && !!selectedUnitId && !!selectedChapterId;
        if (selectedLevel === "topic") return !!selectedExamId && !!selectedSubjectId && !!selectedUnitId && !!selectedChapterId && !!selectedTopicId;
        if (selectedLevel === "subtopic") return !!selectedExamId && !!selectedSubjectId && !!selectedUnitId && !!selectedChapterId && !!selectedTopicId && !!selectedSubTopicId;
        if (selectedLevel === "definition") return !!selectedExamId && !!selectedSubjectId && !!selectedUnitId && !!selectedChapterId && !!selectedTopicId && !!selectedSubTopicId && !!selectedDefinitionId;
        return false;
    }, [selectedLevel, selectedExamId, selectedSubjectId, selectedUnitId, selectedChapterId, selectedTopicId, selectedSubTopicId, selectedDefinitionId]);

    // Handle file selection and parse for preview
    const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showError("Please upload a CSV file");
      return;
    }

        if (!isSelectionComplete) {
            showError("Please complete the level selection first");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return;
        }

        try {
            const fileText = await file.text();
            const parsedData = parseCSV(fileText);

            // Validate required fields
            if (!parsedData || parsedData.length === 0) {
                showError("CSV file is empty or invalid");
                return;
            }

            // Check for required fields
            const firstRow = parsedData[0];
            if (!firstRow.title || !firstRow.content) {
                showError("CSV must contain 'title' and 'content' columns");
                return;
            }

            setPreviewData(parsedData);
            setSelectedFile(file);
            setShowPreview(true);
            setShowConfirmModal(false);
        } catch (err) {
            console.error("Error parsing CSV:", err);
            showError("Failed to parse CSV file: " + (err.message || "Invalid format"));
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // Handle actual import after confirmation
    const handleConfirmImport = async () => {
        if (!selectedFile) {
            showError("No file selected");
            return;
        }

    setIsImporting(true);
    setImportStats(null);
        setShowConfirmModal(false);

    try {
      const formData = new FormData();
            formData.append("file", selectedFile);
            const selectedIds = getSelectedIds();
            Object.keys(selectedIds).forEach(key => {
                formData.append(key, selectedIds[key]);
            });
            formData.append("level", selectedLevel);

      const response = await api.post("/admin/discussion/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setImportStats(response.data.data);
                const stats = response.data.data;
                const createdMsg = stats.threadsCreated > 0 ? `${stats.threadsCreated} threads created` : "";
                const updatedMsg = stats.threadsUpdated > 0 ? `${stats.threadsUpdated} threads updated` : "";
                const replyCreatedMsg = stats.repliesCreated > 0 ? `${stats.repliesCreated} replies created` : "";
                const replyUpdatedMsg = stats.repliesUpdated > 0 ? `${stats.repliesUpdated} replies updated` : "";

                const messages = [createdMsg, updatedMsg, replyCreatedMsg, replyUpdatedMsg].filter(Boolean);
                success(`Import completed: ${messages.join(", ")}`);
                checkDataExists(); // Refresh data check

                // Clear preview
                setPreviewData(null);
                setSelectedFile(null);
                setShowPreview(false);

                if (stats.errors && stats.errors.length > 0) {
                    console.warn("Import errors:", stats.errors);
        }
      } else {
        showError(response.data.message || "Import failed");
      }
    } catch (err) {
      console.error("Import error:", err);
      showError(err.response?.data?.message || "Failed to import discussions");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

    // Cancel preview
    const handleCancelPreview = () => {
        setPreviewData(null);
        setSelectedFile(null);
        setShowPreview(false);
        setShowConfirmModal(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

  const handleExport = async () => {
        if (!isSelectionComplete) {
            showError("Please complete the level selection first");
            return;
        }

        if (hasData === false) {
            showError("No data available to export. Please import discussions first or download the template.");
            return;
        }

    setIsExporting(true);
    try {
            const selectedIds = getSelectedIds();
            const params = new URLSearchParams();
            Object.keys(selectedIds).forEach(key => {
                params.append(key, selectedIds[key]);
            });
            params.append("level", selectedLevel);

            const response = await api.get(`/admin/discussion/export?${params.toString()}`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
            const levelName = selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1);
            link.download = `discussions_export_${levelName}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      success("Discussions exported successfully");
    } catch (err) {
      console.error("Export error:", err);
      showError(err.response?.data?.message || "Failed to export discussions");
    } finally {
      setIsExporting(false);
    }
  };

    const downloadTemplate = async () => {
        if (!isSelectionComplete) {
            showError("Please complete the level selection first");
            return;
        }

        try {
            const selectedIds = getSelectedIds();
            const params = new URLSearchParams();
            Object.keys(selectedIds).forEach(key => {
                params.append(key, selectedIds[key]);
            });
            params.append("level", selectedLevel);

            const response = await api.get(`/admin/discussion/template?${params.toString()}`);

            if (response.data.success) {
                const csvContent = response.data.data.csvContent;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
                const levelName = selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1);
                link.setAttribute("download", `discussion_import_template_${levelName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
                success("Template downloaded successfully");
            } else {
                showError(response.data.message || "Failed to generate template");
            }
        } catch (err) {
            console.error("Template error:", err);
            showError(err.response?.data?.message || "Failed to download template");
        }
    };

    // Get selected entity name for display
    const getSelectedEntityName = () => {
        if (selectedLevel === "exam" && selectedExamId) {
            const exam = exams.find(e => e._id === selectedExamId);
            return exam?.name || "";
        }
        if (selectedLevel === "subject" && selectedSubjectId) {
            const subject = subjects.find(s => s._id === selectedSubjectId);
            return subject?.name || "";
        }
        if (selectedLevel === "unit" && selectedUnitId) {
            const unit = units.find(u => u._id === selectedUnitId);
            return unit?.name || "";
        }
        if (selectedLevel === "chapter" && selectedChapterId) {
            const chapter = chapters.find(c => c._id === selectedChapterId);
            return chapter?.name || "";
        }
        if (selectedLevel === "topic" && selectedTopicId) {
            const topic = topics.find(t => t._id === selectedTopicId);
            return topic?.name || "";
        }
        if (selectedLevel === "subtopic" && selectedSubTopicId) {
            const subtopic = subTopics.find(st => st._id === selectedSubTopicId);
            return subtopic?.name || "";
        }
        if (selectedLevel === "definition" && selectedDefinitionId) {
            const definition = definitions.find(d => d._id === selectedDefinitionId);
            return definition?.name || "";
        }
        return "";
  };

  return (
        <div className="max-w-full mx-auto p-4 space-y-6 animate-in fade-in duration-500">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 mb-1">
                            Discussion Import/Export
                        </h1>
                        <p className="text-xs text-gray-600">
                            Bulk manage discussion threads and replies across all levels of your educational platform.
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
                            value={selectedLevel}
                            onChange={(e) => handleLevelChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none"
                        >
                            <option value="">Select Level</option>
                            {HIERARCHY_LEVELS.map(level => (
                                <option key={level.value} value={level.value}>{level.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Hierarchy Selection - Always show Exam as it's the root */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Exam</label>
                        <select
                            value={selectedExamId}
                            onChange={(e) => {
                                setSelectedExamId(e.target.value);
                                setSelectedSubjectId("");
                                setSelectedUnitId("");
                                setSelectedChapterId("");
                                setSelectedTopicId("");
                                setSelectedSubTopicId("");
                                setSelectedDefinitionId("");
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-100"
                        >
                            <option value="">Select Exam</option>
                            {exams.map(exam => (
                                <option key={exam._id} value={exam._id}>{exam.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Conditional Selects Based on Level */}
                    {(selectedLevel === "subject" || selectedLevel === "unit" || selectedLevel === "chapter" || selectedLevel === "topic" || selectedLevel === "subtopic" || selectedLevel === "definition") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</label>
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => {
                                    setSelectedSubjectId(e.target.value);
                                    setSelectedUnitId("");
                                    setSelectedChapterId("");
                                    setSelectedTopicId("");
                                    setSelectedSubTopicId("");
                                    setSelectedDefinitionId("");
                                }}
                                disabled={!selectedExamId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select Subject</option>
                                {subjects.map(subject => (
                                    <option key={subject._id} value={subject._id}>{subject.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(selectedLevel === "unit" || selectedLevel === "chapter" || selectedLevel === "topic" || selectedLevel === "subtopic" || selectedLevel === "definition") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit</label>
                            <select
                                value={selectedUnitId}
                                onChange={(e) => {
                                    setSelectedUnitId(e.target.value);
                                    setSelectedChapterId("");
                                    setSelectedTopicId("");
                                    setSelectedSubTopicId("");
                                    setSelectedDefinitionId("");
                                }}
                                disabled={!selectedSubjectId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select Unit</option>
                                {units.map(unit => (
                                    <option key={unit._id} value={unit._id}>{unit.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(selectedLevel === "chapter" || selectedLevel === "topic" || selectedLevel === "subtopic" || selectedLevel === "definition") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Chapter</label>
                            <select
                                value={selectedChapterId}
                                onChange={(e) => {
                                    setSelectedChapterId(e.target.value);
                                    setSelectedTopicId("");
                                    setSelectedSubTopicId("");
                                    setSelectedDefinitionId("");
                                }}
                                disabled={!selectedUnitId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select Chapter</option>
                                {chapters.map(chapter => (
                                    <option key={chapter._id} value={chapter._id}>{chapter.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(selectedLevel === "topic" || selectedLevel === "subtopic" || selectedLevel === "definition") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Topic</label>
                            <select
                                value={selectedTopicId}
                                onChange={(e) => {
                                    setSelectedTopicId(e.target.value);
                                    setSelectedSubTopicId("");
                                    setSelectedDefinitionId("");
                                }}
                                disabled={!selectedChapterId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select Topic</option>
                                {topics.map(topic => (
                                    <option key={topic._id} value={topic._id}>{topic.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(selectedLevel === "subtopic" || selectedLevel === "definition") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">SubTopic</label>
                            <select
                                value={selectedSubTopicId}
                                onChange={(e) => {
                                    setSelectedSubTopicId(e.target.value);
                                    setSelectedDefinitionId("");
                                }}
                                disabled={!selectedTopicId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select SubTopic</option>
                                {subTopics.map(subtopic => (
                                    <option key={subtopic._id} value={subtopic._id}>{subtopic.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedLevel === "definition" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Definition</label>
                            <select
                                value={selectedDefinitionId}
                                onChange={(e) => setSelectedDefinitionId(e.target.value)}
                                disabled={!selectedSubTopicId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50"
                            >
                                <option value="">Select Definition</option>
                                {definitions.map(definition => (
                                    <option key={definition._id} value={definition._id}>{definition.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Data Status Alert */}
                {isSelectionComplete && (
                    <div className="mb-6">
                        {loadingData ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                                <FaSpinner className="animate-spin text-blue-600" />
                                <span className="text-sm text-blue-700">Checking for existing data...</span>
                            </div>
                        ) : hasData === false ? (
                            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <FaExclamationCircle className="text-amber-600 text-2xl" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-amber-900 mb-2">No Data Found</h3>
                                        <p className="text-sm text-amber-800 mb-3">
                                            No discussions found at <strong>{selectedLevel}</strong> level for &ldquo;{getSelectedEntityName()}&rdquo;. 
                                            Download the template to get started with importing discussions.
                                        </p>
                                        <div className="bg-amber-100 border border-amber-200 rounded-lg p-3 mb-4">
                                            <p className="text-xs text-amber-900 font-semibold flex items-center gap-2">
                                                <FaInfoCircle />
                                                <span>The <strong>&ldquo;Export to CSV&rdquo;</strong> button is disabled because there&apos;s no data to export. Import discussions first or download the template to get started.</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={downloadTemplate}
                                            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-md"
                                        >
                                            <FaDownload size={16} />
                                            Download Template
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : hasData === true ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                <FaCheckCircle className="text-green-600 text-xl" />
                                <div>
                                    <p className="text-sm font-semibold text-green-900">
                                        Data exists at {selectedLevel} level for &ldquo;{getSelectedEntityName()}&rdquo;
                                    </p>
                                    <p className="text-xs text-green-700 mt-1">You can export existing data or import new discussions.</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Main Action Buttons */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                    <div className="relative group">
                        <button
                            onClick={handleExport}
                            disabled={isExporting || !isSelectionComplete || hasData === false}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting ? <FaSpinner className="animate-spin" /> : <FaFileExport />}
                            Export to CSV
                        </button>
                        {hasData === false && isSelectionComplete && (
                            <div className="absolute -bottom-8 left-0 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                No data available to export
                            </div>
                        )}
          </div>

            <button
              onClick={downloadTemplate}
                        disabled={!isSelectionComplete}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
                        <FaDownload />
                        Download Template
            </button>

                    <div className="flex items-center gap-2">
              <input
                            type="file"
                ref={fileInputRef}
                            onChange={handleFileSelect}
                accept=".csv"
                className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedFile ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                        >
                            {selectedFile ? selectedFile.name : "Choose CSV File"}
                        </button>

                        <button
                            onClick={() => setShowConfirmModal(true)}
                            disabled={isImporting || !selectedFile || !previewData || previewData.length === 0}
                            className="px-4 py-2 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isImporting ? <FaSpinner className="animate-spin" /> : <FaCloudUploadAlt />}
                            Start Import
                        </button>
                    </div>

                    {previewData && previewData.length > 0 && (
                        <button
                            onClick={handleCancelPreview}
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
            {importStats && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-lg border border-green-200 p-6 shadow-sm"
                    >
                        <div className="flex items-center gap-4 mb-4 text-green-700">
                            <FaCheckCircle className="text-2xl" />
                            <div>
                                <h4 className="text-lg font-bold">Import Completed</h4>
                                <p className="text-sm opacity-80">
                                    {importStats.threadsCreated || 0} threads created, {importStats.threadsUpdated || 0} threads updated
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-green-50 p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-green-700">{importStats.threadsCreated || 0}</div>
                                <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Threads Created</div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-blue-700">{importStats.threadsUpdated || 0}</div>
                                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Threads Updated</div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-purple-700">{(importStats.repliesCreated || 0) + (importStats.repliesUpdated || 0)}</div>
                                <div className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Replies Processed</div>
                            </div>
                        </div>

                  {importStats.errors && importStats.errors.length > 0 && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                <h5 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                                    <FaExclamationCircle /> Errors Found ({importStats.errors.length})
                                </h5>
                                <div className="max-h-40 overflow-y-auto text-xs text-red-600 space-y-1 scrollbar-thin">
                                    {importStats.errors.map((err, i) => (
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

                {previewData && previewData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                    >
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Data Preview ({previewData.length} rows)</h4>
                        </div>
                        <div className="overflow-auto scrollbar-thin">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200">#</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200">Title</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200">Content Preview</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200">Guest</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200">Tags</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap text-center">Has Reply</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {previewData.slice(0, 50).map((row, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-100 align-top">
                                                {idx + 1}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-100 align-top">
                                                <div className="min-w-[180px] max-w-[300px]">
                                                    {row.title || "-"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 border-r border-gray-100 align-top">
                                                <div className="min-w-[200px] max-w-[400px] text-xs leading-relaxed">
                                                    {row.content ? (row.content.length > 100 ? row.content.substring(0, 100) + "..." : row.content) : "-"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 border-r border-gray-100 align-top">
                                                <div className="min-w-[150px] max-w-[200px] text-xs">
                                                    {row.guestname || row.guest_name || "Auto-generated"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 border-r border-gray-100 align-top">
                                                <div className="min-w-[100px] max-w-[150px] text-xs">
                                                    {row.tags || "General"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center align-top">
                                                <div className="flex justify-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold whitespace-nowrap inline-block ${
                                                        row.reply_content
                                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                    }`}>
                                                        {row.reply_content ? "Yes" : "No"}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {previewData.length > 50 && (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-4 text-center text-gray-400 italic bg-gray-50/50 border-t-2 border-gray-200">
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>Showing first 50 of {previewData.length} rows. Click &apos;Start Import&apos; to process all data.</span>
                                                </div>
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
                        <p>Use the dropdowns to drill down to the specific level. Discussions will be imported/exported strictly within the selected parent context (e.g., Threads within the selected Subject).</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-bold text-gray-800 mb-2">2. Data Override</p>
                        <p>The system automatically updates existing discussions if the <strong>Title</strong> matches at the same hierarchy level. This allows you to perform incremental updates without creating duplicates.</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-bold text-gray-800 mb-2">3. Guest Users & Dates</p>
                        <p>Guest names are auto-generated if not provided. Dates are randomly generated within the last week if not specified in the CSV file.</p>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowConfirmModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <FaExclamationCircle className="text-blue-600" size={20} />
          </div>
                                <h3 className="text-lg font-semibold text-gray-900">Confirm Import</h3>
        </div>

                            <div className="mb-6">
                                <p className="text-sm text-gray-700 mb-3">
                                    You are about to import <strong>{previewData?.length || 0} discussion(s)</strong> at the <strong>{selectedLevel}</strong> level.
                                </p>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-xs text-amber-800">
                                        <strong>Important:</strong> If a discussion with the same title already exists at this level, it will be <strong>updated</strong>. Otherwise, a <strong>new</strong> discussion will be created.
                                    </p>
            </div>
          </div>

                            <div className="flex items-center gap-3 justify-end">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
            <button
                                    onClick={handleConfirmImport}
                                    disabled={isImporting}
                                    className="px-4 py-2 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isImporting ? (
                                        <>
                                            <FaSpinner className="animate-spin" />
                                            Importing...
                </>
              ) : (
                <>
                                            <FaCheckCircle size={14} />
                                            Confirm & Import
                </>
              )}
            </button>
            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
    </div>
  );
};

export default DiscussionImportExport;