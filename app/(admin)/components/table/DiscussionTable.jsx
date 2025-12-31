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

const DiscussionTable = ({
    threads,
    onToggleApproval,
    onDelete,
    onTogglePin
}) => {
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

    const getHierarchyText = (thread) => {
        const parts = [];
        if (thread.examId?.name) parts.push(thread.examId.name);
        if (thread.subjectId?.name) parts.push(thread.subjectId.name);
        if (thread.unitId?.name) parts.push(thread.unitId.name);
        if (thread.chapterId?.name) parts.push(thread.chapterId.name);
        if (thread.topicId?.name) parts.push(thread.topicId.name);
        if (thread.subTopicId?.name) parts.push(thread.subTopicId.name);

        if (parts.length === 0) return "General Global Forum";
        return parts.join(" › ");
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discussion Topic</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Engagement</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Context</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {threads.map((thread) => (
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
                                            <span className="font-medium">{thread.author?.firstName ? `${thread.author.firstName} ${thread.author.lastName}` : (thread.guestName || "Guest")}</span>
                                        </div>
                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                        <span className="text-[10px] text-gray-400 font-medium">{timeAgo(thread.createdAt)}</span>
                                    </div>
                                </div>
                            </td>

                            {/* Stats */}
                            <td className="px-3 py-4">
                                <div className="flex items-center justify-center gap-4">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold text-gray-900 leading-none">{thread.views || 0}</span>
                                        <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1">Views</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold text-gray-900 leading-none">{thread.replyCount || 0}</span>
                                        <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1">Replies</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold text-gray-900 leading-none">{(thread.upvotes?.length || 0) - (thread.downvotes?.length || 0)}</span>
                                        <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1">Votes</span>
                                    </div>
                                </div>
                            </td>

                            {/* Context */}
                            <td className="px-3 py-4 text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {getHierarchyText(thread)}
                                    </span>
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
                                        className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase tracking-wider transition-colors"
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
                                    <button
                                        onClick={() => onToggleApproval(thread)}
                                        className={`p-1.5 rounded-lg transition-colors border shadow-sm ${thread.isApproved ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                                        title={thread.isApproved ? "Revoke Approval" : "Approve Topic"}
                                    >
                                        {thread.isApproved ? <FaIcons.FaTimes size={12} /> : <FaIcons.FaCheck size={12} />}
                                    </button>

                                    <Link
                                        href={`/admin/discussion/thread/${thread.slug}`}
                                        className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg shadow-sm hover:bg-blue-100 transition-colors"
                                        title="Moderation Control"
                                    >
                                        <FaIcons.FaShieldAlt size={12} />
                                    </Link>

                                    <button
                                        onClick={() => onDelete(thread)}
                                        className="p-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 transition-colors"
                                        title="Delete Permanently"
                                    >
                                        <FaIcons.FaTrash size={12} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DiscussionTable;
