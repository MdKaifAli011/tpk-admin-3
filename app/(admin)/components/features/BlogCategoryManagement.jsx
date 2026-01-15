"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaExclamationTriangle,
  FaEdit,
  FaTrash,
  FaClipboardList,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import { PermissionButton } from "../common/PermissionButton";
import {
  LoadingWrapper,
  SkeletonPageContent,
  LoadingSpinner,
} from "../ui/SkeletonLoader";

const StatusBadge = ({ status, onClick }) => {
  const getStatusStyles = (s) => {
    switch (s) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
        status
      )}`}
    >
      {(status || "active").charAt(0).toUpperCase() +
        (status || "active").slice(1)}
    </button>
  );
};

const BlogCategoryTable = ({ categories, onEdit, onDelete, onToggleStatus, canEdit, canDelete, role }) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-5xl mb-3 animate-float">📝</div>
        <h3 className="text-sm sm:text-sm font-bold text-gray-800 mb-1.5">
          No Categories Found
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Create your first blog category to organize your blog posts by exam.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category Details
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Exam
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Status
              </th>
              <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category, index) => (
              <tr
                key={category._id || category.id || index}
                className={`hover:bg-gray-50 transition-colors ${
                  category.status === "inactive" ? "opacity-60" : ""
                }`}
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-medium truncate ${
                          category.status === "inactive"
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-xs text-gray-400 truncate">
                          {category.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-1 whitespace-nowrap w-40">
                  {category.examId?.name ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {category.examId.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      General
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 whitespace-nowrap w-32">
                  {canEdit ? (
                    <StatusBadge
                      status={category.status}
                      onClick={() => onToggleStatus(category)}
                    />
                  ) : (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        category.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {(category.status || "active").charAt(0).toUpperCase() +
                        (category.status || "active").slice(1)}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-right w-32">
                  <div className="flex items-center justify-end gap-1">
                    <PermissionButton
                      action="edit"
                      onClick={() => onEdit(category)}
                      disabled={!canEdit}
                      className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={getPermissionMessage("edit", role)}
                    >
                      <FaEdit className="text-sm" />
                    </PermissionButton>
                    <PermissionButton
                      action="delete"
                      onClick={() => onDelete(category)}
                      disabled={!canDelete}
                      className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {categories.map((category, index) => (
          <div
            key={category._id || category.id || index}
            className={`p-1.5 hover:bg-gray-50 transition-colors ${
              category.status === "inactive" ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm font-semibold mb-1 ${
                    category.status === "inactive"
                      ? "text-gray-500 line-through"
                      : "text-gray-900"
                  }`}
                >
                  {category.name}
                </h3>
                {category.description && (
                  <div className="text-xs text-gray-500 mb-1">
                    {category.description}
                  </div>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {category.examId?.name ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {category.examId.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      General
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {canEdit ? (
                    <StatusBadge
                      status={category.status}
                      onClick={() => onToggleStatus(category)}
                    />
                  ) : (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        category.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {(category.status || "active").charAt(0).toUpperCase() +
                        (category.status || "active").slice(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3">
                <PermissionButton
                  action="edit"
                  onClick={() => onEdit(category)}
                  disabled={!canEdit}
                  className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={getPermissionMessage("edit", role)}
                >
                  <FaEdit className="text-sm" />
                </PermissionButton>
                <PermissionButton
                  action="delete"
                  onClick={() => onDelete(category)}
                  disabled={!canDelete}
                  className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
};

const BlogCategoryManagement = () => {
  const { canCreate, canEdit, canDelete, role } = usePermissions();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    examId: "",
    orderNumber: "",
    description: "",
  });
  const [formError, setFormError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  // Fetch Exams
  const fetchExams = async () => {
    try {
      const response = await api.get("/exam?status=all");
      if (response.data?.success) {
        setExams(response.data.data || []);
      }
    } catch (err) {
      console.error("❌ Error fetching exams:", err);
    }
  };

  // Fetch Categories
  const fetchCategories = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);
      const response = await api.get("/blog/category?status=all");
      if (response.data?.success) {
        setCategories(response.data.data || []);
      } else {
        setError(response.data?.message || "Failed to fetch categories");
      }
    } catch (err) {
      console.error("❌ Error fetching categories:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch categories";
      setError(errorMessage);
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchExams();
    fetchCategories();
  }, []);

  // Calculate next order number when exam is selected
  useEffect(() => {
    if (showAddForm && formData.examId && !editingCategory) {
      const categoriesInExam = categories.filter(
        (c) => (c.examId?._id || c.examId) === formData.examId
      );
      const maxOrder =
        categoriesInExam.length > 0
          ? Math.max(...categoriesInExam.map((c) => c.orderNumber || 0))
          : 0;
      setFormData((prev) => ({
        ...prev,
        orderNumber: (maxOrder + 1).toString(),
      }));
    }
  }, [formData.examId, showAddForm, editingCategory, categories]);

  // Handle form field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      examId: "",
      orderNumber: "",
      description: "",
    });
    setFormError(null);
  };

  // Handle Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Check permissions
    if (!canCreate && !editingCategory) {
      showError(getPermissionMessage("create", role));
      return;
    }
    if (!canEdit && editingCategory) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      setFormError("Category name is required");
      return;
    }
    if (!formData.examId) {
      setFormError("Exam is required");
      return;
    }

    try {
      setIsFormLoading(true);
      setError(null);

      const payload = {
        name: formData.name.trim(),
        examId: formData.examId,
        description: formData.description.trim() || "",
      };

      // Add orderNumber if provided
      if (formData.orderNumber && formData.orderNumber.trim()) {
        payload.orderNumber = parseInt(formData.orderNumber);
      }

      let response;
      if (editingCategory) {
        // Update existing category
        response = await api.put(
          `/blog/category/${editingCategory._id}`,
          payload
        );
      } else {
        // Create new category
        response = await api.post("/blog/category", payload);
      }

      if (response.data?.success) {
        await fetchCategories();
        success(
          `Category "${formData.name}" ${
            editingCategory ? "updated" : "created"
          } successfully!`
        );
        handleCancelForm();
      } else {
        setFormError(response.data?.message || "Failed to save category");
        showError(response.data?.message || "Failed to save category");
      }
    } catch (err) {
      console.error("❌ Error adding category:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add category";
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  // Handle Edit Category
  const handleEditCategory = (category) => {
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    setEditingCategory(category);
    const examId = category.examId?._id || category.examId || "";
    setFormData({
      name: category.name || "",
      examId: examId,
      orderNumber: category.orderNumber?.toString() || "",
      description: category.description || "",
    });
    setShowAddForm(true);
    setFormError(null);
  };

  // Handle Delete Category
  const handleDeleteCategory = async (categoryToDelete) => {
    if (!canDelete) {
      showError(getPermissionMessage("delete", role));
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to delete "${categoryToDelete.name}"?`
      )
    )
      return;

    try {
      setIsFormLoading(true);
      setError(null);
      const response = await api.delete(
        `/blog/category/${categoryToDelete._id}`
      );

      if (response.data?.success) {
        await fetchCategories();
        success(`Category "${categoryToDelete.name}" deleted successfully!`);
      } else {
        setError(response.data?.message || "Failed to delete category");
        showError(response.data?.message || "Failed to delete category");
      }
    } catch (err) {
      console.error("❌ Error deleting category:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete category";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (category) => {
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    const currentStatus = category.status || "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "deactivate" : "activate";

    if (
      window.confirm(`Are you sure you want to ${action} "${category.name}"?`)
    ) {
      try {
        setIsFormLoading(true);
        setError(null);

        const response = await api.patch(`/blog/category/${category._id}`, {
          status: newStatus,
        });

        if (response.data.success) {
          await fetchCategories();
          success(`Category ${action}d successfully!`);
        } else {
          setError(response.data.message || `Failed to ${action} category`);
          showError(response.data.message || `Failed to ${action} category`);
        }
      } catch (error) {
        console.error(`Error ${action}ing category:`, error);
        const errorMessage =
          error.response?.data?.message ||
          `Failed to ${action} category. Please try again.`;
        setError(errorMessage);
        showError(errorMessage);
      } finally {
        setIsFormLoading(false);
      }
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Blog Category Management
              </h1>
              <p className="text-xs text-gray-600">
                Create and manage blog categories for each exam. Categories help organize your blog posts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PermissionButton
                action="create"
                onClick={() => setShowAddForm(true)}
                disabled={!canCreate}
                className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100"
                title={getPermissionMessage("create", role)}
              >
                Create Category
              </PermissionButton>
            </div>
          </div>
        </div>

        {/* Add Category Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCategory ? "Edit Category" : "Create New Category"}
              </h2>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                disabled={isFormLoading}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              {/* Form Error Display */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <FaExclamationTriangle className="text-red-500" />
                    <p className="text-sm font-medium text-red-800">
                      {formError}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Exam */}
                <div className="space-y-2">
                  <label
                    htmlFor="examId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Exam <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="examId"
                    name="examId"
                    value={formData.examId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                    disabled={isFormLoading || editingCategory}
                  >
                    <option value="">Select an exam</option>
                    {exams.map((exam) => (
                      <option key={exam._id} value={exam._id}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Name */}
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g., Study Tips, News, Resources"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    required
                    disabled={isFormLoading}
                  />
                </div>

                {/* Order Number */}
                <div className="space-y-2">
                  <label
                    htmlFor="orderNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Order Number
                  </label>
                  <input
                    type="number"
                    id="orderNumber"
                    name="orderNumber"
                    value={formData.orderNumber}
                    onChange={handleFormChange}
                    placeholder="Auto-generated if not provided"
                    min="1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Optional description for this category..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all resize-none"
                    disabled={isFormLoading}
                  />
                </div>
              </div>

              {/* Form Actions */}
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
                      <span>{editingCategory ? "Updating..." : "Creating..."}</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>{editingCategory ? "Update Category" : "Create Category"}</span>
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
                  Categories List
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your blog categories, view details, and perform actions
                </p>
              </div>
            </div>
          </div>

          <div>
            {isDataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <LoadingSpinner size="medium" />
                  <p className="text-sm text-gray-500 mt-3">Loading categories...</p>
                </div>
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <FaClipboardList className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Categories Found
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm">
                  You haven&apos;t created any categories yet. Click the &quot;Create Category&quot; button to get started.
                </p>
                {canCreate && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                  >
                    <FaPlus className="w-4 h-4" />
                    Create Your First Category
                  </button>
                )}
              </div>
            ) : (
              <BlogCategoryTable
                categories={categories}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                onToggleStatus={handleToggleStatus}
                canEdit={canEdit}
                canDelete={canDelete}
                role={role}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogCategoryManagement;

