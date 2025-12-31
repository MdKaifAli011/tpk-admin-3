"use client";
import React, { useState, useEffect, useRef } from "react";
import * as FaIcons from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import {
    LoadingSpinner,
    SkeletonPageContent,
    LoadingWrapper
} from "../ui/SkeletonLoader";
import DiscussionTable from "../table/DiscussionTable";

const DiscussionManagement = () => {
    const [threads, setThreads] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
    });

    const { toasts, removeToast, success, error: showError } = useToast();
    const isFetchingRef = useRef(false);

    const fetchThreads = async () => {
        isFetchingRef.current = true;
        try {
            setIsDataLoading(true);
            const res = await api.get(`/discussion/threads?page=${page}&limit=10&search=${search}&sort=new&status=${statusFilter}`);
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
    }, [page, search, statusFilter]);

    const handleToggleApproval = async (thread) => {
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

                {/* Filters & Control Bar */}
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                        {[
                            { id: "all", label: "All Posts", icon: <FaIcons.FaClipboardList size={10} /> },
                            { id: "pending", label: "Pending", icon: <FaIcons.FaHistory size={10} /> },
                            { id: "approved", label: "Approved", icon: <FaIcons.FaCheckCircle size={10} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${statusFilter === tab.id ? "bg-white text-blue-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"}`}
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
