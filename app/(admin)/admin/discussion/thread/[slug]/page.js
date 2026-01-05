"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import * as FaIcons from "react-icons/fa";
import { ToastContainer, useToast } from "../../../../components/ui/Toast";
import { LoadingSpinner } from "../../../../components/ui/SkeletonLoader";
import RichTextEditor from "../../../../components/ui/RichTextEditor";
import Link from "next/link";
import { usePermissions, getDiscussionPermissions, getDiscussionPermissionMessage } from "../../../../hooks/usePermissions";

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

const ThreadDetailModeration = () => {
    const { slug } = useParams();
    const router = useRouter();
    const [thread, setThread] = useState(null);
    const [replies, setReplies] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [replyPage, setReplyPage] = useState(1);
    const [replySearch, setReplySearch] = useState("");
    const [replyPagination, setReplyPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const { toasts, removeToast, success, error: showError } = useToast();
    const searchTimeout = React.useRef(null);

    // Edit State Management
    const [editingThread, setEditingThread] = useState(false);
    const [editingReplyId, setEditingReplyId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [originalContent, setOriginalContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Permissions
    const { role } = usePermissions();
    const discussionPerms = getDiscussionPermissions(role);

    const fetchDetail = async (page = 1, search = "") => {
        try {
            setIsDataLoading(true);
            const params = new URLSearchParams();
            params.append('replyPage', page);
            params.append('replyLimit', 10);
            if (search) params.append('replySearch', search);

            const res = await api.get(`/discussion/threads/${slug}?${params.toString()}`);
            if (res.data.success) {
                setThread(res.data.data.thread);
                setReplies(res.data.data.replies);
                if (res.data.data.pagination) setReplyPagination(res.data.data.pagination);
            }
        } catch (err) {
            console.error(err);
            showError("Failed to fetch discussion details");
        } finally {
            setIsDataLoading(false);
        }
    };

    useEffect(() => {
        if (slug) fetchDetail(replyPage, replySearch);
    }, [slug, replyPage]); // Intentionally exclude replySearch to handle via debounce

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setReplySearch(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setReplyPage(1); // Reset to page 1 on search
            fetchDetail(1, value);
        }, 500);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= replyPagination.pages) {
            setReplyPage(newPage);
        }
    };

    const handleToggleThreadApproval = async () => {
        if (!discussionPerms.canApproveThreads) {
            showError(getDiscussionPermissionMessage("approveThreads", role));
            return;
        }
        try {
            const newStatus = !thread.isApproved;
            const res = await api.patch(`/discussion/threads/${slug}`, {
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
                success("Reply deleted successfully");
                setReplies(replies.filter(r => r._id !== replyId));
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

    const handleSaveThread = async () => {
        if (!editContent.trim()) {
            showError("Content cannot be empty");
            return;
        }
        try {
            setIsSaving(true);
            const res = await api.patch(`/discussion/threads/${slug}`, {
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
                setReplies(replies.map(r => r._id === replyId ? { ...r, content: editContent } : r));
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

    // Organize replies into a tree structure
    const organizedReplies = useMemo(() => {
        if (replySearch) return replies; // Return flat list on search

        const map = {};
        const roots = [];

        // Initialize map
        replies.forEach(r => {
            map[r._id] = { ...r, children: [] };
        });

        // Build tree
        replies.forEach(r => {
            if (r.parentReplyId && map[r.parentReplyId]) {
                map[r.parentReplyId].children.push(map[r._id]);
            } else if (!r.parentReplyId) {
                roots.push(map[r._id]);
            }
            // Note: If parent isn't in this page/batch, it might be a root in this view or an orphan.
            // But since current API returns Roots for page + All Children, this logic holds for rendering the page's roots + their full subtrees.
        });

        return roots;
    }, [replies, replySearch]);

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
            <p className="text-sm text-gray-500 mt-1 mb-6">The topic you're looking for might have been deleted or is unavailable.</p>
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
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{thread.title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={getLiveUrl()}
                            target="_blank"
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <FaIcons.FaExternalLinkAlt size={12} /> Live View
                        </Link>
                        <button
                            onClick={handleEditThread}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <FaIcons.FaEdit size={12} />
                            Edit Content
                        </button>
                        {discussionPerms.canApproveThreads && (
                            <button
                                onClick={handleToggleThreadApproval}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${thread.isApproved
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
                                className="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-2 shadow-sm"
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
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-100 overflow-hidden shadow-sm">
                                        {thread.author?.avatar ? <img src={thread.author.avatar} alt="avatar" className="w-full h-full object-cover" /> : <FaIcons.FaUserCircle size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 leading-none">{thread.author?.firstName ? `${thread.author.firstName} ${thread.author.lastName}` : (thread.guestName || "Guest User")}</p>
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
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                        >
                                            <FaIcons.FaTimes size={12} />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="text-base text-gray-800 font-normal leading-relaxed thread-content-renderer"
                                    dangerouslySetInnerHTML={{ __html: thread.content }}
                                />
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

                    {/* Replies Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <FaIcons.FaCommentDots className="text-blue-500" />
                                Community Responses ({replyPagination.total})
                            </h3>
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
                                            editingReplyId={editingReplyId}
                                            editContent={editContent}
                                            setEditContent={setEditContent}
                                            isSaving={isSaving}
                                            discussionPerms={discussionPerms}
                                            thread={thread}
                                            depth={replySearch ? 0 : 0} // Flatten when searching
                                        />
                                    ))}

                                    {/* Pagination Controls */}
                                    {replyPagination.pages > 1 && (
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                Page {replyPage} of {replyPagination.pages}
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handlePageChange(replyPage - 1)}
                                                    disabled={replyPage === 1}
                                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-all"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => handlePageChange(replyPage + 1)}
                                                    disabled={replyPage === replyPagination.pages}
                                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-all"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
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

const ReplyItem = ({ reply, handleToggleReplyApproval, handleDeleteReply, handleEditReply, handleSaveReply, handleCancelEditReply, editingReplyId, editContent, setEditContent, isSaving, discussionPerms, thread, depth = 0 }) => {
    const isEditing = editingReplyId === reply._id;

    return (
        <div className={`space-y-4 ${depth > 0 ? 'ml-6 sm:ml-10' : ''}`}>
            <div className={`p-5 bg-white rounded-lg border transition-all duration-300 relative group shadow-sm ${!reply.isApproved ? 'bg-amber-50/30 border-amber-100' : 'border-gray-200'}`}>
                {depth > 0 && (
                    <div className="absolute -left-6 sm:-left-10 top-8 w-6 sm:w-10 h-px bg-gray-200"></div>
                )}
                {depth > 0 && (
                    <div className="absolute -left-6 sm:-left-10 -top-4 bottom-8 w-px bg-gray-200"></div>
                )}

                <div className="flex justify-between items-start gap-6">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-indigo-700 shadow-sm">
                                {reply.author?.firstName?.[0] || reply.guestName?.[0] || 'G'}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-900">{reply.author?.firstName ? `${reply.author.firstName} ${reply.author.lastName}` : (reply.guestName || "Guest User")}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{timeAgo(reply.createdAt)}</p>
                            </div>
                            {!reply.isApproved && (
                                <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-bold uppercase tracking-wider rounded">Pending</span>
                            )}
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
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <FaIcons.FaSpinner className="animate-spin" size={10} />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FaIcons.FaSave size={10} />
                                                Save
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancelEditReply}
                                        disabled={isSaving}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        <FaIcons.FaTimes size={10} />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="text-sm text-gray-700 leading-relaxed font-normal reply-content-renderer"
                                dangerouslySetInnerHTML={{ __html: reply.content }}
                            />
                        )}
                    </div>

                    {!isEditing && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleEditReply(reply._id, reply.content)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                                title="Edit Reply"
                            >
                                <FaIcons.FaEdit size={12} />
                            </button>
                            {discussionPerms.canApproveReplies && (
                                <button
                                    onClick={() => handleToggleReplyApproval(reply._id, reply.isApproved)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border shadow-sm ${reply.isApproved ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                                    title={reply.isApproved ? "Revoke Approval" : "Approve Content"}
                                >
                                    {reply.isApproved ? <FaIcons.FaTimes size={12} /> : <FaIcons.FaCheck size={12} />}
                                </button>
                            )}
                            {discussionPerms.canDeleteReplies && (
                                <button
                                    onClick={() => handleDeleteReply(reply._id)}
                                    className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 hover:text-red-600 transition-all"
                                    title="Delete Response"
                                >
                                    <FaIcons.FaTrashAlt size={12} />
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
                            editingReplyId={editingReplyId}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            isSaving={isSaving}
                            discussionPerms={discussionPerms}
                            thread={thread}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ThreadDetailModeration;
