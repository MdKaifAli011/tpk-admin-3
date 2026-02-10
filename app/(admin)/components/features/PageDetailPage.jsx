"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import RichTextEditor from "../ui/RichTextEditor";
import api from "@/lib/api";
import { FaArrowLeft, FaSave, FaGlobe, FaEye } from "react-icons/fa";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const PageDetailPage = ({ pageSlug, examSlug: initialExamSlug }) => {
  const router = useRouter();
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);
  const isCreate = !pageSlug;
  const examSlug = initialExamSlug || null;

  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(!isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    status: "draft",
    metaDescription: "",
    keywords: "",
  });

  const effectiveExamSlug = page?.exam?.slug ?? examSlug;

  const fetchPage = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsLoading(true);
      setError(null);
      const examParam = examSlug ? `?exam=${encodeURIComponent(examSlug)}` : "";
      const res = await api.get(`/page/${pageSlug}${examParam}`);
      if (res.data?.success && res.data.data) {
        const p = res.data.data;
        setPage(p);
        setFormData({
          title: p.title || "",
          content: p.content || "",
          status: p.status || "draft",
          metaDescription: p.metaDescription || "",
          keywords: p.keywords || "",
        });
      } else {
        setError("Page not found");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load page");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [pageSlug, examSlug]);

  useEffect(() => {
    if (pageSlug) fetchPage();
  }, [pageSlug, fetchPage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getPublicPageUrl = () => {
    if (isCreate || !page?.slug) return null;
    if (effectiveExamSlug) return `${basePath}/${effectiveExamSlug}/pages/${page.slug}`;
    return `${basePath}/pages/${page.slug}`;
  };

  const getPathLabel = () => {
    if (!page?.slug) return null;
    if (effectiveExamSlug) return `/${effectiveExamSlug}/pages/${page.slug}`;
    return `/pages/${page.slug}`;
  };

  const handleViewPublic = () => {
    const url = getPublicPageUrl();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else showError("Page must be saved with a slug to view.");
  };

  const buildPutBody = () => ({
    title: formData.title.trim(),
    content: formData.content,
    status: formData.status,
    metaDescription: formData.metaDescription.trim(),
    keywords: formData.keywords.trim(),
    exam: effectiveExamSlug || "site",
  });

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (isCreate) {
        if (!formData.title?.trim()) {
          showError("Title is required.");
          return;
        }
        const res = await api.post("/page", {
          title: formData.title.trim(),
          content: formData.content,
          status: formData.status,
          metaDescription: formData.metaDescription.trim(),
          keywords: formData.keywords.trim(),
          ...(examSlug && { exam: examSlug }),
        });
        if (res.data?.success) {
          success("Page created. Redirecting to edit...");
          const slug = res.data.data.slug;
          router.replace(examSlug ? `/admin/pages/${slug}?exam=${encodeURIComponent(examSlug)}` : `/admin/pages/${slug}`);
        } else {
          showError(res.data?.message || "Failed to create page");
        }
      } else {
        const res = await api.put(`/page/${page.slug}`, buildPutBody());
        if (res.data?.success) {
          setPage(res.data.data);
          success("Page saved.");
        } else {
          showError(res.data?.message || "Failed to save");
        }
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      setIsSaving(true);
      if (isCreate) {
        if (!formData.title?.trim()) {
          showError("Title is required.");
          return;
        }
        const res = await api.post("/page", {
          title: formData.title.trim(),
          content: formData.content,
          status: formData.status,
          metaDescription: formData.metaDescription.trim(),
          keywords: formData.keywords.trim(),
          ...(examSlug && { exam: examSlug }),
        });
        if (res.data?.success) {
          success("Page created.");
          router.push("/admin/pages");
        } else {
          showError(res.data?.message || "Failed to create page");
        }
      } else {
        const res = await api.put(`/page/${page.slug}`, buildPutBody());
        if (res.data?.success) {
          success("Page saved.");
          router.push("/admin/pages");
        } else {
          showError(res.data?.message || "Failed to save");
        }
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isCreate && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="text-sm text-gray-500 mt-4">Loading page...</p>
        </div>
      </div>
    );
  }

  if (!isCreate && error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center bg-white rounded-lg border border-red-200 shadow-sm p-6 max-w-md mx-4">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/admin/pages")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Back to Pages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Go back"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {isCreate ? "New Page" : formData.title || "Untitled Page"}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                    formData.status
                  )}`}
                >
                  {(formData.status || "draft").charAt(0).toUpperCase() +
                    (formData.status || "draft").slice(1)}
                </span>
                {!isCreate && page?.slug && (
                  <>
                    <span>•</span>
                    <span className="font-mono">/pages/{page.slug}</span>
                  </>
                )}
                {!isCreate && page?.updatedAt && (
                  <>
                    <span>•</span>
                    <span>
                      Updated{" "}
                      {new Date(page.updatedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={formData.status}
              onChange={handleChange}
              name="status"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {!isCreate && page?.slug && (
              <button
                onClick={handleViewPublic}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium flex items-center gap-2"
                title="View public page"
              >
                <FaEye className="w-4 h-4" />
                <span className="hidden sm:inline">View</span>
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 text-white text-sm rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <LoadingSpinner size="small" color="white" /> : null}
              {isSaving ? "Saving..." : isCreate ? "Create Page" : "Save"}
            </button>
            <button
              onClick={handleSaveAndClose}
              disabled={isSaving}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 text-white text-sm rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <LoadingSpinner size="small" color="white" /> : null}
              {isSaving ? "Saving..." : isCreate ? "Create & Close" : "Save & Close"}
            </button>
          </div>
        </div>
      </div>

      <div className="py-3 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">
                  Basic Details
                </h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. About Us, Privacy Policy"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  {!isCreate && getPathLabel() && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      URL: <span className="font-mono">{getPathLabel()}</span> (auto-generated from title)
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Page Content
                </h3>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide border border-gray-200 px-2 py-1 rounded bg-white">
                  Rich Text
                </span>
              </div>
              <div className="flex-1 flex flex-col">
                <RichTextEditor
                  value={formData.content}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, content: v }))
                  }
                  placeholder="Write your page content here..."
                  className="flex-1 border-none focus:ring-0 p-4 sm:p-6"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden sticky top-24">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FaGlobe className="text-blue-600 w-4 h-4" /> SEO
                </h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Short description for search engines"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords
                  </label>
                  <input
                    type="text"
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleChange}
                    placeholder="Comma-separated keywords"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageDetailPage;
