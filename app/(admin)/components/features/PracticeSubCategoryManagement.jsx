"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaExclamationTriangle,
  FaLock,
  FaTrash,
  FaPowerOff,
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
import PracticeSubCategoryTable from "../table/PracticeSubCategoryTable";

const PracticeSubCategoryManagement = ({ categoryId: propCategoryId }) => {
  const params = useParams();
  const categoryId = propCategoryId || params?.categoryId;
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: categoryId || "",
    unitId: "",
    chapterId: "",
    topicId: "",
    subTopicId: "",
    definitionId: "",
    orderNumber: "",
    duration: "",
    maximumMarks: "",
    negativeMarks: "",
    description: "",
  });
  const [units, setUnits] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subTopics, setSubTopics] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [formError, setFormError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  // ✅ Fetch Categories (for dropdown) using Axios
  const fetchCategories = async () => {
    try {
      const response = await api.get("/practice/category?status=all");
      if (response.data?.success) {
        setCategories(response.data.data || []);
      }
    } catch (err) {
      console.error("❌ Error fetching categories:", err);
    }
  };

  // ✅ Fetch Current Category Details (when categoryId is in URL)
  const fetchCurrentCategory = useCallback(async () => {
    if (!categoryId) {
      setCurrentCategory(null);
      return;
    }
    try {
      const response = await api.get(`/practice/category/${categoryId}`);
      if (response.data?.success) {
        const categoryData = response.data.data;
        setCurrentCategory(categoryData);
        // Auto-set categoryId in form
        setFormData((prev) => ({
          ...prev,
          categoryId: categoryData._id,
        }));
        // Immediately fetch units if examId and subjectId are available
        if (categoryData?.examId?._id && categoryData?.subjectId?._id) {
          await fetchUnits(categoryData.examId._id, categoryData.subjectId._id);
        }
      }
    } catch (err) {
      console.error("❌ Error fetching current category:", err);
    }
  }, [categoryId]);

  // ✅ Fetch Units based on category's exam and subject
  const fetchUnits = async (examId, subjectId) => {
    if (!examId || !subjectId) {
      setUnits([]);
      return;
    }
    try {
      const response = await api.get(
        `/unit?examId=${examId}&subjectId=${subjectId}&status=all`
      );
      if (response.data?.success) {
        setUnits(response.data.data || []);
      }
    } catch (err) {
      console.error("❌ Error fetching units:", err);
    }
  };

  // ✅ Fetch Chapters based on selected unit
  const fetchChapters = async (unitId) => {
    if (!unitId) {
      setChapters([]);
      return;
    }
    try {
      const response = await api.get(`/chapter?unitId=${unitId}&status=all`);
      if (response.data?.success) {
        setChapters(response.data.data || []);
      }
    } catch (err) {
      console.error("❌ Error fetching chapters:", err);
    }
  };

  // ✅ Fetch Topics based on selected chapter
  const fetchTopics = async (chapterId) => {
    if (!chapterId) {
      setTopics([]);
      return;
    }
    try {
      const response = await api.get(
        `/topic?chapterId=${chapterId}&status=all`
      );
      if (response.data?.success) {
        setTopics(response.data.data || []);
      }
    } catch (err) {
      console.error("❌ Error fetching topics:", err);
    }
  };

  // ✅ Fetch SubTopics based on selected topic
  const fetchSubTopics = async (topicId) => {
    if (!topicId) {
      setSubTopics([]);
      return;
    }
    try {
      const response = await api.get(`/subtopic?topicId=${topicId}&status=all`);
      if (response.data?.success) {
        setSubTopics(response.data.data || []);
      }
    } catch (err) {
      console.error("❌ Error fetching subtopics:", err);
    }
  };

  // ✅ Fetch Definitions based on selected subtopic
  const fetchDefinitions = async (subTopicId) => {
    if (!subTopicId) {
      setDefinitions([]);
      return;
    }
    try {
      const response = await api.get(
        `/definition?subTopicId=${subTopicId}&status=all`
      );
      if (response.data?.success) {
        setDefinitions(response.data.data || []);
      }
    } catch (err) {
      console.error("❌ Error fetching definitions:", err);
    }
  };

  // ✅ Fetch SubCategories using Axios
  const fetchSubCategories = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);
      const queryParams = categoryId
        ? `?categoryId=${categoryId}&status=all`
        : "?status=all";
      const response = await api.get(`/practice/subcategory${queryParams}`);
      if (response.data?.success) {
        setSubCategories(response.data.data || []);
      } else {
        setError(response.data?.message || "Failed to fetch subcategories");
      }
    } catch (err) {
      console.error("❌ Error fetching subcategories:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch subcategories";
      setError(errorMessage);
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategories();
    fetchCurrentCategory();
  }, [fetchCurrentCategory]);

  useEffect(() => {
    fetchSubCategories();
  }, [fetchSubCategories]);

  // Calculate next order number when category is selected
  useEffect(() => {
    if (showAddForm && formData.categoryId && !editingSubCategory) {
      const subCategoriesInCategory = subCategories.filter(
        (sc) => (sc.categoryId?._id || sc.categoryId) === formData.categoryId
      );
      const maxOrder =
        subCategoriesInCategory.length > 0
          ? Math.max(
              ...subCategoriesInCategory.map((sc) => sc.orderNumber || 0)
            )
          : 0;
      setFormData((prev) => ({
        ...prev,
        orderNumber: (maxOrder + 1).toString(),
      }));
    }
  }, [formData.categoryId, showAddForm, editingSubCategory, subCategories]);

  // Fetch category data when form opens for creation
  useEffect(() => {
    if (!showAddForm || editingSubCategory) return; // Only for new creation

    // If categoryId is from URL but currentCategory is not loaded, fetch it
    if (categoryId && !currentCategory) {
      fetchCurrentCategory();
    }
    // Note: Once currentCategory is loaded, the second useEffect will fetch units
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, categoryId, editingSubCategory, currentCategory]);

  // Fetch units when category is loaded or form category changes
  useEffect(() => {
    // Skip if form is not open (to avoid unnecessary fetches)
    if (!showAddForm && !editingSubCategory) return;

    // If categoryId is from URL, use currentCategory
    // Otherwise, find it in categories array
    let selectedCategory = null;

    if (categoryId) {
      // Category from URL - use currentCategory
      selectedCategory = currentCategory;
    } else if (formData.categoryId) {
      // Category from form selection - find in categories array
      selectedCategory = categories.find((c) => c._id === formData.categoryId);
    }

    if (selectedCategory?.examId?._id && selectedCategory?.subjectId?._id) {
      fetchUnits(selectedCategory.examId._id, selectedCategory.subjectId._id);
    } else if (formData.categoryId || categoryId) {
      // Only clear if we actually have a category selected
      // This prevents clearing when form first opens
      if (!selectedCategory) {
        // Category is selected but not loaded yet - don't clear, wait for it
        return;
      }
      setUnits([]);
      setChapters([]);
      setTopics([]);
      setSubTopics([]);
      setDefinitions([]);
    }
  }, [
    currentCategory,
    formData.categoryId,
    categories,
    categoryId,
    showAddForm,
    editingSubCategory,
  ]);

  // Handle form field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Reset dependent fields when parent changes
      if (name === "categoryId") {
        // Reset all hierarchical fields when category changes
        newData.unitId = "";
        newData.chapterId = "";
        newData.topicId = "";
        newData.subTopicId = "";
        newData.definitionId = "";
        setUnits([]);
        setChapters([]);
        setTopics([]);
        setSubTopics([]);
        setDefinitions([]);
        // Fetch units for the new category
        // Check both categories array and currentCategory
        let selectedCategory = categories.find((c) => c._id === value);
        if (!selectedCategory && value === categoryId && currentCategory) {
          selectedCategory = currentCategory;
        }
        if (selectedCategory?.examId?._id && selectedCategory?.subjectId?._id) {
          fetchUnits(
            selectedCategory.examId._id,
            selectedCategory.subjectId._id
          );
        }
      } else if (name === "unitId") {
        newData.chapterId = "";
        newData.topicId = "";
        newData.subTopicId = "";
        newData.definitionId = "";
        setChapters([]);
        setTopics([]);
        setSubTopics([]);
        setDefinitions([]);
        if (value) fetchChapters(value);
      } else if (name === "chapterId") {
        newData.topicId = "";
        newData.subTopicId = "";
        newData.definitionId = "";
        setTopics([]);
        setSubTopics([]);
        setDefinitions([]);
        if (value) fetchTopics(value);
      } else if (name === "topicId") {
        newData.subTopicId = "";
        newData.definitionId = "";
        setSubTopics([]);
        setDefinitions([]);
        if (value) fetchSubTopics(value);
      } else if (name === "subTopicId") {
        newData.definitionId = "";
        setDefinitions([]);
        if (value) fetchDefinitions(value);
      }

      return newData;
    });
    setFormError(null);
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingSubCategory(null);
    setFormData({
      name: "",
      categoryId: categoryId || "",
      unitId: "",
      chapterId: "",
      topicId: "",
      subTopicId: "",
      definitionId: "",
      orderNumber: "",
      duration: "",
      maximumMarks: "",
      negativeMarks: "",
      description: "",
    });
    setUnits([]);
    setChapters([]);
    setTopics([]);
    setSubTopics([]);
    setDefinitions([]);
    setFormError(null);
  };

  // ✅ Handle Add SubCategory using Axios
  const handleAddSubCategory = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Check permissions
    if (!canCreate) {
      showError(getPermissionMessage("create", role));
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      setFormError("SubCategory name is required");
      return;
    }
    if (!formData.categoryId) {
      setFormError("Category is required");
      return;
    }

    try {
      setIsFormLoading(true);
      setError(null);

      const payload = {
        name: formData.name.trim(),
        categoryId: formData.categoryId,
        unitId: formData.unitId || null,
        chapterId: formData.chapterId || null,
        topicId: formData.topicId || null,
        subTopicId: formData.subTopicId || null,
        definitionId: formData.definitionId || null,
        duration: formData.duration.trim() || "",
        maximumMarks: parseFloat(formData.maximumMarks) || 0,
        negativeMarks: parseFloat(formData.negativeMarks) || 0,
        description: formData.description.trim() || "",
      };

      // Add orderNumber if provided
      if (formData.orderNumber && formData.orderNumber.trim()) {
        payload.orderNumber = parseInt(formData.orderNumber);
      }

      let response;
      if (editingSubCategory) {
        // Update existing subcategory
        response = await api.put(
          `/practice/subcategory/${editingSubCategory._id}`,
          payload
        );
      } else {
        // Create new subcategory
        response = await api.post("/practice/subcategory", payload);
      }

      if (response.data?.success) {
        await fetchSubCategories();
        success(
          `SubCategory "${formData.name}" ${
            editingSubCategory ? "updated" : "created"
          } successfully!`
        );
        handleCancelForm();
      } else {
        setFormError(response.data?.message || "Failed to save subcategory");
        showError(response.data?.message || "Failed to save subcategory");
      }
    } catch (err) {
      console.error("❌ Error adding subcategory:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add subcategory";
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  // ✅ Handle Edit SubCategory
  const handleEditSubCategory = (subCategory) => {
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    setEditingSubCategory(subCategory);
    const catId = subCategory.categoryId?._id || subCategory.categoryId || "";

    setFormData({
      name: subCategory.name || "",
      categoryId: catId,
      unitId: subCategory.unitId?._id || subCategory.unitId || "",
      chapterId: subCategory.chapterId?._id || subCategory.chapterId || "",
      topicId: subCategory.topicId?._id || subCategory.topicId || "",
      subTopicId: subCategory.subTopicId?._id || subCategory.subTopicId || "",
      definitionId:
        subCategory.definitionId?._id || subCategory.definitionId || "",
      orderNumber: subCategory.orderNumber?.toString() || "",
      duration: subCategory.duration || "",
      maximumMarks: subCategory.maximumMarks || "",
      negativeMarks: subCategory.negativeMarks || "",
      description: subCategory.description || "",
    });

    // Fetch hierarchical data for editing
    if (catId) {
      const category = categories.find((c) => c._id === catId);
      if (category?.examId?._id && category?.subjectId?._id) {
        fetchUnits(category.examId._id, category.subjectId._id).then(() => {
          if (subCategory.unitId?._id || subCategory.unitId) {
            fetchChapters(subCategory.unitId?._id || subCategory.unitId).then(
              () => {
                if (subCategory.chapterId?._id || subCategory.chapterId) {
                  fetchTopics(
                    subCategory.chapterId?._id || subCategory.chapterId
                  ).then(() => {
                    if (subCategory.topicId?._id || subCategory.topicId) {
                      fetchSubTopics(
                        subCategory.topicId?._id || subCategory.topicId
                      ).then(() => {
                        if (
                          subCategory.subTopicId?._id ||
                          subCategory.subTopicId
                        ) {
                          fetchDefinitions(
                            subCategory.subTopicId?._id ||
                              subCategory.subTopicId
                          );
                        }
                      });
                    }
                  });
                }
              }
            );
          }
        });
      }
    }

    setShowAddForm(true);
    setFormError(null);
  };

  // ✅ Handle Delete SubCategory using Axios
  const handleDeleteSubCategory = async (subCategoryToDelete) => {
    if (!canDelete) {
      showError(getPermissionMessage("delete", role));
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to delete "${subCategoryToDelete.name}"?`
      )
    )
      return;

    try {
      setIsFormLoading(true);
      setError(null);
      const response = await api.delete(
        `/practice/subcategory/${subCategoryToDelete._id}`
      );

      if (response.data?.success) {
        await fetchSubCategories();
        success(
          `SubCategory "${subCategoryToDelete.name}" deleted successfully!`
        );
      } else {
        setError(response.data?.message || "Failed to delete subcategory");
        showError(response.data?.message || "Failed to delete subcategory");
      }
    } catch (err) {
      console.error("❌ Error deleting subcategory:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete subcategory";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  // ✅ Handle Toggle Status
  const handleToggleStatus = async (subCategory) => {
    const currentStatus = subCategory.status || "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "deactivate" : "activate";

    if (
      window.confirm(
        `Are you sure you want to ${action} "${subCategory.name}"?`
      )
    ) {
      try {
        setIsFormLoading(true);
        setError(null);

        const response = await api.patch(
          `/practice/subcategory/${subCategory._id}/status`,
          {
            status: newStatus,
          }
        );

        if (response.data.success) {
          await fetchSubCategories();
          success(`SubCategory ${action}d successfully!`);
        } else {
          setError(response.data.message || `Failed to ${action} subcategory`);
          showError(response.data.message || `Failed to ${action} subcategory`);
        }
      } catch (error) {
        console.error(`Error ${action}ing subcategory:`, error);
        const errorMessage =
          error.response?.data?.message ||
          `Failed to ${action} subcategory. Please try again.`;
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
                {currentCategory?.name || "Practice SubCategory Management"}
              </h1>
              <p className="text-xs text-gray-600">
                {currentCategory
                  ? `${currentCategory.examId?.name || "Exam name"} → ${
                      currentCategory.subjectId?.name || "Subject name"
                    }`
                  : "Manage and organize your practice papers, create new papers, and track paper performance across your educational platform."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canCreate ? (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    // The useEffect will handle data fetching when form opens
                  }}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Create Paper
                </button>
              ) : (
                <button
                  disabled
                  title={getPermissionMessage("create", role)}
                  className="px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium cursor-not-allowed"
                >
                  Create Paper
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Add SubCategory Form - Same Page */}
        {showAddForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSubCategory ? "Edit Paper" : "Create New Paper"}
              </h2>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                disabled={isFormLoading}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubCategory} className="space-y-4">
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

              {/* Category (if not from URL) */}
              {!categoryId && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="categoryId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                    disabled={isFormLoading}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Row 1: Unit, Chapter, Topic, Subtopic, Definition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="unitId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Unit
                  </label>
                  <select
                    id="unitId"
                    name="unitId"
                    value={formData.unitId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={
                      isFormLoading ||
                      (!currentCategory && !formData.categoryId)
                    }
                  >
                    <option value="">Select a unit</option>
                    {units.map((unit) => (
                      <option key={unit._id} value={unit._id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="chapterId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Chapter
                  </label>
                  <select
                    id="chapterId"
                    name="chapterId"
                    value={formData.chapterId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading || !formData.unitId}
                  >
                    <option value="">Select a chapter</option>
                    {chapters.map((chapter) => (
                      <option key={chapter._id} value={chapter._id}>
                        {chapter.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="topicId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Topic
                  </label>
                  <select
                    id="topicId"
                    name="topicId"
                    value={formData.topicId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading || !formData.chapterId}
                  >
                    <option value="">Select a topic</option>
                    {topics.map((topic) => (
                      <option key={topic._id} value={topic._id}>
                        {topic.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="subTopicId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Subtopic
                  </label>
                  <select
                    id="subTopicId"
                    name="subTopicId"
                    value={formData.subTopicId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading || !formData.topicId}
                  >
                    <option value="">Select a subtopic</option>
                    {subTopics.map((subTopic) => (
                      <option key={subTopic._id} value={subTopic._id}>
                        {subTopic.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="definitionId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Definition
                  </label>
                  <select
                    id="definitionId"
                    name="definitionId"
                    value={formData.definitionId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading || !formData.subTopicId}
                  >
                    <option value="">Select a definition</option>
                    {definitions.map((definition) => (
                      <option key={definition._id} value={definition._id}>
                        {definition.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Paper Name & Order Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Paper Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Enter paper name (e.g., 2025 Simple Paper)"
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

              {/* Row 3: Duration, Maximum Marks, Number of Questions, Negative Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    placeholder="e.g., 60 Min"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="maximumMarks"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Maximum Marks
                  </label>
                  <input
                    type="number"
                    id="maximumMarks"
                    name="maximumMarks"
                    value={formData.maximumMarks}
                    onChange={handleFormChange}
                    placeholder="e.g., 100"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="negativeMarks"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Negative Marks
                  </label>
                  <input
                    type="number"
                    id="negativeMarks"
                    name="negativeMarks"
                    value={formData.negativeMarks}
                    onChange={handleFormChange}
                    placeholder="e.g., 0.25"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
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
                  placeholder="Enter description (optional)"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all resize-none"
                  disabled={isFormLoading}
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                  disabled={isFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isFormLoading}
                >
                  {isFormLoading ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>
                        {editingSubCategory ? "Updating..." : "Creating..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>
                        {editingSubCategory ? "Update Paper" : "Create Paper"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SubCategories Table */}
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
              <PracticeSubCategoryTable
                subCategories={subCategories}
                onEdit={handleEditSubCategory}
                onDelete={handleDeleteSubCategory}
                onToggleStatus={handleToggleStatus}
              />
            )}
          </LoadingWrapper>
        </div>
      </div>
    </>
  );
};

export default PracticeSubCategoryManagement;
