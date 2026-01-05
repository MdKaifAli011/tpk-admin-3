"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  FaSearch, FaPlus, FaFilter, FaFire, FaClock, FaComment, FaEye, FaShare,
  FaFlag, FaArrowLeft, FaThumbsUp, FaThumbsDown, FaCheckCircle, FaTimes,
  FaThumbtack, FaUser, FaPaperPlane, FaBullhorn, FaEllipsisV, FaBookmark, FaFilePdf,
  FaShieldAlt
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { marked } from "marked";
import DOMPurify from "dompurify";
import RichTextEditor from "@/app/(admin)/components/ui/RichTextEditor";
import Card from "./Card";
import Button from "./Button";
import DiscussionMetadata from "./DiscussionMetadata";

/* ---------- Persistent Guest Logic ---------- */
const getGuestIdentity = () => {
  if (typeof window === "undefined") return { id: null, name: null };
  let id = localStorage.getItem("tpk_guest_id");
  let name = localStorage.getItem("tpk_guest_name");

  if (!id) {
    id = "guest_" + Math.random().toString(36).substring(2, 9);
    name = "Guest_" + Math.floor(Math.random() * 9000 + 1000);
    localStorage.setItem("tpk_guest_id", id);
    localStorage.setItem("tpk_guest_name", name);
  }
  return { id, name };
};

/* ---------- Helpers ---------- */
const renderContent = (text = "") => {
  const html = marked.parse(text || "");
  return DOMPurify.sanitize(html);
};

const timeAgo = (date) => {
  if (!date) return "";
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

/* ---------- Sub-Components ---------- */

const VoteControl = ({ score, isLiked, isDisliked, onVote, size = "md", layout = "vertical" }) => {
  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col items-center' : 'items-center gap-2'} ${layout === 'vertical' ? 'w-10' : ''}`}>
      <button
        onClick={(e) => { e.stopPropagation(); onVote('upvote'); }}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ${isLiked ? 'text-orange-600 bg-orange-50 shadow-inner' : 'text-gray-400 hover:bg-gray-100'}`}
      >
        <FaThumbsUp size={size === 'sm' ? 12 : 16} />
      </button>
      <span className={`font-bold ${size === 'sm' ? 'text-[10px]' : 'text-sm'} ${isLiked ? 'text-orange-600' : isDisliked ? 'text-blue-600' : 'text-gray-700'}`}>
        {score || 0}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onVote('downvote'); }}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ${isDisliked ? 'text-blue-600 bg-blue-50 shadow-inner' : 'text-gray-400 hover:bg-gray-100'}`}
      >
        <FaThumbsDown size={size === 'sm' ? 12 : 16} />
      </button>
    </div>
  );
};

const TagBadge = ({ label }) => {
  const map = {
    Urgent: "bg-red-50 text-red-700 border-red-100",
    Hot: "bg-orange-50 text-orange-700 border-orange-100",
    Question: "bg-blue-50 text-blue-700 border-blue-100",
    Notes: "bg-emerald-50 text-emerald-700 border-emerald-100",
    General: "bg-gray-50 text-gray-700 border-gray-100",
    Exam: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all duration-300 border ${map[label] || map.General}`}>
      {label === "Hot" && <FaFire className="inline mr-1 text-[11px] mb-0.5" />}
      {label}
    </span>
  );
};

/* ---------- Thread Card ---------- */
const ThreadCard = ({ thread, onClick }) => {
  const borderColor = useMemo(() => {
    const mainTag = thread.tags?.[0];
    if (mainTag === "Urgent") return "border-l-red-500";
    if (mainTag === "Notes") return "border-l-emerald-500";
    if (mainTag === "Question") return "border-l-blue-500";
    return "border-l-indigo-500";
  }, [thread.tags]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onClick(thread.slug)}
      className="group"
    >
      <Card
        variant="standard"
        className={`overflow-hidden cursor-pointer border-l-4 ${borderColor} p-0`}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {thread.tags?.map(t => <TagBadge key={t} label={t} />)}
                {thread.isPinned && (
                  <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <FaThumbtack size={8} /> Pinned
                  </span>
                )}
                {!thread.isApproved && (
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <FaShieldAlt size={8} /> Pending Approval
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                {thread.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-4">
                {(thread.content || "").replace(/<[^>]+>/g, "").substring(0, 160)}...
              </p>

              <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    {thread.author?.avatar ? <img src={thread.author.avatar} alt="av" className="w-full h-full object-cover" /> : <FaUser size={10} className="text-gray-300" />}
                  </div>
                  <span className="font-semibold text-gray-700">
                    {thread.author?.firstName ? `${thread.author.firstName} ${thread.author.lastName}` : (thread.guestName || "Contributor")}
                  </span>
                </div>
                <span className="text-gray-300 hidden sm:block">•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <FaClock className="text-gray-400" size={10} /> {timeAgo(thread.createdAt)}
                </span>
                <span className="text-gray-300 hidden sm:block">•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <FaBookmark className="text-gray-400" size={10} /> {thread.chapterId?.name || "General"}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-sm">
                <FaComment className="text-blue-600" size={11} />
                <span className="text-xs font-bold text-gray-900 leading-none">{thread.replyCount || 0}</span>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider hidden sm:block">Replies</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold pr-0.5">
                <FaEye size={9} className="text-gray-300" /> {thread.views || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Top Answer Preview */}
        <div className="bg-slate-50/50 px-4 sm:px-5 py-2 border-t border-gray-100 flex items-center justify-between text-[11px] transition-colors">
          <div className="flex items-center gap-2 text-gray-500 truncate max-w-[85%]">
            {thread.isSolved ? (
              <>
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                  <FaCheckCircle size={8} />
                </div>
                <span className="truncate font-medium text-gray-600">
                  <span className="font-bold text-emerald-600">Solved:</span> Highlights from the community solution...
                </span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center">
                  <FaComment size={8} />
                </div>
                <span className="truncate font-medium text-gray-400">Waiting for a verified solution...</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 text-gray-300 hover:text-blue-600 transition-colors"><FaBookmark size={10} /></button>
            <button className="p-1 text-gray-300 hover:text-blue-600 transition-colors"><FaShare size={10} /></button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

/* ---------- Pagination Component ---------- */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="pt-10 flex items-center justify-center gap-3">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm font-bold text-[11px] uppercase tracking-wider"
      >
        <FaArrowLeft size={10} />
        <span className="hidden sm:inline">Prev</span>
      </button>

      <div className="flex items-center gap-1.5">
        {[...Array(totalPages)].map((_, i) => {
          const p = i + 1;
          const isEdges = p === 1 || p === totalPages;
          const isNear = Math.abs(p - currentPage) <= 1;

          if (isEdges || isNear) {
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-10 h-10 rounded-xl text-[11px] font-extrabold transition-all shadow-sm flex items-center justify-center ${currentPage === p ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-500 hover:text-blue-600'}`}
              >
                {p}
              </button>
            );
          }
          if (p === 2 || p === totalPages - 1) {
            return <span key={p} className="px-1 text-gray-300 font-bold">...</span>;
          }
          return null;
        })}
      </div>

      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm font-bold text-[11px] uppercase tracking-wider"
      >
        <span className="hidden sm:inline">Next</span>
        <FaArrowLeft size={10} className="rotate-180" />
      </button>
    </div>
  );
};

/* ---------- Success Modal Component ---------- */
const SuccessModal = ({ isOpen, onClose, title, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl shadow-blue-900/20 max-w-sm w-full overflow-hidden border border-blue-100"
          >
            <div className="absolute top-0 right-0 p-4">
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                <FaTimes size={14} />
              </button>
            </div>

            <div className="px-8 pt-10 pb-8 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg shadow-emerald-200">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <FaCheckCircle className="text-emerald-500" size={40} />
                </motion.div>
              </div>

              <h3 className="text-xl font-extrabold text-gray-900 mb-2 leading-tight">
                {title}
              </h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                {message}
              </p>

              <Button
                onClick={onClose}
                variant="primary"
                size="md"
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 font-bold text-sm tracking-wide"
              >
                Got it, thanks!
              </Button>
            </div>

            {/* Decorative element */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-600" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ---------- Thread Detail View ---------- */
const ThreadDetail = ({ slug, onBack, guestIdentity }) => {
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortState, setSortState] = useState("Most Upvoted");
  const [replyContent, setReplyContent] = useState("");
  const [replySearch, setReplySearch] = useState("");
  const [replyPage, setReplyPage] = useState(1);
  const [replyPagination, setReplyPagination] = useState({ pages: 1, total: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successContent, setSuccessContent] = useState({ title: "", message: "" });
  const editorRef = useRef(null);
  const repliesRef = useRef(null);
  const searchTimeout = useRef(null);

  const scrollToEditor = () => {
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToReplies = () => {
    repliesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { "x-guest-id": guestIdentity.id, "x-guest-name": guestIdentity.name };
      const sortParam = sortState === "Most Upvoted" ? "top" : "new";
      const url = `/discussion/threads/${slug}?sort=${sortParam}&replyPage=${replyPage}&replySearch=${replySearch}`;
      const res = await api.get(url, { headers });
      if (res.data.success) {
        setThread(res.data.data.thread);
        setReplies(res.data.data.replies);
        if (res.data.data.pagination) {
          setReplyPagination(res.data.data.pagination);
        }
      }
    } catch (error) {
      console.error("Failed to fetch thread", error);
    } finally {
      setLoading(false);
    }
  }, [slug, guestIdentity, sortState, replyPage, replySearch]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleVote = async (targetType, id, voteType) => {
    try {
      const endpoint = targetType === 'thread' ? `/discussion/threads/${slug}/vote` : `/discussion/replies/${id}/vote`;
      const headers = { "x-guest-id": guestIdentity.id, "x-guest-name": guestIdentity.name };
      const res = await api.post(endpoint, { voteType }, { headers });

      if (res.data.success) {
        if (targetType === 'thread') {
          setThread(prev => ({ ...prev, ...res.data.data, isLiked: voteType === 'upvote', isDisliked: voteType === 'downvote' }));
        } else {
          setReplies(prev => prev.map(r => r._id === id ? { ...r, ...res.data.data, isLiked: voteType === 'upvote', isDisliked: voteType === 'downvote' } : r));
        }
      }
    } catch (err) {
      console.error("Vote failed", err);
      if (err.response?.status === 403) alert(err.response.data.message);
    }
  };

  const handleSave = async () => {
    try {
      const headers = { "x-guest-id": guestIdentity.id, "x-guest-name": guestIdentity.name };
      const res = await api.post(`/discussion/threads/${slug}/subscribe`, {}, { headers });
      if (res.data.success) {
        setThread(prev => ({ ...prev, isSubscribed: res.data.isSubscribed }));
      }
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  const handleReport = async (targetType, id) => {
    const reason = prompt("Why are you reporting this post?");
    if (!reason) return;
    try {
      const endpoint = targetType === 'thread' ? `/discussion/threads/${slug}/report` : `/discussion/replies/${id}/report`;
      const headers = { "x-guest-id": guestIdentity.id, "x-guest-name": guestIdentity.name };
      const res = await api.post(endpoint, { reason }, { headers });
      if (res.data.success) alert("Report submitted successfully.");
    } catch (err) {
      console.error("Report failed", err);
      alert(err.response?.data?.message || "Failed to submit report.");
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Discussion link copied to clipboard!");
  };

  const handlePostReply = async (parentId = null, content = null) => {
    const finalContent = content || replyContent;
    if (!finalContent.trim() || !thread?._id) return;
    setIsSubmitting(true);
    try {
      const headers = { "x-guest-id": guestIdentity.id, "x-guest-name": guestIdentity.name };
      const res = await api.post("/discussion/replies", {
        threadId: thread._id,
        content: finalContent,
        parentReplyId: parentId
      }, { headers });
      setReplyContent("");

      const isApproved = res.data.data.isApproved;
      if (isApproved === false || (guestIdentity.id && isApproved === undefined)) {
        setSuccessContent({
          title: "Waiting for Approval",
          message: "thread is not aproved please wait for aproved by modrate teams or admin teams"
        });
      } else {
        setSuccessContent({
          title: "Reply Posted!",
          message: "Your contribution has been successfully shared with the community. Thank you for helping others learn!"
        });
      }

      setShowSuccessModal(true);
      fetchDetail();
    } catch (error) {
      console.error("Error posting reply", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nestedReplies = useMemo(() => {
    const map = {};
    const roots = [];
    replies.forEach(r => {
      const copy = { ...r, children: [] };
      map[r._id] = copy;
    });
    replies.forEach(r => {
      if (r.parentReplyId && map[r.parentReplyId]) {
        map[r.parentReplyId].children.push(map[r._id]);
      } else if (!r.parentReplyId || !map[r.parentReplyId]) {
        // If it's a root OR the parent isn't in this result set (common in search)
        roots.push(map[r._id]);
      }
    });
    return roots;
  }, [replies]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setReplySearch(value);
      setReplyPage(1);
    }, 500);
  };

  if (loading) return <div className="flex justify-center p-20"><FaEye className="animate-pulse text-indigo-400" size={30} /></div>;
  if (!thread) return <div className="text-center p-20">Thread not found. <button onClick={onBack} className="text-indigo-600 underline">Go Back</button></div>;

  return (
    <div className="pb-10 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Detail Header */}
      <div className="flex items-center justify-between mb-4 sticky top-0 md:relative bg-white/80 backdrop-blur z-10 py-2 border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider"
        >
          <FaArrowLeft size={10} /> Back to Forum
        </button>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            variant="ghost"
            size="sm"
            className={`flex items-center gap-2 font-bold text-[11px] px-3 py-1.5 rounded-lg border transition-all ${thread.isSubscribed ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
          >
            <FaBookmark size={10} className={thread.isSubscribed ? 'text-white' : 'text-gray-400'} />
            {thread.isSubscribed ? 'Saved' : 'Save Post'}
          </Button>
          <div className="flex items-center gap-1">
            <Button onClick={handleShare} variant="ghost" size="sm" className="p-2 text-gray-400 hover:bg-gray-50 flex items-center gap-1.5"><FaShare size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Share</span></Button>
            <Button onClick={() => handleReport('thread')} variant="ghost" size="sm" className="p-2 text-gray-400 hover:bg-gray-50 hover:text-red-500"><FaFlag size={14} /></Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card variant="standard" className="overflow-hidden mb-8 p-0 border-gray-200/60 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                {thread.tags?.map(t => <TagBadge key={t} label={t} />)}
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center"><FaBookmark size={8} /></span>
                  {thread.chapterId?.name || "General"}
                </div>
              </div>
              <span className="text-[10px] text-gray-300 font-bold tracking-widest">#{thread._id.slice(-4).toUpperCase()}</span>
            </div>

            <div className="px-6 md:px-10 pb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                {thread.title}
              </h1>

              {/* Enhanced Metadata Bar */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 mb-8">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Created</span>
                    <span className="text-[11px] font-bold text-gray-900">{timeAgo(thread.createdAt)}</span>
                  </div>
                  <div className="h-8 w-px bg-gray-200 self-center"></div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Last Activity</span>
                    <span className="text-[11px] font-bold text-gray-900">30 mins ago</span>
                  </div>
                </div>
                <div className="flex gap-8">
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Views</span>
                    <span className="text-[11px] font-bold text-gray-900">{thread.views || 0}</span>
                  </div>
                  <div className="h-8 w-px bg-gray-200 self-center"></div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Participants</span>
                    <div className="flex -space-x-1.5 pt-0.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center overflow-hidden">
                          <img src={`https://i.pravatar.cc/100?u=${i + 60}`} alt="user" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <div className="w-5 h-5 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-[7px] font-bold text-blue-600">+4</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex flex-col items-center gap-1.5 min-w-[32px]">
                  <button
                    onClick={() => handleVote('thread', null, 'upvote')}
                    className={`p-1 transition-all ${thread.isLiked ? 'text-blue-600 scale-110' : 'text-gray-300 hover:text-blue-500'}`}
                  >
                    <FaThumbsUp size={16} />
                  </button>
                  <span className="text-base font-bold text-gray-900">{thread.score || 0}</span>
                  <button
                    onClick={() => handleVote('thread', null, 'downvote')}
                    className={`p-1 transition-all ${thread.isDisliked ? 'text-red-500 scale-110' : 'text-gray-300 hover:text-red-500'}`}
                  >
                    <FaThumbsDown size={16} />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-white shadow-sm ring-2 ring-gray-50">
                      {thread.author?.avatar ? (
                        <img src={thread.author.avatar} alt="av" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-blue-600">{thread.author?.firstName?.[0] || thread.guestName?.[0] || "U"}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-gray-900 leading-none">{thread.author?.firstName ? `${thread.author.firstName} ${thread.author.lastName}` : (thread.guestName || "Contributor")}</h4>
                        <span className="bg-gray-100 text-gray-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">{thread.author?.role || "Student"}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium mt-1">Posted {timeAgo(thread.createdAt)} • <FaEye size={8} className="inline mr-1" /> {thread.views || 0}</p>
                    </div>
                  </div>

                  <div className="prose prose-sm prose-slate max-w-none text-gray-600 leading-relaxed text-[13px] mb-8"
                    dangerouslySetInnerHTML={{ __html: renderContent(thread.content) }}
                  />

                  {thread.attachments?.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 max-w-sm mb-8 transition-all hover:border-gray-200 group shadow-sm">
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
                        <FaFilePdf size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-extrabold text-gray-900 truncate">Syllabus_Guide_2024.pdf</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">2.4 MB</p>
                      </div>
                      <button className="p-2 text-gray-300 hover:text-blue-600 group-hover:bg-gray-50 rounded-lg transition-all"><FaPaperPlane size={12} /></button>
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-4">
                    <button
                      onClick={scrollToEditor}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-all uppercase tracking-wider group"
                    >
                      <FaComment size={12} /> Reply
                    </button>
                    <button
                      onClick={handleSave}
                      className={`flex items-center gap-1.5 text-[10px] font-bold transition-all uppercase tracking-wider group ${thread.isSubscribed ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                    >
                      <FaBookmark size={12} /> {thread.isSubscribed ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Replies Section */}
          <div className="space-y-6" ref={repliesRef}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <FaComment className="text-blue-600" size={14} />
                {replyPagination.total || replies.filter(r => !r.parentReplyId).length} Answers
              </h2>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Replies Input */}
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                  <input
                    type="text"
                    placeholder="Search in replies..."
                    defaultValue={replySearch}
                    onChange={handleSearchChange}
                    className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full sm:w-44 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sort:</span>
                  <select
                    className="bg-white border border-gray-200 px-3 py-1 text-[10px] font-bold text-gray-700 rounded-lg outline-none cursor-pointer focus:border-blue-500 transition-all"
                    value={sortState}
                    onChange={(e) => { setSortState(e.target.value); setReplyPage(1); }}
                  >
                    <option>Most Upvoted</option>
                    <option>Latest</option>
                  </select>
                </div>
              </div>
            </div>

            {replySearch && (
              <div className="mb-6 flex items-center justify-between text-[11px] text-gray-500 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <FaFilter size={10} />
                  </div>
                  <span>Showing results for "<span className="font-extrabold text-blue-700">{replySearch}</span>"</span>
                </div>
                <button
                  onClick={() => { setReplySearch(""); setReplyPage(1); }}
                  className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="space-y-8">
              {nestedReplies.length > 0 ? (
                <>
                  {nestedReplies.map(reply => (
                    <CommentItem
                      key={reply._id}
                      reply={reply}
                      onVote={(id, type) => handleVote('reply', id, type)}
                      onReply={handlePostReply}
                      onReport={(id) => handleReport('reply', id)}
                      onShare={handleShare}
                      depth={0}
                    />
                  ))}

                  {/* Reply Pagination Controls */}
                  <Pagination
                    currentPage={replyPage}
                    totalPages={replyPagination.pages}
                    onPageChange={(p) => { setReplyPage(p); scrollToReplies(); }}
                  />
                </>
              ) : (
                <div className="text-center py-24 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 animate-in fade-in duration-500">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-gray-100 text-gray-200">
                    <FaComment size={24} />
                  </div>
                  <h4 className="text-sm font-extrabold text-gray-800">No replies found</h4>
                  <p className="text-[11px] text-gray-400 mt-2 uppercase tracking-widest font-bold">Try adjusting your search or be the first to reply!</p>
                </div>
              )}
            </div>

            {/* Reply Editor */}
            <div ref={editorRef} className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5">
                <h3 className="text-base font-bold text-gray-900 mb-4">Your Answer</h3>
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-white transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
                  <RichTextEditor
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder="Type your answer here... Be helpful and polite!"
                    hideAdminTools={true}
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 border-t border-gray-100 pt-6">
                  <p className="text-[11px] text-gray-400 font-medium tracking-wide">
                    By posting, you agree to the <a href="#" className="text-blue-600 underline">Community Guidelines</a>.
                  </p>
                  <Button
                    onClick={() => handlePostReply()}
                    disabled={isSubmitting || !replyContent.trim()}
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto px-10 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 shadow-md"
                  >
                    {isSubmitting ? "Posting..." : "Post Answer"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <FaBullhorn size={12} />
              </div>
              <div className="flex-1">
                <h4 className="text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1">Remember to be kind</h4>
                <p className="text-[11px] text-blue-800/70 font-medium leading-relaxed">
                  We're all here to learn. Constructive criticism is welcome, but please be respectful to fellow students.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card variant="standard" className="p-5 border-gray-200/60 shadow-sm">
            <h3 className="text-[11px] font-extrabold text-gray-900 uppercase tracking-widest mb-4 border-b border-gray-50 pb-3">Related Topics</h3>
            <div className="space-y-5">
              {[
                { title: "Difference between Taxon and Category?", meta: "8 replies • Biology • Chapter 1", active: true },
                { title: "How to memorize the hierarchy of classification?", meta: "24 replies • Biology • Chapter 1" },
                { title: "Best reference books for Botany?", meta: "45 replies • General" }
              ].map((item, i) => (
                <a key={i} href="#" className="block group">
                  <p className={`text-[13px] font-bold leading-snug mb-1 transition-colors ${item.active ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'}`}>
                    {item.title}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.meta}</p>
                </a>
              ))}
            </div>
            <button className="w-full mt-6 py-2 px-4 rounded-xl border border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-all border-dashed">
              View all related discussions
            </button>
          </Card>

          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 border border-white/10 shadow-inner">
              <FaBullhorn className="text-white/80" size={18} />
            </div>
            <h4 className="text-sm font-extrabold mb-1.5 uppercase tracking-widest">Academic Integrity</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
              Maintain academic honesty and keep discussions respectful. Constructive dialogue empowers everyone.
            </p>
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successContent.title}
        message={successContent.message}
      />
    </div>
  );
};

/* ---------- Recursive Comment Item ---------- */
const CommentItem = ({ reply, onVote, onReply, onReport, onShare, depth = 0 }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [subReplyContent, setSubReplyContent] = useState("");
  const isAccepted = reply.isAccepted;

  // Render for nested items (depth > 0)
  if (depth > 0) {
    return (
      <div className="mt-5 pl-5 border-l-2 border-gray-100 animate-in fade-in slide-in-from-left-2 duration-300">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 shadow-xs">
            {reply.author?.avatar ? (
              <img src={reply.author.avatar} alt="av" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-gray-400">{reply.author?.firstName?.[0] || reply.guestName?.[0] || "U"}</span>
            )}
          </div>
          <span className="text-[12px] font-bold text-gray-900 leading-none">
            {reply.author?.firstName ? `${reply.author.firstName} ${reply.author.lastName}` : (reply.guestName || "Contributor")}
          </span>
          {reply.author?.role && (
            <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${reply.author.role === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {reply.author.role === 'admin' ? 'Author' : 'Student'}
            </span>
          )}
          <span className="text-gray-300">•</span>
          <span className="text-[10px] text-gray-400 font-medium">{timeAgo(reply.createdAt)}</span>
        </div>

        <div className="text-[12px] text-gray-600 leading-relaxed pl-1" dangerouslySetInnerHTML={{ __html: renderContent(reply.content) }} />

        <div className="flex items-center gap-4 mt-2.5 pl-1">
          <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => onVote(reply._id, 'upvote')}>
            <FaThumbsUp size={11} className={`transition-all ${reply.isLiked ? 'text-blue-600' : 'text-gray-300 group-hover:text-blue-500'}`} />
            <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-900">{reply.score || 0}</span>
          </div>
          <button onClick={() => setShowReplyForm(!showReplyForm)} className="text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-all uppercase tracking-wider">
            Reply
          </button>
        </div>

        {/* Nested Reply Form */}
        <AnimatePresence>
          {showReplyForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3">
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <textarea
                  className="w-full bg-transparent border-none p-3 text-[11px] font-medium text-gray-800 placeholder-gray-400 focus:ring-0 outline-none min-h-[80px] resize-none"
                  placeholder="Reply to this insight..."
                  value={subReplyContent}
                  onChange={(e) => setSubReplyContent(e.target.value)}
                />
                <div className="flex justify-end gap-2 p-2 bg-white border-t border-gray-100">
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] px-3" onClick={() => setShowReplyForm(false)}>Cancel</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-7 text-[10px] px-4"
                    onClick={() => { onReply(reply._id, subReplyContent); setSubReplyContent(""); setShowReplyForm(false); }}
                    disabled={!subReplyContent.trim()}
                  >
                    Post Reply
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deeply Recursive Children */}
        {reply.children?.length > 0 && (
          <div className="space-y-3">
            {reply.children.map(child => (
              <CommentItem key={child._id} reply={child} onVote={onVote} onReply={onReply} onReport={onReport} onShare={onShare} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render for top-level items (depth 0)
  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card
        variant="standard"
        hover={false}
        className={`relative flex gap-5 p-4 sm:p-5 transition-all duration-300 border-gray-200/60 shadow-sm ${isAccepted ? 'bg-emerald-50/20 border-emerald-200/60' : 'bg-white'}`}
      >
        {isAccepted && (
          <div className="absolute -top-3 right-6 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center shadow-sm z-10">
            <FaCheckCircle className="mr-1.5" size={10} /> Accepted Solution
          </div>
        )}

        <div className="flex flex-col items-center gap-1.5 min-w-[32px]">
          <button
            onClick={() => onVote(reply._id, 'upvote')}
            className={`p-1 transition-all ${reply.isLiked ? 'text-blue-600 scale-110' : 'text-gray-300 hover:text-blue-500'}`}
          >
            <FaThumbsUp size={14} />
          </button>
          <span className="text-[13px] font-bold text-gray-900">{reply.score || 0}</span>
          <button
            onClick={() => onVote(reply._id, 'downvote')}
            className={`p-1 transition-all ${reply.isDisliked ? 'text-red-500 scale-110' : 'text-gray-300 hover:text-red-500'}`}
          >
            <FaThumbsDown size={14} />
          </button>
          {isAccepted && <FaCheckCircle className="text-emerald-500 mt-2" size={14} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm ring-2 ring-white">
              {reply.author?.avatar ? (
                <img src={reply.author.avatar} alt="av" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-gray-400">{reply.author?.firstName?.[0] || reply.guestName?.[0] || "U"}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 leading-none">
                  {reply.author?.firstName ? `${reply.author.firstName} ${reply.author.lastName}` : (reply.guestName || "Contributor")}
                </span>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${reply.author?.role === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {reply.author?.role === 'admin' ? 'Teacher' : (reply.author?.role || 'Student')}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium mt-1">Answered {timeAgo(reply.createdAt)}</p>
            </div>
          </div>

          <div className="prose prose-sm prose-slate max-w-none text-gray-700 leading-relaxed text-[13px] mb-6"
            dangerouslySetInnerHTML={{ __html: renderContent(reply.content) }}
          />

          <div className="flex items-center gap-5 pt-3 border-t border-gray-50">
            <button onClick={() => setShowReplyForm(!showReplyForm)} className="text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-all flex items-center gap-1.5 uppercase tracking-wider">
              <FaComment size={10} /> Reply
            </button>
            <button onClick={onShare} className="text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-all flex items-center gap-1.5 uppercase tracking-wider">
              <FaShare size={10} /> Share
            </button>
            <button onClick={() => onReport?.(reply._id)} className="text-[10px] font-bold text-gray-400 hover:text-red-600 transition-all flex items-center gap-1.5 uppercase tracking-wider">
              <FaFlag size={10} /> Report
            </button>
          </div>

          <AnimatePresence>
            {showReplyForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-6">
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <textarea
                    className="w-full bg-transparent border-none p-4 text-xs font-medium text-gray-800 placeholder-gray-400 focus:ring-0 outline-none min-h-[100px] resize-none"
                    placeholder="Contribute your insights..."
                    value={subReplyContent}
                    onChange={(e) => setSubReplyContent(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 p-3 bg-white border-t border-gray-100">
                    <Button variant="ghost" size="sm" onClick={() => setShowReplyForm(false)}>Cancel</Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => { onReply(reply._id, subReplyContent); setSubReplyContent(""); setShowReplyForm(false); }}
                      disabled={!subReplyContent.trim()}
                    >
                      Post Reply
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recursive Rendering INSIDE the same Card Container */}
          {reply.children?.length > 0 && (
            <div className="mt-4 space-y-4">
              {reply.children.map(child => (
                <CommentItem
                  key={child._id}
                  reply={child}
                  onVote={onVote}
                  onReply={onReply}
                  onReport={onReport}
                  onShare={onShare}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

/* ---------- Main Discussion Forum Tab ---------- */

const DiscussionForumTab = ({ entityName, entityType, examId, subjectId, unitId, chapterId, topicId, subTopicId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const guestIdentity = useMemo(() => getGuestIdentity(), []);
  const currentThreadSlug = searchParams.get("thread");
  const isListView = !currentThreadSlug;

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  const [listPagination, setListPagination] = useState({ pages: 1, total: 0 });
  const [filter, setFilter] = useState("All");
  const [selectedTag, setSelectedTag] = useState("All Categories");
  const threadSearchTimeout = useRef(null);
  const isCreateView = searchParams.get("action") === "create";
  const view = currentThreadSlug ? "DETAIL" : (isCreateView ? "CREATE" : "LIST");

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTag, setNewTag] = useState("General");
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successContent, setSuccessContent] = useState({ title: "", message: "" });

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (examId) params.append("examId", examId);
      if (subjectId) params.append("subjectId", subjectId);
      if (unitId) params.append("unitId", unitId);
      if (chapterId) params.append("chapterId", chapterId);
      if (topicId) params.append("topicId", topicId);
      if (subTopicId) params.append("subTopicId", subTopicId);

      if (search) params.append("search", search);
      if (filter === "New") params.append("sort", "new");
      if (filter === "Hot") params.append("sort", "hot");
      if (selectedTag !== "All Categories") params.append("tag", selectedTag);
      params.append("page", listPage);
      params.append("limit", 10);

      const res = await api.get(`/discussion/threads?${params.toString()}`);
      if (res.data.success) {
        setThreads(res.data.data);
        if (res.data.pagination) setListPagination(res.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching threads", error);
    } finally {
      setLoading(false);
    }
  }, [examId, subjectId, unitId, chapterId, topicId, subTopicId, search, filter, selectedTag, listPage]);

  useEffect(() => {
    if (isListView) fetchThreads();
  }, [fetchThreads, isListView]);

  const handleThreadClick = (slug) => {
    const params = new URLSearchParams(searchParams);
    params.set("thread", slug);
    params.delete("action");
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  };

  const handleStartCreate = () => {
    const params = new URLSearchParams(searchParams);
    params.set("action", "create");
    params.delete("thread");
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  };

  const handleBack = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("thread");
    params.delete("action");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCreateThread = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsCreating(true);
    try {
      const headers = { "x-guest-id": guestIdentity.id, "x-guest-name": guestIdentity.name };
      const hierarchyParams = { examId, subjectId, unitId, chapterId, topicId, subTopicId };
      const res = await api.post("/discussion/threads", {
        title: newTitle,
        content: newContent,
        tags: [newTag],
        ...hierarchyParams
      }, { headers });
      setNewTitle("");
      setNewContent("");

      const isApproved = res.data.data.isApproved;
      if (isApproved === false || (guestIdentity.id && isApproved === undefined)) {
        setSuccessContent({
          title: "Waiting for Approval",
          message: "thread is not aproved please wait for aproved by modrate teams or admin teams"
        });
      } else {
        setSuccessContent({
          title: "Discussion Published!",
          message: "Your thread is now live! The community can now view, upvote, and reply to your discussion."
        });
      }
      setShowSuccessModal(true);

      const slug = res.data?.data?.slug;
      if (slug) setTimeout(() => handleThreadClick(slug), 1500); // Small delay to let user see success
      else fetchThreads();
    } catch (error) {
      console.error("Failed to create thread", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Prepare entity data for metadata
  const entityData = {
    name: entityName || "Discussion Forum",
    type: entityType,
    examId,
    subjectId,
    unitId,
    chapterId,
    topicId,
    subTopicId,
  };

  return (
    <div className="space-y-6 px-3 sm:px-4 py-3 sm:py-4">
      {/* SEO Metadata Updater for Thread Details */}
      {view === "DETAIL" && <DiscussionMetadata entityData={entityData} />}
      
      {/* Header Section */}
      {view === "LIST" && (
        <div className="mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Discussion Forum
          </h3>
          <p className="text-sm text-gray-700 leading-normal">
            Connect with peers studying {entityName || "this topic"}. Share insights, ask questions, and resolve queries together.
          </p>
        </div>
      )}
      <AnimatePresence mode="wait">
        {view === "CREATE" && (
          <motion.div
            key="create-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-4 sticky top-0 md:relative bg-white/80 backdrop-blur z-10 py-2 border-b border-gray-100">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider"
              >
                <FaArrowLeft size={10} /> Back to Forum
              </button>
            </div>

            <Card variant="standard" className="overflow-hidden border-gray-200/60 shadow-sm">
              <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FaPlus className="text-blue-600" size={16} /> Start a New Discussion
                </h3>
                <p className="text-[11px] text-gray-500 font-medium mt-1 uppercase tracking-wider">Share your thoughts or ask a question to the community</p>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest mb-2.5 block">Subject / Title</label>
                  <input
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm placeholder-gray-300"
                    placeholder="e.g. What is the most effective way to study anatomy?"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest mb-2.5 block">Discussion Category</label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none border-2 border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-800 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none cursor-pointer"
                        value={newTag} onChange={(e) => setNewTag(e.target.value)}
                      >
                        {["General", "Question", "Notes", "Urgent", "Exam"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <FaFilter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={12} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest mb-2.5 block">Visibility</label>
                    <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider italic">Public to all students</span>
                      <FaCheckCircle className="text-emerald-500" size={14} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-widest mb-2.5 block">Main Content</label>
                  <div className="border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm focus-within:border-blue-500 transition-all">
                    <RichTextEditor
                      value={newContent}
                      onChange={setNewContent}
                      placeholder="Write your discussion details here... Use the toolbar to format your text."
                      hideAdminTools={true}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-5 border-t bg-gray-50/30 gap-4">
                <p className="text-[10px] text-gray-400 font-medium">
                  By publishing, you agree to our <a href="#" className="text-blue-600 underline">Community Standards</a>.
                </p>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button variant="ghost" size="md" className="flex-1 sm:flex-none px-6 font-bold text-gray-500" onClick={handleBack}>Discard</Button>
                  <Button
                    onClick={handleCreateThread}
                    disabled={isCreating || !newTitle.trim() || !newContent.trim()}
                    variant="primary"
                    size="md"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold bg-blue-600 shadow-lg shadow-blue-200"
                  >
                    {isCreating ? "Publishing..." : <><FaPaperPlane size={14} /> Publish Discussion</>}
                  </Button>
                </div>
              </div>
            </Card>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <FaBullhorn size={12} />
              </div>
              <div className="flex-1">
                <h4 className="text-[11px] font-bold text-orange-900 uppercase tracking-wider mb-1">Moderation Notice</h4>
                <p className="text-[11px] text-orange-800/70 font-medium leading-relaxed">
                  Every post is reviewed by our moderation team. Ensuring your content is helpful and respectful creates a better learning hub for everyone.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {
        view === "DETAIL" && (
          <ThreadDetail slug={currentThreadSlug} onBack={handleBack} guestIdentity={guestIdentity} />
        )
      }
      {
        view === "LIST" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Communities Banner */}
            <Card variant="gradient" className="p-4 sm:p-5 border-indigo-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="max-w-xl">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
                    Welcome to the Hub
                  </h3>
                  <p className="text-xs text-gray-600 font-medium">
                    Engage with a community of over 120+ active students. Get instant help and share your learning journey.
                  </p>

                </div>
                <div className="flex items-center gap-3 bg-white/80 p-2.5 rounded-lg border border-white shadow-sm self-start md:self-auto">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden bg-gray-100 z-${i * 10}`}>
                        <img src={`https://i.pravatar.cc/100?u=${i + 20}`} alt="user" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div className="w-7 h-7 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white z-30 shadow-md">
                      +124
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-900 uppercase tracking-wider leading-none mb-0.5">Active Now</span>
                    <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> Discussion Hub
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Search & Filters */}
            <div className="py-2">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full group">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={14} />
                  <input
                    type="text" placeholder="Search discussions, topics, or peers..."
                    className="w-full pl-11 pr-5 py-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-800 placeholder-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none shadow-sm"
                    defaultValue={search}
                    onChange={(e) => {
                      if (threadSearchTimeout.current) clearTimeout(threadSearchTimeout.current);
                      threadSearchTimeout.current = setTimeout(() => {
                        setSearch(e.target.value);
                        setListPage(1);
                      }, 500);
                    }}
                  />
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                    {["All", "New", "Hot"].map(t => (
                      <button key={t} onClick={() => { setFilter(t); setListPage(1); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${filter === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
                        {t === "Hot" && <FaFire className="text-orange-500" />} {t}
                      </button>
                    ))}
                  </div>

                  <div className="relative shrink-0">
                    <select
                      className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-gray-700 outline-none focus:border-blue-500 transition shadow-sm cursor-pointer pr-10"
                      value={selectedTag}
                      onChange={(e) => { setSelectedTag(e.target.value); setListPage(1); }}
                    >
                      {["All Categories", "General", "Question", "Notes", "Urgent", "Exam"].map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                    <FaFilter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={10} />
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleStartCreate}
                    className="flex items-center gap-2 shrink-0 py-[10px]"
                  >
                    <FaPlus size={12} /> Start Post
                  </Button>
                </div>
              </div>
            </div>

            {search && (
              <div className="flex items-center justify-between text-[11px] text-gray-500 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <FaSearch size={10} />
                  </div>
                  <span>Showing results for "<span className="font-extrabold text-blue-700">{search}</span>"</span>
                </div>
                <button
                  onClick={() => { setSearch(""); setListPage(1); }}
                  className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Guidelines Banner */}
            <Card variant="standard" className="p-4 flex flex-col md:flex-row items-center gap-4 overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-1000 group-hover:scale-110"></div>
              <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-blue-50">
                <FaBullhorn size={20} />
              </div>
              <div className="flex-1 text-center md:text-left relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-2 mb-1">
                  <h4 className="text-base font-bold text-gray-900 leading-none">Participation Guidelines</h4>
                  <span className="bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active Community</span>
                </div>
                <p className="text-xs text-gray-600 font-medium leading-relaxed max-w-3xl">
                  Maintain academic integrity. Be respectful and supportive. High-quality answers help the entire community study better.
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2.5">
                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded border border-blue-100 shadow-sm"><FaCheckCircle size={8} /> Verified Hub</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <FaClock size={8} className="text-gray-300" /> Latest Sync: 2h ago
                  </span>
                </div>
              </div>
            </Card>

            {/* Thread List */}
            <div className="space-y-3">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-32 rounded-lg bg-gray-50 border border-gray-100 animate-pulse" />)
              ) : threads.length > 0 ? (
                <>
                  {threads.map(thread => <ThreadCard key={thread._id} thread={thread} onClick={handleThreadClick} />)}

                  {/* List Pagination */}
                  <Pagination
                    currentPage={listPage}
                    totalPages={listPagination.pages}
                    onPageChange={(p) => { setListPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  />
                </>
              ) : (
                <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200 animate-in fade-in duration-500">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-gray-100 text-gray-200">
                    <FaComment size={24} />
                  </div>
                  <h4 className="text-sm font-extrabold text-gray-800">No discussions found</h4>
                  <p className="text-[11px] text-gray-400 mt-2 uppercase tracking-widest font-bold">Try adjusting your filters or be the first to start a topic!</p>
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <Card variant="standard" className="p-4 flex items-center justify-between group hover:border-blue-300 transition-colors">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Discussions</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">1,200+</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><FaComment size={16} /></div>
              </Card>
              <Card variant="standard" className="p-4 flex items-center justify-between group hover:border-emerald-300 transition-colors">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Solved</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600">850+</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><FaCheckCircle size={16} /></div>
              </Card>
              <Card variant="standard" className="p-4 flex items-center justify-between group hover:border-purple-300 transition-colors">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Active Peers</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">340+</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><FaUser size={16} /></div>
              </Card>
            </div>
          </motion.div>
        )
      }

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successContent.title}
        message={successContent.message}
      />
    </div>
  );
};

export default DiscussionForumTab;
