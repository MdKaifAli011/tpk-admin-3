"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  FaTimes,
  FaThumbtack,
  FaUser,
  FaPaperPlane,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { marked } from "marked";
import DOMPurify from "dompurify";

/* ---------- Helpers ---------- */

const renderContent = (text = "") => {
  const html = marked.parse(text || "");
  return DOMPurify.sanitize(html);
};

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

/**
 * Markdown toolbar formatter – uses ref + setter so it works correctly.
 */
const applyFormat = (type, textareaRef, setValue) => {
  const textarea = textareaRef.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end) || "";
  let formatted = selected;

  switch (type) {
    case "bold":
      formatted = `**${selected || "bold text"}**`;
      break;
    case "italic":
      formatted = `*${selected || "italic text"}*`;
      break;
    case "underline":
      formatted = `<u>${selected || "underlined text"}</u>`;
      break;
    case "link": {
      const url = window.prompt("Enter link URL");
      if (!url) return;
      formatted = `[${selected || "link text"}](${url})`;
      break;
    }
    case "image": {
      const url = window.prompt("Enter image URL");
      if (!url) return;
      formatted = `![${selected || "image"}](${url})`;
      break;
    }
    default:
      return;
  }

  textarea.setRangeText(formatted, start, end, "end");
  setValue(textarea.value);
  textarea.focus();
};

/* ---------- Small UI Components ---------- */

const TagBadge = ({ label }) => {
  const map = {
    Urgent: "bg-red-50 text-red-600",
    Hot: "bg-orange-50 text-orange-600",
    Question: "bg-sky-50 text-sky-700",
    Notes: "bg-emerald-50 text-emerald-700",
    General: "bg-gray-50 text-gray-600",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
        map[label] || map.General
      }`}
    >
      {label}
    </span>
  );
};

/* ---------- Thread Card (list item) ---------- */

const ThreadCard = ({ thread, onClick }) => {
  const getBorder = (tag) => {
    switch (tag) {
      case "Urgent":
        return "border-l-red-500";
      case "Question":
        return "border-l-sky-500";
      case "Notes":
        return "border-l-emerald-500";
      case "Hot":
        return "border-l-orange-500";
      default:
        return "border-l-gray-300";
    }
  };

  const mainTag = thread.tags?.[0] || "General";
  const borderColor = getBorder(mainTag);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      onClick={() => onClick(thread.slug)}
      className={`bg-white rounded-xl border border-gray-100 shadow-[0_1px_4px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.09)] cursor-pointer group overflow-hidden mb-3 border-l-[4px] ${borderColor}`}
    >
      <div className="p-4 sm:p-5">
        {/* top meta row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {thread.isPinned && (
              <span className="flex items-center gap-1 bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shadow-sm">
                <FaThumbtack className="text-[9px]" /> Pinned
              </span>
            )}

            {thread.tags?.map((tag, idx) => (
              <TagBadge key={idx} label={tag} />
            ))}

            <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
              <FaClock className="text-[10px]" />
              {timeAgo(thread.createdAt)}
            </span>
          </div>

          {thread.isSolved && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wide">
              <FaCheckCircle className="text-xs" />
              Solved
            </div>
          )}
        </div>

        {/* title */}
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 mb-1.5 leading-snug group-hover:text-indigo-600 transition-colors">
          {thread.title}
        </h3>

        {/* content preview */}
        <p className="text-xs sm:text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">
          {(thread.content || "").replace(/<[^>]+>/g, "")}
        </p>

        {/* footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {thread.author?.avatar ? (
              <img
                src={thread.author.avatar}
                alt="avatar"
                className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                {thread.author?.firstName?.[0] || <FaUser className="text-[10px]" />}
              </div>
            )}
            <span className="text-xs font-medium text-slate-700">
              {thread.author?.firstName} {thread.author?.lastName}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <FaEye className="text-[11px]" />
              {thread.views || 0}
            </span>
            <span
              className={`flex items-center gap-1.5 ${
                thread.replyCount > 0
                  ? "bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md"
                  : "hover:text-slate-600"
              }`}
            >
              <FaComment className="text-[11px]" />
              {thread.replyCount || 0}
              <span className="hidden sm:inline"> Replies</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-slate-600">
              <FaThumbsUp className="text-[11px]" />
              {thread.upvotes?.length || 0}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ---------- Thread Detail View ---------- */

const ThreadDetail = ({ slug, onBack }) => {
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const replyRef = useRef(null);

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
    try {
      const res = await api.post(`/discussion/threads/${thread.slug}/like`);
      if (res.data.success) {
        setThread((prev) =>
          prev
            ? { ...prev, upvotes: res.data.data, isLiked: !prev.isLiked }
            : prev
        );
      }
    } catch (err) {
      console.error("Like failed", err);
    }
  };

  const handleLikeReply = async (replyId) => {
    try {
      const res = await api.post(`/discussion/replies/${replyId}/like`);
      if (res.data.success) {
        setReplies((prev) =>
          prev.map((r) =>
            r._id === replyId
              ? { ...r, upvotes: res.data.data, isLiked: !r.isLiked }
              : r
          )
        );
      }
    } catch (err) {
      console.error("Like reply failed", err);
    }
  };

  const handlePostReply = async () => {
    if (!replyContent.trim() || !thread?._id) return;
    setIsSubmitting(true);
    try {
      await api.post("/discussion/replies", {
        threadId: thread._id,
        content: replyContent,
      });
      setReplyContent("");
      fetchDetail();
    } catch (error) {
      console.error("Error posting reply", error);
      alert("Failed to post reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-200 border-b-indigo-600 animate-spin mb-3" />
        <p className="text-slate-400 text-sm font-medium">
          Loading discussion…
        </p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="text-center py-32">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <FaTimes className="text-red-500 text-xl" />
        </div>
        <h3 className="text-slate-900 font-semibold mb-2">Thread not found</h3>
        <button
          onClick={onBack}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold underline"
        >
          Return to forum
        </button>
      </div>
    );
  }

  return (
    <motion.div
      key={slug}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* top navigation row */}
      <div className="sticky top-0 z-20 flex items-center justify-between py-2 mb-2  backdrop-blur border-b border-gray-100">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white group-hover:border-indigo-300 group-hover:bg-indigo-50 transition">
            <FaArrowLeft className="text-[11px] text-black" />
          </div>
          <span className="hidden sm:inline text-black">Back to Forum</span>
        </button>

        <div className="flex items-center gap-2">
          <button className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition">
            <FaFire className="text-orange-500 text-xs" />
            Subscribe
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition">
            <FaShare className="text-xs" />
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-slate-400 hover:text-red-600 hover:border-red-300 transition">
            <FaFlag className="text-xs" />
          </button>
        </div>
      </div>

      {/* main question card */}
      <div className="mb-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2 text-[11px] font-medium text-slate-500">
          <div className="flex flex-wrap items-center gap-1.5">
            {thread.tags?.map((tag) => (
              <TagBadge key={tag} label={tag} />
            ))}
          </div>
          <span className="hidden sm:inline">•</span>
          <span>
            Asked{" "}
            <span className="font-semibold text-slate-900">
              {timeAgo(thread.createdAt)}
            </span>
          </span>
          <span>•</span>
          <span>
            Views{" "}
            <span className="font-semibold text-slate-900">
              {thread.views || 0}
            </span>
          </span>
        </div>

        <div className="flex gap-4 px-4 py-3 sm:px-5 sm:py-4">
          {/* votes */}
          <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
            <button
              onClick={handleLike}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition text-xs ${
                thread.isLiked
                  ? "bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200"
                  : "bg-gray-50 text-slate-400 hover:bg-gray-100 hover:text-indigo-600"
              }`}
            >
              <FaThumbsUp />
            </button>
            <span
              className={`text-xs font-semibold ${
                thread.isLiked ? "text-indigo-600" : "text-slate-700"
              }`}
            >
              {thread.upvotes?.length || 0}
            </span>
          </div>

          {/* content */}
          <div className="min-w-0 flex-1">
            <h1 className="mb-2 text-base md:text-lg font-semibold text-slate-900 leading-snug">
              {thread.title}
            </h1>

            <div
              className="prose prose-sm max-w-none text-slate-800 leading-relaxed prose-a:text-indigo-600 prose-img:rounded-lg"
              dangerouslySetInnerHTML={{
                __html: renderContent(thread.content),
              }}
            />

            {/* author chip */}
            <div className="mt-3 flex justify-end">
              <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-200 text-[11px] font-bold text-indigo-800">
                  {thread.author?.firstName?.[0] || "U"}
                </div>
                <div className="leading-tight">
                  <p className="text-[11px] font-semibold text-indigo-900">
                    {thread.author?.firstName} {thread.author?.lastName}
                  </p>
                  <p className="text-[10px] text-indigo-600">
                    {thread.author?.role || "Student"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* answers section */}
      <div className="mb-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {replies.length} Answers
          </h3>
          <div className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
            Sort by{" "}
            <span className="font-semibold text-slate-900">Most Upvoted</span>
          </div>
        </div>

        <div className="space-y-3">
          {replies.map((reply) => (
            <div
              key={reply._id}
              className={`flex gap-4 rounded-xl border bg-white px-4 py-3 sm:px-5 ${
                reply.isAccepted
                  ? "border-emerald-400 ring-1 ring-emerald-100"
                  : "border-gray-200"
              }`}
            >
              {/* vote column */}
              <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                <button
                  onClick={() => handleLikeReply(reply._id)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition text-xs ${
                    reply.isLiked
                      ? "bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200"
                      : "bg-gray-50 text-slate-400 hover:bg-gray-100 hover:text-indigo-600"
                  }`}
                >
                  <FaThumbsUp />
                </button>
                <span
                  className={`text-xs font-semibold ${
                    reply.isLiked ? "text-indigo-600" : "text-slate-600"
                  }`}
                >
                  {reply.upvotes?.length || 0}
                </span>
                {reply.isAccepted && (
                  <FaCheckCircle
                    className="mt-1 text-emerald-500 text-sm"
                    title="Accepted solution"
                  />
                )}
              </div>

              {/* answer content */}
              <div className="min-w-0 flex-1">
                <div
                  className="prose prose-sm max-w-none text-slate-800 leading-relaxed prose-a:text-indigo-600"
                  dangerouslySetInnerHTML={{
                    __html: renderContent(reply.content),
                  }}
                />

                <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                  <div className="flex gap-3 text-[11px] font-medium text-slate-400">
                    <button className="hover:text-indigo-600">Reply</button>
                    <button className="hover:text-indigo-600">Share</button>
                    <button className="hover:text-indigo-600">Flag</button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400">
                      {timeAgo(reply.createdAt)}
                    </span>
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700">
                      {reply.author?.firstName} {reply.author?.lastName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {replies.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
              No answers yet. Be the first one to help with a detailed solution.
            </div>
          )}
        </div>
      </div>

      {/* answer editor */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Your Answer</h3>

        <div className="relative">
          {/* toolbar */}
          <div className="flex items-center gap-2 rounded-t-lg border border-gray-300 border-b-0 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => applyFormat("bold", replyRef, setReplyContent)}
              className="hover:text-slate-900"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyFormat("italic", replyRef, setReplyContent)}
              className="italic hover:text-slate-900"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => applyFormat("underline", replyRef, setReplyContent)}
              className="underline hover:text-slate-900"
            >
              U
            </button>

            <span className="mx-1 h-3 w-px bg-gray-300" />

            <button
              type="button"
              onClick={() => applyFormat("link", replyRef, setReplyContent)}
              className="hover:text-slate-900"
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => applyFormat("image", replyRef, setReplyContent)}
              className="hover:text-slate-900"
            >
              Image
            </button>
          </div>

          {/* textarea */}
          <textarea
            ref={replyRef}
            id="reply-editor"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Type your answer here… Be helpful and polite!"
            className="w-full h-32 resize-y rounded-b-lg border border-gray-300 px-3 py-2 text-sm text-slate-800 leading-relaxed outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            By posting, you agree to follow the community guidelines.
          </p>
          <button
            onClick={handlePostReply}
            disabled={isSubmitting || !replyContent.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? (
              "Posting…"
            ) : (
              <>
                <FaPaperPlane className="mr-2 text-xs" />
                Post Answer
              </>
            )}
          </button>
        </div>
      </div>

      {/* kindness footer note */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span className="font-semibold">Remember to be kind.</span> Constructive
        criticism is welcome, but please be respectful to fellow students.
      </div>
    </motion.div>
  );
};

/* ---------- Main Discussion Forum Tab ---------- */

const DiscussionForumTab = ({
  entityType,
  entityName,
  examId,
  subjectId,
  unitId,
  chapterId,
  topicId,
  subTopicId,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentThreadSlug = searchParams.get("thread");
  const isListView = !currentThreadSlug;

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [activeTopic, setActiveTopic] = useState("All Topics");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTag, setNewTag] = useState("General");
  const [isCreating, setIsCreating] = useState(false);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (examId) params.append("examId", examId);
      if (subjectId) params.append("subjectId", subjectId);
      if (unitId) params.append("unitId", unitId);
      if (chapterId) params.append("chapterId", chapterId);
      if (topicId) params.append("topicId", topicId);

      if (search) params.append("search", search);
      if (filter === "New") params.append("sort", "new");
      if (filter === "Hot") params.append("sort", "hot");
      if (activeTopic !== "All Topics") params.append("tag", activeTopic);

      const res = await api.get(`/discussion/threads?${params.toString()}`);
      if (res.data.success) setThreads(res.data.data);
    } catch (error) {
      console.error("Error fetching threads", error);
    } finally {
      setLoading(false);
    }
  }, [examId, subjectId, unitId, chapterId, topicId, search, filter, activeTopic]);

  useEffect(() => {
    if (isListView) fetchThreads();
  }, [fetchThreads, isListView]);

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
        examId,
        subjectId,
        unitId,
        chapterId,
        topicId,
        subTopicId,
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewContent("");
      const slug = res.data?.data?.slug;
      if (slug) handleThreadClick(slug);
      else fetchThreads();
    } catch (error) {
      console.error("Failed to create thread", error);
      alert("Failed to create thread.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white min-h-[600px] p-3 rounded-2xl">
      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">
                  Start a New Discussion
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                    Discussion Title
                  </label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition"
                    placeholder="Confusion about Binomial Nomenclature rules?"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                      Category Tag
                    </label>
                    <div className="relative">
                      <select
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 bg-white appearance-none"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                      >
                        <option>General</option>
                        <option>Question</option>
                        <option>Notes</option>
                        <option>Urgent</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <FaFilter className="text-xs" />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 flex items-end">
                    Use “Question” for doubts and “Notes” when sharing material.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                    Content
                  </label>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 h-40 resize-y placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 leading-relaxed"
                    placeholder="Describe your question or discussion point in detail. You can paste examples, share context, and mention what you have already tried."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 rounded-xl hover:bg-white hover:border-slate-200 border border-transparent transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateThread}
                  disabled={
                    isCreating || !newTitle.trim() || !newContent.trim()
                  }
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isCreating ? (
                    "Publishing…"
                  ) : (
                    <>
                      <FaPaperPlane className="text-xs" />
                      Publish Discussion
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail or List View */}
      {!isListView ? (
        <ThreadDetail slug={currentThreadSlug} onBack={handleBack} />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
                Discussion Forum
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Connect with fellow students studying{" "}
                <span className="font-semibold text-indigo-600">
                  {entityName || entityType || "this subject"}
                </span>
                . Share notes and clarify doubts.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-semibold text-white shadow ${
                      i === 1
                        ? "bg-blue-500"
                        : i === 2
                        ? "bg-purple-500"
                        : "bg-emerald-500"
                    }`}
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-600 font-medium">
                <span className="font-semibold text-emerald-500">124</span>{" "}
                active now
              </span>
            </div>
          </div>

          {/* controls */}
          <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 mb-4 px-3 sm:px-6 py-2.5  backdrop-blur border-b border-slate-100">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 group">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 text-sm" />
                <input
                  type="text"
                  placeholder="Search topics, questions, users…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm shrink-0">
                  {["All", "New", "Hot"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilter(t)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        filter === t
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {t === "Hot" && (
                        <FaFire className="text-orange-500 text-xs" />
                      )}
                      {t}
                    </button>
                  ))}
                </div>

                <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 shrink-0">
                  All Topics
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-95 shrink-0"
                >
                  <FaPlus className="text-xs" />
                  New Post
                </button>
              </div>
            </div>
          </div>

          {/* guidelines banner */}
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-[1px] shadow-lg shadow-indigo-100">
            <div className="rounded-2xl bg-indigo-600/5 backdrop-blur px-4 py-3 flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-white/20 p-2 text-white">
                <FaFlag className="text-base" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">
                    Read Before Posting: Community Guidelines
                  </p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 tracking-wide">
                    PINNED
                  </span>
                </div>
                <p className="mt-1 text-xs text-indigo-50 max-w-2xl">
                  Please ensure your posts are relevant to the syllabus and
                  respectful to other students. Duplicate threads will be
                  removed. Help each other grow.
                </p>
              </div>
            </div>
          </div>

          {/* thread list */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-white border border-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : threads.length > 0 ? (
            <AnimatePresence>
              <div className="space-y-2">
                {threads.map((thread) => (
                  <ThreadCard
                    key={thread._id}
                    thread={thread}
                    onClick={handleThreadClick}
                  />
                ))}
              </div>
            </AnimatePresence>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                <FaComment className="text-indigo-300 text-base" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                No discussions yet
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                Start the first discussion for{" "}
                <span className="font-semibold text-indigo-600">
                  {entityName || entityType || "this subject"}
                </span>
                .
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-3 inline-flex items-center rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
              >
                Start Discussion
              </button>
            </div>
          )}

          {/* footer stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white border border-slate-100 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500">Total Discussions</p>
                <p className="text-lg font-semibold text-slate-900">1,204</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-base">
                <FaComment />
              </div>
            </div>

            <div className="rounded-xl bg-white border border-emerald-100 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500">Solved Questions</p>
                <p className="text-lg font-semibold text-emerald-600">856</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 text-base">
                <FaCheckCircle />
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-100 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500">Active Students</p>
                <p className="text-lg font-semibold text-slate-900">342</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 text-base">
                <FaUser />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DiscussionForumTab;
