"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FaBell,
  FaSearch,
  FaFilter,
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronRight,
  FaTimes,
  FaCommentDots,
  FaTrophy,
  FaFileAlt,
  FaInfoCircle,
  FaBullhorn,
  FaEye,
  FaPowerOff,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import RichTextEditor from "../ui/RichTextEditor";
import api from "@/lib/api";

const LIMIT = 500;

import { config } from "@/config/config";

/** Frontend base URL for View links. Prefer NEXT_PUBLIC_SITE_URL in production so links use your domain, not localhost. */
const getFrontendBaseUrl = () => {
  if (config.siteUrl) return config.siteUrl.replace(/\/$/, "");
  const base = (config.baseUrl || "").replace(/\/api\/?$/, "");
  if (base) return base;
  const path = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
  return typeof window !== "undefined" ? `${window.location.origin}${path}` : "";
};

const parseListResponse = (res) => {
  const d = res?.data?.data;
  if (Array.isArray(d)) return d;
  if (d?.data && Array.isArray(d.data)) return d.data;
  return [];
};

const ENTITY_LABELS = {
  general: "General (every exam and all their children)",
  exam: "Exam (this exam page only)",
  exam_with_children: "Exam (this exam + all its children pages)",
  subject: "Subject",
  unit: "Unit",
  chapter: "Chapter",
  topic: "Topic",
  subtopic: "SubTopic",
  definition: "Definition",
};

const ICON_OPTIONS = [
  { value: "comment", label: "Comment", Icon: FaCommentDots },
  { value: "trophy", label: "Trophy", Icon: FaTrophy },
  { value: "document", label: "Document", Icon: FaFileAlt },
  { value: "info", label: "Info", Icon: FaInfoCircle },
  { value: "announcement", label: "Announcement", Icon: FaBullhorn },
];

const HIERARCHY_PILL_COLORS = {
  General: "bg-slate-600 text-white",
  Exam: "bg-emerald-600 text-white",
  "Exam (and children)": "bg-emerald-700 text-white",
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
          {i > 0 && <span className="text-gray-400 font-normal"> &gt; </span>}
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

/** Path as table heading: pills + count pill (e.g. "2 Notifications") */
const PathHeadingWithCount = ({ path, count }) => {
  const pillClass = (label) => HIERARCHY_PILL_COLORS[label] || "bg-gray-500 text-white";
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
      {path?.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-400"> &gt; </span>}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-white whitespace-nowrap max-w-[220px] truncate ${pillClass(item.label)}`}
            title={item.name}
          >
            {item.name}
          </span>
        </span>
      ))}
      {path?.length > 0 && <span className="text-gray-400"> &gt; </span>}
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-700 text-white whitespace-nowrap"
        title={`${count} notification(s) at this level`}
      >
        {count} {count === 1 ? "Notification" : "Notifications"}
      </span>
    </div>
  );
};

const stripHtmlPreview = (html, maxLen = 80) => {
  if (!html || typeof html !== "string") return "—";
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "—";
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
};

const NotificationManagement = () => {
  const { toasts, removeToast, success, error: showError } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const fetchRef = useRef(false);

  const [filterLevel, setFilterLevel] = useState("all"); // "all" | "general" | "hierarchy"
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subTopicId, setSubTopicId] = useState("");
  const [definitionId, setDefinitionId] = useState("");

  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [hierarchyLoading, setHierarchyLoading] = useState({});

  const formSectionRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingNotification, setEditingNotification] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formEntityType, setFormEntityType] = useState("exam");
  const [formEntityId, setFormEntityId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formStripMessage, setFormStripMessage] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formLinkLabel, setFormLinkLabel] = useState("View");
  const [formSlug, setFormSlug] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formIconType, setFormIconType] = useState("announcement");
  const [formEndDate, setFormEndDate] = useState(""); // ISO date string or empty; after this date notification hides from header but stays on landing page
  // Create form: cascading hierarchy
  const [formExamId, setFormExamId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formUnitId, setFormUnitId] = useState("");
  const [formChapterId, setFormChapterId] = useState("");
  const [formTopicId, setFormTopicId] = useState("");
  const [formSubTopicId, setFormSubTopicId] = useState("");
  const [formDefinitionId, setFormDefinitionId] = useState("");
  const [formExams, setFormExams] = useState([]);
  const [formSubjects, setFormSubjects] = useState([]);
  const [formUnits, setFormUnits] = useState([]);
  const [formChapters, setFormChapters] = useState([]);
  const [formTopics, setFormTopics] = useState([]);
  const [formSubtopics, setFormSubtopics] = useState([]);
  const [formDefinitions, setFormDefinitions] = useState([]);
  const [formHierarchyLoading, setFormHierarchyLoading] = useState({});

  const getEffectiveHierarchy = useCallback(() => {
    if (filterLevel === "general") return { entityType: "general" };
    if (filterLevel !== "hierarchy") return null;
    if (definitionId) return { entityType: "definition", entityId: definitionId };
    if (subTopicId) return { entityType: "subtopic", entityId: subTopicId };
    if (topicId) return { entityType: "topic", entityId: topicId };
    if (chapterId) return { entityType: "chapter", entityId: chapterId };
    if (unitId) return { entityType: "unit", entityId: unitId };
    if (subjectId) return { entityType: "subject", entityId: subjectId };
    if (examId) return { entityType: "exam", entityId: examId };
    return null;
  }, [filterLevel, examId, subjectId, unitId, chapterId, topicId, subTopicId, definitionId]);

  const fetchNotifications = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ status: statusFilter, limit: LIMIT, page: 1 });
      const hierarchy = getEffectiveHierarchy();
      if (hierarchy) {
        params.set("entityType", hierarchy.entityType);
        if (hierarchy.entityId) params.set("entityId", hierarchy.entityId);
      }
      const res = await api.get(`/notification?${params.toString()}`);
      const payload = res?.data?.data;
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (payload && Array.isArray(payload.data)) list = payload.data;
      else if (payload && payload.data && Array.isArray(payload.data)) list = payload.data;
      setNotifications(list);
    } catch (err) {
      console.error(err);
      showError("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
      fetchRef.current = false;
    }
  }, [statusFilter, getEffectiveHierarchy, showError]);

  useEffect(() => {
    fetchNotifications();
  }, [statusFilter, getEffectiveHierarchy]);

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          (n.message || "").toLowerCase().includes(q) ||
          (n.stripMessage || "").toLowerCase().includes(q) ||
          (n.slug || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [notifications, searchQuery]);

  // Group by level path so each path has its own table (like Definition Management)
  const groupedByPath = useMemo(() => {
    if (!filteredNotifications?.length) return [];
    const map = new Map();
    filteredNotifications.forEach((n) => {
      const path = n.hierarchyPath || [];
      const key = path.map((p) => `${p.label || ""}:${p.name || ""}`).join("|") || `no-path-${n.entityType}-${n.entityId}`;
      if (!map.has(key)) {
        map.set(key, { path, notifications: [] });
      }
      map.get(key).notifications.push(n);
    });
    return Array.from(map.values()).sort((a, b) => {
      const aStr = a.path.map((p) => p.name).join(" ");
      const bStr = b.path.map((p) => p.name).join(" ");
      return aStr.localeCompare(bStr);
    });
  }, [filteredNotifications]);

  const hasContent = (n) => (n.message && n.message.trim()) || (n.stripMessage && n.stripMessage.trim());
  const contentDate = (n) => {
    if (!hasContent(n)) return null;
    const d = n.updatedAt || n.createdAt;
    return d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : null;
  };

  const activeFilterCount =
    (filterLevel !== "all" ? 1 : 0) +
    (examId ? 1 : 0) +
    (subjectId ? 1 : 0) +
    (unitId ? 1 : 0) +
    (chapterId ? 1 : 0) +
    (topicId ? 1 : 0) +
    (subTopicId ? 1 : 0) +
    (definitionId ? 1 : 0);

  const clearFilters = () => {
    setFilterLevel("all");
    setExamId("");
    setSubjectId("");
    setUnitId("");
    setChapterId("");
    setTopicId("");
    setSubTopicId("");
    setDefinitionId("");
  };

  useEffect(() => {
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, exam: true }));
    api.get(`/exam?status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setExams(parseListResponse(res));
    }).catch(() => { if (!cancelled) setExams([]); }).finally(() => {
      if (!cancelled) setHierarchyLoading((p) => ({ ...p, exam: false }));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!examId) {
      setSubjects([]); setSubjectId(""); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId("");
      setUnits([]); setChapters([]); setTopics([]); setSubtopics([]); setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, subject: true }));
    setSubjectId(""); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId("");
    setUnits([]); setChapters([]); setTopics([]); setSubtopics([]); setDefinitions([]);
    api.get(`/subject?examId=${examId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setSubjects(parseListResponse(res));
    }).catch(() => { if (!cancelled) setSubjects([]); }).finally(() => {
      if (!cancelled) setHierarchyLoading((p) => ({ ...p, subject: false }));
    });
    return () => { cancelled = true; };
  }, [examId]);

  useEffect(() => {
    if (!subjectId) {
      setUnits([]); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId("");
      setChapters([]); setTopics([]); setSubtopics([]); setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, unit: true }));
    setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId("");
    setChapters([]); setTopics([]); setSubtopics([]); setDefinitions([]);
    api.get(`/unit?subjectId=${subjectId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setUnits(parseListResponse(res));
    }).catch(() => { if (!cancelled) setUnits([]); }).finally(() => {
      if (!cancelled) setHierarchyLoading((p) => ({ ...p, unit: false }));
    });
    return () => { cancelled = true; };
  }, [subjectId]);

  useEffect(() => {
    if (!unitId) {
      setChapters([]); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId("");
      setTopics([]); setSubtopics([]); setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, chapter: true }));
    setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId("");
    setTopics([]); setSubtopics([]); setDefinitions([]);
    api.get(`/chapter?unitId=${unitId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setChapters(parseListResponse(res));
    }).catch(() => { if (!cancelled) setChapters([]); }).finally(() => {
      if (!cancelled) setHierarchyLoading((p) => ({ ...p, chapter: false }));
    });
    return () => { cancelled = true; };
  }, [unitId]);

  useEffect(() => {
    if (!chapterId) {
      setTopics([]); setTopicId(""); setSubTopicId(""); setDefinitionId("");
      setSubtopics([]); setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, topic: true }));
    setTopicId(""); setSubTopicId(""); setDefinitionId("");
    setSubtopics([]); setDefinitions([]);
    api.get(`/topic?chapterId=${chapterId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setTopics(parseListResponse(res));
    }).catch(() => { if (!cancelled) setTopics([]); }).finally(() => {
      if (!cancelled) setHierarchyLoading((p) => ({ ...p, topic: false }));
    });
    return () => { cancelled = true; };
  }, [chapterId]);

  useEffect(() => {
    if (!topicId) {
      setSubtopics([]); setSubTopicId(""); setDefinitionId(""); setDefinitions([]);
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, subtopic: true }));
    setSubTopicId(""); setDefinitionId(""); setDefinitions([]);
    api.get(`/subtopic?topicId=${topicId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setSubtopics(parseListResponse(res));
    }).catch(() => { if (!cancelled) setSubtopics([]); }).finally(() => {
      if (!cancelled) setHierarchyLoading((p) => ({ ...p, subtopic: false }));
    });
    return () => { cancelled = true; };
  }, [topicId]);

  useEffect(() => {
    if (!subTopicId) {
      setDefinitions([]); setDefinitionId("");
      return;
    }
    let cancelled = false;
    setHierarchyLoading((p) => ({ ...p, definition: true }));
    setDefinitionId("");
    api.get(`/definition?subTopicId=${subTopicId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setDefinitions(parseListResponse(res));
    }).catch(() => { if (!cancelled) setDefinitions([]); }).finally(() => {
      if (!cancelled) setHierarchyLoading((p) => ({ ...p, definition: false }));
    });
    return () => { cancelled = true; };
  }, [subTopicId]);

  // Create form: load hierarchy options when modal is open (create mode)
  useEffect(() => {
    if (!showForm || editingId) return;
    let cancelled = false;
    setFormHierarchyLoading((p) => ({ ...p, exam: true }));
    api.get(`/exam?status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setFormExams(parseListResponse(res));
    }).catch(() => { if (!cancelled) setFormExams([]); }).finally(() => {
      if (!cancelled) setFormHierarchyLoading((p) => ({ ...p, exam: false }));
    });
    return () => { cancelled = true; };
  }, [showForm, editingId]);

  useEffect(() => {
    if (!showForm || editingId || !formExamId) {
      if (!showForm || editingId) setFormSubjects([]);
      return;
    }
    let cancelled = false;
    setFormHierarchyLoading((p) => ({ ...p, subject: true }));
    setFormSubjectId(""); setFormUnitId(""); setFormChapterId(""); setFormTopicId(""); setFormSubTopicId(""); setFormDefinitionId("");
    setFormUnits([]); setFormChapters([]); setFormTopics([]); setFormSubtopics([]); setFormDefinitions([]);
    api.get(`/subject?examId=${formExamId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setFormSubjects(parseListResponse(res));
    }).catch(() => { if (!cancelled) setFormSubjects([]); }).finally(() => {
      if (!cancelled) setFormHierarchyLoading((p) => ({ ...p, subject: false }));
    });
    return () => { cancelled = true; };
  }, [showForm, editingId, formExamId]);

  useEffect(() => {
    if (!showForm || editingId || !formSubjectId) {
      if (!showForm || editingId) setFormUnits([]);
      return;
    }
    let cancelled = false;
    setFormHierarchyLoading((p) => ({ ...p, unit: true }));
    setFormUnitId(""); setFormChapterId(""); setFormTopicId(""); setFormSubTopicId(""); setFormDefinitionId("");
    setFormChapters([]); setFormTopics([]); setFormSubtopics([]); setFormDefinitions([]);
    api.get(`/unit?subjectId=${formSubjectId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setFormUnits(parseListResponse(res));
    }).catch(() => { if (!cancelled) setFormUnits([]); }).finally(() => {
      if (!cancelled) setFormHierarchyLoading((p) => ({ ...p, unit: false }));
    });
    return () => { cancelled = true; };
  }, [showForm, editingId, formSubjectId]);

  useEffect(() => {
    if (!showForm || editingId || !formUnitId) {
      if (!showForm || editingId) setFormChapters([]);
      return;
    }
    let cancelled = false;
    setFormHierarchyLoading((p) => ({ ...p, chapter: true }));
    setFormChapterId(""); setFormTopicId(""); setFormSubTopicId(""); setFormDefinitionId("");
    setFormTopics([]); setFormSubtopics([]); setFormDefinitions([]);
    api.get(`/chapter?unitId=${formUnitId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setFormChapters(parseListResponse(res));
    }).catch(() => { if (!cancelled) setFormChapters([]); }).finally(() => {
      if (!cancelled) setFormHierarchyLoading((p) => ({ ...p, chapter: false }));
    });
    return () => { cancelled = true; };
  }, [showForm, editingId, formUnitId]);

  useEffect(() => {
    if (!showForm || editingId || !formChapterId) {
      if (!showForm || editingId) setFormTopics([]);
      return;
    }
    let cancelled = false;
    setFormHierarchyLoading((p) => ({ ...p, topic: true }));
    setFormTopicId(""); setFormSubTopicId(""); setFormDefinitionId("");
    setFormSubtopics([]); setFormDefinitions([]);
    api.get(`/topic?chapterId=${formChapterId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setFormTopics(parseListResponse(res));
    }).catch(() => { if (!cancelled) setFormTopics([]); }).finally(() => {
      if (!cancelled) setFormHierarchyLoading((p) => ({ ...p, topic: false }));
    });
    return () => { cancelled = true; };
  }, [showForm, editingId, formChapterId]);

  useEffect(() => {
    if (!showForm || editingId || !formTopicId) {
      if (!showForm || editingId) setFormSubtopics([]);
      return;
    }
    let cancelled = false;
    setFormHierarchyLoading((p) => ({ ...p, subtopic: true }));
    setFormSubTopicId(""); setFormDefinitionId(""); setFormDefinitions([]);
    api.get(`/subtopic?topicId=${formTopicId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setFormSubtopics(parseListResponse(res));
    }).catch(() => { if (!cancelled) setFormSubtopics([]); }).finally(() => {
      if (!cancelled) setFormHierarchyLoading((p) => ({ ...p, subtopic: false }));
    });
    return () => { cancelled = true; };
  }, [showForm, editingId, formTopicId]);

  useEffect(() => {
    if (!showForm || editingId || !formSubTopicId) {
      if (!showForm || editingId) setFormDefinitions([]);
      return;
    }
    let cancelled = false;
    setFormHierarchyLoading((p) => ({ ...p, definition: true }));
    setFormDefinitionId("");
    api.get(`/definition?subTopicId=${formSubTopicId}&status=all&limit=${LIMIT}&page=1`).then((res) => {
      if (!cancelled) setFormDefinitions(parseListResponse(res));
    }).catch(() => { if (!cancelled) setFormDefinitions([]); }).finally(() => {
      if (!cancelled) setFormHierarchyLoading((p) => ({ ...p, definition: false }));
    });
    return () => { cancelled = true; };
  }, [showForm, editingId, formSubTopicId]);

  const getFormEntityId = () => {
    if (formEntityType === "general") return null;
    if (editingId) return formEntityId;
    if (formEntityType === "definition") return formDefinitionId;
    if (formEntityType === "subtopic") return formSubTopicId;
    if (formEntityType === "topic") return formTopicId;
    if (formEntityType === "chapter") return formChapterId;
    if (formEntityType === "unit") return formUnitId;
    if (formEntityType === "subject") return formSubjectId;
    if (formEntityType === "exam" || formEntityType === "exam_with_children") return formExamId;
    return formEntityId;
  };

  const openCreate = () => {
    setEditingId(null);
    setEditingNotification(null);
    setFormEntityType("exam");
    setFormEntityId("");
    setFormExamId("");
    setFormSubjectId("");
    setFormUnitId("");
    setFormChapterId("");
    setFormTopicId("");
    setFormSubTopicId("");
    setFormDefinitionId("");
    setFormExams([]);
    setFormSubjects([]);
    setFormUnits([]);
    setFormChapters([]);
    setFormTopics([]);
    setFormSubtopics([]);
    setFormDefinitions([]);
    setFormTitle("");
    setFormMessage("");
    setFormStripMessage("");
    setFormLink("");
    setFormLinkLabel("View");
    setFormSlug("");
    setFormStatus("active");
    setFormIconType("announcement");
    setFormEndDate("");
    setShowForm(true);
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openEdit = (n) => {
    setEditingId(n._id);
    setEditingNotification(n);
    setFormEntityType(n.entityType || "exam");
    const eid = n.entityType === "general" ? "" : (n.entityId?._id ? n.entityId._id : n.entityId);
    setFormEntityId(eid);
    if (n.entityType === "exam" || n.entityType === "exam_with_children") {
      setFormExamId(eid || "");
    } else {
      setFormExamId("");
    }
    setFormSubjectId("");
    setFormUnitId("");
    setFormChapterId("");
    setFormTopicId("");
    setFormSubTopicId("");
    setFormDefinitionId("");
    setFormTitle(n.title || "");
    setFormMessage(n.message || "");
    setFormStripMessage(n.stripMessage || "");
    setFormLink(n.link || "");
    setFormLinkLabel(n.linkLabel || "View");
    setFormSlug(n.slug || "");
    setFormStatus(n.status || "active");
    setFormIconType(n.iconType || "announcement");
    setFormEndDate(n.endDate ? new Date(n.endDate).toISOString().slice(0, 16) : "");
    setShowForm(true);
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const saveForm = async () => {
    const entityId = getFormEntityId();
    if (formEntityType !== "general" && !entityId) {
      showError("Please select the full hierarchy for the chosen level (e.g. for Exam: select Exam; for Topic: select Exam → Subject → Unit → Chapter → Topic).");
      return;
    }
    if (!formTitle.trim()) {
      showError("Title is required.");
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        entityType: formEntityType,
        entityId: formEntityType === "general" ? null : entityId,
        title: formTitle.trim(),
        message: formMessage.trim(),
        stripMessage: formStripMessage.trim(),
        link: formLink.trim(),
        linkLabel: formLinkLabel.trim() || "View",
        slug: formSlug.trim() || undefined,
        status: formStatus,
        iconType: formIconType,
        endDate: formEndDate.trim() ? formEndDate.trim() : null,
      };
      if (editingId) {
        await api.put(`/notification/${editingId}`, payload);
        success("Notification updated");
      } else {
        await api.post("/notification", payload);
        success("Notification created");
      }
      setShowForm(false);
      fetchNotifications();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save notification");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification? It will no longer show on the site.")) return;
    try {
      await api.delete(`/notification/${id}`);
      success("Notification deleted");
      fetchNotifications();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to delete");
    }
  };

  const handleToggleStatus = async (n) => {
    const next = n.status === "active" ? "inactive" : "active";
    try {
      await api.put(`/notification/${n._id}`, {
        title: n.title,
        message: n.message ?? "",
        stripMessage: n.stripMessage ?? "",
        link: n.link ?? "",
        linkLabel: n.linkLabel ?? "View",
        slug: n.slug,
        status: next,
        iconType: n.iconType ?? "announcement",
        entityType: n.entityType,
        entityId: n.entityType === "general" ? null : (n.entityId?._id || n.entityId),
        endDate: n.endDate ?? null,
      });
      success(`Notification ${next === "active" ? "activated" : "deactivated"}`);
      fetchNotifications();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to update status");
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <>
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {showForm && (
          <div ref={formSectionRef} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-b from-indigo-50/60 to-white">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? "Edit Notification" : "Create Notification"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close form"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {editingId ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Target (read-only)</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <HierarchyPills path={editingNotification?.hierarchyPath} />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Level (where this notification will show)</label>
                    <select
                      value={formEntityType}
                      onChange={(e) => {
                        setFormEntityType(e.target.value);
                        setFormExamId(""); setFormSubjectId(""); setFormUnitId(""); setFormChapterId(""); setFormTopicId(""); setFormSubTopicId(""); setFormDefinitionId("");
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    {formEntityType === "general" ? (
                      <p className="text-xs text-gray-500 mt-1.5">Shows on every page: all exams (NEET, JEE, SAT, etc.) and all their children pages.</p>
                    ) : formEntityType === "exam" ? (
                      <p className="text-xs text-gray-500 mt-1.5">Shows only on the selected exam’s own page (not on subject/unit/chapter/… under it).</p>
                    ) : formEntityType === "exam_with_children" ? (
                      <p className="text-xs text-gray-500 mt-1.5">Shows on the selected exam page and all its children (subjects, units, chapters, topics, subtopics, definitions under that exam).</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1.5">Select level, then choose Exam → Subject → … up to that level.</p>
                    )}
                  </div>
                  {formEntityType !== "general" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {["exam", "subject", "unit", "chapter", "topic", "subtopic", "definition"].map((level, idx) => {
                        const levels = ["exam", "subject", "unit", "chapter", "topic", "subtopic", "definition"];
                        if (formEntityType === "exam" || formEntityType === "exam_with_children") {
                          if (level !== "exam") return null;
                        } else if (levels.indexOf(formEntityType) < idx) return null;
                        const valueMap = { exam: formExamId, subject: formSubjectId, unit: formUnitId, chapter: formChapterId, topic: formTopicId, subtopic: formSubTopicId, definition: formDefinitionId };
                        const setValueMap = { exam: setFormExamId, subject: setFormSubjectId, unit: setFormUnitId, chapter: setFormChapterId, topic: setFormTopicId, subtopic: setFormSubTopicId, definition: setFormDefinitionId };
                        const optionsMap = { exam: formExams, subject: formSubjects, unit: formUnits, chapter: formChapters, topic: formTopics, subtopic: formSubtopics, definition: formDefinitions };
                        const disabled = level === "exam" ? formHierarchyLoading.exam : (level === "subject" ? !formExamId || formHierarchyLoading.subject : level === "unit" ? !formSubjectId || formHierarchyLoading.unit : level === "chapter" ? !formUnitId || formHierarchyLoading.chapter : level === "topic" ? !formChapterId || formHierarchyLoading.topic : level === "subtopic" ? !formTopicId || formHierarchyLoading.subtopic : !formSubTopicId || formHierarchyLoading.definition);
                        const value = valueMap[level];
                        const setValue = setValueMap[level];
                        const options = optionsMap[level] || [];
                        const label = level === "subtopic" ? "SubTopic" : ENTITY_LABELS[level];
                        const placeholder = level === "exam" ? "Select Exam" : level === "subject" ? (formExamId ? "Select Subject" : "Select Exam first") : level === "unit" ? (formSubjectId ? "Select Unit" : "Select Subject first") : level === "chapter" ? (formUnitId ? "Select Chapter" : "Select Unit first") : level === "topic" ? (formChapterId ? "Select Topic" : "Select Chapter first") : level === "subtopic" ? (formTopicId ? "Select SubTopic" : "Select Topic first") : (formSubTopicId ? "Select Definition" : "Select SubTopic first");
                        return (
                          <div key={level}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                            <select
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              disabled={disabled}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                            >
                              <option value="">{placeholder}</option>
                              {options.map((o) => (
                                <option key={o._id} value={o._id}>{o.name || o.title || o.term || String(o._id).slice(-6)}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Notification title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message (body)</label>
                <p className="text-xs text-gray-500 mb-2">Rich text content for the notification detail page.</p>
                <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[280px]">
                  <RichTextEditor
                    value={formMessage}
                    onChange={setFormMessage}
                    placeholder="Write the notification body content..."
                    className="min-h-[260px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Strip message (one line for banner)</label>
                <input
                  type="text"
                  value={formStripMessage}
                  onChange={(e) => setFormStripMessage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional; uses title if empty"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Link URL</label>
                  <input type="text" value={formLink} onChange={(e) => setFormLink(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="/path or full URL" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Link label</label>
                  <input type="text" value={formLinkLabel} onChange={(e) => setFormLinkLabel(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="View" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug (for /notification/[slug])</label>
                  <input type="text" value={formSlug} onChange={(e) => setFormSlug(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Auto from title if empty" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon type</label>
                <select value={formIconType} onChange={(e) => setFormIconType(e.target.value)} className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  {ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End date (optional)</label>
                <input
                  type="datetime-local"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1.5">After this date the notification stops showing in the header dropdown but still appears on the Notification landing page.</p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="button" onClick={saveForm} disabled={formLoading} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2">
                  {formLoading ? <LoadingSpinner size="small" /> : null}
                  {formLoading ? "Saving…" : editingId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-5 sm:px-6 sm:py-6 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white">
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                      <FaBell className="w-5 h-5" />
                    </span>
                    Notification Management
                  </h1>
                  <p className="text-sm text-gray-500 mt-2 max-w-2xl">
                    Create and manage notifications shown on exam, subject, unit, chapter, topic, subtopic, or definition pages. Select hierarchy to target a specific level.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium shadow-sm transition-colors shrink-0"
                >
                  <FaPlus className="w-4 h-4 shrink-0" />
                  Create Notification
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="relative flex-1 sm:max-w-xs">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by title, message, slug..."
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
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
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
            <div className="px-4 py-4 sm:px-6 bg-gray-50 border-b border-gray-200">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Show notifications</label>
                <select
                  value={filterLevel}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterLevel(v);
                    if (v !== "hierarchy") {
                      setExamId(""); setSubjectId(""); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId("");
                    }
                  }}
                  className="min-w-[200px] px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="all">All (general + exam + hierarchy)</option>
                  <option value="general">General only (all pages)</option>
                  <option value="hierarchy">By hierarchy (select Exam → … below)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  General = every page. Exam = that exam and all its children. Use hierarchy to filter by specific exam/subject/unit/….
                </p>
              </div>
              {filterLevel === "hierarchy" && (
                <>
                  <p className="text-xs text-gray-500 mb-4">
                    Select hierarchy (Exam → Subject → Unit → Chapter → Topic → SubTopic → Definition) to filter notifications for that level.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Filter by Exam</label>
                      <select
                        value={examId}
                        onChange={(e) => { setExamId(e.target.value); setSubjectId(""); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); setUnits([]); setChapters([]); setTopics([]); setSubtopics([]); setDefinitions([]); }}
                        disabled={hierarchyLoading.exam}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 bg-white disabled:bg-gray-100"
                      >
                        <option value="">All Exams</option>
                        {exams.map((e) => (
                          <option key={e._id} value={e._id}>{e.name || e.title || String(e._id).slice(-6)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Filter by Subject</label>
                      <select
                        value={subjectId}
                        onChange={(e) => { setSubjectId(e.target.value); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); setChapters([]); setTopics([]); setSubtopics([]); setDefinitions([]); }}
                        disabled={!examId || hierarchyLoading.subject}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">{examId ? "All Subjects" : "Select Exam First"}</option>
                        {subjects.map((s) => (
                          <option key={s._id} value={s._id}>{s.name || s.title || String(s._id).slice(-6)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Filter by Unit</label>
                      <select
                        value={unitId}
                        onChange={(e) => { setUnitId(e.target.value); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); setTopics([]); setSubtopics([]); setDefinitions([]); }}
                        disabled={!subjectId || hierarchyLoading.unit}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">{subjectId ? "All Units" : "Select Subject First"}</option>
                        {units.map((u) => (
                          <option key={u._id} value={u._id}>{u.name || u.title || String(u._id).slice(-6)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Filter by Chapter</label>
                      <select
                        value={chapterId}
                        onChange={(e) => { setChapterId(e.target.value); setTopicId(""); setSubTopicId(""); setDefinitionId(""); setSubtopics([]); setDefinitions([]); }}
                        disabled={!unitId || hierarchyLoading.chapter}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">{unitId ? "All Chapters" : "Select Unit First"}</option>
                        {chapters.map((c) => (
                          <option key={c._id} value={c._id}>{c.name || c.title || String(c._id).slice(-6)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Filter by Topic</label>
                      <select
                        value={topicId}
                        onChange={(e) => { setTopicId(e.target.value); setSubTopicId(""); setDefinitionId(""); setDefinitions([]); }}
                        disabled={!chapterId || hierarchyLoading.topic}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">{chapterId ? "All Topics" : "Select Chapter First"}</option>
                        {topics.map((t) => (
                          <option key={t._id} value={t._id}>{t.name || t.title || String(t._id).slice(-6)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Filter by SubTopic</label>
                      <select
                        value={subTopicId}
                        onChange={(e) => { setSubTopicId(e.target.value); setDefinitionId(""); }}
                        disabled={!topicId || hierarchyLoading.subtopic}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">{topicId ? "All SubTopics" : "Select Topic First"}</option>
                        {subtopics.map((s) => (
                          <option key={s._id} value={s._id}>{s.name || s.title || String(s._id).slice(-6)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Filter by Definition</label>
                      <select
                        value={definitionId}
                        onChange={(e) => setDefinitionId(e.target.value)}
                        disabled={!subTopicId || hierarchyLoading.definition}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">{subTopicId ? "All Definitions" : "Select SubTopic First"}</option>
                        {definitions.map((d) => (
                          <option key={d._id} value={d._id}>{d.name || d.title || d.term || String(d._id).slice(-6)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 mt-4">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Active Filters</span>
                  {filterLevel === "general" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                      General only (all pages)
                      <button type="button" onClick={() => setFilterLevel("all")} className="hover:bg-slate-200 rounded-full p-0.5 transition-colors" aria-label="Clear"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterLevel === "hierarchy" && examId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Exam: {exams.find((e) => String(e._id) === String(examId))?.name || exams.find((e) => String(e._id) === String(examId))?.title || "—"}
                      <button type="button" onClick={() => { setExamId(""); setSubjectId(""); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors" aria-label="Clear exam"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterLevel === "hierarchy" && subjectId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Subject: {subjects.find((s) => String(s._id) === String(subjectId))?.name || subjects.find((s) => String(s._id) === String(subjectId))?.title || "—"}
                      <button type="button" onClick={() => { setSubjectId(""); setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors" aria-label="Clear subject"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterLevel === "hierarchy" && unitId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Unit: {units.find((u) => String(u._id) === String(unitId))?.name || units.find((u) => String(u._id) === String(unitId))?.title || "—"}
                      <button type="button" onClick={() => { setUnitId(""); setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors" aria-label="Clear unit"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterLevel === "hierarchy" && chapterId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Chapter: {chapters.find((c) => String(c._id) === String(chapterId))?.name || chapters.find((c) => String(c._id) === String(chapterId))?.title || "—"}
                      <button type="button" onClick={() => { setChapterId(""); setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors" aria-label="Clear chapter"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterLevel === "hierarchy" && topicId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Topic: {topics.find((t) => String(t._id) === String(topicId))?.name || topics.find((t) => String(t._id) === String(topicId))?.title || "—"}
                      <button type="button" onClick={() => { setTopicId(""); setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors" aria-label="Clear topic"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterLevel === "hierarchy" && subTopicId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      SubTopic: {subtopics.find((s) => String(s._id) === String(subTopicId))?.name || subtopics.find((s) => String(s._id) === String(subTopicId))?.title || "—"}
                      <button type="button" onClick={() => { setSubTopicId(""); setDefinitionId(""); }} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors" aria-label="Clear subtopic"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterLevel === "hierarchy" && definitionId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Definition: {definitions.find((d) => String(d._id) === String(definitionId))?.name || definitions.find((d) => String(d._id) === String(definitionId))?.title || definitions.find((d) => String(d._id) === String(definitionId))?.term || "—"}
                      <button type="button" onClick={() => setDefinitionId("")} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors" aria-label="Clear definition"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-auto px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-xs font-medium transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-200">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="large" />
              </div>
            ) : groupedByPath.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm px-4">
                No notifications found for the selected filters.
              </div>
            ) : (
              <div className="space-y-6 px-4 py-4 sm:px-6">
                {groupedByPath.map((group, groupIndex) => (
                  <div
                    key={groupIndex}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                  >
                    {/* Level path as table heading (breadcrumb pills + count) */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <PathHeadingWithCount path={group.path} count={group.notifications.length} />
                    </div>
                    {/* Table for this level */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Order</th>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[180px]">Title</th>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">Strip message (one line for banner)</th>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">Content</th>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">End date</th>
                            <th scope="col" className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Status</th>
                            <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {group.notifications.map((n, idx) => (
                            <tr key={n._id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {n.orderNumber ?? idx + 1}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[240px] truncate" title={n.title}>
                                {n.title}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 max-w-[280px] truncate" title={n.stripMessage || n.title || ""}>
                                {n.stripMessage || n.title || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap">
                                <span className={hasContent(n) ? "text-gray-700" : "text-gray-400 italic"}>
                                  {contentDate(n) || "unavailable"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                                {n.endDate ? formatDate(n.endDate) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${n.status === "active" ? "bg-green-100 text-green-800" : n.status === "draft" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                                  {n.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-0.5">
                                  {/* {n.slug && (
                                    <a
                                      href={`${getFrontendBaseUrl()}/notification/${n.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:text-green-800 p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                                      title="View"
                                    >
                                      <FaEye className="w-4 h-4" />
                                    </a>
                                  )} */}
                                  <button type="button" onClick={() => openEdit(n)} className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Edit">
                                    <FaEdit className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => handleDelete(n._id)} className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                                    <FaTrash className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(n)}
                                    className={`p-1.5 rounded-lg transition-colors ${n.status === "active" ? "text-red-600 hover:text-red-800 hover:bg-red-50" : "text-green-600 hover:text-green-800 hover:bg-green-50"}`}
                                    title={n.status === "active" ? "Deactivate" : "Activate"}
                                  >
                                    <FaPowerOff className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
};

export default NotificationManagement;
