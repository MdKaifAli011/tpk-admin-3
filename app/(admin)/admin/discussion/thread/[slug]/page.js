"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { FaTrash, FaCheck, FaTimes, FaArrowLeft, FaUser, FaReply } from "react-icons/fa";
import { ToastContainer, useToast } from "../../../../components/ui/Toast";
import { LoadingSpinner } from "../../../../components/ui/SkeletonLoader";

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

const ThreadDetailModeration = () => {
    const { slug } = useParams();
    const router = useRouter();
    const [thread, setThread] = useState(null);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toasts, removeToast, success, error: showError } = useToast();

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/discussion/threads/${slug}`);
            if (res.data.success) {
                setThread(res.data.data.thread);
                setReplies(res.data.data.replies);
            }
        } catch (err) {
            console.error(err);
            showError("Failed to fetch thread details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (slug) fetchDetail();
    }, [slug]);

    const handleDeleteReply = async (replyId) => {
        if (!confirm("Are you sure you want to delete this reply?")) return;
        try {
            const res = await api.delete(`/discussion/replies/${replyId}`);
            if (res.data.success) {
                success("Reply deleted");
                setReplies(replies.filter(r => r._id !== replyId));
            }
        } catch (err) {
            showError("Failed to delete reply");
        }
    }

    const handleToggleStatus = async (replyId, currentStatus) => {
        // This assumes you might want to add approval logic later. 
        // For now, let's just implement Delete as primary moderation.
        // If you add an 'isApproved' field to Schema later, this is where you'd toggle it.
    }

    if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner size="large" /></div>;
    if (!thread) return <div className="p-12 text-center text-red-500">Thread not found</div>;

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <FaArrowLeft className="text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Moderate Thread</h1>
            </div>

            {/* Main Thread Content */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{thread.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="font-medium text-gray-900">{thread.author?.firstName} {thread.author?.lastName}</span>
                            <span>• {timeAgo(thread.createdAt)}</span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{thread.tags?.[0]}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="text-center px-3 py-1 bg-blue-50 rounded text-blue-700 text-xs font-bold">
                            {thread.views} Views
                        </div>
                        <div className="text-center px-3 py-1 bg-green-50 rounded text-green-700 text-xs font-bold">
                            {thread.upvotes?.length || 0} Likes
                        </div>
                    </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{thread.content}</p>
            </div>

            {/* Replies Management */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FaReply className="text-gray-400" />
                        Replies ({replies.length})
                    </h3>
                </div>

                <div className="divide-y divide-gray-200">
                    {replies.length === 0 && <div className="p-8 text-center text-gray-500">No replies yet.</div>}
                    {replies.map(reply => (
                        <div key={reply._id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-700">
                                            {reply.author?.firstName?.[0] || <FaUser />}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900">{reply.author?.firstName} {reply.author?.lastName}</span>
                                        <span className="text-xs text-gray-400">• {timeAgo(reply.createdAt)}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm whitespace-pre-wrap pl-8">{reply.content}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Future: Approve/Deny buttons here */}
                                    <button
                                        onClick={() => handleDeleteReply(reply._id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Delete Reply"
                                    >
                                        <FaTrash size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ThreadDetailModeration;
