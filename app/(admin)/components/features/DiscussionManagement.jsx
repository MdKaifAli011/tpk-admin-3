"use client";
import React, { useState, useEffect, useRef } from "react";
import {
    FaTrash,
    FaThumbtack,
    FaCheck,
    FaSearch,
    FaEye,
    FaComment,
    FaExternalLinkAlt,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import Link from "next/link";
// import { formatDistanceToNow } from "date-fns";

// Helper: Time Ago (Consistent with Main App)
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

const DiscussionManagement = () => {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const { toasts, removeToast, success, error: showError } = useToast();
    const isFetchingRef = useRef(false);

    const fetchThreads = async () => {
        // if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            setLoading(true);
            const res = await api.get(`/discussion/threads?page=${page}&limit=10&search=${search}&sort=new`);
            if (res.data.success) {
                setThreads(res.data.data);
                setTotalPages(res.data.pagination?.pages || 1);
            }
        } catch (err) {
            console.error("Error fetching threads:", err);
            showError("Failed to fetch threads");
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        fetchThreads();
    }, [page, search]); // Re-fetch on page or search change

    const handleDelete = async (thread) => {
        if (!confirm(`Are you sure you want to delete "${thread.title}"?`)) return;

        try {
            const res = await api.delete(`/discussion/threads/${thread.slug}`);
            if (res.data.success) {
                success("Thread deleted successfully");
                setThreads(threads.filter((t) => t._id !== thread._id));
            }
        } catch (err) {
            showError(err.response?.data?.message || "Failed to delete thread");
        }
    };

    const handleTogglePin = async (thread) => {
        try {
            const newStatus = !thread.isPinned;
            const res = await api.patch(`/discussion/threads/${thread.slug}`, {
                isPinned: newStatus,
            });
            if (res.data.success) {
                success(`Thread ${newStatus ? "pinned" : "unpinned"}`);
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
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Discussion Forum Management</h1>
                            <p className="text-sm text-gray-600 mt-1">Moderate threads, manage pins, and ensure community guidelines.</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search threads..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Thread List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex justify-center">
                            <LoadingSpinner size="large" />
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No threads found.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {threads.map((thread) => (
                                <div key={thread._id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {thread.isPinned && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><FaThumbtack size={10} /> PINNED</span>}
                                            {thread.isSolved && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><FaCheck size={10} /> SOLVED</span>}
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{thread.tags?.[0] || 'General'}</span>
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 truncate pr-4">
                                            {thread.title}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><FaComment /> {thread.replyCount}</span>
                                            <span className="flex items-center gap-1"><FaEye /> {thread.views || 0}</span>
                                            <span>by <span className="font-medium text-gray-800">{thread.author?.firstName} {thread.author?.lastName}</span></span>
                                            <span>• {timeAgo(thread.createdAt)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* View Link (Admin Detail) */}
                                        <Link
                                            href={`/admin/discussion/thread/${thread.slug}`}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Moderate Thread"
                                        >
                                            <FaEye size={14} />
                                        </Link>

                                        {/* Pin Toggle */}
                                        <button
                                            onClick={() => handleTogglePin(thread)}
                                            className={`p-2 rounded-lg transition-colors ${thread.isPinned ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'}`}
                                            title={thread.isPinned ? "Unpin Thread" : "Pin Thread"}
                                        >
                                            <FaThumbtack size={14} />
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDelete(thread)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Thread"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-200 flex justify-center gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-600">Page {page} of {totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DiscussionManagement;
