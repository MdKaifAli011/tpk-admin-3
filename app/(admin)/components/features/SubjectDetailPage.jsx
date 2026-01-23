"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import RichTextEditor from "../ui/RichTextEditor";
import api from "@/lib/api";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import { FaArrowLeft } from "react-icons/fa";

const SubjectDetailPage = ({ subjectId }) => {
  const router = useRouter();
  const { canEdit, role } = usePermissions();
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  const [subject, setSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalContent, setOriginalContent] = useState(""); // Store original content when editing starts
  const [originalData, setOriginalData] = useState({}); // Store all original data when editing starts
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    title: "",
    metaDescription: "",
    keywords: "",
    status: "draft",
  });

  const fetchSubjectDetails = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsLoading(true);
      // Fetch main subject and details in parallel
      const [subjectRes, detailsRes] = await Promise.all([
        api.get(`/subject/${subjectId}`),
        api.get(`/subject/${subjectId}/details`),
      ]);

      if (subjectRes.data?.success) {
        const data = subjectRes.data.data;
        setSubject(data);

        // Get details or use defaults
        const details = detailsRes.data?.success
          ? detailsRes.data.data
          : {
              content: "",
              title: "",
              metaDescription: "",
              keywords: "",
              status: "draft",
            };

        setFormData({
          name: data.name || "",
          content: details.content || "",
          title: details.title || "",
          metaDescription: details.metaDescription || "",
          keywords: details.keywords || "",
          status: details.status || "draft",
        });
      } else
        setError(subjectRes.data?.message || "Failed to fetch subject details");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to fetch subject details"
      );
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [subjectId]);

  useEffect(() => {
    if (subjectId) {
      fetchSubjectDetails();
    } else {
      setError("Subject ID is missing");
    }
  }, [subjectId, fetchSubjectDetails]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Save content and metadata for preview
  const handleSaveContent = async () => {
    // Check permissions
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    try {
      setIsSaving(true);
      // Save content and SEO metadata (but not entity name)
      const detailsRes = await api.put(`/subject/${subjectId}/details`, {
        content: formData.content,
        title: formData.title,
        metaDescription: formData.metaDescription,
        keywords: formData.keywords,
        status: formData.status,
      });
      
      if (detailsRes.data?.success) {
        success("Content and metadata saved! You can preview on frontend.");
        // Keep editor open (isEditing stays true)
        // Update originalContent to current content for proper cancel functionality
        setOriginalContent(formData.content);
      } else {
        showError(detailsRes.data?.message || "Failed to save content and metadata");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save content and metadata");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Cancel - restore all original data and close editor
  const handleCancel = async () => {
    try {
      setIsSaving(true);
      // Restore all original data (content + metadata)
      const detailsRes = await api.put(`/subject/${subjectId}/details`, {
        content: originalData.content || "",
        title: originalData.title || "",
        metaDescription: originalData.metaDescription || "",
        keywords: originalData.keywords || "",
        status: originalData.status || "draft",
      });
      
      if (detailsRes.data?.success) {
        // Update formData to show original data
        setFormData({
          ...formData,
          content: originalData.content || "",
          title: originalData.title || "",
          metaDescription: originalData.metaDescription || "",
          keywords: originalData.keywords || "",
          status: originalData.status || "draft",
        });
        success("All changes discarded. Original data restored.");
      } else {
        showError(detailsRes.data?.message || "Failed to restore data");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to restore data");
    } finally {
      setIsSaving(false);
      // Close editor
      setIsEditing(false);
    }
  };

  // Save all fields and close editor
  const handleSaveAndClose = async () => {
    // Check permissions
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    try {
      setIsSaving(true);
      // Save main subject and all details
      const [subjectRes, detailsRes] = await Promise.all([
        api.put(`/subject/${subjectId}`, { name: formData.name }),
        api.put(`/subject/${subjectId}/details`, {
          content: formData.content,
          title: formData.title,
          metaDescription: formData.metaDescription,
          keywords: formData.keywords,
          status: formData.status,
        }),
      ]);
      
      if (subjectRes.data?.success && detailsRes.data?.success) {
        success("All changes saved successfully!");
        setSubject(subjectRes.data.data);
        setIsEditing(false); // Close editor
      } else {
        showError(
          subjectRes.data?.message || detailsRes.data?.message || "Save failed"
        );
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-blue-100 animate-fadeInUp">
          <LoadingSpinner size="large" />
          <h3 className="text-xl font-bold text-gray-900 mt-6">
            Loading Subject...
          </h3>
          <p className="text-gray-500 text-sm">
            Please wait while we fetch the details.
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-5 border border-red-100 animate-fadeInUp">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Error Loading Subject
          </h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:scale-105 hover:shadow-lg text-white rounded-xl font-medium transition-all duration-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );

  if (!subject)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-5 border border-gray-100 animate-fadeInUp">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Subject Not Found
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            The requested subject could not be found.
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gradient-to-r from-gray-500 to-blue-500 hover:scale-105 hover:shadow-lg text-white rounded-xl font-medium transition-all duration-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-100 px-4 py-3 mb-2 flex justify-between items-center animate-fadeInUp">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-gray-700 hover:text-gray-900 p-2 rounded-xl hover:bg-white/70 transition-all duration-200"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {isEditing ? "Edit " + subject.name : subject.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Part of{" "}
              <span className="font-medium text-indigo-600">
                {subject.examId?.name || "No Exam"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <select
            value={formData.status}
            onChange={handleChange}
            name="status"
            disabled={!isEditing}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border shadow-sm transition-all duration-200 ${
              isEditing
                ? "border-gray-300 bg-white text-gray-700 hover:border-blue-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                : "border-gray-200 bg-white/50 text-gray-500 cursor-not-allowed"
            } ${
              formData.status === "publish"
                ? "text-green-700"
                : formData.status === "unpublish"
                ? "text-red-700"
                : "text-gray-600"
            }`}
          >
            <option value="draft">Draft</option>
            <option value="publish">Publish</option>
            <option value="unpublish">Unpublish</option>
          </select>

          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-2 py-1.5 bg-white border border-gray-300 rounded-xl hover:shadow-md text-gray-800 text-sm font-semibold transition-all duration-200 disabled:opacity-50"
              >
                {isSaving ? "Restoring..." : "Cancel"}
              </button>
              {canEdit ? (
                <>
                  <button
                    onClick={handleSaveContent}
                    disabled={isSaving}
                    className="px-2 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 hover:shadow-lg text-white text-sm rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <LoadingSpinner size="small" />
                    ) : null}
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleSaveAndClose}
                    disabled={isSaving}
                    className="px-2 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 hover:shadow-lg text-white text-sm rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <LoadingSpinner size="small" />
                    ) : null}
                    {isSaving ? "Saving..." : "Save & Close"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled
                    title={getPermissionMessage("edit", role)}
                    className="px-2 py-1.5 bg-gray-300 text-gray-500 text-sm rounded-xl font-semibold flex items-center gap-2 cursor-not-allowed transition-all duration-200"
                  >
                    Save
                  </button>
                  <button
                    disabled
                    title={getPermissionMessage("edit", role)}
                    className="px-2 py-1.5 bg-gray-300 text-gray-500 text-sm rounded-xl font-semibold flex items-center gap-2 cursor-not-allowed transition-all duration-200"
                  >
                    Save & Close
                  </button>
                </>
              )}
            </>
          ) : canEdit ? (
            <button
              onClick={() => {
                if (canEdit) {
                  // Store all original data when starting to edit
                  setOriginalContent(formData.content);
                  setOriginalData({
                    content: formData.content,
                    title: formData.title,
                    metaDescription: formData.metaDescription,
                    keywords: formData.keywords,
                    status: formData.status,
                  });
                  setIsEditing(true);
                } else {
                  showError(getPermissionMessage("edit", role));
                }
              }}
              className="px-2 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 hover:shadow-lg text-white text-sm rounded-xl font-semibold flex items-center gap-2 transition-all duration-200"
            >
              Edit Subject
            </button>
          ) : (
            <button
              disabled
              title={getPermissionMessage("edit", role)}
              className="px-2 py-2 bg-gray-300 text-gray-500 rounded-xl font-semibold flex items-center gap-2 cursor-not-allowed transition-all duration-200"
            >
              Edit Subject
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 animate-fadeInUp">
        {/* Subject Content */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-4 hover:shadow-2xl transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Subject Content
          </h2>
          <RichTextEditor
            value={formData.content}
            onChange={(v) => setFormData({ ...formData, content: v })}
            placeholder="Write detailed content for this subject..."
            disabled={!isEditing}
            examId={subject?.examId?._id || subject?.examId || null}
            subjectId={subject?._id || null}
          />
        </div>

        {/* SEO Meta Section */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">SEO Meta</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter title for SEO..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed shadow-sm text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/60 characters
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Keywords
              </label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="keyword1, keyword2, keyword3"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed shadow-sm text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate keywords with commas
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Meta Description
              </label>
              <textarea
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleChange}
                disabled={!isEditing}
                rows={3}
                placeholder="Write a compelling meta description for SEO..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed shadow-sm text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.metaDescription.length}/160 characters
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubjectDetailPage;
