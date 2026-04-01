"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import {
  LoadingWrapper,
  SkeletonPageContent,
  LoadingSpinner,
} from "../ui/SkeletonLoader";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaEdit,
  FaExclamationTriangle,
  FaClipboardList,
  FaLock,
  FaSearch,
  FaCheck,
  FaGripVertical,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import StatusCascadeModal from "../ui/StatusCascadeModal";
import api from "@/lib/api";
import { getUnitListCache, setUnitListCache } from "@/lib/unitListCache";
import { invalidateListCachesFrom } from "@/lib/listCacheInvalidation";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import { IoFilterOutline } from "react-icons/io5";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import { ADMIN_PAGINATION } from "@/constants";

// Lazy load heavy components
const UnitsTable = lazy(() => import("../table/UnitsTable"));

const UnitsManagement = () => {
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();
  const [filterState, setFilterState] = useFilterPersistence("unit", {
    filterExam: "",
    filterSubject: "",
    searchQuery: "",
    metaFilter: "all",
  });
  const {
    page,
    limit,
    filterExam,
    filterSubject,
    searchQuery,
    metaFilter,
  } = filterState;
  const [searchInput, setSearchInput] = useDebouncedSearchQuery(searchQuery, setFilterState);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [countsBySubject, setCountsBySubject] = useState({});
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    examId: "",
    subjectId: "",
    unitNames: "",
    orderNumber: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    examId: "",
    subjectId: "",
    orderNumber: "",
  });
  const [additionalUnits, setAdditionalUnits] = useState([]);
  const [nextOrderNumber, setNextOrderNumber] = useState(1);
  const [formError, setFormError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState({});
  const [cascadeModalOpen, setCascadeModalOpen] = useState(false);
  const [cascadeItem, setCascadeItem] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  // Get next available order number for a subject
  const getNextOrderNumber = useCallback(async (subjectId) => {
    if (!subjectId) return 1;

    try {
      // Fetch all units for this subject (including inactive) to get correct order number
      const response = await api.get(`/unit?subjectId=${subjectId}&status=all&limit=1000`);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const maxOrder = Math.max(
          ...response.data.data.map((unit) => unit.orderNumber || 0)
        );
        return maxOrder + 1;
      }
      return 1;
    } catch (error) {
      console.error("Error getting next order number:", error);
      return 1;
    }
  }, []);

  // Handle subject selection - get next order number and add first unit
  useEffect(() => {
    const handleSubjectSelection = async () => {
      if (formData.subjectId && showAddForm && additionalUnits.length === 0) {
        const nextOrder = await getNextOrderNumber(formData.subjectId);
        setNextOrderNumber(nextOrder);

        // Add first unit with the next order number
        setAdditionalUnits([
          {
            id: Date.now(),
            name: "",
            orderNumber: nextOrder,
          },
        ]);
      }
    };

    handleSubjectSelection();
  }, [
    formData.subjectId,
    showAddForm,
    additionalUnits.length,
    getNextOrderNumber,
  ]);

  // Fetch units from API with server-side filters + pagination
  const fetchUnits = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("status", "all");
      params.set("metaStatus", metaFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filterExam) params.set("examId", filterExam);
      if (filterSubject) params.set("subjectId", filterSubject);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const response = await api.get(`/unit?${params.toString()}`);

      if (response.data.success) {
        const fetchedUnits = response.data.data || [];
        setUnits(fetchedUnits);
        setCountsBySubject(response.data.countsBySubject || {});
        const pag = response.data?.pagination;
        if (pag) {
          setPagination({
            total: pag.total ?? 0,
            totalPages: pag.totalPages ?? 0,
            hasNextPage: !!pag.hasNextPage,
            hasPrevPage: !!pag.hasPrevPage,
          });
        }
        setUnitListCache(fetchedUnits, metaFilter);
      } else {
        setError(response.data.message || "Failed to fetch units");
      }
    } catch (error) {
      console.error("Error fetching units:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to fetch units. Please check your connection.";
      setError(errorMessage);
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  }, [metaFilter, page, limit, filterExam, filterSubject, searchQuery]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Fetch exams from API using Axios
  const fetchExams = async () => {
    try {
      // Fetch all exams (active and inactive) for dropdown
      const response = await api.get("/exam?status=all&limit=1000");

      if (response.data.success) {
        setExams(response.data.data || []);
      } else {
        console.error("Failed to fetch exams:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  // Fetch subjects from API using Axios
  const fetchSubjects = async () => {
    try {
      // Fetch all subjects (active and inactive) for dropdown
      const response = await api.get("/subject?status=all&limit=10000");

      if (response.data.success) {
        setSubjects(response.data.data || []);
      } else {
        console.error("Failed to fetch subjects:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  useEffect(() => {
    Promise.all([fetchExams(), fetchSubjects()]);
  }, []);

  // Auto-clear error after 5 seconds with cleanup
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Filter subjects based on selected exam for filters
  const filteredFilterSubjects = useMemo(() => {
    if (!filterExam) return [];
    return subjects.filter(
      (subject) =>
        subject.examId?._id === filterExam || subject.examId === filterExam
    );
  }, [subjects, filterExam]);

  // Search is done server-side
  const filteredUnits = units;

  // Get active filter count
  const activeFilterCount = (filterExam ? 1 : 0) + (filterSubject ? 1 : 0) + (searchQuery ? 1 : 0);

  // Clear all filters
  const clearFilters = () => {
    setSearchInput("");
    setFilterState({
      filterExam: "",
      filterSubject: "",
      searchQuery: "",
      page: 1,
    });
  };

  const handleAddUnits = async (e) => {
    e.preventDefault();

    // Check permissions
    if (!canCreate) {
      showError(getPermissionMessage("create", role));
      return;
    }

    // Validate that we have at least one unit with a name
    const validUnits = additionalUnits.filter((unit) => unit.name.trim());

    if (!formData.examId || !formData.subjectId || validUnits.length === 0) {
      setFormError(
        "Please fill in all required fields and add at least one unit"
      );
      return;
    }

    try {
      setIsFormLoading(true);
      setFormError(null);

      // Create units array from individual units
      const unitsToCreate = validUnits.map((unit, index) => ({
        name: unit.name.trim(),
        examId: formData.examId,
        subjectId: formData.subjectId,
        orderNumber: parseInt(unit.orderNumber) || nextOrderNumber + index,
      }));

      // Create all units
      const createdUnits = [];
      for (const unitData of unitsToCreate) {
        const response = await api.post("/unit", unitData);
        if (response.data.success) {
          createdUnits.push(response.data.data);
        }
      }

      if (createdUnits.length > 0) {
        invalidateListCachesFrom("unit");
        await fetchUnits();
        success(`${createdUnits.length} unit(s) added successfully!`);

        // Reset form
        setFormData({
          examId: "",
          subjectId: "",
          unitNames: "",
          orderNumber: "",
        });
        setAdditionalUnits([]);
        setNextOrderNumber(1);
        setShowAddForm(false);
      } else {
        setFormError("Failed to create any units");
        showError("Failed to create any units");
      }
    } catch (error) {
      console.error("Error adding units:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to add units. Please try again.";
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError(null);
  };

  const handleOpenAddForm = async () => {
    setShowAddForm(true);
    setFormData({
      examId: "",
      subjectId: "",
      unitNames: "",
      orderNumber: "",
    });
    setAdditionalUnits([]);
    setFormError(null);
  };

  const handleCancelForm = () => {
    setFormData({
      examId: "",
      subjectId: "",
      unitNames: "",
      orderNumber: "",
    });
    setAdditionalUnits([]);
    setNextOrderNumber(1);
    setFormError(null);
    setShowAddForm(false);
  };

  const handleAddMoreUnits = () => {
    const nextOrder = nextOrderNumber + additionalUnits.length;
    setAdditionalUnits((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        orderNumber: nextOrder,
      },
    ]);
  };

  const handleRemoveAdditionalUnit = (id) => {
    setAdditionalUnits((prev) => prev.filter((unit) => unit.id !== id));
  };

  const handleAdditionalUnitChange = (id, field, value) => {
    setAdditionalUnits((prev) =>
      prev.map((unit) => (unit.id === id ? { ...unit, [field]: value } : unit))
    );
  };

  const handleEditUnit = (unitToEdit) => {
    // Check permissions
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    setEditingUnit(unitToEdit);
    setEditFormData({
      name: unitToEdit.name,
      examId: unitToEdit.examId._id || unitToEdit.examId,
      subjectId: unitToEdit.subjectId._id || unitToEdit.subjectId,
      orderNumber: unitToEdit.orderNumber?.toString() || "",
    });
    setShowEditForm(true);
    setFormError(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError(null);
  };

  const handleCancelEditForm = () => {
    setEditFormData({
      name: "",
      examId: "",
      subjectId: "",
      orderNumber: "",
    });
    setFormError(null);
    setShowEditForm(false);
    setEditingUnit(null);
  };

  const handleUpdateUnit = async (e) => {
    e.preventDefault();

    if (
      !editFormData.name ||
      !editFormData.examId ||
      !editFormData.subjectId
    ) {
      setFormError("Please fill in all required fields");
      return;
    }

    try {
      setIsFormLoading(true);
      setFormError(null);

      const response = await api.put(`/unit/${editingUnit._id}`, {
        name: editFormData.name.trim(),
        examId: editFormData.examId,
        subjectId: editFormData.subjectId,
        orderNumber: editFormData.orderNumber && editFormData.orderNumber.trim()
          ? parseInt(editFormData.orderNumber)
          : undefined,
      });

      if (response.data.success) {
        invalidateListCachesFrom("unit");
        await fetchUnits();
        success("Unit updated successfully!");

        // Reset form
        setEditFormData({
          name: "",
          examId: "",
          subjectId: "",
          orderNumber: "",
        });
        setShowEditForm(false);
        setEditingUnit(null);
      } else {
        setFormError(response.data.message || "Failed to update unit");
        showError(response.data.message || "Failed to update unit");
      }
    } catch (error) {
      console.error("Error updating unit:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update unit. Please try again.";
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteUnit = async (unitToDelete) => {
    // Check permissions
    if (!canDelete) {
      showError(getPermissionMessage("delete", role));
      return;
    }

    if (
      window.confirm(`Are you sure you want to delete "${unitToDelete.name}"?`)
    ) {
      try {
        setIsFormLoading(true);
        setError(null);

        const response = await api.delete(`/unit/${unitToDelete._id}`);

        if (response.data.success) {
          invalidateListCachesFrom("unit");
          await fetchUnits();
          success(`Unit "${unitToDelete.name}" deleted successfully!`);
        } else {
          setError(response.data.message || "Failed to delete unit");
          showError(response.data.message || "Failed to delete unit");
        }
      } catch (error) {
        console.error("Error deleting unit:", error);
        setError(
          error.response?.data?.message ||
          "Failed to delete unit. Please try again."
        );
        showError("Failed to delete unit. Please try again.");
      } finally {
        setIsFormLoading(false);
      }
    }
  };

  const handleToggleStatus = (unit) => {
    setCascadeItem(unit);
    setCascadeModalOpen(true);
  };

  const handleCascadeConfirm = async (newStatus, cascadeMode) => {
    if (!cascadeItem) return;
    const action = newStatus === "inactive" ? "deactivate" : "activate";
    try {
      setIsFormLoading(true);
      setError(null);
      const response = await api.patch(`/unit/${cascadeItem._id}/status`, {
        status: newStatus,
        cascadeMode: cascadeMode || "respect_manual",
      });
      if (response.data.success) {
        invalidateListCachesFrom("unit");
        await fetchUnits();
        success(
          `Unit "${cascadeItem.name}" and children ${action}d successfully!`
        );
        setCascadeModalOpen(false);
        setCascadeItem(null);
      } else {
        setError(response.data.message || `Failed to ${action} unit`);
        showError(response.data.message || `Failed to ${action} unit`);
      }
    } catch (error) {
      console.error(`Error ${action}ing unit:`, error);
      const errorMessage =
        error.response?.data?.message ||
        `Failed to ${action} unit. Please try again.`;
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleBulkToggleStatus = async (selectedUnits, newStatus) => {
    if (!selectedUnits || selectedUnits.length === 0) return Promise.resolve();
    const action = newStatus === "inactive" ? "deactivate" : "activate";
    const n = selectedUnits.length;
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${n} unit${n === 1 ? "" : "s"}? Their chapters and related content will also be ${action}d.`
      )
    ) {
      return Promise.resolve();
    }
    try {
      setIsFormLoading(true);
      setError(null);
      const results = await Promise.all(
        selectedUnits.map((u) =>
          api.patch(`/unit/${u._id}/status`, { status: newStatus })
        )
      );
      const allOk = results.every((r) => r?.data?.success);
      if (allOk) {
        invalidateListCachesFrom("unit");
        await fetchUnits();
        success(
          n === 1
            ? `Unit ${action}d successfully`
            : `${n} units ${action}d successfully`
        );
      } else {
        throw new Error(
          results.find((r) => !r?.data?.success)?.data?.message ||
            `Failed to ${action} some units`
        );
      }
    } catch (error) {
      console.error(`Error bulk ${action}ing units:`, error);
      setError(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${action} units`
      );
      showError(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${action} units`
      );
      throw error;
    } finally {
      setIsFormLoading(false);
    }
  };

  const saveReorderForSubject = async (subjectId, newOrderedUnits) => {
    const payload = {
      units: newOrderedUnits.map((u, i) => ({
        id: u._id,
        orderNumber: i + 1,
      })),
    };
    const response = await api.patch("/unit/reorder", payload);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to reorder units");
    }
  };

  const handleReorderDraft = (subjectId, newOrderedUnits) => {
    setReorderDraft((prev) => ({ ...prev, [subjectId]: newOrderedUnits }));
  };

  const handleDoneReorder = async () => {
    if (!canReorder) {
      showError(getPermissionMessage("reorder", role));
      return;
    }
    const subjectIds = Object.keys(reorderDraft);
    if (subjectIds.length === 0) {
      setIsReorderMode(false);
      return;
    }
    try {
      setIsFormLoading(true);
      setError(null);
      await Promise.all(
        subjectIds.map((subjectId) => saveReorderForSubject(subjectId, reorderDraft[subjectId]))
      );
      invalidateListCachesFrom("unit");
      await fetchUnits();
      setReorderDraft({});
      setIsReorderMode(false);
      success("Unit order updated successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to reorder units. Please try again.";
      showError(msg);
    } finally {
      setIsFormLoading(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <StatusCascadeModal
        open={cascadeModalOpen}
        onClose={() => { setCascadeModalOpen(false); setCascadeItem(null); }}
        levelLabel="Unit"
        itemName={cascadeItem?.name}
        currentStatus={cascadeItem?.status || "active"}
        onConfirm={handleCascadeConfirm}
        loading={isFormLoading}
      />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Units Management
              </h1>
              <p className="text-xs text-gray-600">
                Manage and organize your units, create new units, and track unit performance across your educational platform.
              </p>
            </div>
            {canCreate ? (
              <button
                onClick={handleOpenAddForm}
                className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors"
              >
                Add New Units
              </button>
            ) : (
              <button
                disabled
                title={getPermissionMessage("create", role)}
                className="px-2 py-1 bg-gray-300 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed"
              >
                Add New Units
              </button>
            )}
          </div>
        </div>

        {/* Add Units Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New Units
              </h2>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                disabled={isFormLoading}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddUnits} className="space-y-4">
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

              {/* Exam + Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Exam Select */}
                <div className="space-y-2">
                  <label
                    htmlFor="examId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Select Exam <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="examId"
                    name="examId"
                    value={formData.examId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                    disabled={isFormLoading}
                  >
                    <option value="">-- Select Exam --</option>
                    {exams?.map((exam) => (
                      <option key={exam._id} value={exam._id}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Select */}
                <div className="space-y-2">
                  <label
                    htmlFor="subjectId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Select Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subjectId"
                    name="subjectId"
                    value={formData.subjectId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                    disabled={isFormLoading}
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects
                      ?.filter(
                        (subject) =>
                          subject.examId?._id === formData.examId ||
                          subject.examId === formData.examId
                      )
                      .map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Units Section */}
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Units</h3>
                  <button
                    type="button"
                    onClick={handleAddMoreUnits}
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1"
                    disabled={isFormLoading}
                  >
                    <FaPlus className="w-3 h-3" />
                    Add More
                  </button>
                </div>

                {additionalUnits.map((unit, index) => (
                  <div
                    key={unit.id}
                    className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Unit Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-600">
                        Unit Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={unit.name}
                        onChange={(e) =>
                          handleAdditionalUnitChange(
                            unit.id,
                            "name",
                            e.target.value
                          )
                        }
                        placeholder={`Unit ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                        disabled={isFormLoading}
                        required
                      />
                    </div>

                    {/* Order */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-600">
                        Order Number
                      </label>
                      <input
                        type="number"
                        value={unit.orderNumber}
                        onChange={(e) =>
                          handleAdditionalUnitChange(
                            unit.id,
                            "orderNumber",
                            e.target.value
                          )
                        }
                        placeholder="Order"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                        disabled={isFormLoading}
                      />
                    </div>

                    {/* Remove */}
                    {additionalUnits.length > 1 && (
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveAdditionalUnit(unit.id)}
                          className="w-full px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1"
                          disabled={isFormLoading}
                        >
                          <FaTimes className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
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
                      <span>Adding Units...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>Add Units</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Unit Form */}
        {showEditForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Unit: {editingUnit?.name}
              </h2>
              <button
                onClick={handleCancelEditForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                disabled={isFormLoading}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUnit} className="space-y-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Unit Name */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="editName"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Unit Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="editName"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm hover:border-gray-400"
                    required
                    disabled={isFormLoading}
                  />
                </div>

                {/* Order Number */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="editOrderNumber"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Order Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="editOrderNumber"
                    name="orderNumber"
                    value={editFormData.orderNumber}
                    onChange={handleEditFormChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm hover:border-gray-400"
                    required
                    disabled={isFormLoading}
                  />
                </div>

                {/* Exam Select */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="editExamId"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Select Exam <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="editExamId"
                    name="examId"
                    value={editFormData.examId}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm hover:border-gray-400"
                    required
                    disabled={isFormLoading}
                  >
                    <option value="">-- Select Exam --</option>
                    {exams?.map((exam) => (
                      <option key={exam._id} value={exam._id}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Select */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="editSubjectId"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Select Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="editSubjectId"
                    name="subjectId"
                    value={editFormData.subjectId}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm hover:border-gray-400"
                    required
                    disabled={isFormLoading}
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects
                      ?.filter(
                        (subject) =>
                          subject.examId._id === editFormData.examId ||
                          subject.examId === editFormData.examId
                      )
                      .map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancelEditForm}
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
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>Update Unit</span>
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
                  Units List
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your units, view details, and perform actions
                  {isReorderMode && (
                    <span className="ml-1.5 text-blue-600 font-medium">— Drag rows within each subject, then click Done to save</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canReorder && !searchQuery.trim() && (
                  isReorderMode ? (
                    <button
                      type="button"
                      onClick={handleDoneReorder}
                      disabled={isFormLoading}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      title="Save order and exit reorder mode"
                    >
                      {isFormLoading ? (
                        <>
                          <LoadingSpinner size="small" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaCheck className="w-4 h-4" />
                          Done
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setIsReorderMode(true); setReorderDraft({}); }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                      title="Enable drag and drop to reorder units per subject"
                    >
                      <FaGripVertical className="w-4 h-4" />
                      Reorder position
                    </button>
                  )
                )}
                {/* Search Input */}
                <div className="relative min-w-[200px] sm:min-w-[240px]">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search units..."
                    className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchInput("");
                        setFilterState({ searchQuery: "", page: 1 });
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Meta Status:</label>
                  <select
                    value={metaFilter}
                    onChange={(e) =>
                      setFilterState({ metaFilter: e.target.value, page: 1 })
                    }
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="all">All Items</option>
                    <option value="filled">Meta Filled</option>
                    <option value="notFilled">Meta Not Filled</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showFilters
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-blue-400"
                    }`}
                >
                  <IoFilterOutline className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
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
                  <label className="block text-sm font-semibold text-gray-700">
                    Filter by Exam
                  </label>
                  <select
                    value={filterExam}
                    onChange={(e) => {
                      setFilterState({
                        filterExam: e.target.value,
                        filterSubject: "",
                        page: 1,
                      });
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white"
                  >
                    <option value="">All Exams</option>
                    {exams.map((exam) => (
                      <option key={exam._id} value={exam._id}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Subject */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Filter by Subject
                  </label>
                  <select
                    value={filterSubject}
                    onChange={(e) =>
                      setFilterState({ filterSubject: e.target.value, page: 1 })
                    }
                    disabled={!filterExam}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">
                      {filterExam ? "Select Exam First" : "All Subjects"}
                    </option>
                    {filteredFilterSubjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
              <span className="text-xs font-semibold text-gray-600">
                Active Filters:
              </span>
              {filterExam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  Exam:{" "}
                  {exams.find((e) => e._id === filterExam)?.name || "N/A"}
                  <button
                    onClick={() => {
                      setFilterState({
                        filterExam: "",
                        filterSubject: "",
                        page: 1,
                      });
                    }}
                    className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterSubject && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Subject:{" "}
                  {subjects.find((s) => s._id === filterSubject)?.name ||
                    "N/A"}
                  <button
                    onClick={() =>
                      setFilterState({ filterSubject: "", page: 1 })
                    }
                    className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                  Search: {searchQuery}
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setFilterState({ searchQuery: "", page: 1 });
                    }}
                    className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
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
          <div className="p-2">
            {isDataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <LoadingSpinner size="medium" />
                  <p className="text-sm text-gray-500 mt-3">Loading units...</p>
                </div>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <FaClipboardList className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Units Found
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm">
                  {activeFilterCount > 0
                    ? "No units match your current filters."
                    : 'You haven\'t created any units yet. Click the "Add New Units" button to get started.'}
                </p>
                {activeFilterCount > 0 ? (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : (
                  canCreate ? (
                    <button
                      onClick={handleOpenAddForm}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <FaPlus className="w-4 h-4" />
                      Create Your First Units
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium flex items-center gap-2">
                      <FaLock className="w-4 h-4" />
                      <span>{getPermissionMessage("create", role)}</span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="medium" />
                    </div>
                  }
                >
                  <UnitsTable
                    units={filteredUnits}
                    countsBySubject={countsBySubject}
                    onEdit={handleEditUnit}
                    onDelete={handleDeleteUnit}
                    onToggleStatus={handleToggleStatus}
                    onBulkToggleStatus={handleBulkToggleStatus}
                    onReorderDraft={handleReorderDraft}
                    reorderDraft={reorderDraft}
                    isReorderAllowed={isReorderMode && !searchQuery.trim()}
                  />
                </Suspense>
                {/* Pagination */}
                {(pagination.totalPages > 0 || pagination.total > 0) && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total}
                      </span>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        Per page
                        <select
                          value={limit}
                          onChange={(e) =>
                            setFilterState({
                              limit: Number(e.target.value),
                              page: 1,
                            })
                          }
                          className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          {ADMIN_PAGINATION.PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFilterState({ page: page - 1 })}
                        disabled={!pagination.hasPrevPage}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous page"
                      >
                        <FaChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600 whitespace-nowrap">
                        Page {page} of {pagination.totalPages || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFilterState({ page: page + 1 })}
                        disabled={!pagination.hasNextPage}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next page"
                      >
                        <FaChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UnitsManagement;
