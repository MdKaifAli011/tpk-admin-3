"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { LoadingWrapper, LoadingSpinner } from "../ui/SkeletonLoader";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaClipboardList,
  FaEdit,
  FaTrash,
  FaSearch,
  FaImage,
  FaNewspaper,
  FaPowerOff,
  FaCheck,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import PaginationBar from "../ui/PaginationBar";

const StatusBadge = ({ status, onClick }) => {
  const getStatusStyles = (s) => {
    switch (s) {
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
    <button
      type="button"
      onClick={onClick}
      title={status === "active" || status === "publish" ? "Click to set Inactive" : "Click to set Active"}
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
        status
      )} hover:opacity-90 transition-opacity`}
    >
      {(status || "active").charAt(0).toUpperCase() +
        (status || "active").slice(1)}
    </button>
  );
};

const MetaIcon = ({ filled }) =>
  filled ? (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
      <FaCheck className="w-2.5 h-2.5" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400">
      <FaTimes className="w-2.5 h-2.5" />
    </span>
  );

const ExamBlogTable = ({ examName, blogs, onEdit, onDelete, onToggleStatus }) => {
  const { role } = usePermissions();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-t-lg">
        <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-indigo-600 text-white">
          {examName}
        </span>
        <span className="text-xs text-gray-500">
          {blogs.length} blog{blogs.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="overflow-x-auto border border-t-0 border-gray-200 rounded-b-lg">
        {/* Desktop Table */}
        <table className="hidden md:table min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Blog</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Category</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Content</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Meta</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-40">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {blogs.map((blog, index) => (
              <tr
                key={blog._id || blog.id || index}
                className={`hover:bg-gray-50 transition-colors ${
                  blog.status === "inactive" ? "opacity-60" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-14 shrink-0 rounded overflow-hidden border border-gray-100 bg-gray-50">
                      {blog.image ? (
                        <img
                          className="h-full w-full object-cover"
                          src={blog.image}
                          alt=""
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextElementSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`h-full w-full ${
                          blog.image ? "hidden" : "flex"
                        } items-center justify-center text-gray-300`}
                      >
                        <FaImage className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-medium truncate cursor-pointer hover:text-blue-600 transition-colors ${
                          blog.status === "inactive"
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                        }`}
                        onClick={() => onEdit(blog)}
                      >
                        {blog.name}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono truncate">
                        /{blog.slug}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {blog.author || "Admin"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap w-32">
                  {blog.categoryId?.name ? (
                    <span className="text-xs text-gray-600">{blog.categoryId.name}</span>
                  ) : blog.category ? (
                    <span className="text-xs text-gray-600">{blog.category}</span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">—</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap w-28">
                  {blog._detailsSummary?.contentUpdatedAt ? (
                    <span className="text-xs text-green-700 font-medium">
                      {new Date(blog._detailsSummary.contentUpdatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-orange-500 italic">Unavailable</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center w-16">
                  <MetaIcon
                    filled={!!(blog._detailsSummary && blog._detailsSummary.hasContent && blog._detailsSummary.hasMeta)}
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap w-24">
                  <StatusBadge
                    status={blog.status}
                    onClick={() => onToggleStatus(blog)}
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right w-40">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <PermissionButton
                      action="edit"
                      onClick={() => onToggleStatus(blog)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                        blog.status === "active" || blog.status === "publish"
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                          : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                      }`}
                      title={blog.status === "active" || blog.status === "publish" ? "Set Inactive" : "Set Active"}
                    >
                      <FaPowerOff className="text-xs" />
                      {blog.status === "active" || blog.status === "publish" ? "Inactive" : "Active"}
                    </PermissionButton>
                    <PermissionButton
                      action="edit"
                      onClick={() => onEdit(blog)}
                      className="p-1.5 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                      title={getPermissionMessage("edit", role)}
                    >
                      <FaEdit className="text-sm" />
                    </PermissionButton>
                    <PermissionButton
                      action="delete"
                      onClick={() => onDelete(blog)}
                      className="p-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                      title={getPermissionMessage("delete", role)}
                    >
                      <FaTrash className="text-sm" />
                    </PermissionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200">
          {blogs.map((blog, index) => (
            <div
              key={blog._id || blog.id || index}
              className={`p-3 hover:bg-gray-50 transition-colors ${
                blog.status === "inactive" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="h-12 w-16 shrink-0 rounded overflow-hidden border border-gray-100 bg-gray-50">
                      {blog.image ? (
                        <img
                          className="h-full w-full object-cover"
                          src={blog.image}
                          alt=""
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextElementSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`h-full w-full ${
                          blog.image ? "hidden" : "flex"
                        } items-center justify-center text-gray-300`}
                      >
                        <FaImage className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-sm font-semibold mb-0.5 cursor-pointer hover:text-blue-600 transition-colors ${
                          blog.status === "inactive"
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                        }`}
                        onClick={() => onEdit(blog)}
                      >
                        {blog.name}
                      </h3>
                      <div className="text-[10px] text-gray-400 font-mono truncate mb-0.5">
                        /{blog.slug}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate mb-1">
                        {blog.author || "Admin"}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {blog.categoryId?.name ? (
                          <span className="text-xs text-gray-600">{blog.categoryId.name}</span>
                        ) : blog.category ? (
                          <span className="text-xs text-gray-600">{blog.category}</span>
                        ) : null}
                        <MetaIcon
                          filled={!!(blog._detailsSummary && blog._detailsSummary.hasContent && blog._detailsSummary.hasMeta)}
                        />
                        {blog._detailsSummary?.contentUpdatedAt ? (
                          <span className="text-[10px] text-green-700 font-medium">
                            {new Date(blog._detailsSummary.contentUpdatedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="text-[10px] text-orange-500 italic">No content</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge
                      status={blog.status}
                      onClick={() => onToggleStatus(blog)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-3 shrink-0">
                  <PermissionButton
                    action="edit"
                    onClick={() => onToggleStatus(blog)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                      blog.status === "active" || blog.status === "publish"
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    }`}
                    title={blog.status === "active" || blog.status === "publish" ? "Set Inactive" : "Set Active"}
                  >
                    <FaPowerOff className="text-xs" />
                    {blog.status === "active" || blog.status === "publish" ? "Inactive" : "Active"}
                  </PermissionButton>
                  <PermissionButton
                    action="edit"
                    onClick={() => onEdit(blog)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                    title={getPermissionMessage("edit", role)}
                  >
                    <FaEdit className="text-sm" />
                  </PermissionButton>
                  <PermissionButton
                    action="delete"
                    onClick={() => onDelete(blog)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                    title={getPermissionMessage("delete", role)}
                  >
                    <FaTrash className="text-sm" />
                  </PermissionButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BlogManagement = () => {
    const { role } = usePermissions();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    status: "draft",
    examId: "",
    image: "",
  });

  const [formError, setFormError] = useState(null);
  const [filterState, setFilterState] = useFilterPersistence("blog", { statusFilter: "all", examFilter: "all", searchQuery: "" });
  const { page, limit, statusFilter, examFilter, searchQuery } = filterState;
  const [searchInput, setSearchInput] = useDebouncedSearchQuery(searchQuery, setFilterState);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  const fetchBlogs = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), limit: String(limit), status: statusFilter });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (examFilter && examFilter !== "all") params.set("examId", examFilter);
      const blogsRes = await api.get(`/blog?${params.toString()}`);

      if (blogsRes.data?.success) {
        setBlogs(blogsRes.data.data || []);
        if (blogsRes.data.pagination) {
          setPagination(blogsRes.data.pagination);
        }
      }
    } catch (error) {
      console.error("Error fetching blogs:", error);
      setError("Failed to fetch blogs");
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchMetadata = async () => {
    try {
      const [examsRes, categoriesRes] = await Promise.all([
        api.get("/exam?status=active"),
        api.get("/blog/category?status=active").catch(() => ({ data: { success: false } })),
      ]);

      if (examsRes.data?.success) {
        setExams(examsRes.data.data || []);
      }
      if (categoriesRes.data?.success) {
        setCategories(categoriesRes.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [page, limit, statusFilter, examFilter, searchQuery]);

  const examMap = useMemo(() => {
    const m = new Map();
    exams.forEach((e) => m.set(e._id, e.name));
    return m;
  }, [exams]);

  const groupedBlogs = useMemo(() => {
    const groups = new Map();
    blogs.forEach((b) => {
      const examId = b.examId?._id || b.examId || "unassigned";
      const examName = b.examId?.name || examMap.get(examId) || "Unassigned";
      if (!groups.has(examId)) groups.set(examId, { examName, items: [] });
      groups.get(examId).items.push(b);
    });
    return Array.from(groups.values());
  }, [blogs, examMap]);

  const handleAddBlog = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setFormError("Please enter a blog name");

    try {
      setIsFormLoading(true);
      setFormError(null);
      const payload = {
        name: formData.name.trim(),
        categoryId: formData.categoryId || null,
        status: formData.status,
        examId: formData.examId || null,
        image: formData.image,
      };
      const response = await api.post("/blog", payload);
      if (response.data.success) {
        fetchBlogs();
        success(`Blog "${formData.name}" created!`);
        setFormData({
          name: "",
          categoryId: "",
          status: "draft",
          examId: "",
          image: "",
        });
        setShowAddForm(false);
      } else {
        setFormError(response.data.message || "Failed");
        showError(response.data.message);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed";
      setFormError(msg);
      showError(msg);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
    
    if (name === "examId") {
      setFormData((prev) => ({ ...prev, categoryId: "" }));
    }
  };
  
  const getFilteredCategories = () => {
    if (!formData.examId) return [];
    return categories.filter(
      (cat) => (cat.examId?._id || cat.examId) === formData.examId
    );
  };

  const handleToggleStatus = async (blog) => {
    const isActive = blog.status === "active" || blog.status === "publish";
    const newStatus = isActive ? "inactive" : "active";
    try {
      const response = await api.put(`/blog/${blog._id}`, {
        status: newStatus,
      });
      if (response.data.success) {
        setBlogs((prev) =>
          prev.map((b) =>
            b._id === blog._id ? { ...b, status: newStatus } : b
          )
        );
        success(`Blog set to ${newStatus}`);
      }
    } catch (err) {
      showError("Failed to update status");
    }
  };

  const handleDeleteBlog = async (blog) => {
    if (!window.confirm(`Delete "${blog.name}"?`)) return;
    try {
      const response = await api.delete(`/blog/${blog._id}`);
      if (response.data.success) {
        setBlogs((prev) => prev.filter((b) => b._id !== blog._id));
        success("Deleted successfully");
      }
    } catch (err) {
      showError("Failed to delete");
    }
  };

  const handleCancelForm = () => {
    setFormData({
      name: "",
      categoryId: "",
      status: "draft",
      examId: "",
      image: "",
    });
    setFormError(null);
    setShowAddForm(false);
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Blog Management
              </h1>
              <p className="text-xs text-gray-600">
                Manage your content, news, and updates. Create and organize blog
                posts for your educational platform.
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors"
            >
              Add New Blog
            </button>
          </div>
        </div>

        {/* Add/Edit Blog Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New Blog
              </h2>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                disabled={isFormLoading}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBlog} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-sm font-medium text-red-800">
                      {formError}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Blog Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Enter blog title (e.g., 5 Strategies to Crack JEE Advanced)"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    required
                    disabled={isFormLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="examId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Exam
                  </label>
                  <select
                    id="examId"
                    name="examId"
                    value={formData.examId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading}
                  >
                    <option value="">-- General --</option>
                    {exams.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <label
                    htmlFor="categoryId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Category
                  </label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading || !formData.examId}
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

                <div className="space-y-2">
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="image"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    id="image"
                    name="image"
                    value={formData.image}
                    onChange={handleFormChange}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  disabled={isFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isFormLoading}
                >
                  {isFormLoading ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Adding Blog...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>Add Blog</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Blogs List
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your blogs, view details, and perform actions
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                  <input
                    type="text"
                    placeholder="Search blogs..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white w-48"
                  />
                </div>
                <select
                  value={examFilter}
                  onChange={(e) => setFilterState({ examFilter: e.target.value, page: 1 })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="all">All Exams</option>
                  {exams.map((ex) => (
                    <option key={ex._id} value={ex._id}>{ex.name}</option>
                  ))}
                </select>
                <select
                  id="blog-status-filter"
                  value={statusFilter}
                  onChange={(e) => setFilterState({ statusFilter: e.target.value, page: 1 })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            {isDataLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <LoadingSpinner size="large" />
                <p className="mt-3 text-sm text-gray-500">Loading blogs...</p>
              </div>
            ) : blogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <FaClipboardList className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Blogs Found
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm">
                  You haven&apos;t created any blogs yet. Click the &quot;Add
                  New Blog&quot; button to get started.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <FaPlus className="w-4 h-4" />
                  Create Your First Blog
                </button>
              </div>
            ) : (
              <>
                <div className="p-4">
                  {groupedBlogs.map((group) => (
                    <ExamBlogTable
                      key={group.examName}
                      examName={group.examName}
                      blogs={group.items}
                      onEdit={(b) => router.push(`/admin/blog/${b._id}`)}
                      onDelete={handleDeleteBlog}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </div>
                <PaginationBar
                  page={page}
                  limit={limit}
                  total={pagination.total}
                  totalPages={pagination.totalPages}
                  hasNextPage={pagination.hasNextPage}
                  hasPrevPage={pagination.hasPrevPage}
                  onPageChange={(p) => setFilterState({ page: p })}
                  onLimitChange={(l) => setFilterState({ limit: l, page: 1 })}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogManagement;
