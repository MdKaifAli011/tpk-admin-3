"use client";
import React from "react";
import * as FaIcons from "react-icons/fa";
import Link from "next/link";

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

import { usePermissions, getDiscussionPermissions, getDiscussionPermissionMessage } from "../../hooks/usePermissions";
import { getThreadHierarchyQueryString } from "@/lib/discussionThreadQuery";

const DiscussionTable = ({
    threads,
    sortByViews = false,
    onToggleApproval,
    onDelete,
    onTogglePin
}) => {
    // Permissions
    const { role } = usePermissions();
    const discussionPerms = getDiscussionPermissions(role);

    // Helper to generate hierarchy signature - Move before useMemo to fix initialization error
    const getHierarchySignature = (thread) => {
        const parts = [
            thread.examId?._id || "gn",
            thread.subjectId?._id || "gn",
            thread.unitId?._id || "gn",
            thread.chapterId?._id || "gn",
            thread.topicId?._id || "gn",
            thread.subTopicId?._id || "gn",
            thread.definitionId?._id || "gn"
        ];
        return parts.join("-");
    };

    // Group threads - Now getHierarchySignature is available
    const groupedThreads = React.useMemo(() => {
        const groups = {};
        threads.forEach(thread => {
            const sig = getHierarchySignature(thread);
            if (!groups[sig]) {
                groups[sig] = {
                    hierarchy: thread, // Use the first thread as representative for hierarchy
                    items: []
                };
            }
            groups[sig].items.push(thread);
        });
        return Object.values(groups);
    }, [threads]);

    if (!threads || threads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-4">
                    <FaIcons.FaComment size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No Discussions Found</h3>
                <p className="text-sm text-gray-500 max-w-sm px-6">
                    When students or guests post discussions, they will appear here for moderation and engagement tracking.
                </p>
            </div>
        );
    }

    const HierarchyBreadcrumb = ({ thread, count }) => {
        const parts = [];
        if (thread.examId?.name) parts.push({ label: thread.examId.name, color: "#10B981" });
        if (thread.subjectId?.name) parts.push({ label: thread.subjectId.name, color: "#9333EA" });
        if (thread.unitId?.name) parts.push({ label: thread.unitId.name, color: "#0056FF" });
        if (thread.chapterId?.name) parts.push({ label: thread.chapterId.name, color: "#7C3AED" });
        if (thread.topicId?.name) parts.push({ label: thread.topicId.name, color: "#6366F1" });
        if (thread.subTopicId?.name) parts.push({ label: thread.subTopicId.name, color: "#EC4899" });
        if (thread.definitionId?.name) parts.push({ label: thread.definitionId.name, color: "#F59E0B" });

        if (parts.length === 0) return <span className="text-gray-500 font-medium text-sm">General Global Forum</span>;

        return (
            <div className="flex items-center gap-2 flex-wrap">
                {parts.map((part, index) => (
                    <React.Fragment key={index}>
                        <span
                            className="px-2.5 py-1 rounded-full text-white text-[10px] font-bold whitespace-nowrap shadow-sm"
                            style={{ backgroundColor: part.color }}
                        >
                            {part.label}
                        </span>
                        {index < parts.length - 1 && <span className="text-gray-300 text-[10px]">›</span>}
                    </React.Fragment>
                ))}
                {count > 0 && (
                    <span className="ml-2 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded-full">
                        {count} {parts[parts.length - 1]?.label.includes("Definition") ? "Definitions" : "Discussions"}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {groupedThreads.map((group, groupIndex) => (
                <div key={groupIndex} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    {/* Group Header */}
                    <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                        <HierarchyBreadcrumb thread={group.hierarchy} count={group.items.length} />
                    </div>

                    {/* Group Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Discussion Topic</th>
                                    <th className={`px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider w-32 ${sortByViews ? 'text-orange-600 bg-orange-50' : 'text-gray-400'}`}>
                                        <div className="flex items-center justify-center gap-1">
                                            <FaIcons.FaEye size={10} />
                                            Engagement
                                            {sortByViews && (
                                                <span className="bg-orange-600 text-white text-[8px] px-1.5 py-0.5 rounded-full ml-1">
                                                    TOP RANK
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-28">Replies</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-32">Context</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24">Status</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-40">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {group.items.map((thread) => (
                                    <tr key={thread._id} className="group hover:bg-blue-50/20 transition-all duration-300">
                                        {/* Topic & Author */}
                                        <td className="px-4 py-4 max-w-md">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {thread.isPinned && (
                                                        <span className="bg-orange-100 text-orange-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                                                            <FaIcons.FaThumbtack size={8} /> Pinned
                                                        </span>
                                                    )}
                                                    {thread.isSolved && (
                                                        <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                                                            <FaIcons.FaCheck size={8} /> Solved
                                                        </span>
                                                    )}
                                                    {thread.reports?.length > 0 && (
                                                        <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider animate-pulse">
                                                            <FaIcons.FaExclamationTriangle size={8} /> {thread.reports.length} Reports
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        {thread.tags?.[0] || 'General'}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                    {thread.title}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                                        <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 border border-gray-200 overflow-hidden">
                                                            {thread.author?.avatar ? <img src={thread.author.avatar} alt="avatar" className="w-full h-full object-cover" /> : <FaIcons.FaUserCircle size={10} />}
                                                        </div>
                                                        <span className="font-medium">
                                                            {thread.contributorDisplayName || thread.authorType === "User" || (thread.author?.role && String(thread.author.role).toLowerCase().includes("admin")) ? "TestPrepKart" : (thread.author?.firstName ? `${thread.author.firstName} ${thread.author.lastName}` : (thread.author?.name || thread.guestName || "Guest"))}
                                                        </span>
                                                    </div>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{timeAgo(thread.createdAt)}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Stats */}
                                        <td className="px-3 py-4">
                                            <div className="flex items-center justify-center gap-4">
                                                <div className={`flex flex-col items-center relative ${sortByViews ? 'animate-pulse' : ''}`}>
                                                    {sortByViews && (
                                                        <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">
                                                            #{group.items.indexOf(thread) + 1}
                                                        </div>
                                                    )}
                                                    <div className={`flex items-center gap-1 ${sortByViews ? 'bg-orange-100 px-2 py-1 rounded-lg border border-orange-200' : ''}`}>
                                                        <FaIcons.FaEye size={10} className={sortByViews ? 'text-orange-600' : 'text-gray-400'} />
                                                        <span className={`text-xs font-bold leading-none ${sortByViews ? 'text-orange-700' : 'text-gray-900'}`}>
                                                            {thread.views || 0}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[9px] font-medium uppercase tracking-wider mt-1 ${sortByViews ? 'text-orange-600' : 'text-gray-400'}`}>
                                                        Views
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-gray-900 leading-none">{(thread.upvotes?.length || 0) - (thread.downvotes?.length || 0)}</span>
                                                    <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1">Votes</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Replies: Total & Pending */}
                                        <td className="px-3 py-4 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-xs font-bold text-gray-900 leading-none">
                                                    {thread.totalReplies ?? thread.replyCount ?? 0}
                                                </span>
                                                <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Total</span>
                                                <span className="text-xs font-bold leading-none mt-1 text-amber-600">
                                                    {thread.pendingReplies ?? 0}
                                                </span>
                                                <span className="text-[9px] font-medium text-amber-600 uppercase tracking-wider">Pending</span>
                                            </div>
                                        </td>

                                        {/* Context (Reduced since it's in header, keeping specific items or Live Link) */}
                                        <td className="px-3 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <Link
                                                    href={(() => {
                                                        let path = "";
                                                        if (thread.examId?.slug) path += `/${thread.examId.slug}`;
                                                        if (thread.subjectId?.slug) path += `/${thread.subjectId.slug}`;
                                                        if (thread.unitId?.slug) path += `/${thread.unitId.slug}`;
                                                        if (thread.chapterId?.slug) path += `/${thread.chapterId.slug}`;
                                                        if (thread.topicId?.slug) path += `/${thread.topicId.slug}`;
                                                        if (thread.subTopicId?.slug) path += `/${thread.subTopicId.slug}`;
                                                        if (!path) return `/discussion?thread=${thread.slug}`;
                                                        return `${path}?tab=discussion&thread=${thread.slug}`;
                                                    })()}
                                                    target="_blank"
                                                    className="w-full max-w-[100px] py-1.5 bg-gray-50 border border-gray-200 rounded text-[9px] font-bold text-blue-600 hover:text-blue-800 hover:border-blue-200 uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                                                >
                                                    Live Forum <FaIcons.FaExternalLinkAlt size={7} />
                                                </Link>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-3 py-4 text-center">
                                            {thread.isApproved ? (
                                                <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-medium border border-green-200">
                                                    Approved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-medium border border-amber-200 animate-pulse">
                                                    Pending
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {discussionPerms.canApproveThreads ? (
                                                    <button
                                                        onClick={() => onToggleApproval(thread)}
                                                        className={`p-1.5 rounded-lg transition-colors border shadow-sm ${thread.isApproved ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                                                        title={thread.isApproved ? "Revoke Approval" : "Approve Topic"}
                                                    >
                                                        {thread.isApproved ? <FaIcons.FaTimes size={12} /> : <FaIcons.FaCheck size={12} />}
                                                    </button>
                                                ) : (
                                                    <button disabled className="p-1.5 rounded-lg bg-gray-100 text-gray-300 border border-gray-200 cursor-not-allowed">
                                                        <FaIcons.FaLock size={12} />
                                                    </button>
                                                )}

                                                <Link
                                                    href={(() => {
                                                        const q = getThreadHierarchyQueryString(thread);
                                                        return `/admin/discussion/thread/${thread.slug}${q ? `?${q}` : ""}`;
                                                    })()}
                                                    className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg shadow-sm hover:bg-blue-100 transition-colors"
                                                    title="Moderation Control"
                                                >
                                                    <FaIcons.FaShieldAlt size={12} />
                                                </Link>

                                                {discussionPerms.canPinThreads && (
                                                    <button
                                                        onClick={() => onTogglePin(thread)}
                                                        className={`p-1.5 rounded-lg transition-colors border shadow-sm ${thread.isPinned ? 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100 hover:text-orange-500 hover:border-orange-100'}`}
                                                        title={thread.isPinned ? "Unpin Topic" : "Pin Topic"}
                                                    >
                                                        <FaIcons.FaThumbtack size={12} />
                                                    </button>
                                                )}

                                                {discussionPerms.canDeleteThreads ? (
                                                    <button
                                                        onClick={() => onDelete(thread)}
                                                        className="p-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 transition-colors"
                                                        title="Delete Permanently"
                                                    >
                                                        <FaIcons.FaTrash size={12} />
                                                    </button>
                                                ) : (
                                                    <button disabled className="p-1.5 rounded-lg bg-gray-100 text-gray-300 border border-gray-200 cursor-not-allowed">
                                                        <FaIcons.FaTrash size={12} />
                                                    </button>
                                                )}
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
    );
};

export default DiscussionTable;
