"use client";

import React, { useState, useEffect } from "react";
import { FaUser, FaClock, FaCheckCircle, FaExclamationCircle, FaCommentDots } from "react-icons/fa";
import api from "@/lib/api";
import CommentFormModal from "./CommentFormModal";

const INITIAL_LIMIT = 5;
const LOAD_MORE_LIMIT = 5;

const OverviewCommentSection = ({ entityType, entityId }) => {
  const [comments, setComments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("student_token");
    const user = localStorage.getItem("student");
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setIsAuthenticated(true);
        setStudentName(
          userData.firstName && userData.lastName
            ? `${userData.firstName} ${userData.lastName}`
            : userData.email || "Student"
        );
        setStudentEmail(userData.email || "");
      } catch (_) {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const fetchComments = async (options = {}) => {
    if (!entityId || !entityType) return;
    const { limit = INITIAL_LIMIT, skip = 0, append = false } = options;
    try {
      if (!append) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }
      const res = await api.get(
        `/overview-comment?entityType=${entityType}&entityId=${entityId}&status=approved&limit=${limit}&skip=${skip}`
      );
      if (res.data?.success) {
        const payload = res.data.data || {};
        const list = Array.isArray(payload) ? payload : (payload.data || []);
        const total = typeof payload.total === "number" ? payload.total : list.length;
        if (append) {
          setComments((prev) => [...prev, ...list]);
        } else {
          setComments(list);
        }
        setTotalCount(total);
      }
    } catch (err) {
      console.error("Error fetching overview comments:", err);
      if (!append) setError("Failed to load comments");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreComments = () => {
    fetchComments({
      limit: LOAD_MORE_LIMIT,
      skip: comments.length,
      append: true,
    });
  };

  useEffect(() => {
    if (entityId && entityType) fetchComments();
  }, [entityId, entityType]);

  const handleCommentSubmit = async (formData) => {
    if (!entityId || !entityType) return;
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const payload = {
        entityType,
        entityId,
        comment: formData.comment,
      };

      if (isAuthenticated) {
        const token = localStorage.getItem("student_token");
        const res = await api.post("/overview-comment", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          setNewComment("");
          setIsModalOpen(false);
          setSuccess("Comment submitted. It will be reviewed before being published.");
          setTimeout(fetchComments, 800);
        } else {
          throw new Error(res.data?.message || "Failed to submit comment");
        }
      } else {
        payload.name = formData.name;
        payload.email = formData.email;
        const res = await api.post("/overview-comment", payload);
        if (res.data?.success) {
          setNewComment("");
          setIsModalOpen(false);
          setSuccess("Comment submitted. It will be reviewed before being published.");
          setTimeout(fetchComments, 800);
        } else {
          throw new Error(res.data?.message || "Failed to submit comment");
        }
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostCommentClick = () => {
    if (!newComment.trim()) {
      setError("Please enter a comment");
      return;
    }
    if (newComment.trim().length > 2000) {
      setError("Comment cannot exceed 2000 characters");
      return;
    }
    setError(null);
    setIsModalOpen(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const renderCommentText = (text) => {
    if (!text) return null;
    const urlRegex = /((https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*))/gi;
    const escape = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const linked = escape(text).replace(urlRegex, (url) => {
      const href = url.match(/^https?:/) ? url : `http://${url}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline break-all">${url}</a>`;
    });
    return <span dangerouslySetInnerHTML={{ __html: linked }} />;
  };

  if (!entityId || !entityType) return null;

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
          <FaCommentDots className="text-indigo-600" />
          Comments
        </h3>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-6">
        <h4 className="text-base font-semibold text-gray-900 mb-3">Leave a comment</h4>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mb-3">
            <FaExclamationCircle className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2 mb-3">
            <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isAuthenticated ? `Comment as ${studentName}` : "Your comment"}
          </label>
          <textarea
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            placeholder="Share your thoughts or ask a question..."
            rows={4}
            maxLength={2000}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder-gray-400 resize-none"
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">{newComment.length}/2000</span>
            <span className="text-xs text-gray-500">Comments are moderated</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePostCommentClick}
          disabled={isSubmitting || !newComment.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            "Post Comment"
          )}
        </button>

        {!isAuthenticated && (
          <p className="text-xs text-gray-500 mt-2">
            You can comment without logging in. We&apos;ll ask for your name and email before submitting.
          </p>
        )}
      </div>

      <CommentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onSubmit={handleCommentSubmit}
        initialComment={newComment}
        initialData={isAuthenticated ? { name: studentName, email: studentEmail } : {}}
      />

      <div className="mt-6 bg-white rounded-xl border border-gray-200/60 p-4 sm:p-6">
        <h4 className="text-base font-semibold text-gray-900 mb-4">
          Comments {!isLoading && totalCount >= 0 ? `(${totalCount})` : ""}
        </h4>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No comments yet. Be the first to comment!</p>
        ) : (
          <>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment._id}
                  className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FaUser className="text-indigo-600 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {comment.studentId?.firstName && comment.studentId?.lastName
                            ? `${comment.studentId.firstName} ${comment.studentId.lastName}`
                            : comment.studentId?.email || comment.anonymousName || "Anonymous"}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <FaClock className="text-[10px]" />
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {renderCommentText(comment.comment)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {comments.length < totalCount && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
                <button
                  type="button"
                  onClick={loadMoreComments}
                  disabled={isLoadingMore}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>View more comments ({totalCount - comments.length} more)</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OverviewCommentSection;
