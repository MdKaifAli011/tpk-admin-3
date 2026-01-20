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
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";

// Lazy load heavy components
const UnitsTable = lazy(() => import("../table/UnitsTable"));

const UnitsManagement = () => {
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [units, setUnits] = useState([]);
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
  const [filterExam, setFilterExam] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  // Fetch units from API using Axios (fetch all units for admin management)
  const fetchUnits = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);
      // Fetch all units including inactive ones for admin management
      const response = await api.get("/unit?status=all&limit=10000");

      if (response.data.success) {
        setUnits(response.data.data || []);
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
  }, []);

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

  // Load data on component mount
  useEffect(() => {
    fetchUnits();
    fetchExams();
    fetchSubjects();
  }, [fetchUnits]);

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

  // Filter units based on filters
  const filteredUnits = useMemo(() => {
    let result = units;
    if (filterExam) {
      result = result.filter(
        (unit) => unit.examId?._id === filterExam || unit.examId === filterExam
      );
    }
    if (filterSubject) {
      result = result.filter(
        (unit) =>
          unit.subjectId?._id === filterSubject ||
          unit.subjectId === filterSubject
      );
    }
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((unit) =>
        unit.name?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [units, filterExam, filterSubject, searchQuery]);

  // Get active filter count
  const activeFilterCount = (filterExam ? 1 : 0) + (filterSubject ? 1 : 0);

  // Clear all filters
  const clearFilters = () => {
    setFilterExam("");
    setFilterSubject("");
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
        // Add the new units to the list
        setUnits((prev) => [...prev, ...createdUnits]);
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
        // Update the unit in the list
        setUnits((prev) =>
          prev.map((u) => (u._id === editingUnit._id ? response.data.data : u))
        );
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
          // Remove the unit from the list
          setUnits((prev) => prev.filter((u) => u._id !== unitToDelete._id));
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

  const handleToggleStatus = async (unit) => {
    const currentStatus = unit.status || "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "deactivate" : "activate";

    if (
      window.confirm(
        `Are you sure you want to ${action} "${unit.name}"? All its children will also be ${action}d.`
      )
    ) {
      try {
        setIsFormLoading(true);
        setError(null);

        const response = await api.patch(`/unit/${unit._id}/status`, {
          status: newStatus,
        });

        if (response.data.success) {
          // Update the unit status in the list
          setUnits((prev) =>
            prev.map((u) =>
              u._id === unit._id ? { ...u, status: newStatus } : u
            )
          );
          success(
            `Unit "${unit.name}" and all children ${action}d successfully!`
          );
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
    }
  };

  const handleDragEnd = async (result) => {
    // Check permissions
    if (!canReorder) {
      showError(getPermissionMessage("reorder", role));
      return;
    }

    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // Don't do anything if dropped in the same position
    if (sourceIndex === destinationIndex) return;

    const items = Array.from(units);
    const reorderedItem = items[sourceIndex];

    // Get the subject ID to identify the group
    const subjectId = reorderedItem.subjectId?._id || reorderedItem.subjectId;
    const examId = reorderedItem.examId?._id || reorderedItem.examId;

    // Find all units in the same group (same exam and subject)
    const groupUnits = items.filter((unit) => {
      const unitSubjectId = unit.subjectId?._id || unit.subjectId;
      const unitExamId = unit.examId?._id || unit.examId;
      return unitSubjectId === subjectId && unitExamId === examId;
    });

    // Find indices within the group
    const groupSourceIndex = groupUnits.findIndex(
      (u) => (u._id || u.id) === (reorderedItem._id || reorderedItem.id)
    );

    // Create a reordered group array
    const reorderedGroup = Array.from(groupUnits);
    const [movedUnit] = reorderedGroup.splice(groupSourceIndex, 1);

    // Calculate destination index within the group
    const groupDestIndex = groupUnits.findIndex((unit, idx) => {
      if (idx === groupSourceIndex) return false;
      const flatIndex = items.findIndex(
        (u) => (u._id || u.id) === (unit._id || unit.id)
      );
      return flatIndex >= destinationIndex;
    });
    const finalDestIndex = groupDestIndex === -1 ? reorderedGroup.length : groupDestIndex;
    reorderedGroup.splice(finalDestIndex, 0, movedUnit);

    // Update order numbers only for units in this group
    const updatedGroupUnits = reorderedGroup.map((unit, index) => ({
      ...unit,
      orderNumber: index + 1,
    }));

    // Update the full units array, preserving other units
    const updatedItems = items.map((unit) => {
      const updatedUnit = updatedGroupUnits.find(
        (u) => (u._id || u.id) === (unit._id || unit.id)
      );
      return updatedUnit || unit;
    });

    // Optimistically update the UI first
    setUnits(updatedItems);

    // Update all affected units in the database using the reorder endpoint
    try {
      // Prepare units data for the reorder endpoint
      const unitsData = updatedGroupUnits.map((unit) => ({
        id: unit._id,
        orderNumber: unit.orderNumber,
      }));

      // Use the dedicated reorder endpoint
      const response = await api.patch("/unit/reorder", {
        units: unitsData,
      });

      if (response.data.success) {
        console.log(
          `✅ Unit "${reorderedItem.name}" moved to position ${finalDestIndex + 1}`
        );
      } else {
        throw new Error(response.data.message || "Failed to reorder units");
      }
    } catch (error) {
      console.error("❌ Error updating unit order:", error);

      // Revert the local state if API call fails
      console.log("🔄 Reverting unit order due to API error");
      fetchUnits();

      // Show user-friendly error message
      setError(
        `Failed to update unit order: ${error.response?.data?.message || error.message
        }`
      );
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
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
                  Manage your units, view details, and perform actions. You can
                  drag to reorder units.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filter Units
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
                  <label className="block text-sm font-semibold text-gray-700">
                    Filter by Exam
                  </label>
                  <select
                    value={filterExam}
                    onChange={(e) => {
                      setFilterExam(e.target.value);
                      setFilterSubject(""); // Reset subject when exam changes
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
                    onChange={(e) => setFilterSubject(e.target.value)}
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
                          setFilterExam("");
                          setFilterSubject("");
                        }}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filterSubject && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Subject:{" "}
                      {subjects.find((s) => s._id === filterSubject)?.name ||
                        "N/A"}
                      <button
                        onClick={() => setFilterSubject("")}
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
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="medium" />
                  </div>
                }
              >
                <UnitsTable
                  units={filteredUnits}
                  onEdit={handleEditUnit}
                  onDelete={handleDeleteUnit}
                  onDragEnd={handleDragEnd}
                  onToggleStatus={handleToggleStatus}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UnitsManagement;
