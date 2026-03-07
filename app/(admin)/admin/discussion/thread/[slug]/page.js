"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { getThreadHierarchyQueryString } from "@/lib/discussionThreadQuery";
import * as FaIcons from "react-icons/fa";
import { ToastContainer, useToast } from "../../../../components/ui/Toast";
import { LoadingSpinner } from "../../../../components/ui/SkeletonLoader";
import RichContent from "../../../../../(main)/components/RichContent";
import RichTextEditor from "../../../../components/ui/RichTextEditor";
import Link from "next/link";
import { usePermissions, getDiscussionPermissions, getDiscussionPermissionMessage } from "../../../../hooks/usePermissions";
import { SEO_DEFAULTS } from "@/constants";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
const BRAND_LOGO_URL = SEO_DEFAULTS?.FAVICON || `${basePath}/logo.png`;

const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

const getReplyAuthorDisplayName = (reply) => {
    if (reply.authorType === "User") return "Testprepkart";
    return reply.author?.firstName ? `${reply.author.firstName} ${reply.author.lastName}` : (reply.guestName || "Guest User");
};

const getReplyAuthorInitial = (reply) => {
    if (reply.authorType === "User") return "T";
    return reply.author?.firstName?.[0] || reply.guestName?.[0] || "G";
};

const isThreadAdmin = (thread) => thread?.contributorDisplayName || thread?.authorType === "User";

const ThreadDetailModeration = () => {
    const { slug } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [thread, setThread] = useState(null);
    const [replies, setReplies] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [replySearch, setReplySearch] = useState("");
    const [replyFilter, setReplyFilter] = useState("all"); // "all", "pending", "approved", "new"
    const [replySortOrder, setReplySortOrder] = useState("newest"); // "newest" | "oldest" | "top" — recent top by default
    const [lastViewedAt, setLastViewedAt] = useState(null);
    const { toasts, removeToast, success, error: showError } = useToast();
    const searchTimeout = React.useRef(null);

    // Edit State Management
    const [editingThread, setEditingThread] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState("");
    const [editingReplyId, setEditingReplyId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [originalContent, setOriginalContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Admin Create Reply
    const [adminReplyContent, setAdminReplyContent] = useState("");
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [replyingToReplyId, setReplyingToReplyId] = useState(null);
    const [replyingToName, setReplyingToName] = useState("");
    const replyComposerRef = React.useRef(null);

    // Permissions
    const { role } = usePermissions();
    const discussionPerms = getDiscussionPermissions(role);

    const hierarchyQuery = useMemo(() => {
        const p = new URLSearchParams();
        ["examId", "subjectId", "unitId", "chapterId", "topicId", "subTopicId", "definitionId"].forEach((key) => {
            const v = searchParams.get(key);
            if (v) p.set(key, v);
        });
        return p.toString();
    }, [searchParams]);

    const fetchDetail = async (search = "") => {
        try {
            setIsDataLoading(true);
            const params = new URLSearchParams();
            params.set("replyLimit", "1000");
            if (search) params.set("replySearch", search);
            params.set("sort", "new"); // fetch newest first; client applies replySortOrder
            const url = `/discussion/threads/${slug}?${params.toString()}${hierarchyQuery ? `&${hierarchyQuery}` : ""}`;
            const res = await api.get(url);
            if (res.data.success) {
                setThread(res.data.data.thread);
                setReplies(res.data.data.replies || []);
            }
        } catch (err) {
            console.error(err);
            showError("Failed to fetch discussion details");
        } finally {
            setIsDataLoading(false);
        }
    };

    // Load last viewed timestamp from localStorage
    useEffect(() => {
        if (typeof window !== "undefined" && slug) {
            const stored = localStorage.getItem(`thread_last_viewed_${slug}`);
            if (stored) {
                setLastViewedAt(new Date(stored));
            }
        }
    }, [slug]);

    useEffect(() => {
        if (slug) fetchDetail(replySearch);
    }, [slug, hierarchyQuery]); // reply sort is applied client-side

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setReplySearch(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            fetchDetail(value);
        }, 500);
    };

    // Mark all replies as viewed (update last viewed timestamp)
    const handleMarkAllAsViewed = () => {
        const now = new Date();
        setLastViewedAt(now);
        if (typeof window !== "undefined" && slug) {
            localStorage.setItem(`thread_last_viewed_${slug}`, now.toISOString());
        }
        success("All replies marked as viewed");
    };

    // Check if a reply is "new" (created after last view)
    const isNewReply = (replyCreatedAt) => {
        if (!lastViewedAt) return true; // If never viewed, all are new
        return new Date(replyCreatedAt) > lastViewedAt;
    };

    // Count new replies
    const newRepliesCount = useMemo(() => {
        if (!lastViewedAt) return replies.length;
        return replies.filter(r => isNewReply(r.createdAt)).length;
    }, [replies, lastViewedAt]);

    const handleToggleThreadApproval = async () => {
        if (!discussionPerms.canApproveThreads) {
            showError(getDiscussionPermissionMessage("approveThreads", role));
            return;
        }
        try {
            const newStatus = !thread.isApproved;
            const q = getThreadHierarchyQueryString(thread);
            const res = await api.patch(`/discussion/threads/${slug}${q ? `?${q}` : ""}`, {
                isApproved: newStatus
            });
            if (res.data.success) {
                success(newStatus ? "Thread approved & visible" : "Thread restricted");
                setThread({ ...thread, isApproved: newStatus });
            }
        } catch (err) {
            showError("Status update failed");
        }
    };

    const handleToggleReplyApproval = async (replyId, currentStatus) => {
        if (!discussionPerms.canApproveReplies) {
            showError("Permission denied: Cannot approve/restrict replies");
            return;
        }
        try {
            const newStatus = !currentStatus;
            const res = await api.patch(`/discussion/replies/${replyId}`, {
                isApproved: newStatus
            });
            if (res.data.success) {
                success(newStatus ? "Reply approved" : "Reply restricted");
                setReplies(replies.map(r => r._id === replyId ? { ...r, isApproved: newStatus } : r));
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("admin-discussion-reply-pending-updated", { detail: { delta: newStatus ? -1 : 1 } }));
                }
            }
        } catch (err) {
            showError("Status update failed");
        }
    };

    const handleDeleteReply = async (replyId) => {
        if (!discussionPerms.canDeleteReplies) {
            showError(getDiscussionPermissionMessage("deleteReplies", role));
            return;
        }
        if (!confirm("Are you sure you want to delete this reply?")) return;
        try {
            const res = await api.delete(`/discussion/replies/${replyId}`);
            if (res.data.success) {
                const deletedReply = replies.find(r => r._id === replyId);
                success("Reply deleted successfully");
                setReplies(replies.filter(r => r._id !== replyId));
                if (deletedReply && !deletedReply.isApproved && typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("admin-discussion-reply-pending-updated", { detail: { delta: -1 } }));
                }
            }
        } catch (err) {
            showError("Failed to delete reply");
        }
    };

    // Edit Thread Content
    const handleEditThread = () => {
        setOriginalContent(thread.content);
        setEditContent(thread.content);
        setEditingThread(true);
    };

    const handleCancelEditThread = () => {
        setEditContent("");
        setOriginalContent("");
        setEditingThread(false);
    };

    const handleEditTitle = () => {
        setEditTitleValue(thread.title || "");
        setEditingTitle(true);
    };

    const handleCancelEditTitle = () => {
        setEditTitleValue("");
        setEditingTitle(false);
    };

    const handleSaveTitle = async () => {
        const newTitle = (editTitleValue || "").trim();
        if (!newTitle) {
            showError("Title cannot be empty");
            return;
        }
        try {
            setIsSaving(true);
            const q = getThreadHierarchyQueryString(thread);
            const res = await api.patch(`/discussion/threads/${slug}${q ? `?${q}` : ""}`, {
                title: newTitle
            });
            if (res.data.success) {
                success("Title updated successfully. Slug is unchanged.");
                setThread({ ...thread, title: newTitle });
                setEditingTitle(false);
                setEditTitleValue("");
            }
        } catch (err) {
            showError("Failed to update title");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveThread = async () => {
        if (!editContent.trim()) {
            showError("Content cannot be empty");
            return;
        }
        try {
            setIsSaving(true);
            const q = getThreadHierarchyQueryString(thread);
            const res = await api.patch(`/discussion/threads/${slug}${q ? `?${q}` : ""}`, {
                content: editContent
            });
            if (res.data.success) {
                success("Thread content updated successfully");
                setThread({ ...thread, content: editContent });
                setEditingThread(false);
                setEditContent("");
                setOriginalContent("");
            }
        } catch (err) {
            showError("Failed to update thread content");
        } finally {
            setIsSaving(false);
        }
    };

    // Edit Reply Content
    const handleEditReply = (replyId, currentContent) => {
        setOriginalContent(currentContent);
        setEditContent(currentContent);
        setEditingReplyId(replyId);
    };

    const handleCancelEditReply = () => {
        setEditContent("");
        setOriginalContent("");
        setEditingReplyId(null);
    };

    const handleSaveReply = async (replyId) => {
        if (!editContent.trim()) {
            showError("Content cannot be empty");
            return;
        }
        try {
            setIsSaving(true);
            const res = await api.patch(`/discussion/replies/${replyId}`, {
                content: editContent
            });
            if (res.data.success) {
                success("Reply updated successfully");
                setReplies(replies.map(r => r._id === replyId ? { ...r, content: editContent, isApproved: r.isApproved } : r));
                setEditingReplyId(null);
                setEditContent("");
                setOriginalContent("");
            }
        } catch (err) {
            showError("Failed to update reply content");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateReply = async () => {
        const content = (adminReplyContent || "").trim();
        if (!content || !thread?._id) return;
        setIsSubmittingReply(true);
        try {
            const res = await api.post("/discussion/replies", {
                threadId: thread._id,
                content,
                parentReplyId: replyingToReplyId || null
            });
            if (res.data.success) {
                success("Reply posted successfully");
                setAdminReplyContent("");
                setReplyingToReplyId(null);
                setReplyingToName("");
                fetchDetail(replySearch);
            } else {
                showError(res.data.message || "Failed to post reply");
            }
        } catch (err) {
            console.error(err);
            showError("Failed to post reply");
        } finally {
            setIsSubmittingReply(false);
        }
    };

    const handleCancelReplyTo = () => {
        setReplyingToReplyId(null);
        setReplyingToName("");
    };

    const handleReplyToReply = (replyId, name) => {
        setReplyingToReplyId(replyId);
        setReplyingToName(name || "this reply");
        replyComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const getLiveUrl = () => {
        if (!thread) return "/";
        let path = "";
        if (thread.examId?.slug) path += `/${thread.examId.slug}`;
        if (thread.subjectId?.slug) path += `/${thread.subjectId.slug}`;
        if (thread.unitId?.slug) path += `/${thread.unitId.slug}`;
        if (thread.chapterId?.slug) path += `/${thread.chapterId.slug}`;
        if (thread.topicId?.slug) path += `/${thread.topicId.slug}`;
        if (thread.subTopicId?.slug) path += `/${thread.subTopicId.slug}`;

        // If no hierarchy, use the general discussion page
        if (!path) return `/discussion?thread=${thread.slug}`;

        return `${path}?tab=discussion&thread=${thread.slug}`;
    };

    // Helper function to recursively filter tree while preserving structure
    const filterTree = (nodes, filterType) => {
        if (!nodes || nodes.length === 0) return [];
        
        return nodes
            .map(node => {
                const matchesFilter = 
                    filterType === "all" ? true :
                    filterType === "pending" ? !node.isApproved :
                    filterType === "approved" ? node.isApproved :
                    filterType === "new" ? isNewReply(node.createdAt) : true;
                
                // Recursively filter children first
                const filteredChildren = node.children ? filterTree(node.children, filterType) : [];
                
                // If this node matches OR has matching children, include it
                if (matchesFilter || filteredChildren.length > 0) {
                    return {
                        ...node,
                        children: filteredChildren
                    };
                }
                return null;
            })
            .filter(node => node !== null);
    };

    // Helper function to count matching replies recursively
    const countMatchingReplies = (nodes, filterType) => {
        if (!nodes || nodes.length === 0) return 0;
        let count = 0;
        nodes.forEach(node => {
            const matches = 
                filterType === "all" ? true :
                filterType === "pending" ? !node.isApproved :
                filterType === "approved" ? node.isApproved :
                filterType === "new" ? isNewReply(node.createdAt) : false;
            if (matches) count++;
            if (node.children) count += countMatchingReplies(node.children, filterType);
        });
        return count;
    };

    // Sort reply nodes (roots or flat list) by replySortOrder
    const sortReplyNodes = (nodes, order) => {
        if (!nodes?.length) return;
        if (order === "newest") {
            nodes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (order === "oldest") {
            nodes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (order === "top") {
            const score = (r) => (r.upvotes?.length ?? 0) - (r.downvotes?.length ?? 0);
            nodes.sort((a, b) => score(b) - score(a) || new Date(b.createdAt) - new Date(a.createdAt));
        }
        nodes.forEach((n) => {
            if (n.children?.length) sortReplyNodes(n.children, order);
        });
    };

    // Organize replies into a tree structure first, then apply filter and sort
    const organizedReplies = useMemo(() => {
        if (replySearch) {
            // For search, return flat filtered list, sorted
            let list = replies;
            if (replyFilter === "pending") list = replies.filter(r => !r.isApproved);
            else if (replyFilter === "approved") list = replies.filter(r => r.isApproved);
            else if (replyFilter === "new") list = replies.filter(r => isNewReply(r.createdAt));
            const arr = [...list];
            sortReplyNodes(arr, replySortOrder);
            return arr;
        }

        // Build complete tree structure first
        const map = {};
        const roots = [];

        // Initialize map with all replies
        replies.forEach(r => {
            map[r._id] = { ...r, children: [] };
        });

        // Build tree structure
        replies.forEach(r => {
            if (r.parentReplyId && map[r.parentReplyId]) {
                map[r.parentReplyId].children.push(map[r._id]);
            } else if (!r.parentReplyId) {
                roots.push(map[r._id]);
            }
        });

        // Sort roots and each node's children by replySortOrder
        sortReplyNodes(roots, replySortOrder);

        // Now apply filter while preserving tree structure
        if (replyFilter === "all") {
            return roots;
        }

        return filterTree(roots, replyFilter);
    }, [replies, replyFilter, replySearch, lastViewedAt, replySortOrder]);

    // Calculate filtered reply count
    const filteredReplyCount = useMemo(() => {
        if (replySearch) {
            // For search, count filtered flat list
            if (replyFilter === "all") return replies.length;
            if (replyFilter === "pending") return replies.filter(r => !r.isApproved).length;
            if (replyFilter === "approved") return replies.filter(r => r.isApproved).length;
            if (replyFilter === "new") return replies.filter(r => isNewReply(r.createdAt)).length;
            return replies.length;
        }

        // For tree structure, count recursively
        const map = {};
        const roots = [];
        replies.forEach(r => {
            map[r._id] = { ...r, children: [] };
        });
        replies.forEach(r => {
            if (r.parentReplyId && map[r.parentReplyId]) {
                map[r.parentReplyId].children.push(map[r._id]);
            } else if (!r.parentReplyId) {
                roots.push(map[r._id]);
            }
        });

        if (replyFilter === "all") {
            return replies.length;
        }

        return countMatchingReplies(roots, replyFilter);
    }, [replies, replyFilter, replySearch, lastViewedAt]);

    if (!thread && isDataLoading) return (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="large" />
            <p className="text-sm text-gray-500 animate-pulse font-medium">Loading discussion details...</p>
        </div>
    );

    if (!thread && !isDataLoading) return (
        <div className="p-20 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <FaIcons.FaExclamationTriangle size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Discussion Not Found</h2>
            <p className="text-sm text-gray-500 mt-1 mb-6">{"The topic you're looking for might have been deleted or is unavailable."}</p>
            <button onClick={() => router.back()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                Back to List
            </button>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header Section - Matches ExamManagement style */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
                        >
                            <FaIcons.FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                                Moderation Control <FaIcons.FaChevronRight size={8} className="text-gray-300" /> Topic Review
                            </div>
                            {editingTitle ? (
                                <div className="space-y-2 mt-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <input
                                            type="text"
                                            value={editTitleValue}
                                            onChange={(e) => setEditTitleValue(e.target.value)}
                                            placeholder="Thread title"
                                            maxLength={200}
                                            className="flex-1 min-w-0 px-3 py-2 text-base font-bold text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            autoFocus
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleSaveTitle}
                                                disabled={isSaving || !editTitleValue.trim()}
                                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                                            >
                                                {isSaving ? <FaIcons.FaSpinner className="animate-spin" size={12} /> : <FaIcons.FaSave size={12} />}
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelEditTitle}
                                                disabled={isSaving}
                                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                                            >
                                                <FaIcons.FaTimes size={12} />
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500">Slug will not change: <span className="font-mono font-semibold text-gray-700">{thread.slug}</span></p>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{thread.title}</h1>
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">URL slug: {thread.slug}</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href={getLiveUrl()}
                            target="_blank"
                            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <FaIcons.FaExternalLinkAlt size={12} /> Live View
                        </Link>
                        {!editingTitle && (
                            <button
                                onClick={handleEditTitle}
                                className="px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <FaIcons.FaEdit size={12} />
                                Edit Title
                            </button>
                        )}
                        <button
                            onClick={handleEditThread}
                            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <FaIcons.FaEdit size={12} />
                            Edit Content
                        </button>
                        {discussionPerms.canApproveThreads && (
                            <button
                                onClick={handleToggleThreadApproval}
                                className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm ${thread.isApproved
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                    : 'bg-green-600 text-white hover:bg-green-700'}`}
                            >
                                {thread.isApproved ? <><FaIcons.FaTimes size={12} /> Restrict Post</> : <><FaIcons.FaCheck size={12} /> Approve Post</>}
                            </button>
                        )}
                        {!discussionPerms.canApproveThreads && (
                            <button
                                disabled
                                title={getDiscussionPermissionMessage("approveThreads", role)}
                                className="px-4 py-2.5 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-sm font-bold cursor-not-allowed flex items-center gap-2 shadow-sm"
                            >
                                <FaIcons.FaLock size={12} /> {thread.isApproved ? "Restricted" : "Approval Locked"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                                        {isThreadAdmin(thread) ? (
                                            <img src={BRAND_LOGO_URL} alt="Testprepkart" className="w-full h-full object-cover" />
                                        ) : thread.author?.avatar ? (
                                            <img src={thread.author.avatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <FaIcons.FaUserCircle size={20} className="text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 leading-none">
                                            {isThreadAdmin(thread) ? "Testprepkart" : (thread.author?.firstName ? `${thread.author.firstName} ${thread.author.lastName}` : (thread.guestName || "Guest User"))}
                                        </p>
                                        <p className="text-[11px] text-gray-500 font-medium mt-1">
                                            Posted {timeAgo(thread.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${thread.isApproved ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                    {thread.isApproved ? 'Visible' : 'Pending Approval'}
                                </span>
                            </div>
                        </div>

                        <div className="p-8 prose prose-slate max-w-none">
                            {editingThread ? (
                                <div className="space-y-4">
                                    <RichTextEditor
                                        value={editContent}
                                        onChange={setEditContent}
                                        placeholder="Edit thread content..."
                                        examId={thread.examId?._id}
                                        subjectId={thread.subjectId?._id}
                                        unitId={thread.unitId?._id}
                                        chapterId={thread.chapterId?._id}
                                        topicId={thread.topicId?._id}
                                        subtopicId={thread.subTopicId?._id}
                                        definitionId={thread.definitionId?._id}
                                    />
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                        <button
                                            onClick={handleSaveThread}
                                            disabled={isSaving}
                                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <FaIcons.FaSpinner className="animate-spin" size={12} />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FaIcons.FaSave size={12} />
                                                    Save Changes
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleCancelEditThread}
                                            disabled={isSaving}
                                            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                        >
                                            <FaIcons.FaTimes size={12} />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <RichContent html={thread.content} />
                            )}
                        </div>

                        {thread.attachments?.length > 0 && (
                            <div className="px-6 pb-6 pt-2">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Attachments</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {thread.attachments.map((file, i) => (
                                            <a key={i} href={file.url} target="_blank" className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
                                                <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <FaIcons.FaFileAlt size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold text-gray-700 truncate">{file.name || `File ${i + 1}`}</p>
                                                    <p className="text-[9px] text-gray-400 font-medium uppercase">{file.size || 'N/A'}</p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Admin Post Reply */}
                    <div ref={replyComposerRef} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/80 to-blue-50/80">
                            <div className="flex items-center gap-2 flex-wrap">
                                <FaIcons.FaReply className="text-indigo-600" size={14} />
                                <h3 className="text-sm font-bold text-gray-900">
                                    {replyingToReplyId ? `Replying to ${replyingToName}` : "Post a reply as moderator"}
                                </h3>
                                {replyingToReplyId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelReplyTo}
                                        className="ml-2 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <RichTextEditor
                                value={adminReplyContent}
                                onChange={setAdminReplyContent}
                                placeholder="Write your reply... (Admin replies are auto-approved)"
                                examId={thread.examId?._id}
                                subjectId={thread.subjectId?._id}
                                unitId={thread.unitId?._id}
                                chapterId={thread.chapterId?._id}
                                topicId={thread.topicId?._id}
                                subtopicId={thread.subTopicId?._id}
                                definitionId={thread.definitionId?._id}
                            />
                            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                                <p className="text-[10px] text-gray-500 font-medium">
                                    Your reply will appear as a moderator and is visible immediately.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleCreateReply}
                                    disabled={!adminReplyContent.trim() || isSubmittingReply}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    {isSubmittingReply ? (
                                        <>
                                            <FaIcons.FaSpinner className="animate-spin" size={14} />
                                            Posting...
                                        </>
                                    ) : (
                                        <>
                                            <FaIcons.FaPaperPlane size={14} />
                                            Post reply
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Replies Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <FaIcons.FaCommentDots className="text-blue-500" />
                                    Community Responses ({filteredReplyCount})
                                </h3>
                                {newRepliesCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsViewed}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <FaIcons.FaCheckCircle size={11} />
                                        Mark All as Viewed
                                    </button>
                                )}
                                {newRepliesCount > 0 && (
                                    <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-2 border border-blue-200">
                                        <FaIcons.FaBell size={11} className="animate-pulse" />
                                        {newRepliesCount} New
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Reply sort: Recent top (default), Oldest first, Most liked */}
                                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200">
                                    <span className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider self-center">Sort</span>
                                    <button
                                        onClick={() => setReplySortOrder("newest")}
                                        className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${
                                            replySortOrder === "newest"
                                                ? "bg-teal-100 text-teal-800 shadow-sm border border-teal-200"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                        title="Newest replies first"
                                    >
                                        Recent top
                                    </button>
                                    <button
                                        onClick={() => setReplySortOrder("oldest")}
                                        className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${
                                            replySortOrder === "oldest"
                                                ? "bg-teal-100 text-teal-800 shadow-sm border border-teal-200"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                        title="Oldest replies first"
                                    >
                                        Oldest first
                                    </button>
                                    <button
                                        onClick={() => setReplySortOrder("top")}
                                        className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${
                                            replySortOrder === "top"
                                                ? "bg-teal-100 text-teal-800 shadow-sm border border-teal-200"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                        title="Most upvoted first"
                                    >
                                        Most liked
                                    </button>
                                </div>
                                {/* Approval Status Filter */}
                                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200">
                                    <button
                                        onClick={() => setReplyFilter("all")}
                                        className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${
                                            replyFilter === "all"
                                                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setReplyFilter("new")}
                                        className={`px-3 py-2 text-xs font-bold rounded-md transition-all relative ${
                                            replyFilter === "new"
                                                ? "bg-blue-100 text-blue-700 shadow-sm border border-blue-200"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        New
                                        {newRepliesCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                                                {newRepliesCount > 9 ? '9+' : newRepliesCount}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setReplyFilter("pending")}
                                        className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${
                                            replyFilter === "pending"
                                                ? "bg-amber-100 text-amber-700 shadow-sm border border-amber-200"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        onClick={() => setReplyFilter("approved")}
                                        className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${
                                            replyFilter === "approved"
                                                ? "bg-green-100 text-green-700 shadow-sm border border-green-200"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        Approved
                                    </button>
                                </div>
                                <div className="relative">
                                    <FaIcons.FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                    <input
                                        type="text"
                                        placeholder="Search replies..."
                                        defaultValue={replySearch}
                                        onChange={handleSearchChange}
                                        className="pl-9 pr-4 py-1.5 text-xs font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full sm:w-64"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {organizedReplies.length === 0 ? (
                                <div className="py-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <FaIcons.FaReply size={32} className="text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">No replies found</p>
                                </div>
                            ) : (
                                <>
                                    {organizedReplies.map(reply => (
                                        <ReplyItem
                                            key={reply._id}
                                            reply={reply}
                                            handleToggleReplyApproval={handleToggleReplyApproval}
                                            handleDeleteReply={handleDeleteReply}
                                            handleEditReply={handleEditReply}
                                            handleSaveReply={handleSaveReply}
                                            handleCancelEditReply={handleCancelEditReply}
                                            onReplyToReply={handleReplyToReply}
                                            editingReplyId={editingReplyId}
                                            editContent={editContent}
                                            setEditContent={setEditContent}
                                            isSaving={isSaving}
                                            discussionPerms={discussionPerms}
                                            thread={thread}
                                            depth={replySearch ? 0 : 0} // Flatten when searching
                                            isNewReply={isNewReply}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* New Replies Alert Section */}
                    {newRepliesCount > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200 shadow-lg animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                                    <FaIcons.FaBell className="text-white" size={16} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-900">New Replies Alert</h4>
                                    <p className="text-[10px] text-blue-700 font-medium">Unread activity detected</p>
                                </div>
                            </div>
                            <div className="bg-white/80 rounded-lg p-4 border border-blue-100 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold text-gray-600 uppercase">New Replies</span>
                                    <span className="text-2xl font-bold text-blue-600">{newRepliesCount}</span>
                                </div>
                                <p className="text-[10px] text-gray-500">
                                    {lastViewedAt 
                                        ? `Since ${lastViewedAt.toLocaleDateString()} ${lastViewedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : 'First time viewing this thread'
                                    }
                                </p>
                            </div>
                            <button
                                onClick={handleMarkAllAsViewed}
                                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md"
                            >
                                <FaIcons.FaCheckCircle size={13} />
                                Mark All as Viewed
                            </button>
                        </div>
                    )}

                    {/* Activity Stats */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                            Topic Performance
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        </h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                        <FaIcons.FaEye size={14} />
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-600 uppercase">Total Views</span>
                                </div>
                                <span className="text-lg font-bold text-gray-900">{thread.views || 0}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Score</p>
                                    <p className="text-xl font-bold text-gray-900">{(thread.upvotes?.length || 0) - (thread.downvotes?.length || 0)}</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-center">
                                    <p className="text-[10px] font-bold text-purple-500 uppercase mb-1">Saved</p>
                                    <p className="text-xl font-bold text-gray-900">{thread.subscribers?.length || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Context */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Hierarchical Context</h4>
                        <div className="space-y-3">
                            {[
                                { label: 'Exam', value: thread.examId?.name || 'Global' },
                                { label: 'Subject', value: thread.subjectId?.name || 'N/A' },
                                { label: 'Unit', value: thread.unitId?.name || 'N/A' },
                                { label: 'Chapter', value: thread.chapterId?.name || 'N/A' },
                                { label: 'Topic', value: thread.topicId?.name || 'N/A' },
                                { label: 'SubTopic', value: thread.subTopicId?.name || 'N/A' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col gap-1.5 p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</span>
                                    <span className="text-xs font-bold text-gray-800">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Moderator Quick Actions */}
                    <div className="bg-gray-900 rounded-lg p-6 text-white shadow-lg shadow-blue-900/10">
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FaIcons.FaShieldAlt /> Guidelines
                        </h4>
                        <ul className="space-y-3">
                            {[
                                "Filter disrespectful behavior.",
                                "Verify solutions for accuracy.",
                                "Keep meta-links functional.",
                                "Standardize tags & categories."
                            ].map((rule, i) => (
                                <li key={i} className="flex gap-3 text-xs font-medium text-gray-400 leading-snug">
                                    <FaIcons.FaCheckCircle className="text-blue-500 mt-0.5" size={12} />
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReplyItem = ({ reply, handleToggleReplyApproval, handleDeleteReply, handleEditReply, handleSaveReply, handleCancelEditReply, onReplyToReply, editingReplyId, editContent, setEditContent, isSaving, discussionPerms, thread, depth = 0, isNewReply }) => {
    const isEditing = editingReplyId === reply._id;
    const isNew = isNewReply(reply.createdAt);

    return (
        <div className={`space-y-4 ${depth > 0 ? 'ml-6 sm:ml-10' : ''}`}>
            <div className={`p-5 rounded-lg border transition-all duration-300 relative group shadow-sm ${
                !reply.isApproved ? 'bg-amber-50/30 border-amber-100' : 
                isNew ? 'bg-blue-50/50 border-blue-200 border-l-4 border-l-blue-500' : 
                'bg-white border-gray-200'
            }`}>
                {depth > 0 && (
                    <div className="absolute -left-6 sm:-left-10 top-8 w-6 sm:w-10 h-px bg-gray-200"></div>
                )}
                {depth > 0 && (
                    <div className="absolute -left-6 sm:-left-10 -top-4 bottom-8 w-px bg-gray-200"></div>
                )}

                <div className="flex justify-between items-start gap-6">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shadow-sm ${reply.authorType === "User" ? "bg-blue-100 border border-blue-200" : "bg-indigo-50 border border-indigo-100"}`}>
                                {reply.authorType === "User" ? (
                                    <img src={BRAND_LOGO_URL} alt="Testprepkart" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px] font-bold text-indigo-700">{getReplyAuthorInitial(reply)}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs font-bold text-gray-900">{getReplyAuthorDisplayName(reply)}</p>
                                    {reply.authorType === "User" && (
                                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-bold uppercase tracking-wider rounded">Testprepkart</span>
                                    )}
                                    {isNew && (
                                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 animate-pulse">
                                            <FaIcons.FaCircle size={6} />
                                            NEW
                                        </span>
                                    )}
                                    {!reply.isApproved && (
                                        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-bold uppercase tracking-wider rounded">Pending</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium">{timeAgo(reply.createdAt)}</p>
                            </div>
                        </div>
                        {isEditing ? (
                            <div className="space-y-4">
                                <RichTextEditor
                                    value={editContent}
                                    onChange={setEditContent}
                                    placeholder="Edit reply content..."
                                    examId={thread?.examId?._id}
                                    subjectId={thread?.subjectId?._id}
                                    unitId={thread?.unitId?._id}
                                    chapterId={thread?.chapterId?._id}
                                    topicId={thread?.topicId?._id}
                                    subtopicId={thread?.subTopicId?._id}
                                    definitionId={thread?.definitionId?._id}
                                />
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                    <button
                                        onClick={() => handleSaveReply(reply._id)}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        {isSaving ? (
                                            <>
                                                <FaIcons.FaSpinner className="animate-spin" size={11} />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FaIcons.FaSave size={11} />
                                                Save
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancelEditReply}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        <FaIcons.FaTimes size={11} />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <RichContent html={reply.content} />
                        )}
                    </div>

                    {!isEditing && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onReplyToReply && (
                                <button
                                    onClick={() => onReplyToReply(reply._id, getReplyAuthorDisplayName(reply))}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all shadow-sm"
                                    title="Reply to this"
                                >
                                    <FaIcons.FaReply size={13} />
                                </button>
                            )}
                            <button
                                onClick={() => handleEditReply(reply._id, reply.content)}
                                className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                                title="Edit Reply"
                            >
                                <FaIcons.FaEdit size={13} />
                            </button>
                            {discussionPerms.canApproveReplies && (
                                <button
                                    onClick={() => handleToggleReplyApproval(reply._id, reply.isApproved)}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all border shadow-sm ${reply.isApproved ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                                    title={reply.isApproved ? "Revoke Approval" : "Approve Content"}
                                >
                                    {reply.isApproved ? <FaIcons.FaTimes size={13} /> : <FaIcons.FaCheck size={13} />}
                                </button>
                            )}
                            {discussionPerms.canDeleteReplies && (
                                <button
                                    onClick={() => handleDeleteReply(reply._id)}
                                    className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 hover:text-red-600 transition-all"
                                    title="Delete Response"
                                >
                                    <FaIcons.FaTrashAlt size={13} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {reply.children?.length > 0 && (
                <div className="space-y-4">
                    {reply.children.map(child => (
                        <ReplyItem
                            key={child._id}
                            reply={child}
                            handleToggleReplyApproval={handleToggleReplyApproval}
                            handleDeleteReply={handleDeleteReply}
                            handleEditReply={handleEditReply}
                            handleSaveReply={handleSaveReply}
                            handleCancelEditReply={handleCancelEditReply}
                            onReplyToReply={onReplyToReply}
                            editingReplyId={editingReplyId}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            isSaving={isSaving}
                            discussionPerms={discussionPerms}
                            thread={thread}
                            depth={depth + 1}
                            isNewReply={isNewReply}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ThreadDetailModeration;
