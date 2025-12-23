"use client";

import React, { useState, useEffect } from "react";
import { FaUser, FaClock, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import api from "@/lib/api";
import CommentFormModal from "../../../components/CommentFormModal";

const BlogComments = ({ blogId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
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
        } catch (err) {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch comments
  const fetchComments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/blog/${blogId}/comment?status=approved`);

      if (response.data?.success) {
        setComments(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (blogId) {
      fetchComments();
    }
  }, [blogId]);

  // Handle comment submission from modal
  const handleCommentSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const payload = {
        comment: formData.comment,
      };

      // If authenticated, use token; otherwise include name and email
      if (isAuthenticated) {
        const token = localStorage.getItem("student_token");
        const response = await api.post(`/blog/${blogId}/comment`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data?.success) {
          setNewComment("");
          // Refresh comments after a short delay
          setTimeout(() => {
            fetchComments();
          }, 1000);
        } else {
          throw new Error(response.data?.message || "Failed to submit comment");
        }
      } else {
        // Anonymous comment
        payload.name = formData.name;
        payload.email = formData.email;

        const response = await api.post(`/blog/${blogId}/comment`, payload);

        if (response.data?.success) {
          setNewComment("");
          // Refresh comments after a short delay
          setTimeout(() => {
            fetchComments();
          }, 1000);
        } else {
          throw new Error(response.data?.message || "Failed to submit comment");
        }
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
      throw err; // Re-throw to let modal handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle "Post Comment" button click - open modal
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
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderWithHighlightedLinks = (text) => {
    if (!text) return null;

    // Robust URL regex pattern that supports localhost, IPs, and standard domains
    const urlRegex = /((https?:\/\/)?(localhost|(\d{1,3}\.){3}\d{1,3}|(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gi;

    // Escape HTML to prevent XSS since we're using dangerouslySetInnerHTML
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const escapedText = escapeHtml(text);

    const linkedText = escapedText.replace(urlRegex, (url) => {
      const href = url.match(/^https?:/) ? url : `http://${url}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 font-bold hover:underline break-all" onClick="event.stopPropagation();">${url}</a>`;
    });

    return <span dangerouslySetInnerHTML={{ __html: linkedText }} />;
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Comment Form */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Leave a Comment
        </h3>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <FaExclamationCircle className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isAuthenticated ? `Comment as ${studentName}` : "Your Comment"}
            </label>
            <textarea
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              placeholder="Share your thoughts..."
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder-gray-400 resize-none"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">
                {newComment.length}/2000 characters
              </p>
              <p className="text-xs text-gray-500">
                Comments are moderated before being published
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePostCommentClick}
            disabled={isSubmitting || !newComment.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </>
            ) : (
              "Post Comment"
            )}
          </button>

          {!isAuthenticated && (
            <p className="text-xs text-gray-500 text-center">
              You can comment without logging in. We'll ask for your name and email before submitting.
            </p>
          )}
        </div>
      </div>

      {/* Comment Form Modal */}
      <CommentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onSubmit={handleCommentSubmit}
        initialComment={newComment}
        initialData={isAuthenticated ? { name: studentName, email: studentEmail } : {}}
        blogId={blogId}
      />

      {/* Comments List */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Comments ({comments.length})
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No comments yet. Be the first to comment!
            </p>
          </div>
        ) : (
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
                      {renderWithHighlightedLinks(comment.comment)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogComments;

