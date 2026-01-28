"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as FaIcons from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import {
    LoadingSpinner,
    SkeletonPageContent,
    LoadingWrapper
} from "../ui/SkeletonLoader";
import DiscussionTable from "../table/DiscussionTable";
import { usePermissions, getDiscussionPermissions, getDiscussionPermissionMessage } from "../../hooks/usePermissions";

const DiscussionManagement = () => {
    const [threads, setThreads] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortByViews, setSortByViews] = useState(false); // Top Views filter state
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
    });

    // Hierarchy States
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [units, setUnits] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [subTopics, setSubTopics] = useState([]);
    const [definitions, setDefinitions] = useState([]);

    // Filter States
    const [showFilters, setShowFilters] = useState(false);
    const [filterExam, setFilterExam] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterUnit, setFilterUnit] = useState("");
    const [filterChapter, setFilterChapter] = useState("");
    const [filterTopic, setFilterTopic] = useState("");
    const [filterSubTopic, setFilterSubTopic] = useState("");
    const [filterDefinition, setFilterDefinition] = useState("");

    const { toasts, removeToast, success, error: showError } = useToast();
    const isFetchingRef = useRef(false);

    // Permissions
    const { role } = usePermissions();
    const discussionPerms = getDiscussionPermissions(role);

    // Fetch Functions for Hierarchy
    const fetchExams = useCallback(async () => {
        try {
            const res = await api.get("/exam?status=all");
            if (res.data.success) setExams(res.data.data || []);
        } catch (err) { console.error("Error fetching exams:", err); }
    }, []);


    const fetchSubjects = useCallback(async (examId = null) => {
        try {
            let url = "/subject?status=all&limit=1000";
            if (examId) {
                url += `&examId=${examId}`;
            }
            const res = await api.get(url);
            if (res.data.success) setSubjects(res.data.data || []);
        } catch (err) { 
            console.error("Error fetching subjects:", err);
            setSubjects([]);
        }
    }, []);

    const fetchUnits = useCallback(async (examId, subjectId) => {
        if (!examId || !subjectId) { setUnits([]); return; }
        try {
            const res = await api.get(`/unit?examId=${examId}&subjectId=${subjectId}&status=all&limit=1000`);
            if (res.data.success) setUnits(res.data.data || []);
        } catch (err) { console.error("Error fetching units:", err); }
    }, []);

    const fetchChapters = useCallback(async (unitId) => {
        if (!unitId) { setChapters([]); return; }
        try {
            const res = await api.get(`/chapter?unitId=${unitId}&status=all&limit=1000`);
            if (res.data.success) setChapters(res.data.data || []);
        } catch (err) { console.error("Error fetching chapters:", err); }
    }, []);

    const fetchTopics = useCallback(async (chapterId) => {
        if (!chapterId) { setTopics([]); return; }
        try {
            const res = await api.get(`/topic?chapterId=${chapterId}&status=all&limit=1000`);
            if (res.data.success) setTopics(res.data.data || []);
        } catch (err) { console.error("Error fetching topics:", err); }
    }, []);

    const fetchSubTopics = useCallback(async (topicId) => {
        if (!topicId) { setSubTopics([]); return; }
        try {
            const res = await api.get(`/subtopic?topicId=${topicId}&status=all&limit=1000`);
            if (res.data.success) setSubTopics(res.data.data || []);
        } catch (err) { console.error("Error fetching subtopics:", err); }
    }, []);

    const fetchDefinitions = useCallback(async (subTopicId) => {
        if (!subTopicId) { setDefinitions([]); return; }
        try {
            const res = await api.get(`/definition?subTopicId=${subTopicId}&status=all&limit=1000`);
            if (res.data.success) setDefinitions(res.data.data || []);
        } catch (err) { console.error("Error fetching definitions:", err); }
    }, []);

    useEffect(() => {
        fetchExams();
        // Don't fetch subjects initially - wait for exam selection
    }, [fetchExams]);

    // Fetch subjects ONLY when exam is selected
    useEffect(() => {
        if (filterExam) {
            // Only fetch subjects for the selected exam
            fetchSubjects(filterExam);
        } else {
            // If no exam selected, clear subjects
            setSubjects([]);
        }
    }, [filterExam, fetchSubjects]);

    // Cascading Effects
    useEffect(() => {
        if (filterExam && filterSubject) {
            fetchUnits(filterExam, filterSubject);
        } else {
            setUnits([]);
        }
    }, [filterExam, filterSubject, fetchUnits]);

    useEffect(() => {
        if (filterUnit) fetchChapters(filterUnit);
        else setChapters([]);
    }, [filterUnit, fetchChapters]);

    useEffect(() => {
        if (filterChapter) fetchTopics(filterChapter);
        else setTopics([]);
    }, [filterChapter, fetchTopics]);

    useEffect(() => {
        if (filterTopic) fetchSubTopics(filterTopic);
        else setSubTopics([]);
    }, [filterTopic, fetchSubTopics]);

    useEffect(() => {
        if (filterSubTopic) fetchDefinitions(filterSubTopic);
        else setDefinitions([]);
    }, [filterSubTopic, fetchDefinitions]);

    // Reset dependents when parent changes
    const handleExamChange = (val) => {
        setFilterExam(val); 
        setFilterSubject(""); 
        setFilterUnit(""); 
        setFilterChapter(""); 
        setFilterTopic(""); 
        setFilterSubTopic(""); 
        setFilterDefinition("");
        // Clear subjects when exam is cleared, or let useEffect handle fetching
        if (!val) {
            setSubjects([]);
        }
    };
    const handleSubjectChange = (val) => {
        setFilterSubject(val); setFilterUnit(""); setFilterChapter(""); setFilterTopic(""); setFilterSubTopic(""); setFilterDefinition("");
    };
    const handleUnitChange = (val) => {
        setFilterUnit(val); setFilterChapter(""); setFilterTopic(""); setFilterSubTopic(""); setFilterDefinition("");
    };
    const handleChapterChange = (val) => {
        setFilterChapter(val); setFilterTopic(""); setFilterSubTopic(""); setFilterDefinition("");
    };
    const handleTopicChange = (val) => {
        setFilterTopic(val); setFilterSubTopic(""); setFilterDefinition("");
    };
    const handleSubTopicChange = (val) => {
        setFilterSubTopic(val); setFilterDefinition("");
    };

    // Filtered Subjects - when exam is selected, subjects are already filtered by API
    // No need for additional filtering since API returns only subjects for that exam
    const filteredSubjects = useMemo(() => {
        // If no exam selected, return empty array (don't show any subjects)
        if (!filterExam) {
            return [];
        }
        // Subjects are already filtered by API for the selected exam
        // Just return them as-is
        return subjects;
    }, [subjects, filterExam]);

    const activeFilterCount = [filterExam, filterSubject, filterUnit, filterChapter, filterTopic, filterSubTopic, filterDefinition].filter(Boolean).length;

    const clearFilters = () => {
        setFilterExam(""); setFilterSubject(""); setFilterUnit(""); setFilterChapter(""); setFilterTopic(""); setFilterSubTopic(""); setFilterDefinition("");
    };

    const fetchThreads = async () => {
        isFetchingRef.current = true;
        try {
            setIsDataLoading(true);
            const queryParams = new URLSearchParams({
                page,
                limit: "10",
                search,
                sort: sortByViews ? "views" : "new", // Sort by views if Top Views is active
                status: statusFilter
            });
            if (filterExam) queryParams.set("examId", filterExam);
            if (filterSubject) queryParams.set("subjectId", filterSubject);
            if (filterUnit) queryParams.set("unitId", filterUnit);
            if (filterChapter) queryParams.set("chapterId", filterChapter);
            if (filterTopic) queryParams.set("topicId", filterTopic);
            if (filterSubTopic) queryParams.set("subTopicId", filterSubTopic);
            if (filterDefinition) queryParams.set("definitionId", filterDefinition);

            const res = await api.get(`/discussion/threads?${queryParams.toString()}`);
            if (res.data.success) {
                setThreads(res.data.data);
                setTotalPages(res.data.pagination?.pages || 1);

                // Aggregated counts for the header
                const total = res.data.pagination?.total || 0;
                if (statusFilter === "all") {
                    setStats(prev => ({ ...prev, total }));
                } else if (statusFilter === "pending") {
                    setStats(prev => ({ ...prev, pending: total }));
                } else if (statusFilter === "approved") {
                    setStats(prev => ({ ...prev, approved: total }));
                }
            }
        } catch (err) {
            console.error("Error fetching threads:", err);
            showError("Failed to synchronize discussions");
        } finally {
            setIsDataLoading(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        fetchThreads();
    }, [page, search, statusFilter, sortByViews, filterExam, filterSubject, filterUnit, filterChapter, filterTopic, filterSubTopic, filterDefinition]);

    const handleToggleApproval = async (thread) => {
        if (!discussionPerms.canApproveThreads) {
            showError(getDiscussionPermissionMessage("approveThreads", role));
            return;
        }
        try {
            const newStatus = !thread.isApproved;
            const res = await api.patch(`/discussion/threads/${thread.slug}`, {
                isApproved: newStatus,
            });
            if (res.data.success) {
                success(`Topic "${thread.title}" ${newStatus ? "approved" : "unapproved"}`);
                setThreads(threads.map((t) => (t._id === thread._id ? { ...t, isApproved: newStatus } : t)));
                // Update header stats optimistically
                setStats(prev => ({
                    ...prev,
                    pending: newStatus ? prev.pending - 1 : prev.pending + 1,
                    approved: newStatus ? prev.approved + 1 : prev.approved - 1
                }));
            }
        } catch (err) {
            showError("Moderation action failed");
        }
    };

    const handleDelete = async (thread) => {
        if (!discussionPerms.canDeleteThreads) {
            showError(getDiscussionPermissionMessage("deleteThreads", role));
            return;
        }
        if (!confirm(`Permanently remove discussion: "${thread.title}"?`)) return;

        try {
            const res = await api.delete(`/discussion/threads/${thread.slug}`);
            if (res.data.success) {
                success("Discussion removed successfully");
                setThreads(threads.filter((t) => t._id !== thread._id));
            }
        } catch (err) {
            showError("Failed to delete discussion");
        }
    };

    const handleTogglePin = async (thread) => {
        if (!discussionPerms.canPinThreads) {
            showError(getDiscussionPermissionMessage("pinThreads", role));
            return;
        }
        try {
            const newStatus = !thread.isPinned;
            const res = await api.patch(`/discussion/threads/${thread.slug}`, {
                isPinned: newStatus,
            });
            if (res.data.success) {
                success(`Topic ${newStatus ? "featured/pinned" : "unpinned"}`);
                setThreads(threads.map((t) => (t._id === thread._id ? { ...t, isPinned: newStatus } : t)));
            }
        } catch (err) {
            showError("Failed to update pin status");
        }
    };

    return (
        <>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <div className="space-y-6">
                {/* Page Header - Consistent with ExamManagement */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-10 opacity-5 pointer-events-none">
                        <FaIcons.FaComment size={80} />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        <div className="space-y-1">
                            <h1 className="text-xl font-semibold text-gray-900">
                                Discussion Forum Management
                            </h1>
                            <p className="text-xs text-gray-600">
                                Moderate community discussions, verify guest contributions, and track forum engagement metrics.
                            </p>
                        </div>

                        {/* Quick Metrics */}
                        <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-1.5 rounded-lg border border-white">
                            <div className="px-3 py-1 text-center border-r border-gray-100">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Posts</p>
                                <p className="text-base font-bold text-gray-900 leading-none mt-1">{stats.total || threads.length}</p>
                            </div>
                            <div className="px-3 py-1 text-center">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1 justify-center">
                                    <FaIcons.FaCheck size={8} /> Verified
                                </p>
                                <p className="text-base font-bold text-emerald-600 leading-none mt-1">{stats.approved || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${showFilters || activeFilterCount > 0 ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                        >
                            <FaIcons.FaFilter size={10} />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {/* Top Views Filter Button */}
                        <button
                            onClick={() => { setSortByViews(!sortByViews); setPage(1); }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${sortByViews ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                        >
                            <FaIcons.FaEye size={10} />
                            Top Views
                            {sortByViews && (
                                <span className="bg-orange-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                    #1
                                </span>
                            )}
                        </button>

                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-xs text-red-500 font-medium hover:text-red-700 hover:underline"
                            >
                                <FaIcons.FaTimes size={10} /> Clear
                            </button>
                        )}
                    </div>

                    {/* Extended Filters Panel */}
                    {showFilters && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Exam Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Exam</label>
                                <select
                                    value={filterExam}
                                    onChange={(e) => handleExamChange(e.target.value)}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                >
                                    <option value="">All Exams</option>
                                    {exams.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                                </select>
                            </div>

                            {/* Subject Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Subject</label>
                                <select
                                    value={filterSubject}
                                    onChange={(e) => handleSubjectChange(e.target.value)}
                                    disabled={!filterExam}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                >
                                    <option value="">All Subjects</option>
                                    {filterExam ? (
                                        filteredSubjects.length > 0 ? (
                                            filteredSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)
                                        ) : (
                                            <option value="" disabled>No subjects found for selected exam</option>
                                        )
                                    ) : (
                                        <option value="" disabled>Select an exam first</option>
                                    )}
                                </select>
                            </div>

                            {/* Unit Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Unit</label>
                                <select
                                    value={filterUnit}
                                    onChange={(e) => handleUnitChange(e.target.value)}
                                    disabled={!filterExam || !filterSubject}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                >
                                    <option value="">All Units</option>
                                    {units.length > 0 ? (
                                        units.map(u => <option key={u._id} value={u._id}>{u.name}</option>)
                                    ) : filterExam && filterSubject ? (
                                        <option value="" disabled>No units found</option>
                                    ) : (
                                        <option value="" disabled>Select exam and subject first</option>
                                    )}
                                </select>
                            </div>

                            {/* Chapter Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Chapter</label>
                                <select
                                    value={filterChapter}
                                    onChange={(e) => handleChapterChange(e.target.value)}
                                    disabled={!filterUnit}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                >
                                    <option value="">All Chapters</option>
                                    {chapters.length > 0 ? (
                                        chapters.map(c => <option key={c._id} value={c._id}>{c.name}</option>)
                                    ) : filterUnit ? (
                                        <option value="" disabled>No chapters found</option>
                                    ) : (
                                        <option value="" disabled>Select unit first</option>
                                    )}
                                </select>
                            </div>

                            {/* Topic Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Topic</label>
                                <select
                                    value={filterTopic}
                                    onChange={(e) => handleTopicChange(e.target.value)}
                                    disabled={!filterChapter}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                >
                                    <option value="">All Topics</option>
                                    {topics.length > 0 ? (
                                        topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)
                                    ) : filterChapter ? (
                                        <option value="" disabled>No topics found</option>
                                    ) : (
                                        <option value="" disabled>Select chapter first</option>
                                    )}
                                </select>
                            </div>

                            {/* SubTopic Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">SubTopic</label>
                                <select
                                    value={filterSubTopic}
                                    onChange={(e) => handleSubTopicChange(e.target.value)}
                                    disabled={!filterTopic}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                >
                                    <option value="">All SubTopics</option>
                                    {subTopics.length > 0 ? (
                                        subTopics.map(st => <option key={st._id} value={st._id}>{st.name}</option>)
                                    ) : filterTopic ? (
                                        <option value="" disabled>No subtopics found</option>
                                    ) : (
                                        <option value="" disabled>Select topic first</option>
                                    )}
                                </select>
                            </div>

                            {/* Definition Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Definition</label>
                                <select
                                    value={filterDefinition}
                                    onChange={(e) => setFilterDefinition(e.target.value)}
                                    disabled={!filterSubTopic}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                >
                                    <option value="">All Definitions</option>
                                    {definitions.length > 0 ? (
                                        definitions.map(d => <option key={d._id} value={d._id}>{d.name}</option>)
                                    ) : filterSubTopic ? (
                                        <option value="" disabled>No definitions found</option>
                                    ) : (
                                        <option value="" disabled>Select subtopic first</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filters & Control Bar */}
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100 w-full md:w-auto">
                        {[
                            { id: "all", label: "All Posts", icon: <FaIcons.FaClipboardList size={10} /> },
                            { id: "pending", label: "Pending", icon: <FaIcons.FaHistory size={10} /> },
                            { id: "approved", label: "Approved", icon: <FaIcons.FaCheckCircle size={10} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex-1 md:flex-none ${statusFilter === tab.id ? "bg-white text-blue-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <FaIcons.FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={12} />
                        <input
                            type="text"
                            placeholder="Search discussions or authors..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm text-gray-800 placeholder-gray-400"
                        />
                    </div>
                </div>

                {/* Content Area - Consistent with ExamManagement */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="space-y-0.5">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Discussions List
                            </h2>
                            <p className="text-sm text-gray-600">
                                Moderate community topics, verify guest posts, and track forum engagement.
                            </p>
                        </div>
                    </div>

                    <LoadingWrapper isLoading={isDataLoading}>
                        <DiscussionTable
                            threads={threads}
                            sortByViews={sortByViews}
                            onToggleApproval={handleToggleApproval}
                            onDelete={handleDelete}
                            onTogglePin={handleTogglePin}
                        />
                    </LoadingWrapper>

                    {/* Pagination - Professional Footer */}
                    {!isDataLoading && totalPages > 1 && (
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <p className="text-[11px] font-bold text-gray-500">
                                    Page {page} of {totalPages}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default DiscussionManagement;
