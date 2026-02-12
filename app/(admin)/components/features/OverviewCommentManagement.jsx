"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUser,
  FaCommentDots,
  FaTrash,
  FaBan,
  FaSearch,
  FaFilter,
  FaTimes,
  FaChevronRight,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";

const LIMIT = 500;

const parseListResponse = (res) => {
  const raw = res?.data?.data;
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  return [];
};

const StatusBadge = ({ status }) => {
  const styles = {
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };
  const icons = {
    approved: <FaCheckCircle className="w-3 h-3" />,
    rejected: <FaTimesCircle className="w-3 h-3" />,
    pending: <FaClock className="w-3 h-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-800"}`}
    >
      {icons[status]}
      {(status || "pending").charAt(0).toUpperCase() + (status || "pending").slice(1)}
    </span>
  );
};

const HIERARCHY_PILL_COLORS = {
  Exam: "bg-emerald-600 text-white",
  Subject: "bg-purple-600 text-white",
  Unit: "bg-blue-600 text-white",
  Chapter: "bg-red-600 text-white",
  Topic: "bg-amber-500 text-white",
  SubTopic: "bg-violet-600 text-white",
  Definition: "bg-gray-700 text-white",
};

const HierarchyPills = ({ path }) => {
  if (!path?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {path.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <FaChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full font-medium whitespace-nowrap max-w-[200px] truncate ${HIERARCHY_PILL_COLORS[item.label] || "bg-gray-500 text-white"}`}
            title={item.name}
          >
            {item.name}
          </span>
        </span>
      ))}
    </div>
  );
};

const OverviewCommentManagement = () => {
  const { toasts, removeToast, success, error: showError } = useToast();
  const { role } = usePermissions();
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const fetchRef = useRef(false);
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  // Hierarchy filter state (deepest selection wins)
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subTopicId, setSubTopicId] = useState("");
  const [definitionId, setDefinitionId] = useState("");

  // Options for dropdowns
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [hierarchyLoading, setHierarchyLoading] = useState({});

  const getEffectiveHierarchyFilter = useCallback(() => {
    if (definitionId) return { entityType: "definition", entityId: definitionId };
    if (subTopicId) return { entityType: "subtopic", entityId: subTopicId };
    if (topicId) return { entityType: "topic", entityId: topicId };
    if (chapterId) return { entityType: "chapter", entityId: chapterId };
    if (unitId) return { entityType: "unit", entityId: unitId };
    if (subjectId) return { entityType: "subject", entityId: subjectId };
    if (examId) return { entityType: "exam", entityId: examId };
    return null;
  }, [examId, subjectId, unitId, chapterId, topicId, subTopicId, definitionId]);

  const fetchComments = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ listAll: "true", status: statusFilter, includeHierarchy: "true" });
      const res = await api.get(`/overview-comment?${params.toString()}`);
      if (res.data?.success) {
        const data = res.data.data || [];
        setComments(data);
        if (statusFilter === "pending" && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("admin-overview-comment-pending-updated", { detail: { count: data.length } }));
        }
      }
    } catch (err) {
      console.error("Error fetching overview comments:", err);
      showErrorRef.current("Failed to fetch comments");
    } finally {
      setIsLoading(false);
      fetchRef.current = false;
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchComments();
  }, [statusFilter]);

  const getAuthorName = (c) => {
    if (c.studentId?.firstName && c.studentId?.lastName) {
      return `${c.studentId.firstName} ${c.studentId.lastName}`;
    }
    return c.studentId?.email || c.name || c.anonymousName || "Anonymous";
  };

  const filteredComments = useMemo(() => {
    let result = [...comments];
    const hierarchy = getEffectiveHierarchyFilter();
    if (hierarchy) {
      result = result.filter(
        (c) =>
          c.entityType === hierarchy.entityType &&
          String(c.entityId) === String(hierarchy.entityId)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const name = (getAuthorName(c) || "").toLowerCase();
        const email = (c.studentId?.email || c.email || c.anonymousEmail || "").toLowerCase();
        const commentText = (c.comment || "").toLowerCase();
        return name.includes(q) || email.includes(q) || commentText.includes(q);
      });
    }
    return result;
  }, [comments, getEffectiveHierarchyFilter, searchQuery]);

  const activeFilterCount =
    (examId ? 1 : 0) +
    (subjectId ? 1 : 0) +
    (unitId ? 1 : 0) +
    (chapterId ? 1 : 0) +
    (topicId ? 1 : 0) +
    (subTopicId ? 1 : 0) +
    (definitionId ? 1 : 0);

  const clearFilters = () => {
    setExamId("");
    setSubjectId("");
    setUnitId("");
    setChapterId("");
    setTopicId("");
    setSubTopicId("");
    setDefinitionId("");
  };

  // Load exams on mount
  useEffect(() => {
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, exam: true }));
    api
      .get(`/exam?status=all&limit=${LIMIT}&page=1`)
      .then((res) => {
        if (!cancelled) setExams(parseListResponse(res));
      })
      .catch(() => {
        if (!cancelled) setExams([]);
      })
      .finally(() => {
        if (!cancelled) setHierarchyLoading((p) => ({ ...p, exam: false }));
      });
    return () => { cancelled = true; };
  }, []);

  // Load subjects when exam selected
  useEffect(() => {
    if (!examId) {
      setSubjects([]);
      setSubjectId("");
      setUnitId("");
      setChapterId("");
      setTopicId("");
      setSubTopicId("");
      setDefinitionId("");
      setUnits([]);
      setChapters([]);
      setTopics([]);
      setSubtopics([]);
      setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, subject: true }));
    setSubjectId("");
    setUnitId("");
    setChapterId("");
    setTopicId("");
    setSubTopicId("");
    setDefinitionId("");
    setUnits([]);
    setChapters([]);
    setTopics([]);
    setSubtopics([]);
    setDefinitions([]);
    api
      .get(`/subject?examId=${examId}&status=all&limit=${LIMIT}&page=1`)
      .then((res) => {
        if (!cancelled) setSubjects(parseListResponse(res));
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      })
      .finally(() => {
        if (!cancelled) setHierarchyLoading((p) => ({ ...p, subject: false }));
      });
    return () => { cancelled = true; };
  }, [examId]);

  // Load units when subject selected
  useEffect(() => {
    if (!subjectId) {
      setUnits([]);
      setUnitId("");
      setChapterId("");
      setTopicId("");
      setSubTopicId("");
      setDefinitionId("");
      setChapters([]);
      setTopics([]);
      setSubtopics([]);
      setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, unit: true }));
    setUnitId("");
    setChapterId("");
    setTopicId("");
    setSubTopicId("");
    setDefinitionId("");
    setChapters([]);
    setTopics([]);
    setSubtopics([]);
    setDefinitions([]);
    api
      .get(`/unit?subjectId=${subjectId}&status=all&limit=${LIMIT}&page=1`)
      .then((res) => {
        if (!cancelled) setUnits(parseListResponse(res));
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      })
      .finally(() => {
        if (!cancelled) setHierarchyLoading((p) => ({ ...p, unit: false }));
      });
    return () => { cancelled = true; };
  }, [subjectId]);

  // Load chapters when unit selected
  useEffect(() => {
    if (!unitId) {
      setChapters([]);
      setChapterId("");
      setTopicId("");
      setSubTopicId("");
      setDefinitionId("");
      setTopics([]);
      setSubtopics([]);
      setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, chapter: true }));
    setChapterId("");
    setTopicId("");
    setSubTopicId("");
    setDefinitionId("");
    setTopics([]);
    setSubtopics([]);
    setDefinitions([]);
    api
      .get(`/chapter?unitId=${unitId}&status=all&limit=${LIMIT}&page=1`)
      .then((res) => {
        if (!cancelled) setChapters(parseListResponse(res));
      })
      .catch(() => {
        if (!cancelled) setChapters([]);
      })
      .finally(() => {
        if (!cancelled) setHierarchyLoading((p) => ({ ...p, chapter: false }));
      });
    return () => { cancelled = true; };
  }, [unitId]);

  // Load topics when chapter selected
  useEffect(() => {
    if (!chapterId) {
      setTopics([]);
      setTopicId("");
      setSubTopicId("");
      setDefinitionId("");
      setSubtopics([]);
      setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, topic: true }));
    setTopicId("");
    setSubTopicId("");
    setDefinitionId("");
    setSubtopics([]);
    setDefinitions([]);
    api
      .get(`/topic?chapterId=${chapterId}&status=all&limit=${LIMIT}&page=1`)
      .then((res) => {
        if (!cancelled) setTopics(parseListResponse(res));
      })
      .catch(() => {
        if (!cancelled) setTopics([]);
      })
      .finally(() => {
        if (!cancelled) setHierarchyLoading((p) => ({ ...p, topic: false }));
      });
    return () => { cancelled = true; };
  }, [chapterId]);

  // Load subtopics when topic selected
  useEffect(() => {
    if (!topicId) {
      setSubtopics([]);
      setSubTopicId("");
      setDefinitionId("");
      setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, subtopic: true }));
    setSubTopicId("");
    setDefinitionId("");
    setDefinitions([]);
    api
      .get(`/subtopic?topicId=${topicId}&status=all&limit=${LIMIT}&page=1`)
      .then((res) => {
        if (!cancelled) setSubtopics(parseListResponse(res));
      })
      .catch(() => {
        if (!cancelled) setSubtopics([]);
      })
      .finally(() => {
        if (!cancelled) setHierarchyLoading((p) => ({ ...p, subtopic: false }));
      });
    return () => { cancelled = true; };
  }, [topicId]);

  // Load definitions when subtopic selected
  useEffect(() => {
    if (!subTopicId) {
      setDefinitions([]);
      setDefinitionId("");
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, definition: true }));
    setDefinitionId("");
    api
      .get(`/definition?subTopicId=${subTopicId}&status=all&limit=${LIMIT}&page=1`)
      .then((res) => {
        if (!cancelled) setDefinitions(parseListResponse(res));
      })
      .catch(() => {
        if (!cancelled) setDefinitions([]);
      })
      .finally(() => {
        if (!cancelled) setHierarchyLoading((p) => ({ ...p, definition: false }));
      });
    return () => { cancelled = true; };
  }, [subTopicId]);

  const handleStatusChange = async (comment, newStatus) => {
    try {
      const res = await api.put(`/overview-comment/${comment._id}`, { status: newStatus });
      if (res.data?.success) {
        success(`Comment ${newStatus} successfully`);
        fetchComments();
        if (typeof window !== "undefined") {
          const wasPending = comment.status === "pending";
          const nowPending = newStatus === "pending";
          if (wasPending && !nowPending) {
            window.dispatchEvent(new CustomEvent("admin-overview-comment-pending-updated", { detail: { delta: -1 } }));
          } else if (!wasPending && nowPending) {
            window.dispatchEvent(new CustomEvent("admin-overview-comment-pending-updated", { detail: { delta: 1 } }));
          }
        }
      } else {
        showError(res.data?.message || "Failed to update");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to update comment");
    }
  };

  const handleDelete = async (comment) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    try {
      const res = await api.delete(`/overview-comment/${comment._id}`);
      if (res.data?.success) {
        success("Comment deleted");
        fetchComments();
        if (comment.status === "pending" && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("admin-overview-comment-pending-updated", { detail: { delta: -1 } }));
        }
      } else {
        showError(res.data?.message || "Failed to delete");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to delete comment");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Page header + toolbar */}
            <div className="px-5 py-5 sm:px-6 sm:py-6 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white">
              <div className="flex flex-col gap-5">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600">
                      <FaCommentDots className="w-5 h-5" />
                    </span>
                    Overview Comment Management
                  </h1>
                  <p className="text-sm text-gray-500 mt-2 max-w-2xl">
                    Approve, unapprove, or delete comments from Overview tabs. Use search and filters to find comments by author, email, or hierarchy.
                  </p>
                </div>
                {/* Search + Status + Filters toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="relative flex-1 sm:max-w-xs">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by author, email or comment..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="min-w-[120px] px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                      >
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${showFilters
                        ? "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
                        : "bg-white text-gray-700 border border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50"
                        }`}
                    >
                      <FaFilter className="w-4 h-4 shrink-0" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-xs font-semibold ${showFilters ? "bg-white text-indigo-600" : "bg-indigo-100 text-indigo-700"}`}>
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {showFilters && (
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Filter by Exam</label>
                    <select
                      value={examId}
                      onChange={(e) => {
                        setExamId(e.target.value);
                        setSubjectId("");
                        setUnitId("");
                        setChapterId("");
                        setTopicId("");
                        setSubTopicId("");
                        setDefinitionId("");
                      }}
                      disabled={hierarchyLoading.exam}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-60"
                    >
                      <option value="">All Exams</option>
                      {exams.map((e) => (
                        <option key={e._id} value={e._id}>{e.name || e.title || String(e._id).slice(-6)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Filter by Subject</label>
                    <select
                      value={subjectId}
                      onChange={(e) => {
                        setSubjectId(e.target.value);
                        setUnitId("");
                        setChapterId("");
                        setTopicId("");
                        setSubTopicId("");
                        setDefinitionId("");
                      }}
                      disabled={!examId || hierarchyLoading.subject}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">{examId ? "Select Exam First" : "All Subjects"}</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>{s.name || s.title || String(s._id).slice(-6)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Filter by Unit</label>
                    <select
                      value={unitId}
                      onChange={(e) => {
                        setUnitId(e.target.value);
                        setChapterId("");
                        setTopicId("");
                        setSubTopicId("");
                        setDefinitionId("");
                      }}
                      disabled={!subjectId || hierarchyLoading.unit}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">{subjectId ? "Select Subject First" : "All Units"}</option>
                      {units.map((u) => (
                        <option key={u._id} value={u._id}>{u.name || u.title || String(u._id).slice(-6)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Filter by Chapter</label>
                    <select
                      value={chapterId}
                      onChange={(e) => {
                        setChapterId(e.target.value);
                        setTopicId("");
                        setSubTopicId("");
                        setDefinitionId("");
                      }}
                      disabled={!unitId || hierarchyLoading.chapter}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">{unitId ? "Select Unit First" : "All Chapters"}</option>
                      {chapters.map((c) => (
                        <option key={c._id} value={c._id}>{c.name || c.title || String(c._id).slice(-6)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Filter by Topic</label>
                    <select
                      value={topicId}
                      onChange={(e) => {
                        setTopicId(e.target.value);
                        setSubTopicId("");
                        setDefinitionId("");
                      }}
                      disabled={!chapterId || hierarchyLoading.topic}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">{chapterId ? "Select Chapter First" : "All Topics"}</option>
                      {topics.map((t) => (
                        <option key={t._id} value={t._id}>{t.name || t.title || String(t._id).slice(-6)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Filter by SubTopic</label>
                    <select
                      value={subTopicId}
                      onChange={(e) => {
                        setSubTopicId(e.target.value);
                        setDefinitionId("");
                      }}
                      disabled={!topicId || hierarchyLoading.subtopic}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">{topicId ? "Select Topic First" : "All SubTopics"}</option>
                      {subtopics.map((s) => (
                        <option key={s._id} value={s._id}>{s.name || s.title || String(s._id).slice(-6)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Filter by Definition</label>
                    <select
                      value={definitionId}
                      onChange={(e) => setDefinitionId(e.target.value)}
                      disabled={!subTopicId || hierarchyLoading.definition}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">{subTopicId ? "Select SubTopic First" : "All Definitions"}</option>
                      {definitions.map((d) => (
                        <option key={d._id} value={d._id}>{d.name || d.title || d.term || String(d._id).slice(-6)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                    <span className="text-xs font-semibold text-gray-600">Active Filters:</span>
                    {examId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Exam: {exams.find((e) => String(e._id) === String(examId))?.name || exams.find((e) => String(e._id) === String(examId))?.title || "—"}
                        <button type="button" onClick={() => { setExamId(""); setSubjectId(""); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><FaTimes className="w-3 h-3" /></button>
                      </span>
                    )}
                    {subjectId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Subject: {subjects.find((s) => String(s._id) === String(subjectId))?.name || subjects.find((s) => String(s._id) === String(subjectId))?.title || "—"}
                        <button type="button" onClick={() => { setSubjectId(""); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><FaTimes className="w-3 h-3" /></button>
                      </span>
                    )}
                    {unitId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Unit: {units.find((u) => String(u._id) === String(unitId))?.name || units.find((u) => String(u._id) === String(unitId))?.title || "—"}
                        <button type="button" onClick={() => { setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><FaTimes className="w-3 h-3" /></button>
                      </span>
                    )}
                    {chapterId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Chapter: {chapters.find((c) => String(c._id) === String(chapterId))?.name || chapters.find((c) => String(c._id) === String(chapterId))?.title || "—"}
                        <button type="button" onClick={() => { setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><FaTimes className="w-3 h-3" /></button>
                      </span>
                    )}
                    {topicId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Topic: {topics.find((t) => String(t._id) === String(topicId))?.name || topics.find((t) => String(t._id) === String(topicId))?.title || "—"}
                        <button type="button" onClick={() => { setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><FaTimes className="w-3 h-3" /></button>
                      </span>
                    )}
                    {subTopicId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        SubTopic: {subtopics.find((s) => String(s._id) === String(subTopicId))?.name || subtopics.find((s) => String(s._id) === String(subTopicId))?.title || "—"}
                        <button type="button" onClick={() => { setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><FaTimes className="w-3 h-3" /></button>
                      </span>
                    )}
                    {definitionId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Definition: {definitions.find((d) => String(d._id) === String(definitionId))?.name || definitions.find((d) => String(d._id) === String(definitionId))?.title || definitions.find((d) => String(d._id) === String(definitionId))?.term || "—"}
                        <button type="button" onClick={() => setDefinitionId("")} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><FaTimes className="w-3 h-3" /></button>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="ml-auto px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-xs font-medium transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                <FaCommentDots className="text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Comments ({filteredComments.length})</h2>
              </div>

              <div>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size="medium" />
                  </div>
                ) : filteredComments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No comments found for the selected filters.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredComments.map((comment) => (
                      <div key={comment._id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                  <FaUser className="text-indigo-600 text-xs" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {getAuthorName(comment)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {comment.studentId?.email || comment.email || comment.anonymousEmail || "—"}
                                    {!comment.studentId && (comment.name || comment.anonymousName) && (
                                      <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                                        Guest
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <StatusBadge status={comment.status} />
                            </div>
                            {comment.hierarchyPath?.length > 0 && (
                              <div className="mb-2">
                                <HierarchyPills path={comment.hierarchyPath} />
                              </div>
                            )}
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">
                              {comment.comment}
                            </p>
                            <p className="text-xs text-gray-400">{formatDate(comment.createdAt)}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {comment.status !== "approved" && (
                              <PermissionButton
                                action="edit"
                                onClick={() => handleStatusChange(comment._id, "approved")}
                                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                title={getPermissionMessage("edit", role)}
                              >
                                <FaCheckCircle className="w-4 h-4" />
                              </PermissionButton>
                            )}
                            {comment.status === "approved" && (
                              <PermissionButton
                                action="edit"
                                onClick={() => handleStatusChange(comment, "pending")}
                                className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                                title="Unapprove (set to Pending)"
                              >
                                <FaBan className="w-4 h-4" />
                              </PermissionButton>
                            )}
                            {comment.status !== "rejected" && (
                              <PermissionButton
                                action="edit"
                                onClick={() => handleStatusChange(comment, "rejected")}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title="Reject"
                              >
                                <FaTimesCircle className="w-4 h-4" />
                              </PermissionButton>
                            )}
                            <PermissionButton
                              action="delete"
                              onClick={() => handleDelete(comment)}
                              className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                              title={getPermissionMessage("delete", role)}
                            >
                              <FaTrash className="w-4 h-4" />
                            </PermissionButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OverviewCommentManagement;
