"use client";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import SubjectTable from "../table/SubjectTable";
import {
  LoadingWrapper,
  SkeletonPageContent,
  LoadingSpinner,
} from "../ui/SkeletonLoader";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaExclamationTriangle,
  FaClipboardList,
  FaLock,
  FaSearch,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";

const SubjectManagement = () => {
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    examId: "",
    orderNumber: "",
  });
  const [formError, setFormError] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterExam, setFilterExam] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);
  const [metaFilter, setMetaFilter] = useState("all"); // all, filled, notFilled

  // ✅ Fetch Subjects using Axios
  const fetchSubjects = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);
      // Fetch all subjects (active and inactive) to show correct status
      // Use a high limit to get all subjects at once (or use pagination if needed)
      const response = await api.get(`/subject?status=all&limit=1000&metaStatus=${metaFilter}`);

      if (response.data?.success) {
        const fetchedSubjects = response.data.data || [];
        // Ensure we have an array
        if (Array.isArray(fetchedSubjects)) {
          setSubjects(fetchedSubjects);
        } else {
          console.error("❌ Invalid subjects data format:", fetchedSubjects);
          setError("Invalid data format received from server");
          setSubjects([]);
        }
      } else {
        setError(response.data?.message || "Failed to fetch subjects");
        setSubjects([]);
      }
    } catch (err) {
      console.error("❌ Error fetching subjects:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch subjects";
      setError(errorMessage);
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  }, [metaFilter]);

  // ✅ Fetch Exams (for dropdown) using Axios
  const fetchExams = async () => {
    try {
      // Fetch all exams (active and inactive) for dropdown
      const response = await api.get("/exam?status=all&limit=1000");

      if (response.data?.success) {
        setExams(response.data.data || []);
      } else {
        console.error("Failed to fetch exams:", response.data?.message);
      }
    } catch (err) {
      console.error("❌ Error fetching exams:", err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects, metaFilter]);

  useEffect(() => {
    fetchExams();
  }, []);

  // Calculate next order number when exam is selected
  useEffect(() => {
    if (showAddForm && formData.examId && !editingSubject) {
      const subjectsInExam = subjects.filter(
        (s) => (s.examId?._id || s.examId) === formData.examId
      );
      const maxOrder = subjectsInExam.length > 0
        ? Math.max(...subjectsInExam.map(s => s.orderNumber || 0))
        : 0;
      setFormData(prev => ({
        ...prev,
        orderNumber: (maxOrder + 1).toString(),
      }));
    }
  }, [formData.examId, showAddForm, editingSubject, subjects]);

  // Filter subjects based on selected exam
  const filteredSubjects = useMemo(() => {
    let result = subjects;
    if (filterExam) {
      result = result.filter(
        (subject) =>
          subject.examId?._id === filterExam || subject.examId === filterExam
      );
    }
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((subject) =>
        subject.name?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [subjects, filterExam, searchQuery]);

  // Get active filter count
  const activeFilterCount = filterExam ? 1 : 0;

  // Clear all filters
  const clearFilters = () => {
    setFilterExam("");
  };

  // ✅ Handle Input Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError(null);
  };

  // ✅ Handle Add Subject using Axios
  const handleAddSubject = async (e) => {
    e.preventDefault();

    // Check permissions
    if (!canCreate) {
      showError(getPermissionMessage("create", role));
      return;
    }

    if (!formData.name.trim() || !formData.examId) {
      setFormError("Please fill in all required fields.");
      return;
    }

    try {
      setIsFormLoading(true);
      setFormError(null);
      const payload = {
        name: formData.name.trim(),
        examId: formData.examId,
      };

      // Add orderNumber if provided
      if (formData.orderNumber && formData.orderNumber.trim()) {
        payload.orderNumber = parseInt(formData.orderNumber);
      }

      const response = await api.post("/subject", payload);

      if (response.data?.success) {
        // Add the new subject with populated exam data
        setSubjects((prev) => [...prev, response.data.data]);
        success(`Subject "${formData.name}" added successfully!`);
        // Reset form
        setFormData({ name: "", examId: "", orderNumber: "" });
        setEditingSubject(null);
        setShowAddForm(false);
      } else {
        setFormError(response.data?.message || "Failed to add subject");
        showError(response.data?.message || "Failed to add subject");
      }
    } catch (err) {
      console.error("❌ Error adding subject:", err);
      const errorMessage =
        err?.response?.data?.message || err?.message || "Failed to add subject";
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleCancelForm = () => {
    setFormData({ name: "", examId: "", orderNumber: "" });
    setFormError(null);
    setEditingSubject(null);
    setShowAddForm(false);
  };

  // ✅ Handle Edit Subject
  const handleEditSubject = (subjectToEdit) => {
    // Check permissions
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }
    setEditingSubject(subjectToEdit);
    setFormData({
      name: subjectToEdit.name || "",
      examId: subjectToEdit.examId?._id || subjectToEdit.examId || "",
      orderNumber: subjectToEdit.orderNumber?.toString() || "",
    });
    setShowAddForm(true);
    setFormError(null);
  };

  // ✅ Handle Update Subject
  const handleUpdateSubject = async (e) => {
    e.preventDefault();

    // Check permissions
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    if (!formData.name.trim() || !formData.examId) {
      setFormError("Please fill in all required fields.");
      return;
    }

    try {
      setIsFormLoading(true);
      setFormError(null);

      const payload = {
        name: formData.name.trim(),
        examId: formData.examId,
      };

      // Add orderNumber if provided
      if (formData.orderNumber && formData.orderNumber.trim()) {
        payload.orderNumber = parseInt(formData.orderNumber);
      }

      const response = await api.put(`/subject/${editingSubject._id}`, payload);

      if (response.data?.success) {
        setSubjects((prev) =>
          prev.map((s) =>
            s._id === editingSubject._id ? response.data.data : s
          )
        );
        success("Subject updated successfully!");
        handleCancelForm();
      } else {
        setFormError(response.data?.message || "Failed to update subject");
        showError(response.data?.message || "Failed to update subject");
      }
    } catch (err) {
      console.error("❌ Error updating subject:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update subject";
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  // ✅ Handle Delete Subject using Axios
  const handleDeleteSubject = async (subjectToDelete) => {
    // Check permissions
    if (!canDelete) {
      showError(getPermissionMessage("delete", role));
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to delete "${subjectToDelete.name}"?`
      )
    )
      return;

    try {
      setIsFormLoading(true);
      setError(null);
      const response = await api.delete(`/subject/${subjectToDelete._id}`);

      if (response.data?.success) {
        setSubjects((prev) =>
          prev.filter((s) => s._id !== subjectToDelete._id)
        );
        success(`Subject "${subjectToDelete.name}" deleted successfully!`);
      } else {
        setError(response.data?.message || "Failed to delete subject");
        showError(response.data?.message || "Failed to delete subject");
      }
    } catch (err) {
      console.error("❌ Error deleting subject:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete subject";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  // ✅ Handle Toggle Practice
  const handleTogglePractice = async (subject) => {
    const currentPracticeDisabled = subject.practiceDisabled || false;
    const newPracticeDisabled = !currentPracticeDisabled;
    const action = newPracticeDisabled ? "disable" : "enable";

    if (
      window.confirm(
        `Are you sure you want to ${action} practice tests for "${subject.name}"? This will ${action} practice tests for all children (units, chapters, topics, subtopics) of this subject.`
      )
    ) {
      try {
        setIsFormLoading(true);
        setError(null);

        const response = await api.patch(`/subject/${subject._id}/practice`, {
          practiceDisabled: newPracticeDisabled,
        });

        if (response.data.success) {
          // Refetch subjects to get updated practiceDisabled from database
          await fetchSubjects();
          success(
            `Practice tests ${action}d successfully for "${subject.name}" and all children!`
          );
        } else {
          setError(response.data.message || `Failed to ${action} practice tests`);
          showError(response.data.message || `Failed to ${action} practice tests`);
        }
      } catch (error) {
        console.error(`Error ${action}ing practice tests:`, error);
        const errorMessage =
          error.response?.data?.message ||
          `Failed to ${action} practice tests. Please try again.`;
        setError(errorMessage);
        showError(errorMessage);
      } finally {
        setIsFormLoading(false);
      }
    }
  };

  // ✅ Handle Toggle Status
  const handleToggleStatus = async (subject) => {
    const currentStatus = subject.status || "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "deactivate" : "activate";

    if (
      window.confirm(
        `Are you sure you want to ${action} "${subject.name}"? All its children will also be ${action}d.`
      )
    ) {
      try {
        setIsFormLoading(true);
        setError(null);

        const response = await api.patch(`/subject/${subject._id}/status`, {
          status: newStatus,
        });

        if (response.data.success) {
          // Refetch subjects to get updated status from database
          await fetchSubjects();
          success(
            `Subject "${subject.name}" and all children ${action}d successfully!`
          );
        } else {
          setError(response.data.message || `Failed to ${action} subject`);
          showError(response.data.message || `Failed to ${action} subject`);
        }
      } catch (error) {
        console.error(`Error ${action}ing subject:`, error);
        const errorMessage =
          error.response?.data?.message ||
          `Failed to ${action} subject. Please try again.`;
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
                Subject Management
              </h1>
              <p className="text-xs text-gray-600">
                Manage and organize your subjects, create new ones, and track performance across your educational platform.
              </p>
            </div>
            {canCreate ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors"
              >
                Add New Subject
              </button>
            ) : (
              <button
                disabled
                title={getPermissionMessage("create", role)}
                className="px-2 py-1 bg-gray-300 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed"
              >
                Add New Subject
              </button>
            )}
          </div>
        </div>

        {/* Add/Edit Subject Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSubject ? "Edit Subject" : "Add New Subject"}
              </h2>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                disabled={isFormLoading}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingSubject ? handleUpdateSubject : handleAddSubject} className="space-y-4">
              {/* Form Error Display */}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Subject Name */}
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Enter subject name (e.g., Mathematics)"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    required
                    disabled={isFormLoading}
                  />
                </div>

                {/* Exam Selection */}
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
                    disabled={isFormLoading || editingSubject}
                  >
                    <option value="">Select an exam</option>
                    {exams.map((exam) => (
                      <option key={exam._id} value={exam._id}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
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
                    placeholder="Auto-calculated"
                    min="1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
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
                      <span>{editingSubject ? "Updating..." : "Adding Subject..."}</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>{editingSubject ? "Update Subject" : "Add Subject"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subjects Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Subjects List
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage subjects, organize content, and configure learning paths
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meta Status:</label>
                  <select
                    value={metaFilter}
                    onChange={(e) => setMetaFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="all">All Items</option>
                    <option value="filled">Meta Filled</option>
                    <option value="notFilled">Meta Not Filled</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${showFilters
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-blue-400"
                    }`}
                >
                  <FaSearch className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded-full text-xs font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          {showFilters && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Filter by Exam */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Filter by Exam
                  </label>
                  <select
                    value={filterExam}
                    onChange={(e) => setFilterExam(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                  >
                    <option value="">All Exams</option>
                    {exams.map((exam) => (
                      <option key={exam._id} value={exam._id}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filters */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                  <span className="text-xs font-medium text-gray-600">
                    Active Filters:
                  </span>
                  {filterExam && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Exam:{" "}
                      {exams.find((e) => e._id === filterExam)?.name || "N/A"}
                      <button
                        onClick={() => setFilterExam("")}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearFilters}
                    className="ml-auto px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-xs font-medium transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="p-2">
            {isDataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <LoadingSpinner size="medium" />
                  <p className="text-sm text-gray-500 mt-3">
                    Loading subjects...
                  </p>
                </div>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <FaClipboardList className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Subjects Found
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm">
                  {activeFilterCount > 0
                    ? "No subjects match your current filters."
                    : 'You haven\'t created any subjects yet. Click the "Add New Subject" button to get started.'}
                </p>
                {activeFilterCount > 0 ? (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : canCreate ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <FaPlus className="w-4 h-4" />
                    Create Your First Subject
                  </button>
                ) : (
                  <div className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium flex items-center gap-2">
                    <FaLock className="w-4 h-4" />
                    <span>{getPermissionMessage("create", role)}</span>
                  </div>
                )}
              </div>
            ) : (
              <SubjectTable
                subjects={filteredSubjects}
                onEdit={handleEditSubject}
                onDelete={handleDeleteSubject}
                onToggleStatus={handleToggleStatus}
                onTogglePractice={handleTogglePractice}
              />
            )}
          </div>
        </div>
      </div >
    </>
  );
};

export default SubjectManagement;
