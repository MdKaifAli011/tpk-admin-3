"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUser,
  FaLink,
  FaSearch,
  FaTrash,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";

const StatusBadge = ({ status }) => {
  const getStatusStyles = (s) => {
    switch (s) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getIcon = (s) => {
    switch (s) {
      case "approved":
        return <FaCheckCircle className="w-3 h-3" />;
      case "rejected":
        return <FaTimesCircle className="w-3 h-3" />;
      case "pending":
        return <FaClock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(
        status
      )}`}
    >
      {getIcon(status)}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const BlogCommentManagement = () => {
  const { toasts, removeToast, success, error: showError } = useToast();
  const { role } = usePermissions();
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "pending", // Default to pending for approval
    hasUrl: "all",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const isFetchingRef = useRef(false);

  const fetchComments = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: filters.status,
      });

      if (filters.hasUrl !== "all") {
        params.append("hasUrl", filters.hasUrl);
      }
      if (filters.search.trim()) {
        params.append("search", filters.search.trim());
      }

      const response = await api.get(`/blog/comment?${params.toString()}`);

      if (response.data?.success) {
        setComments(response.data.data || []);
        if (response.data.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: response.data.pagination.total || 0,
            totalPages: response.data.pagination.totalPages || 0,
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
      showError("Failed to fetch comments");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.hasUrl, filters.search, pagination.page]);

  const handleStatusChange = async (commentId, newStatus) => {
    try {
      const response = await api.put(`/blog/comment/${commentId}`, {
        status: newStatus,
      });

      if (response.data?.success) {
        success(`Comment ${newStatus} successfully`);
        fetchComments();
      } else {
        showError(response.data?.message || "Failed to update comment");
      }
    } catch (err) {
      console.error("Error updating comment:", err);
      showError(err.response?.data?.message || "Failed to update comment");
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const response = await api.delete(`/blog/comment/${commentId}`);

      if (response.data?.success) {
        success("Comment deleted successfully");
        fetchComments();
      } else {
        showError(response.data?.message || "Failed to delete comment");
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
      showError(err.response?.data?.message || "Failed to delete comment");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const highlightUrls = (text) => {
    if (!text) return "";

    // URL regex pattern (same as in model)
    const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

    // Split text by URLs to preserve non-URL text
    return text.split(urlRegex).map((part, index) => {
      // This split based regex approach is tricky with capturing groups. 
      // Simpler approach: match all and replace.
      return text; // Placeholder to switch to the safer HTML replacement below
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

    // Use a temporary token to avoid re-matching replaced HTML
    const linkedText = escapedText.replace(urlRegex, (url) => {
      const href = url.match(/^https?:/) ? url : `http://${url}`; // Default to http
      // Add visual priority styling
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-700 font-bold hover:underline bg-yellow-200 border border-yellow-300 px-1 py-0.5 rounded transition-colors shadow-sm" onClick="event.stopPropagation();">${url}</a>`;
    });

    return <span dangerouslySetInnerHTML={{ __html: linkedText }} />;
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Blog Comment Management
              </h1>
              <p className="text-xs text-gray-600">
                Review and moderate comments from blog posts. Approve, reject, or delete comments.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, status: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* URL Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Has URL
              </label>
              <select
                value={filters.hasUrl}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, hasUrl: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Comments</option>
                <option value="true">With URLs</option>
                <option value="false">Without URLs</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Comments
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }));
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  placeholder="Search in comments..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Comments Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Comments ({pagination.total})
              </h2>
              {filters.hasUrl === "true" && (
                <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                  <FaLink className="inline mr-1" />
                  Showing comments with URLs
                </span>
              )}
            </div>
          </div>

          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="medium" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No comments found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {comments.map((comment) => (
                  <div
                    key={comment._id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${comment.hasUrl ? "bg-yellow-50/50 border-l-4 border-yellow-400" : ""
                      }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <FaUser className="text-indigo-600 text-xs" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {comment.studentId?.firstName && comment.studentId?.lastName
                                  ? `${comment.studentId.firstName} ${comment.studentId.lastName}`
                                  : comment.studentId?.email || comment.name || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {comment.studentId?.email || comment.email || "No email"}
                                {!comment.studentId && comment.name && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                                    Anonymous
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={comment.status} />
                          {comment.hasUrl && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium border border-yellow-200">
                              <FaLink className="w-3 h-3" />
                              Contains URL
                            </span>
                          )}
                        </div>

                        {/* Blog Info */}
                        <div className="mb-2">
                          <p className="text-xs text-gray-500">
                            Comment on:{" "}
                            <span className="font-medium text-gray-700">
                              {comment.blogId?.name || "Unknown Blog"}
                            </span>
                          </p>
                        </div>


                        <div className="mb-3">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {renderWithHighlightedLinks(comment.comment)}
                          </p>
                        </div>

                        {/* Detected URLs */}
                        {comment.detectedUrls && comment.detectedUrls.length > 0 && (
                          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-xs font-medium text-yellow-900 mb-1">
                              Detected URLs:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {comment.detectedUrls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url.startsWith("http") ? url : `https://${url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-yellow-700 hover:text-yellow-900 underline break-all"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-xs text-gray-400">
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-start gap-2 flex-shrink-0">
                        {comment.status === "pending" && (
                          <>
                            <PermissionButton
                              action="edit"
                              onClick={() => handleStatusChange(comment._id, "approved")}
                              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                              title={getPermissionMessage("edit", role)}
                            >
                              <FaCheckCircle className="w-4 h-4" />
                            </PermissionButton>
                            <PermissionButton
                              action="edit"
                              onClick={() => handleStatusChange(comment._id, "rejected")}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title={getPermissionMessage("edit", role)}
                            >
                              <FaTimesCircle className="w-4 h-4" />
                            </PermissionButton>
                          </>
                        )}
                        <PermissionButton
                          action="delete"
                          onClick={() => handleDelete(comment._id)}
                          className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title={getPermissionMessage("delete", role)}
                        >
                          <FaTrash className="w-4 h-4" />
                        </PermissionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default BlogCommentManagement;

