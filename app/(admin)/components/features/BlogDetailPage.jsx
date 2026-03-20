"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import RichTextEditor from "../ui/RichTextEditor";
import api from "@/lib/api";
import { createSlug } from "@/utils/slug";
import { FaArrowLeft, FaSave, FaImage, FaGlobe, FaEye, FaLink } from "react-icons/fa";

const BlogDetailPage = ({ blogId }) => {
  const router = useRouter();
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  const [blog, setBlog] = useState(null);
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(null);

  // Form Data including core and details
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    status: "draft",
    examId: "",
    image: "",
    content: "",
    title: "", // SEO Title
    metaDescription: "", // SEO Desc
    shortDescription: "", // Short description for card display
    keywords: "", // SEO KW (for meta tags)
    tags: "", // Tags (for displaying on blog page)
    // Assign to level (7-level hierarchy)
    assignmentLevel: "",
    assignmentSubjectId: "",
    assignmentUnitId: "",
    assignmentChapterId: "",
    assignmentTopicId: "",
    assignmentSubTopicId: "",
    assignmentDefinitionId: "",
  });

  // Hierarchy options for assignment dropdowns (loaded when exam + level selected)
  const [assignmentSubjects, setAssignmentSubjects] = useState([]);
  const [assignmentUnits, setAssignmentUnits] = useState([]);
  const [assignmentChapters, setAssignmentChapters] = useState([]);
  const [assignmentTopics, setAssignmentTopics] = useState([]);
  const [assignmentSubTopics, setAssignmentSubTopics] = useState([]);
  const [assignmentDefinitions, setAssignmentDefinitions] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const fetchBlogDetails = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsLoading(true);
      setError(null);
      const [blogRes, detailsRes, examsRes, categoriesRes] = await Promise.all([
        api.get(`/blog/${blogId}`),
        api
          .get(`/blog/${blogId}/details`)
          .catch(() => ({ data: { success: false } })),
        api.get("/exam?status=active"),
        api.get("/blog/category?status=active").catch(() => ({ data: { success: false } })),
      ]);

      if (blogRes.data?.success) {
        const blogData = blogRes.data.data;
        setBlog(blogData);
        const detailsData = detailsRes?.data?.data || {};

        const initialFormData = {
          name: blogData.name || "",
          categoryId: blogData.categoryId?._id || blogData.categoryId || "",
          status: blogData.status || "draft",
          examId: blogData.examId?._id || blogData.examId || "",
          image: blogData.image || "",
          content: detailsData.content || "",
          title: detailsData.title || "",
          metaDescription: detailsData.metaDescription || "",
          shortDescription: detailsData.shortDescription || "",
          keywords: detailsData.keywords || "",
          tags: detailsData.tags || "",
          assignmentLevel: blogData.assignmentLevel || "",
          assignmentSubjectId: blogData.assignmentSubjectId?._id || blogData.assignmentSubjectId || "",
          assignmentUnitId: blogData.assignmentUnitId?._id || blogData.assignmentUnitId || "",
          assignmentChapterId: blogData.assignmentChapterId?._id || blogData.assignmentChapterId || "",
          assignmentTopicId: blogData.assignmentTopicId?._id || blogData.assignmentTopicId || "",
          assignmentSubTopicId: blogData.assignmentSubTopicId?._id || blogData.assignmentSubTopicId || "",
          assignmentDefinitionId: blogData.assignmentDefinitionId?._id || blogData.assignmentDefinitionId || "",
        };
        setFormData(initialFormData);
        setOriginalFormData(initialFormData);
      } else {
        setError(blogRes.data?.message || "Failed to fetch blog");
      }

      if (examsRes.data?.success) {
        setExams(examsRes.data.data || []);
      }
      if (categoriesRes.data?.success) {
        setCategories(categoriesRes.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching blog:", err);
      setError(err?.response?.data?.message || "Failed to fetch blog");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [blogId]);

  useEffect(() => {
    if (blogId) fetchBlogDetails();
  }, [blogId, fetchBlogDetails]);

  // Load hierarchy options for assignment when exam and level/ids change
  useEffect(() => {
    const examId = formData.examId;
    const level = formData.assignmentLevel;
    if (!examId || !level || level === "exam") {
      setAssignmentSubjects([]);
      setAssignmentUnits([]);
      setAssignmentChapters([]);
      setAssignmentTopics([]);
      setAssignmentSubTopics([]);
      setAssignmentDefinitions([]);
      return;
    }

    let cancelled = false;
    setAssignmentLoading(true);

    const run = async () => {
      try {
        if (level >= "subject") {
          const res = await api.get(`/subject?examId=${examId}&status=active&limit=500&page=1`);
          if (!cancelled && res.data?.success && res.data?.data) {
            setAssignmentSubjects(Array.isArray(res.data.data) ? res.data.data : []);
          }
        }
        if (level >= "unit" && formData.assignmentSubjectId) {
          const res = await api.get(`/unit?examId=${examId}&subjectId=${formData.assignmentSubjectId}&status=active&limit=500&page=1`);
          if (!cancelled && res.data?.success && res.data?.data) {
            setAssignmentUnits(Array.isArray(res.data.data) ? res.data.data : []);
          }
        }
        if (level >= "chapter" && formData.assignmentUnitId) {
          const res = await api.get(`/chapter?unitId=${formData.assignmentUnitId}&status=active&limit=500&page=1`);
          if (!cancelled && res.data?.success && res.data?.data) {
            setAssignmentChapters(Array.isArray(res.data.data) ? res.data.data : []);
          }
        }
        if (level >= "topic" && formData.assignmentChapterId) {
          const res = await api.get(`/topic?chapterId=${formData.assignmentChapterId}&status=active&limit=500&page=1`);
          if (!cancelled && res.data?.success && res.data?.data) {
            setAssignmentTopics(Array.isArray(res.data.data) ? res.data.data : []);
          }
        }
        if (level >= "subtopic" && formData.assignmentTopicId) {
          const res = await api.get(`/subtopic?topicId=${formData.assignmentTopicId}&status=active&limit=500&page=1`);
          if (!cancelled && res.data?.success && res.data?.data) {
            setAssignmentSubTopics(Array.isArray(res.data.data) ? res.data.data : []);
          }
        }
        if (level === "definition" && formData.assignmentSubTopicId) {
          const res = await api.get(`/definition?subTopicId=${formData.assignmentSubTopicId}&status=active&limit=500&page=1`);
          if (!cancelled && res.data?.success && res.data?.data) {
            setAssignmentDefinitions(Array.isArray(res.data.data) ? res.data.data : []);
          }
        }
      } catch (err) {
        if (!cancelled) console.error("Error loading assignment hierarchy:", err);
      } finally {
        if (!cancelled) setAssignmentLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [
    formData.examId,
    formData.assignmentLevel,
    formData.assignmentSubjectId,
    formData.assignmentUnitId,
    formData.assignmentChapterId,
    formData.assignmentTopicId,
    formData.assignmentSubTopicId,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      // When exam changes, reset categoryId and assignment
      if (name === "examId") {
        newData.categoryId = "";
        newData.assignmentLevel = "";
        newData.assignmentSubjectId = "";
        newData.assignmentUnitId = "";
        newData.assignmentChapterId = "";
        newData.assignmentTopicId = "";
        newData.assignmentSubTopicId = "";
        newData.assignmentDefinitionId = "";
      }
      // When assignment level changes, clear downstream
      if (name === "assignmentLevel") {
        const levels = ["exam", "subject", "unit", "chapter", "topic", "subtopic", "definition"];
        const idx = levels.indexOf(value);
        if (idx < 1) {
          newData.assignmentSubjectId = "";
          newData.assignmentUnitId = "";
          newData.assignmentChapterId = "";
          newData.assignmentTopicId = "";
          newData.assignmentSubTopicId = "";
          newData.assignmentDefinitionId = "";
        } else {
          if (idx < 2) newData.assignmentUnitId = "";
          if (idx < 3) newData.assignmentChapterId = "";
          if (idx < 4) newData.assignmentTopicId = "";
          if (idx < 5) newData.assignmentSubTopicId = "";
          if (idx < 6) newData.assignmentDefinitionId = "";
        }
      }
      if (name === "assignmentSubjectId") {
        newData.assignmentUnitId = "";
        newData.assignmentChapterId = "";
        newData.assignmentTopicId = "";
        newData.assignmentSubTopicId = "";
        newData.assignmentDefinitionId = "";
      }
      if (name === "assignmentUnitId") {
        newData.assignmentChapterId = "";
        newData.assignmentTopicId = "";
        newData.assignmentSubTopicId = "";
        newData.assignmentDefinitionId = "";
      }
      if (name === "assignmentChapterId") {
        newData.assignmentTopicId = "";
        newData.assignmentSubTopicId = "";
        newData.assignmentDefinitionId = "";
      }
      if (name === "assignmentTopicId") {
        newData.assignmentSubTopicId = "";
        newData.assignmentDefinitionId = "";
      }
      if (name === "assignmentSubTopicId") {
        newData.assignmentDefinitionId = "";
      }
      return newData;
    });
  };
  
  // Get categories filtered by selected exam
  const getFilteredCategories = () => {
    if (!formData.examId) return [];
    return categories.filter(
      (cat) => (cat.examId?._id || cat.examId) === formData.examId
    );
  };

  // Generate public blog URL
  const getPublicBlogUrl = () => {
    if (!blog || !blog.slug) return null;
    
    // Get exam slug from blog's examId
    const exam = exams.find(
      (e) => e._id === (blog.examId?._id || blog.examId)
    );
    
    // Also check if examId is populated in blog object
    const examData = blog.examId?.name ? blog.examId : exam;
    
    if (!examData || !examData.name) {
      // If no exam, we can't generate a valid URL
      // The public blog pages require an exam context
      return null;
    }
    
    // Use exam slug if available, otherwise create from name
    const examSlug = examData.slug || createSlug(examData.name);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
    
    // Construct URL: /self-study/{examSlug}/blog/{blogSlug}
    return `${basePath}/${examSlug}/blog/${blog.slug}`;
  };

  // Handle View button click
  const handleViewPublic = () => {
    const publicUrl = getPublicBlogUrl();
    if (publicUrl) {
      window.open(publicUrl, "_blank", "noopener,noreferrer");
    } else {
      showError("Cannot view blog: Exam information is missing or blog slug is not available.");
    }
  };

  // Save all fields but keep editor open (draft save)
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const coreUpdate = api.put(`/blog/${blogId}`, {
        name: formData.name.trim(),
        categoryId: formData.categoryId || null,
        status: formData.status,
        examId: formData.examId || null,
        image: formData.image.trim(),
        assignmentLevel: formData.assignmentLevel || "",
        assignmentSubjectId: formData.assignmentSubjectId || null,
        assignmentUnitId: formData.assignmentUnitId || null,
        assignmentChapterId: formData.assignmentChapterId || null,
        assignmentTopicId: formData.assignmentTopicId || null,
        assignmentSubTopicId: formData.assignmentSubTopicId || null,
        assignmentDefinitionId: formData.assignmentDefinitionId || null,
      });

      const detailsUpdate = api.put(`/blog/${blogId}/details`, {
        content: formData.content,
        title: formData.title.trim(),
        metaDescription: formData.metaDescription.trim(),
        shortDescription: formData.shortDescription.trim(),
        keywords: formData.keywords.trim(),
        tags: formData.tags.trim(),
      });

      const [coreRes, detailsRes] = await Promise.all([
        coreUpdate,
        detailsUpdate,
      ]);

      if (coreRes.data?.success && detailsRes.data?.success) {
        success("Blog saved successfully! Editor remains open.");
        setBlog(coreRes.data.data);
        // Update original form data to current state
        setOriginalFormData({ ...formData });
      } else {
        showError(
          coreRes.data?.message ||
            detailsRes.data?.message ||
            "Some changes could not be saved"
        );
      }
    } catch (err) {
      console.error("Error saving blog:", err);
      showError(
        err?.response?.data?.message || "Failed to save blog. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Save all fields and redirect back
  const handleSaveAndClose = async () => {
    try {
      setIsSaving(true);
      const coreUpdate = api.put(`/blog/${blogId}`, {
        name: formData.name.trim(),
        categoryId: formData.categoryId || null,
        status: formData.status,
        examId: formData.examId || null,
        image: formData.image.trim(),
        assignmentLevel: formData.assignmentLevel || "",
        assignmentSubjectId: formData.assignmentSubjectId || null,
        assignmentUnitId: formData.assignmentUnitId || null,
        assignmentChapterId: formData.assignmentChapterId || null,
        assignmentTopicId: formData.assignmentTopicId || null,
        assignmentSubTopicId: formData.assignmentSubTopicId || null,
        assignmentDefinitionId: formData.assignmentDefinitionId || null,
      });

      const detailsUpdate = api.put(`/blog/${blogId}/details`, {
        content: formData.content,
        title: formData.title.trim(),
        metaDescription: formData.metaDescription.trim(),
        shortDescription: formData.shortDescription.trim(),
        keywords: formData.keywords.trim(),
        tags: formData.tags.trim(),
      });

      const [coreRes, detailsRes] = await Promise.all([
        coreUpdate,
        detailsUpdate,
      ]);

      if (coreRes.data?.success && detailsRes.data?.success) {
        success("All changes saved successfully!");
        setBlog(coreRes.data.data);
        setIsEditing(false);
        // Redirect back to blog list
        router.push("/admin/blog");
      } else {
        showError(
          coreRes.data?.message ||
            detailsRes.data?.message ||
            "Some changes could not be saved"
        );
      }
    } catch (err) {
      console.error("Error saving blog:", err);
      showError(
        err?.response?.data?.message || "Failed to save blog. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Cancel - restore original data and close editor
  const handleCancel = () => {
    if (originalFormData) {
      setFormData(originalFormData);
    }
    setIsEditing(false);
    success("Changes discarded. Original content restored.");
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="text-sm text-gray-500 mt-4">Loading blog details...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center bg-white rounded-lg border border-red-200 shadow-sm p-6 max-w-md mx-4">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );

  if (!blog)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-4">
            Blog not found
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "active":
      case "publish":
        return "bg-green-100 text-green-800";
      case "inactive":
      case "unpublish":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Sticky Header */}
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
                {formData.name || "Untitled Blog"}
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
                <span>•</span>
                <span>
                  Updated{" "}
                  {new Date(blog.updatedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
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
                formData.status === "active"
                  ? "text-green-700"
                  : formData.status === "inactive"
                  ? "text-red-700"
                  : "text-gray-600"
              }`}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* View Public Blog Button */}
            {blog && blog.slug && getPublicBlogUrl() && (
              <button
                onClick={handleViewPublic}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md text-gray-700 text-sm font-medium transition-all duration-200 flex items-center gap-2"
                title="View public blog post"
              >
                <FaEye className="w-4 h-4" />
                <span className="hidden sm:inline">View</span>
              </button>
            )}

            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:shadow-md text-gray-800 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {isSaving ? "Restoring..." : "Cancel"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 hover:shadow-lg text-white text-sm rounded-lg font-medium flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
                >
                  {isSaving ? (
                    <LoadingSpinner size="small" color="white" />
                  ) : null}
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleSaveAndClose}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 hover:shadow-lg text-white text-sm rounded-lg font-medium flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
                >
                  {isSaving ? (
                    <LoadingSpinner size="small" color="white" />
                  ) : null}
                  {isSaving ? "Saving..." : "Save & Close"}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(true);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 hover:shadow-lg text-white text-sm rounded-lg font-medium flex items-center gap-2 transition-all duration-200"
              >
                Edit Blog
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="py-3 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Content (8/12) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Core Info */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">
                  Basic Details
                </h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blog Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Enter an engaging title for your post..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleChange}
                      disabled={!isEditing || !formData.examId}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Select Category --</option>
                      {getFilteredCategories().map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {!formData.examId && (
                      <p className="text-xs text-gray-500 mt-1">
                        Please select an exam first to see categories
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Image URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        name="image"
                        value={formData.image}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                      <FaImage className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                    </div>
                  </div>
                </div>
                {formData.image && (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 h-64 w-full bg-gray-50">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Blog Content
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
                  disabled={!isEditing}
                  placeholder="Start writing your amazing story here..."
                  className="flex-1 border-none focus:ring-0 p-4 sm:p-6"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar (4/12) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Settings Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden sticky top-24">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FaGlobe className="text-blue-600 w-4 h-4" /> SEO &
                  Organization
                </h3>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Exam Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Associated Exam
                  </label>
                  <div className="relative">
                    <select
                      name="examId"
                      value={formData.examId}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full pl-4 pr-10 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer text-gray-700 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- General / No Exam --</option>
                      {exams.map((exam) => (
                        <option key={exam._id} value={exam._id}>
                          {exam.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                          fillRule="evenodd"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Connect this post to a specific exam page.
                  </p>
                </div>

                {/* Assign to level (only when exam selected) */}
                {formData.examId && (
                  <>
                    <div className="h-px bg-gray-200 w-full"></div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <FaLink className="text-indigo-600 w-4 h-4" /> Assign to level
                      </h4>
                      <p className="text-xs text-gray-500">
                        Optionally link this blog to a specific level in the exam hierarchy (e.g. a chapter). Select level then pick Subject → Unit → Chapter, etc.
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Level
                        </label>
                        <select
                          name="assignmentLevel"
                          value={formData.assignmentLevel}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          <option value="">No assignment</option>
                          <option value="exam">Exam only</option>
                          <option value="subject">Subject</option>
                          <option value="unit">Unit</option>
                          <option value="chapter">Chapter</option>
                          <option value="topic">Topic</option>
                          <option value="subtopic">Subtopic</option>
                          <option value="definition">Definition</option>
                        </select>
                      </div>

                      {formData.assignmentLevel && formData.assignmentLevel !== "exam" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                            <select
                              name="assignmentSubjectId"
                              value={formData.assignmentSubjectId}
                              onChange={handleChange}
                              disabled={!isEditing || assignmentLoading}
                              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            >
                              <option value="">-- Select Subject --</option>
                              {assignmentSubjects.map((s) => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          {["unit", "chapter", "topic", "subtopic", "definition"].includes(formData.assignmentLevel) && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                              <select
                                name="assignmentUnitId"
                                value={formData.assignmentUnitId}
                                onChange={handleChange}
                                disabled={!isEditing || !formData.assignmentSubjectId || assignmentLoading}
                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                              >
                                <option value="">-- Select Unit --</option>
                                {assignmentUnits.map((u) => (
                                  <option key={u._id} value={u._id}>{u.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {["chapter", "topic", "subtopic", "definition"].includes(formData.assignmentLevel) && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                              <select
                                name="assignmentChapterId"
                                value={formData.assignmentChapterId}
                                onChange={handleChange}
                                disabled={!isEditing || !formData.assignmentUnitId || assignmentLoading}
                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                              >
                                <option value="">-- Select Chapter --</option>
                                {assignmentChapters.map((c) => (
                                  <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {["topic", "subtopic", "definition"].includes(formData.assignmentLevel) && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                              <select
                                name="assignmentTopicId"
                                value={formData.assignmentTopicId}
                                onChange={handleChange}
                                disabled={!isEditing || !formData.assignmentChapterId || assignmentLoading}
                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                              >
                                <option value="">-- Select Topic --</option>
                                {assignmentTopics.map((t) => (
                                  <option key={t._id} value={t._id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {["subtopic", "definition"].includes(formData.assignmentLevel) && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Subtopic</label>
                              <select
                                name="assignmentSubTopicId"
                                value={formData.assignmentSubTopicId}
                                onChange={handleChange}
                                disabled={!isEditing || !formData.assignmentTopicId || assignmentLoading}
                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                              >
                                <option value="">-- Select Subtopic --</option>
                                {assignmentSubTopics.map((st) => (
                                  <option key={st._id} value={st._id}>{st.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {formData.assignmentLevel === "definition" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Definition</label>
                              <select
                                name="assignmentDefinitionId"
                                value={formData.assignmentDefinitionId}
                                onChange={handleChange}
                                disabled={!isEditing || !formData.assignmentSubTopicId || assignmentLoading}
                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                              >
                                <option value="">-- Select Definition --</option>
                                {assignmentDefinitions.map((d) => (
                                  <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                <div className="h-px bg-gray-200 w-full"></div>

                {/* SEO Fields */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        SEO Title
                      </label>
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          formData.title.length > 60
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {formData.title.length}/60
                      </span>
                    </div>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="Page title for search results..."
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Short Description (for card)
                      </label>
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          formData.shortDescription.length > 150
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {formData.shortDescription.length}/150
                      </span>
                    </div>
                    <textarea
                      name="shortDescription"
                      value={formData.shortDescription}
                      onChange={handleChange}
                      disabled={!isEditing}
                      rows={3}
                      placeholder="Brief description shown on blog cards..."
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-700 placeholder:text-gray-400 leading-relaxed disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This description appears on blog listing cards.
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Meta Description (SEO)
                      </label>
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          formData.metaDescription.length > 160
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {formData.metaDescription.length}/160
                      </span>
                    </div>
                    <textarea
                      name="metaDescription"
                      value={formData.metaDescription}
                      onChange={handleChange}
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Brief summary for search engines..."
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-700 placeholder:text-gray-400 leading-relaxed disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for SEO and search engine results.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Keywords (Meta)
                    </label>
                    <input
                      type="text"
                      name="keywords"
                      value={formData.keywords}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="comma, separated, keywords (for SEO meta tags)"
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for SEO meta keywords (not displayed on page).
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="comma, separated, tags (displayed on blog page)"
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-700 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tags displayed on the blog post page (separate from SEO keywords).
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500 font-medium flex items-center justify-center gap-1">
                  <FaSave className="w-3 h-3" /> Changes saved on submit
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;
