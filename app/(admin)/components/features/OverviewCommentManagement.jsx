"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUser,
  FaCommentDots,
  FaTrash,
  FaBan,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";

const StatusBadge = ({ status }) => {
  const styles = {
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };
  const icons = {
    approved: <FaCheckCircle className="w-3 h-3" />,
    rejected: <FaTimesCircle className="w-3 h-3" />,
    pending: <FaClock className="w-3 h-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-800"}`}
    >
      {icons[status]}
      {(status || "pending").charAt(0).toUpperCase() + (status || "pending").slice(1)}
    </span>
  );
};

const OverviewCommentManagement = () => {
  const { toasts, removeToast, success, error: showError } = useToast();
  const { role } = usePermissions();
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const fetchRef = useRef(false);

  const fetchComments = async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ listAll: "true", status: statusFilter });
      const res = await api.get(`/overview-comment?${params.toString()}`);
      if (res.data?.success) {
        let list = res.data.data || [];
        if (entityTypeFilter !== "all") {
          list = list.filter((c) => c.entityType === entityTypeFilter);
        }
        setComments(list);
      }
    } catch (err) {
      console.error("Error fetching overview comments:", err);
      showError("Failed to fetch comments");
    } finally {
      setIsLoading(false);
      fetchRef.current = false;
    }
  };

  useEffect(() => {
    fetchComments();
  }, [statusFilter, entityTypeFilter]);

  const handleStatusChange = async (commentId, newStatus) => {
    try {
      const res = await api.put(`/overview-comment/${commentId}`, { status: newStatus });
      if (res.data?.success) {
        success(`Comment ${newStatus} successfully`);
        fetchComments();
      } else {
        showError(res.data?.message || "Failed to update");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to update comment");
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    try {
      const res = await api.delete(`/overview-comment/${commentId}`);
      if (res.data?.success) {
        success("Comment deleted");
        fetchComments();
      } else {
        showError(res.data?.message || "Failed to delete");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to delete comment");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAuthorName = (c) => {
    if (c.studentId?.firstName && c.studentId?.lastName) {
      return `${c.studentId.firstName} ${c.studentId.lastName}`;
    }
    return c.studentId?.email || c.name || c.anonymousName || "Anonymous";
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Overview Comment Management
              </h1>
              <p className="text-xs text-gray-600">
                Approve, unapprove, or delete comments from Overview tabs (exam, subject, unit, chapter, topic, subtopic).
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity type</label>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="all">All</option>
                <option value="exam">Exam</option>
                <option value="subject">Subject</option>
                <option value="unit">Unit</option>
                <option value="chapter">Chapter</option>
                <option value="topic">Topic</option>
                <option value="subtopic">Subtopic</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <FaCommentDots className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Comments ({comments.length})</h2>
          </div>

          <div>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="medium" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No comments found for the selected filters.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {comments.map((comment) => (
                  <div key={comment._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <FaUser className="text-indigo-600 text-xs" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {getAuthorName(comment)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {comment.studentId?.email || comment.email || comment.anonymousEmail || "—"}
                                {!comment.studentId && (comment.name || comment.anonymousName) && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                                    Guest
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={comment.status} />
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {comment.entityType} • {String(comment.entityId).slice(-6)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">
                          {comment.comment}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(comment.createdAt)}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {comment.status !== "approved" && (
                          <PermissionButton
                            action="edit"
                            onClick={() => handleStatusChange(comment._id, "approved")}
                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            title={getPermissionMessage("edit", role)}
                          >
                            <FaCheckCircle className="w-4 h-4" />
                          </PermissionButton>
                        )}
                        {comment.status === "approved" && (
                          <PermissionButton
                            action="edit"
                            onClick={() => handleStatusChange(comment._id, "pending")}
                            className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                            title="Unapprove (set to Pending)"
                          >
                            <FaBan className="w-4 h-4" />
                          </PermissionButton>
                        )}
                        {comment.status !== "rejected" && (
                          <PermissionButton
                            action="edit"
                            onClick={() => handleStatusChange(comment._id, "rejected")}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Reject"
                          >
                            <FaTimesCircle className="w-4 h-4" />
                          </PermissionButton>
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
        </div>
      </div>
    </>
  );
};

export default OverviewCommentManagement;
