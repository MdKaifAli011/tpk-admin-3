"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaExclamationTriangle,
  FaLock,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import {
  LoadingWrapper,
  SkeletonPageContent,
  LoadingSpinner,
} from "../ui/SkeletonLoader";
import PracticeCategoryTable from "../table/PracticeCategoryTable";
import { FaTrash, FaPowerOff } from "react-icons/fa";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import PaginationBar from "../ui/PaginationBar";

const PracticeManagement = () => {
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();
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
    subjectId: "",
    orderNumber: "",
    noOfTests: "",
    mode: "Online Test",
    duration: "",
    language: "English",
  });
  const [subjects, setSubjects] = useState([]);
  const [formError, setFormError] = useState(null);
  const [filterState, setFilterState] = useFilterPersistence("practice", {});
  const { page, limit } = filterState;
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  // ✅ Fetch Exams (for dropdown) using Axios
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

  // ✅ Fetch Subjects (for dropdown) using Axios
  const fetchSubjects = async (examId) => {
    if (!examId) {
      setSubjects([]);
      return;
    }
    try {
      const response = await api.get(`/subject?examId=${examId}&status=all`);
      if (response.data?.success) {
        setSubjects(response.data.data || []);
      }
    } catch (err) {
      console.error("❌ Error fetching subjects:", err);
    }
  };

  // ✅ Fetch Categories using Axios
  const fetchCategories = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);
      const response = await api.get(`/practice/category?status=all&page=${page}&limit=${limit}`);
      if (response.data?.success) {
        setCategories(response.data.data || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
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
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [page, limit]);

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

    // Fetch subjects when exam changes
    if (name === "examId") {
      setFormData((prev) => ({ ...prev, subjectId: "" }));
      fetchSubjects(value);
    }
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      examId: "",
      subjectId: "",
      orderNumber: "",
      noOfTests: "",
      mode: "Online Test",
      duration: "",
      language: "English",
    });
    setSubjects([]);
    setFormError(null);
  };

  // ✅ Handle Add Category using Axios
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Check permissions
    if (!canCreate) {
      showError(getPermissionMessage("create", role));
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
        subjectId: formData.subjectId || null,
        noOfTests: parseInt(formData.noOfTests) || 0,
        mode: formData.mode.trim() || "Online Test",
        duration: formData.duration.trim() || "",
        language: formData.language.trim() || "English",
      };

      // Add orderNumber if provided
      if (formData.orderNumber && formData.orderNumber.trim()) {
        payload.orderNumber = parseInt(formData.orderNumber);
      }

      let response;
      if (editingCategory) {
        // Update existing category
        response = await api.put(
          `/practice/category/${editingCategory._id}`,
          payload
        );
      } else {
        // Create new category
        response = await api.post("/practice/category", payload);
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

  // ✅ Handle Edit Category
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
      subjectId: category.subjectId?._id || category.subjectId || "",
      orderNumber: category.orderNumber?.toString() || "",
      noOfTests: category.noOfTests || "",
      mode: category.mode || "Online Test",
      duration: category.duration || "",
      language: category.language || "English",
    });
    if (examId) {
      fetchSubjects(examId);
    }
    setShowAddForm(true);
    setFormError(null);
  };

  // ✅ Handle Delete Category using Axios
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
        `/practice/category/${categoryToDelete._id}`
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

  // ✅ Handle Toggle Status
  const handleToggleStatus = async (category) => {
    const currentStatus = category.status || "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "deactivate" : "activate";

    if (
      window.confirm(`Are you sure you want to ${action} "${category.name}"?`)
    ) {
      try {
        setIsFormLoading(true);
        setError(null);

        const response = await api.patch(
          `/practice/category/${category._id}/status`,
          {
            status: newStatus,
          }
        );

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
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Practice Management
              </h1>
              <p className="text-xs text-gray-600">
                Manage and organize your practice categories, create new categories, and track category performance across your educational platform.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canCreate ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Create Category
                </button>
              ) : (
                <button
                  disabled
                  title={getPermissionMessage("create", role)}
                  className="px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium cursor-not-allowed"
                >
                  Create Category
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Add Category Form - Same Page */}
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

              {/* Row 1: Exam, Subject & Category Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
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

                <div className="space-y-1.5">
                  <label
                    htmlFor="subjectId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Subject
                  </label>
                  <select
                    id="subjectId"
                    name="subjectId"
                    value={formData.subjectId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading || !formData.examId}
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 1.5: Category Name & Order Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
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
                    placeholder="Enter category name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    required
                    disabled={isFormLoading}
                  />
                </div>

                <div className="space-y-1.5">
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
                    placeholder="Auto-calculated"
                    min="1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
                </div>
              </div>

              {/* Row 2: No. of Tests, Mode, Duration & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="noOfTests"
                    className="block text-sm font-medium text-gray-700"
                  >
                    No. of Tests
                  </label>
                  <input
                    type="number"
                    id="noOfTests"
                    name="noOfTests"
                    value={formData.noOfTests}
                    onChange={handleFormChange}
                    placeholder="Enter number of tests"
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="mode"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Mode
                  </label>
                  <select
                    id="mode"
                    name="mode"
                    value={formData.mode}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading}
                  >
                    <option value="Online Test">Online Test</option>
                    <option value="Offline Test">Offline Test</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Duration
                  </label>
                  <input
                    type="text"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleFormChange}
                    placeholder="e.g., 60 Min / Test"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Language
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading}
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
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
                      <span>
                        {editingCategory ? "Updating..." : "Creating..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>
                        {editingCategory
                          ? "Update Category"
                          : "Create Category"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <LoadingWrapper
            isLoading={isDataLoading}
            skeleton={<SkeletonPageContent />}
          >
            {error ? (
              <div className="p-6 text-center">
                <div className="text-red-500 text-sm">{error}</div>
              </div>
            ) : (
              <>
                <PracticeCategoryTable
                  categories={categories}
                  onEdit={handleEditCategory}
                  onDelete={handleDeleteCategory}
                  onToggleStatus={handleToggleStatus}
                />
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
          </LoadingWrapper>
        </div>
      </div>
    </>
  );
};

export default PracticeManagement;
