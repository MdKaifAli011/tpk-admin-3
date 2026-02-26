"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import RichTextEditor from "../ui/RichTextEditor";
import api from "@/lib/api";
import { createSlug } from "@/utils/slug";
import { FaArrowLeft, FaSave, FaGlobe, FaEye, FaEdit, FaFileAlt } from "react-icons/fa";

export default function CourseDetailPage({ courseId }) {
  const { toasts, removeToast, success, error: showError } = useToast();
  const fetchRef = useRef(false);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    content: "",
  });

  useEffect(() => {
    if (!courseId || fetchRef.current) return;
    fetchRef.current = true;
    api
      .get(`/course/${courseId}`)
      .then((res) => {
        const c = res.data?.data;
        if (c) {
          setCourse(c);
          setFormData({
            metaTitle: c.metaTitle ?? "",
            metaDescription: c.metaDescription ?? "",
            keywords: c.keywords ?? "",
            content: c.content ?? "",
          });
        } else setError("Course not found");
      })
      .catch(() => setError("Failed to load course"))
      .finally(() => {
        setLoading(false);
        fetchRef.current = false;
      });
  }, [courseId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        metaTitle: formData.metaTitle.trim(),
        metaDescription: formData.metaDescription.trim(),
        keywords: formData.keywords.trim(),
        content: formData.content ?? "",
      };
      const res = await api.patch(`/course/${courseId}`, payload);
      if (res.data?.success) {
        setCourse(res.data.data);
        success("SEO & content saved successfully.");
      } else showError(res.data?.message || "Save failed");
    } catch (err) {
      showError(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const getPublicUrl = () => {
    if (!course?.slug || !course?.examId) return null;
    const examSlug = course.examId.slug || createSlug(course.examId.name || "");
    return `/self-study/${examSlug}/course/${course.slug}`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-sm text-gray-500">Loading course...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 max-w-md text-center">
          <p className="text-red-600 font-medium mb-4">{error || "Course not found"}</p>
          <Link
            href="/admin/course"
            className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:underline"
          >
            <FaArrowLeft className="w-4 h-4" /> Back to courses
          </Link>
        </div>
      </div>
    );
  }

  const examName = course.examId?.name || "Exam";

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/admin/course"
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0"
                aria-label="Back to courses"
              >
                <FaArrowLeft className="w-4 h-4" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">{course.title}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">
                    {examName}
                  </span>
                  <span className="ml-2">Content & SEO</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/admin/course/${courseId}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <FaEdit className="w-4 h-4" /> Edit basic info
              </Link>
              {getPublicUrl() && (
                <a
                  href={getPublicUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <FaEye className="w-4 h-4" /> View
                </a>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saving ? <LoadingSpinner size="small" color="white" /> : <FaSave className="w-4 h-4" />}
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          {/* Left: Course content editor */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FaFileAlt className="w-4 h-4 text-indigo-600" /> Course content
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                This content is shown on the public course page below the course details.
              </p>
            </div>
            <div className="p-5">
              <RichTextEditor
                value={formData.content}
                onChange={(v) => setFormData((p) => ({ ...p, content: v ?? "" }))}
                placeholder="Write course description, syllabus, FAQ..."
                className="min-h-[420px]"
              />
            </div>
          </div>

          {/* Right: SEO panel (sticky on desktop) */}
          <aside className="lg:sticky lg:top-24">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FaGlobe className="w-4 h-4 text-indigo-600" /> SEO settings
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Meta title, description and keywords for search engines.
                </p>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Meta title
                  </label>
                  <input
                    id="metaTitle"
                    name="metaTitle"
                    type="text"
                    value={formData.metaTitle}
                    onChange={handleChange}
                    placeholder="e.g. 1 Yr. JEE Preparation | TestprepKart"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                  />
                </div>
                <div>
                  <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Meta description
                  </label>
                  <textarea
                    id="metaDescription"
                    name="metaDescription"
                    rows={3}
                    value={formData.metaDescription}
                    onChange={handleChange}
                    placeholder="Short description for search results."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-y transition-shadow"
                  />
                </div>
                <div>
                  <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Keywords <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="keywords"
                    name="keywords"
                    type="text"
                    value={formData.keywords}
                    onChange={handleChange}
                    placeholder="Comma-separated keywords"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
