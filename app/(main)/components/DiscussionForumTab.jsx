"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  FaSearch,
  FaPlus,
  FaFilter,
  FaFire,
  FaClock,
  FaComment,
  FaEye,
  FaShare,
  FaFlag,
  FaArrowLeft,
  FaThumbsUp,
  FaCheckCircle,
  FaCheck,
  FaEllipsisH,
  FaPaperPlane,
  FaTimes,
  FaThumbtack
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

// Helper: Time Ago
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

// --- Components ---

// 1. Thread List Item
const ThreadCard = ({ thread, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={() => onClick(thread.slug)}
      className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-indigo-100 transition-all duration-300 cursor-pointer mb-4 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {thread.isPinned && (
             <span className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border border-indigo-200 uppercase tracking-widest shadow-sm">
                <FaThumbtack className="text-[10px]" /> Pinned
             </span>
          )}
          {thread.tags?.map((tag, idx) => (
            <span key={idx} className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${tag === 'Urgent' ? 'bg-red-50 text-red-600 border border-red-100' :
                tag === 'Hot' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                  tag === 'Notes' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    tag === 'Question' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      'bg-gray-50 text-gray-600 border border-gray-100'
              }`}>
              {tag}
            </span>
          ))}
          {thread.isSolved && (
            <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold border border-green-100 uppercase tracking-wide">
              <FaCheckCircle /> Solved
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-400 font-medium">
          {timeAgo(thread.createdAt)}
        </span>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
        {thread.title}
      </h3>

      <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">
        {thread.content.replace(/<[^>]+>/g, '')}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="flex items-center gap-3">
          {thread.author?.avatar ? (
            <img src={thread.author.avatar} alt="avatar" className="w-6 h-6 rounded-full ring-2 ring-white" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-[9px] ring-2 ring-white shadow-sm">
              {thread.author?.firstName?.[0] || "?"}
            </div>
          )}
          <span className="text-xs font-semibold text-gray-700">
            {thread.author?.firstName} {thread.author?.lastName}
          </span>
        </div>

        <div className="flex items-center gap-4 text-gray-400 text-xs font-medium">
          <div className="flex items-center gap-1.5 group-hover:text-indigo-500 transition-colors">
            <FaComment className="" />
            <span>{thread.replyCount || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 group-hover:text-indigo-500 transition-colors">
            <FaEye className="" />
            <span>{thread.views || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 group-hover:text-indigo-500 transition-colors">
            <FaThumbsUp />
            <span>{thread.upvotes?.length || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 2. Thread Detail View
const ThreadDetail = ({ slug, onBack }) => {
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch detail
  const fetchDetail = useCallback(async () => {
    try {
      const res = await api.get(`/discussion/threads/${slug}`);
      if (res.data.success) {
        setThread(res.data.data.thread);
        setReplies(res.data.data.replies);
      }
    } catch (error) {
      console.error("Failed to fetch thread", error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleLike = async () => {
      if (!thread) return;
      // Optimistic update could be done here, but safe fetch first
      try {
        const res = await api.post(`/discussion/threads/${thread.slug}/like`);
        if (res.data.success) {
            setThread(prev => ({ ...prev, upvotes: res.data.data }));
        }
      } catch (err) {
        console.error("Like failed", err);
      }
  };

  const handleLikeReply = async (replyId) => {
      try {
        const res = await api.post(`/discussion/replies/${replyId}/like`);
        if (res.data.success) {
            setReplies(prev => prev.map(r => {
                if (r._id === replyId) {
                    // Toggle locally based on success, assuming API returns updated upvotes list
                    return { ...r, upvotes: res.data.data, isLiked: !r.isLiked };
                }
                return r;
            }));
        }
      } catch (err) {
        console.error("Like reply failed", err);
      }
  };

  const handlePostReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post("/discussion/replies", {
        threadId: thread._id,
        content: replyContent,
      });

      setReplyContent("");
      fetchDetail(); // Refresh
    } catch (error) {
      console.error("Error posting reply", error);
      alert("Failed to post reply. " + (error.response?.data?.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
      <p className="text-gray-500 text-sm font-medium">Loading discussion...</p>
    </div>
  );

  if (!thread) return (
    <div className="text-center py-20">
      <p className="text-red-500 mb-4">Thread not found</p>
      <button onClick={onBack} className="text-indigo-600 hover:underline">Go Back</button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className=""
    >
      {/* Header / Nav */}
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50/95 backdrop-blur py-3 z-10 border-b border-gray-200/50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-medium transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <FaArrowLeft className="text-xs" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
            <FaFlag className="text-gray-400" /> Report
          </button>
          <button className="p-2 text-gray-400 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg hover:border-indigo-200 hover:shadow-sm transition-all">
            <FaShare />
          </button>
        </div>
      </div>

      {/* Main Question */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6">
        <div className="flex gap-6">
          {/* Vote Column */}
          <div className="hidden sm:flex flex-col items-center gap-1 text-gray-400">
            <button 
              onClick={handleLike} 
              className={`p-2 rounded-lg transition-colors ${thread.isLiked ? 'text-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-200' : 'hover:text-indigo-600 hover:bg-indigo-50'}`}
              title={thread.isLiked ? "Unlike" : "Like"}
            >
              <FaThumbsUp className="text-xl" />
            </button>
            <span className={`font-bold text-sm ${thread.isLiked ? 'text-indigo-600' : 'text-gray-700'}`}>{thread.upvotes?.length || 0}</span>
          </div>

          {/* Content Column */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {thread.tags?.map(tag => (
                <span key={tag} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">{tag}</span>
              ))}
              <span className="text-gray-400 text-xs flex items-center gap-1">
                <FaClock className="text-[10px]" /> Posted {timeAgo(thread.createdAt)}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-5 leading-tight">{thread.title}</h1>

            <div className="prose prose-sm md:prose-base prose-indigo max-w-none text-gray-600 mb-8 whitespace-pre-line leading-relaxed">
              {thread.content}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3">
                {thread.author?.avatar ? (
                  <img src={thread.author.avatar} className="w-10 h-10 rounded-full ring-2 ring-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                    {thread.author?.firstName?.[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-gray-900">{thread.author?.firstName} {thread.author?.lastName}</p>
                  <p className="text-xs text-indigo-500 font-medium">{thread.author?.role || "Student"}</p>
                </div>
              </div>
              <div className="text-xs font-medium text-gray-400 flex gap-4 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <span>{thread.views || 0} Views</span>
                <span className="w-px h-3 bg-gray-300 self-center"></span>
                <span>{thread.activeParticipants || 1} Participants</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Answers Section */}
      <div className="mb-8">
        <div className="flex items-center href-between mb-4 px-2">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-sm">{replies.length}</span>
            Answers
          </h3>
        </div>

        <div className="space-y-4">
          {replies.map((reply, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={reply._id}
              className={`bg-white rounded-xl shadow-sm border p-6 ${reply.isAccepted ? 'border-emerald-200 ring-1 ring-emerald-50 bg-emerald-50/10' : 'border-gray-200'}`}
            >
              {reply.isAccepted && (
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold mb-4 bg-emerald-100 w-fit px-3 py-1 rounded-full border border-emerald-200">
                  <FaCheckCircle /> Accepted Solution
                </div>
              )}
              <div className="flex gap-4">
                <div className="hidden sm:flex flex-col items-center gap-1 text-gray-400">
                  <button 
                    onClick={() => handleLikeReply(reply._id)}
                    className={`p-1.5 rounded-lg transition-colors ${reply.isLiked ? 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200' : 'hover:text-indigo-600 hover:bg-indigo-50'}`}
                  >
                     <FaThumbsUp className="text-sm" />
                  </button>
                  <span className={`text-xs font-bold ${reply.isLiked ? 'text-indigo-600' : 'text-gray-500'}`}>{reply.upvotes?.length || 0}</span>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                        {reply.author?.firstName?.[0]}
                      </div>
                      <span className="text-sm font-bold text-gray-900">{reply.author?.firstName} {reply.author?.lastName}</span>
                      <span className="text-xs text-gray-400">• {timeAgo(reply.createdAt)}</span>
                    </div>
                  </div>

                  <div className="text-gray-700 text-sm mb-4 leading-relaxed whitespace-pre-wrap">
                    {reply.content}
                  </div>

                  <div className="flex items-center gap-4 border-t border-gray-50 pt-3">
                    <button className="text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors">Reply</button>
                    <button className="text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors">Share</button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Your Answer Input */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Your Answer</h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all shadow-inner bg-gray-50/50">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Type your answer here... Be helpful and polite!"
            className="w-full p-4 h-32 outline-none text-sm text-gray-700 resize-none bg-transparent"
          />
        </div>
        <div className="flex items-center justify-end mt-4">
          <button
            onClick={handlePostReply}
            disabled={isSubmitting || !replyContent.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-sm hover:shadow-indigo-200"
          >
            {isSubmitting ? 'Posting...' : <><FaPaperPlane className="text-xs" /> Post Answer</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main Layout Component ---

const DiscussionForumTab = ({
  entityType,
  entityName,
  examId, subjectId, unitId, chapterId, topicId, subTopicId
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentThreadSlug = searchParams.get("thread");
  const isListView = !currentThreadSlug;

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All"); // All, New, Hot
  const [activeTopic, setActiveTopic] = useState("All Topics");

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Data for Create Modal
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTag, setNewTag] = useState("General");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch Threads 
  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Hierarchy filters
      if (examId) params.append("examId", examId);
      if (subjectId) params.append("subjectId", subjectId);
      if (unitId) params.append("unitId", unitId);
      if (chapterId) params.append("chapterId", chapterId);
      if (topicId) params.append("topicId", topicId);

      // Sort/Filter
      if (search) params.append("search", search);
      if (filter === 'New') params.append("sort", "new");
      if (filter === 'Hot') params.append("sort", "hot");
      if (activeTopic !== 'All Topics') params.append("tag", activeTopic);

      const res = await api.get(`/discussion/threads?${params.toString()}`);
      if (res.data.success) {
        setThreads(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching threads", error);
    } finally {
      setLoading(false);
    }
  }, [examId, subjectId, unitId, chapterId, topicId, search, filter, activeTopic]);

  useEffect(() => {
    if (isListView) {
      fetchThreads();
    }
  }, [fetchThreads, isListView]);

  // Handlers
  const handleThreadClick = (slug) => {
    const params = new URLSearchParams(searchParams);
    params.set("thread", slug);
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  };

  const handleBack = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("thread");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCreateThread = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsCreating(true);
    try {
      const res = await api.post("/discussion/threads", {
        title: newTitle,
        content: newContent,
        tags: [newTag],
        // Context
        examId, subjectId, unitId, chapterId, topicId, subTopicId
      });

      setShowCreateModal(false);
      setNewTitle("");
      setNewContent("");
      // fetchThreads(); // No need to fetch list if we open it
      
      // Auto-open the new thread
      if (res.data?.data?.slug) {
         handleThreadClick(res.data.data.slug);
      } else {
         fetchThreads();
      }
    } catch (error) {
      console.error("Failed to create thread", error);
      alert("Failed to create thread: " + (error.response?.data?.message || "Unknown error"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-gray-50/30 min-h-[600px] p-2 sm:p-6 rounded-2xl relative">

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-0 overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900">Start a New Discussion</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <FaTimes />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 tracking-wide">Discussion Title</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300 font-medium"
                    placeholder="e.g., How do I solve integration by parts?"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 tracking-wide">Category Tag</label>
                  <div className="relative">
                    <select
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none appearance-none bg-white focus:border-indigo-500 transition-all font-medium text-gray-700"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                    >
                      <option>General</option>
                      <option>Question</option>
                      <option>Notes</option>
                      <option>Urgent</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <FaFilter className="text-xs" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 tracking-wide">Content</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl p-4 text-sm h-40 resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300 leading-relaxed"
                    placeholder="Describe your question or discussion point in detail..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-6 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-white hover:shadow-sm rounded-xl text-sm transition-all border border-transparent hover:border-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateThread}
                  disabled={isCreating}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 text-sm disabled:opacity-50 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2"
                >
                  {isCreating ? 'Publishing...' : <><FaPaperPlane className="text-xs" /> Publish Discussion</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail View */}
      {!isListView && (
        <ThreadDetail slug={currentThreadSlug} onBack={handleBack} />
      )}

      {/* List View */}
      {isListView && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className=""
        >

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Discussion Forum</h2>
              <p className="text-gray-500 text-sm mt-1">
                Collaborate with peers studying <span className="font-semibold text-indigo-600">{entityName}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-purple-500' : 'bg-emerald-500'}`}>
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-600 font-medium">
                <span className="text-emerald-500 font-bold">124</span> online
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6 sticky top-0 bg-gray-50/95 py-3 z-10 backdrop-blur-md -mx-2 px-2 border-b border-transparent">
            <div className="relative flex-1 group">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search questions, topics, or keywords..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm shadow-sm transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
              <div className="flex bg-white rounded-xl p-1.5 border border-gray-200 shadow-sm shrink-0">
                {['All', 'New', 'Hot'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${filter === t ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                  >
                    {t === 'Hot' && <FaFire className="text-orange-500" />}
                    {t}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all shrink-0 whitespace-nowrap"
              >
                <FaPlus /> New Discussion
              </button>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-1 shadow-lg shadow-indigo-100 mb-8 overflow-hidden">
            <div className="bg-white/10 backdrop-blur-lg p-4 rounded-lg flex items-start gap-4">
              <div className="bg-white/20 p-2.5 rounded-lg text-white shrink-0">
                <FaFlag className="text-lg" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                  Community Guidelines
                  <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded text-white font-bold tracking-wider">PINNED</span>
                </h3>
                <p className="text-indigo-50 text-xs leading-relaxed opacity-90 max-w-2xl">
                  Keep discussions respectful and syllabus-focused. Duplicate threads will be removed. Help each other grow!
                </p>
              </div>
            </div>
          </div>

          {/* Thread List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-gray-100"></div>
              ))}
            </div>
          ) : (
            <div>
              {threads.length > 0 ? (
                <AnimatePresence>
                  {threads.map(thread => (
                    <ThreadCard key={thread._id} thread={thread} onClick={handleThreadClick} />
                  ))}
                </AnimatePresence>
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                       <FaComment className="text-indigo-200 text-3xl" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No discussions yet</h3>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">Be the first to start a conversation about {entityName}! Your question might help others.</p>
                    <button 
                       onClick={() => setShowCreateModal(true)}
                       className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors bg-indigo-50 px-6 py-2 rounded-full"
                    >
                       Start a Discussion
                    </button>
                 </div>
              )}
            </div>
          )}
          
        </motion.div>
      )}
    </div>
  );
};

export default DiscussionForumTab;
