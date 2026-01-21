"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import ChaptersTable from "../table/ChaptersTable";
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

const ChaptersManagement = () => {
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [filterUnits, setFilterUnits] = useState([]); // Separate units for filter section
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    examId: "",
    subjectId: "",
    unitId: "",
    name: "",
    orderNumber: "",
  });
  const [additionalChapters, setAdditionalChapters] = useState([
    {
      id: Date.now(),
      name: "",
      orderNumber: 1,
      weightage: 0,
      time: 0,
      questions: 0,
    },
  ]);
  const [nextOrderNumber, setNextOrderNumber] = useState(1);
  const [editFormData, setEditFormData] = useState({
    examId: "",
    subjectId: "",
    unitId: "",
    name: "",
    orderNumber: "",
    weightage: "",
    time: "",
    questions: "",
  });
  const [formError, setFormError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterExam, setFilterExam] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);
  const [metaFilter, setMetaFilter] = useState("all"); // all, filled, notFilled

  // Fetch chapters from API using Axios
  const fetchChapters = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);
      // Fetch all chapters (active and inactive) for admin management
      const response = await api.get(`/chapter?status=all&limit=10000&metaStatus=${metaFilter}`);

      if (response.data.success) {
        setChapters(response.data.data || []);
      } else {
        setError(response.data.message || "Failed to fetch chapters");
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to fetch chapters. Please check your connection.";
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

  // Fetch units from API based on exam and subject
  const fetchUnits = async (examId, subjectId) => {
    if (!examId || !subjectId) {
      setUnits([]);
      return;
    }
    try {
      // Fetch units for the selected exam and subject
      const response = await api.get(
        `/unit?examId=${examId}&subjectId=${subjectId}&status=all&limit=1000`
      );

      if (response.data.success) {
        setUnits(response.data.data || []);
      } else {
        console.error("Failed to fetch units:", response.data.message);
        setUnits([]);
      }
    } catch (error) {
      console.error("Error fetching units:", error);
      setUnits([]);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchChapters();
  }, [fetchChapters, metaFilter]);

  useEffect(() => {
    fetchExams();
    fetchSubjects();
    // Don't fetch units on mount - will fetch when subject is selected
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

  // Filter subjects based on selected exam
  const filteredSubjects = useMemo(() => {
    if (!formData.examId) {
      // If no exam is selected, show all subjects
      return subjects || [];
    }
    if (!subjects || subjects.length === 0) {
      return [];
    }
    // Filter subjects by selected exam (handle both populated and non-populated examId)
    return subjects.filter(
      (subject) =>
        subject.examId?._id === formData.examId ||
        subject.examId === formData.examId
    );
  }, [formData.examId, subjects]);

  // Units are already filtered by API call, so return all units
  const filteredUnits = useMemo(() => {
    // Units are already filtered by fetchUnits(examId, subjectId), so just return them
    return units || [];
  }, [units]);

  // Filter subjects based on selected exam for filters
  const filteredFilterSubjects = useMemo(() => {
    if (!filterExam) return [];
    return subjects.filter(
      (subject) =>
        subject.examId?._id === filterExam || subject.examId === filterExam
    );
  }, [subjects, filterExam]);

  // Filter subjects for edit form based on selected exam
  const filteredEditSubjects = useMemo(() => {
    if (!editFormData.examId) {
      // If no exam is selected in edit form, show all subjects
      return subjects || [];
    }
    if (!subjects || subjects.length === 0) {
      return [];
    }
    // Filter subjects by selected exam in edit form (handle both populated and non-populated examId)
    return subjects.filter(
      (subject) =>
        subject.examId?._id === editFormData.examId ||
        subject.examId === editFormData.examId
    );
  }, [editFormData.examId, subjects]);

  // Units for edit form are already filtered by API call, so return all units
  const filteredEditUnits = useMemo(() => {
    // Units are already filtered by fetchUnits(examId, subjectId), so just return them
    return units || [];
  }, [units]);

  // Fetch units for filter section
  const fetchUnitsForFilter = useCallback(async (examId, subjectId) => {
    if (!examId || !subjectId) {
      setFilterUnits([]);
      return;
    }
    try {
      const response = await api.get(
        `/unit?examId=${examId}&subjectId=${subjectId}&status=all&limit=1000`
      );
      if (response.data.success) {
        setFilterUnits(response.data.data || []);
      } else {
        console.error("Failed to fetch filter units:", response.data.message);
        setFilterUnits([]);
      }
    } catch (error) {
      console.error("Error fetching filter units:", error);
      setFilterUnits([]);
    }
  }, []);

  // Fetch units for filter section when filterSubject changes
  useEffect(() => {
    if (filterSubject && filterExam) {
      fetchUnitsForFilter(filterExam, filterSubject);
    } else {
      setFilterUnits([]);
    }
  }, [filterSubject, filterExam, fetchUnitsForFilter]);

  // Filter units based on selected subject for filters
  const filteredFilterUnits = useMemo(() => {
    if (!filterSubject) return [];
    return filterUnits.filter(
      (unit) =>
        unit.subjectId?._id === filterSubject ||
        unit.subjectId === filterSubject
    );
  }, [filterUnits, filterSubject]);

  // Filter chapters based on filters
  const filteredChapters = useMemo(() => {
    let result = chapters;
    if (filterExam) {
      result = result.filter(
        (chapter) =>
          chapter.examId?._id === filterExam || chapter.examId === filterExam
      );
    }
    if (filterSubject) {
      result = result.filter(
        (chapter) =>
          chapter.subjectId?._id === filterSubject ||
          chapter.subjectId === filterSubject
      );
    }
    if (filterUnit) {
      result = result.filter(
        (chapter) =>
          chapter.unitId?._id === filterUnit || chapter.unitId === filterUnit
      );
    }
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((chapter) =>
        chapter.name?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [chapters, filterExam, filterSubject, filterUnit, searchQuery]);

  // Get active filter count
  const activeFilterCount =
    (filterExam ? 1 : 0) + (filterSubject ? 1 : 0) + (filterUnit ? 1 : 0);

  // Clear all filters
  const clearFilters = () => {
    setFilterExam("");
    setFilterSubject("");
    setFilterUnit("");
  };

  // Get next order number for chapters in a unit
  const getNextOrderNumber = useCallback(async (unitId) => {
    if (!unitId) return 1;
    try {
      const response = await api.get(`/chapter?unitId=${unitId}&status=all&limit=1000`);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const maxOrder = Math.max(
          ...response.data.data.map((chapter) => chapter.orderNumber || 0),
          0
        );
        return maxOrder + 1;
      }
      return 1;
    } catch (error) {
      console.error("Error fetching next order number:", error);
      return 1;
    }
  }, []);

  // Effect to get next order number when unit is selected
  useEffect(() => {
    if (formData.unitId && showAddForm) {
      getNextOrderNumber(formData.unitId).then((nextOrder) => {
        setNextOrderNumber(nextOrder);

        // Always update chapters - create first one if none exist, or update existing ones
        setAdditionalChapters((prev) => {
          if (prev.length === 0) {
            // Create first chapter with calculated order number
            return [
              {
                id: Date.now(),
                name: "",
                orderNumber: nextOrder,
                weightage: 0,
                time: 0,
                questions: 0,
              },
            ];
          } else {
            // Update order numbers for existing chapters
            return prev.map((chapter, index) => ({
              ...chapter,
              orderNumber: nextOrder + index,
            }));
          }
        });
      });
    } else if (!formData.unitId && showAddForm) {
      // Clear chapters when unit is cleared
      setAdditionalChapters([]);
      setNextOrderNumber(1);
    }
  }, [
    formData.unitId,
    showAddForm,
    getNextOrderNumber,
  ]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Reset subject when exam changes
      if (name === "examId" && value !== prev.examId) {
        newData.subjectId = "";
        newData.unitId = "";
        setUnits([]); // Clear units when exam changes
      }

      // Reset unit when subject changes and fetch units for the selected exam and subject
      if (name === "subjectId" && value !== prev.subjectId) {
        newData.unitId = "";
        // Fetch units for the selected exam and subject
        if (newData.examId && value) {
          fetchUnits(newData.examId, value);
        } else {
          setUnits([]);
        }
      }

      // Note: Chapter clearing and order number calculation is handled by useEffect
      // when unitId changes

      return newData;
    });
    setFormError(null);
  };

  const handleCancelForm = () => {
    setFormData({
      examId: "",
      subjectId: "",
      unitId: "",
      name: "",
      orderNumber: "",
    });
    setAdditionalChapters([
      {
        id: Date.now(),
        name: "",
        orderNumber: 1,
        weightage: 0,
        time: 0,
        questions: 0,
      },
    ]);
    setNextOrderNumber(1);
    setFormError(null);
    setUnits([]); // Clear units when form is cancelled
    setShowAddForm(false);
  };

  const handleOpenAddForm = () => {
    setShowAddForm(true);
    setFormData({
      examId: "",
      subjectId: "",
      unitId: "",
      name: "",
      orderNumber: "",
    });
    setAdditionalChapters([
      {
        id: Date.now(),
        name: "",
        orderNumber: 1,
        weightage: 0,
        time: 0,
        questions: 0,
      },
    ]);
    setNextOrderNumber(1);
    setFormError(null);
    setUnits([]); // Clear units when opening new form
  };

  const handleAddMoreChapters = () => {
    const nextOrder = nextOrderNumber + additionalChapters.length;
    setAdditionalChapters((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        orderNumber: nextOrder,
        weightage: 0,
        time: 0,
        questions: 0,
      },
    ]);
  };

  const handleChapterChange = (id, field, value) => {
    setAdditionalChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === id ? { ...chapter, [field]: value } : chapter
      )
    );
  };

  const handleRemoveChapter = (id) => {
    if (additionalChapters.length > 1) {
      setAdditionalChapters((prev) =>
        prev.filter((chapter) => chapter.id !== id)
      );
    }
  };

  const handleAddChapter = async (e) => {
    e.preventDefault();

    // Check permissions
    if (!canCreate) {
      showError(getPermissionMessage("create", role));
      return;
    }

    // Validate that we have the required fields and at least one chapter
    if (!formData.examId || !formData.subjectId || !formData.unitId) {
      setFormError("Please select Exam, Subject, and Unit");
      return;
    }

    // Filter out empty chapters
    const validChapters = additionalChapters.filter(
      (chapter) => chapter.name.trim() !== ""
    );

    if (validChapters.length === 0) {
      setFormError("Please enter at least one chapter name");
      return;
    }

    try {
      setIsFormLoading(true);
      setFormError(null);

      // Prepare chapters to create
      const chaptersToCreate = validChapters.map((chapter, index) => ({
        name: chapter.name.trim(),
        examId: formData.examId,
        subjectId: formData.subjectId,
        unitId: formData.unitId,
        orderNumber: chapter.orderNumber || nextOrderNumber + index,
        weightage: chapter.weightage || 0,
        time: chapter.time || 0,
        questions: chapter.questions || 0,
      }));

      // Create chapters one by one
      const createdChapters = [];
      for (const chapterData of chaptersToCreate) {
        const response = await api.post("/chapter", chapterData);
        if (response.data.success) {
          createdChapters.push(response.data.data);
        } else {
          throw new Error(response.data.message || "Failed to create chapter");
        }
      }

      // Add all created chapters to the list
      setChapters((prev) => [...prev, ...createdChapters]);

      if (createdChapters.length === 1) {
        success(`Chapter "${createdChapters[0].name}" added successfully!`);
      } else {
        success(`${createdChapters.length} chapters added successfully!`);
      }

      // Reset form
      setFormData({
        examId: "",
        subjectId: "",
        unitId: "",
        name: "",
        orderNumber: "",
      });
      setAdditionalChapters([]);
      setNextOrderNumber(1);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding chapters:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to add chapters. Please try again.";
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleEditChapter = (chapterToEdit) => {
    // Check permissions
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }
    const examId = chapterToEdit.examId?._id || chapterToEdit.examId;
    const subjectId = chapterToEdit.subjectId?._id || chapterToEdit.subjectId;
    const unitId = chapterToEdit.unitId?._id || chapterToEdit.unitId;

    setEditingChapter(chapterToEdit);
    setEditFormData({
      name: chapterToEdit.name,
      examId: examId,
      subjectId: subjectId,
      unitId: unitId,
      orderNumber: chapterToEdit.orderNumber?.toString() || "",
      weightage: chapterToEdit.weightage || 0,
      time: chapterToEdit.time || 0,
      questions: chapterToEdit.questions || 0,
    });

    // Fetch units for the selected exam and subject when editing
    if (examId && subjectId) {
      fetchUnits(examId, subjectId);
    }

    setShowEditForm(true);
    setFormError(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Reset subject when exam changes
      if (name === "examId" && value !== prev.examId) {
        newData.subjectId = "";
        newData.unitId = "";
        setUnits([]); // Clear units when exam changes
      }

      // Reset unit when subject changes and fetch units for the selected exam and subject
      if (name === "subjectId" && value !== prev.subjectId) {
        newData.unitId = "";
        // Fetch units for the selected exam and subject in edit form
        if (newData.examId && value) {
          fetchUnits(newData.examId, value);
        } else {
          setUnits([]);
        }
      }

      return newData;
    });
    setFormError(null);
  };

  const handleCancelEditForm = () => {
    setEditFormData({
      examId: "",
      subjectId: "",
      unitId: "",
      name: "",
      orderNumber: "",
      weightage: "",
      time: "",
      questions: "",
    });
    setFormError(null);
    setShowEditForm(false);
    setEditingChapter(null);
  };

  const handleUpdateChapter = async (e) => {
    e.preventDefault();

    if (
      !editFormData.examId ||
      !editFormData.subjectId ||
      !editFormData.unitId ||
      !editFormData.name.trim()
    ) {
      setFormError("Please fill in all required fields");
      return;
    }

    try {
      setIsFormLoading(true);
      setFormError(null);

      const response = await api.put(`/chapter/${editingChapter._id}`, {
        name: editFormData.name.trim(),
        examId: editFormData.examId,
        subjectId: editFormData.subjectId,
        unitId: editFormData.unitId,
        orderNumber: editFormData.orderNumber && editFormData.orderNumber.trim()
          ? parseInt(editFormData.orderNumber)
          : undefined,
        weightage: editFormData.weightage
          ? parseFloat(editFormData.weightage)
          : 0,
        time: editFormData.time ? parseInt(editFormData.time) : 0,
        questions: editFormData.questions
          ? parseInt(editFormData.questions)
          : 0,
      });

      if (response.data.success) {
        // Update the chapter in the list
        setChapters((prev) =>
          prev.map((c) =>
            c._id === editingChapter._id ? response.data.data : c
          )
        );
        success("Chapter updated successfully!");

        // Reset form
        setEditFormData({
          examId: "",
          subjectId: "",
          unitId: "",
          name: "",
          orderNumber: "",
          weightage: "",
          time: "",
          questions: "",
        });
        setShowEditForm(false);
        setEditingChapter(null);
      } else {
        setFormError(response.data.message || "Failed to update chapter");
        showError(response.data.message || "Failed to update chapter");
      }
    } catch (error) {
      console.error("Error updating chapter:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update chapter. Please try again.";
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteChapter = async (chapterToDelete) => {
    // Check permissions
    if (!canDelete) {
      showError(getPermissionMessage("delete", role));
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to delete "${chapterToDelete.name}"?`
      )
    ) {
      return;
    }

    try {
      setIsFormLoading(true);
      setError(null);

      const response = await api.delete(`/chapter/${chapterToDelete._id}`);

      if (response.data.success) {
        // Remove the chapter from the list
        setChapters((prev) =>
          prev.filter((c) => c._id !== chapterToDelete._id)
        );
        success(`Chapter "${chapterToDelete.name}" deleted successfully!`);
      } else {
        setError(response.data.message || "Failed to delete chapter");
        showError(response.data.message || "Failed to delete chapter");
      }
    } catch (error) {
      console.error("Error deleting chapter:", error);
      setError(
        error.response?.data?.message ||
        "Failed to delete chapter. Please try again."
      );
      showError("Failed to delete chapter. Please try again.");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleToggleStatus = async (chapter) => {
    const currentStatus = chapter.status || "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "deactivate" : "activate";

    if (
      window.confirm(
        `Are you sure you want to ${action} "${chapter.name}"? All its children will also be ${action}d.`
      )
    ) {
      try {
        setIsFormLoading(true);
        setError(null);

        const response = await api.patch(`/chapter/${chapter._id}/status`, {
          status: newStatus,
        });

        if (response.data.success) {
          // Update the chapter status in the list
          setChapters((prev) =>
            prev.map((c) =>
              c._id === chapter._id ? { ...c, status: newStatus } : c
            )
          );
          success(
            `Chapter "${chapter.name}" and all children ${action}d successfully!`
          );
        } else {
          setError(response.data.message || `Failed to ${action} chapter`);
          showError(response.data.message || `Failed to ${action} chapter`);
        }
      } catch (error) {
        console.error(`Error ${action}ing chapter:`, error);
        const errorMessage =
          error.response?.data?.message ||
          `Failed to ${action} chapter. Please try again.`;
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

    const items = Array.from(chapters);
    const reorderedItem = items[sourceIndex];

    // Get the unit ID to identify the group
    const unitId = reorderedItem.unitId?._id || reorderedItem.unitId;

    // Find all chapters in the same group (same unit)
    const groupChapters = items.filter((chapter) => {
      const chapterUnitId = chapter.unitId?._id || chapter.unitId;
      return chapterUnitId === unitId;
    });

    // Find indices within the group
    const groupSourceIndex = groupChapters.findIndex(
      (c) => (c._id || c.id) === (reorderedItem._id || reorderedItem.id)
    );

    // Create a reordered group array
    const reorderedGroup = Array.from(groupChapters);
    const [movedChapter] = reorderedGroup.splice(groupSourceIndex, 1);

    // Calculate destination index within the group
    const groupDestIndex = groupChapters.findIndex((chapter, idx) => {
      if (idx === groupSourceIndex) return false;
      const flatIndex = items.findIndex(
        (c) => (c._id || c.id) === (chapter._id || chapter.id)
      );
      return flatIndex >= destinationIndex;
    });
    const finalDestIndex = groupDestIndex === -1 ? reorderedGroup.length : groupDestIndex;
    reorderedGroup.splice(finalDestIndex, 0, movedChapter);

    // Update order numbers only for chapters in this group
    const updatedGroupChapters = reorderedGroup.map((chapter, index) => ({
      ...chapter,
      orderNumber: index + 1,
    }));

    // Update the full chapters array, preserving other chapters
    const updatedItems = items.map((chapter) => {
      const updatedChapter = updatedGroupChapters.find(
        (c) => (c._id || c.id) === (chapter._id || chapter.id)
      );
      return updatedChapter || chapter;
    });

    // Optimistically update the UI first
    setChapters(updatedItems);

    // Update all affected chapters in the database using the reorder endpoint
    try {
      // Prepare chapters data for the reorder endpoint
      const chaptersData = updatedGroupChapters.map((chapter) => ({
        id: chapter._id,
        orderNumber: chapter.orderNumber,
      }));

      // Use the dedicated reorder endpoint
      const response = await api.patch("/chapter/reorder", {
        chapters: chaptersData,
      });

      if (response.data.success) {
        console.log(
          `✅ Chapter "${reorderedItem.name}" moved to position ${finalDestIndex + 1}`
        );
      } else {
        throw new Error(response.data.message || "Failed to reorder chapters");
      }
    } catch (error) {
      console.error("❌ Error updating chapter order:", error);

      // Revert the local state if API call fails
      console.log("🔄 Reverting chapter order due to API error");
      fetchChapters();

      // Show user-friendly error message
      setError(
        `Failed to update chapter order: ${error.response?.data?.message || error.message
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
                Chapter Management
              </h1>
              <p className="text-xs text-gray-600">
                Manage and organize your chapters, create new chapters, and
                track chapter performance across your educational platform.
              </p>
            </div>
            {canCreate ? (
              <button
                onClick={handleOpenAddForm}
                className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors"
              >
                Add New Chapter
              </button>
            ) : (
              <button
                disabled
                title={getPermissionMessage("create", role)}
                className="px-2 py-1 bg-gray-300 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed"
              >
                Add New Chapter
              </button>
            )}
          </div>
        </div>

        {/* Add Chapter Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaPlus className="size-3 text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  Add New Chapter
                </h2>
              </div>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all duration-200"
                disabled={isFormLoading}
              >
                <FaTimes className="size-3" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddChapter} className="space-y-2 mt-3 px-2">
              {/* Form Error Display */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center animate-fadeIn">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="size-2 bg-red-500 rounded-full"></div>
                    <p className="text-xs font-medium text-red-800">
                      {formError}
                    </p>
                  </div>
                </div>
              )}

              {/* Exam + Subject + Unit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Exam Select */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="examId"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Select Exam <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="examId"
                    name="examId"
                    value={formData.examId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
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
                    htmlFor="subjectId"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Select Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subjectId"
                    name="subjectId"
                    value={formData.subjectId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                    required
                    disabled={!formData.examId || isFormLoading}
                  >
                    <option value="">-- Select Subject --</option>
                    {filteredSubjects?.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit Select */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="unitId"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Select Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="unitId"
                    name="unitId"
                    value={formData.unitId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                    required
                    disabled={!formData.subjectId || isFormLoading}
                  >
                    <option value="">-- Select Unit --</option>
                    {filteredUnits && filteredUnits.length > 0 ? (
                      filteredUnits.map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.name}
                        </option>
                      ))
                    ) : formData.subjectId ? (
                      <option value="" disabled>Loading units...</option>
                    ) : null}
                  </select>
                </div>
              </div>

              {/* Chapters Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Chapters
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddMoreChapters}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    disabled={isFormLoading}
                  >
                    <FaPlus className="w-3 h-3" />
                    Add More
                  </button>
                </div>

                {/* Individual Chapter Inputs */}
                {additionalChapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className="grid grid-cols-1 md:grid-cols-5 gap-2"
                  >
                    {/* Chapter Name */}
                    <div className="space-y-2 px-2">
                      <label
                        htmlFor={`chapter-name-${chapter.id}`}
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Chapter Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id={`chapter-name-${chapter.id}`}
                        value={chapter.name}
                        onChange={(e) =>
                          handleChapterChange(
                            chapter.id,
                            "name",
                            e.target.value
                          )
                        }
                        placeholder="Enter chapter name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                        disabled={isFormLoading}
                      />
                    </div>

                    {/* Order Number */}
                    <div className="space-y-2 px-2">
                      <label
                        htmlFor={`chapter-order-${chapter.id}`}
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Order Number
                      </label>
                      <input
                        type="number"
                        id={`chapter-order-${chapter.id}`}
                        value={chapter.orderNumber}
                        onChange={(e) =>
                          handleChapterChange(
                            chapter.id,
                            "orderNumber",
                            parseInt(e.target.value) || 1
                          )
                        }
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                        disabled={isFormLoading}
                      />
                    </div>

                    {/* Weightage (%) */}
                    <div className="space-y-2 px-2">
                      <label
                        htmlFor={`chapter-weightage-${chapter.id}`}
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Weightage (%)
                      </label>
                      <input
                        type="number"
                        id={`chapter-weightage-${chapter.id}`}
                        value={chapter.weightage || 0}
                        onChange={(e) =>
                          handleChapterChange(
                            chapter.id,
                            "weightage",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                        disabled={isFormLoading}
                      />
                    </div>

                    {/* Time (min) */}
                    <div className="space-y-2 px-2">
                      <label
                        htmlFor={`chapter-time-${chapter.id}`}
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Time (min)
                      </label>
                      <input
                        type="number"
                        id={`chapter-time-${chapter.id}`}
                        value={chapter.time || 0}
                        onChange={(e) =>
                          handleChapterChange(
                            chapter.id,
                            "time",
                            parseInt(e.target.value) || 0
                          )
                        }
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                        disabled={isFormLoading}
                      />
                    </div>

                    {/* Questions */}
                    <div className="space-y-2 px-2">
                      <label
                        htmlFor={`chapter-questions-${chapter.id}`}
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Questions
                      </label>
                      <input
                        type="number"
                        id={`chapter-questions-${chapter.id}`}
                        value={chapter.questions || 0}
                        onChange={(e) =>
                          handleChapterChange(
                            chapter.id,
                            "questions",
                            parseInt(e.target.value) || 0
                          )
                        }
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                        disabled={isFormLoading}
                      />
                    </div>

                    {/* Remove Button */}
                    {additionalChapters.length > 1 && (
                      <div className="space-y-2 px-2 md:col-span-5 flex items-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveChapter(chapter.id)}
                          className="w-full px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
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
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="w-24 py-2 px-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                  disabled={isFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                  disabled={isFormLoading}
                >
                  {isFormLoading ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Adding Chapter...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="size-3" />
                      <span>Add Chapters</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Chapter Form */}
        {showEditForm && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-3 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaEdit className="size-3 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  Edit Chapter: {editingChapter?.name}
                </h2>
              </div>
              <button
                onClick={handleCancelEditForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all duration-200"
                disabled={isFormLoading}
              >
                <FaTimes className="size-3" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateChapter}
              className="space-y-2 mt-3 px-2"
            >
              {/* Form Error Display */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <div className="size-2 bg-red-500 rounded-full"></div>
                    <p className="text-xs font-medium text-red-800 text-center">
                      {formError}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Chapter Name */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="editName"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Chapter Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="editName"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                    required
                    disabled={isFormLoading}
                  />
                </div>

                {/* Weightage (%) */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="editWeightage"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Weightage (%)
                  </label>
                  <input
                    type="number"
                    id="editWeightage"
                    name="weightage"
                    value={editFormData.weightage}
                    onChange={handleEditFormChange}
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                    disabled={isFormLoading}
                  />
                </div>

                {/* Time (min) */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="editTime"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Time (min)
                  </label>
                  <input
                    type="number"
                    id="editTime"
                    name="time"
                    value={editFormData.time}
                    onChange={handleEditFormChange}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                    disabled={isFormLoading}
                  />
                </div>

                {/* Questions */}
                <div className="space-y-2 px-2">
                  <label
                    htmlFor="editQuestions"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Questions
                  </label>
                  <input
                    type="number"
                    id="editQuestions"
                    name="questions"
                    value={editFormData.questions}
                    onChange={handleEditFormChange}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                    required
                    disabled={!editFormData.examId || isFormLoading}
                  >
                    <option value="">-- Select Subject --</option>
                    {filteredEditSubjects?.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit Select */}
                <div className="space-y-2 px-2 md:col-span-2">
                  <label
                    htmlFor="editUnitId"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Select Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="editUnitId"
                    name="unitId"
                    value={editFormData.unitId}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm hover:border-gray-400"
                    required
                    disabled={!editFormData.subjectId || isFormLoading}
                  >
                    <option value="">-- Select Unit --</option>
                    {filteredEditUnits && filteredEditUnits.length > 0 ? (
                      filteredEditUnits.map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.name}
                        </option>
                      ))
                    ) : editFormData.subjectId ? (
                      <option value="" disabled>Loading units...</option>
                    ) : null}
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancelEditForm}
                  className="w-24 py-2 px-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                  disabled={isFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                  disabled={isFormLoading}
                >
                  {isFormLoading ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="size-3" />
                      <span>Update Chapter</span>
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
                  Chapters List
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your chapters, view details, and perform actions. You
                  can drag to reorder chapters.
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Filter by Exam */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Filter by Exam
                  </label>
                  <select
                    value={filterExam}
                    onChange={(e) => {
                      setFilterExam(e.target.value);
                      setFilterSubject("");
                      setFilterUnit("");
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
                    onChange={(e) => {
                      setFilterSubject(e.target.value);
                      setFilterUnit("");
                    }}
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

                {/* Filter by Unit */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Filter by Unit
                  </label>
                  <select
                    value={filterUnit}
                    onChange={(e) => setFilterUnit(e.target.value)}
                    disabled={!filterSubject}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">
                      {filterSubject ? "Select Subject First" : "All Units"}
                    </option>
                    {filteredFilterUnits.map((unit) => (
                      <option key={unit._id} value={unit._id}>
                        {unit.name}
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
                          setFilterUnit("");
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
                        onClick={() => {
                          setFilterSubject("");
                          setFilterUnit("");
                        }}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filterUnit && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Unit:{" "}
                      {filterUnits.find((u) => u._id === filterUnit)?.name || "N/A"}
                      <button
                        onClick={() => setFilterUnit("")}
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
                    Loading chapters...
                  </p>
                </div>
              </div>
            ) : filteredChapters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <FaClipboardList className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Chapters Found
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm">
                  {activeFilterCount > 0
                    ? "No chapters match your current filters."
                    : 'You haven\'t created any chapters yet. Click the "Add New Chapter" button to get started.'}
                </p>
                {activeFilterCount > 0 ? (
                  <button
                    onClick={clearFilters}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  >
                    Clear Filters
                  </button>
                ) : (
                  canCreate ? (
                    <button
                      onClick={handleOpenAddForm}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                    >
                      <FaPlus className="w-4 h-4" />
                      Create Your First Chapter
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
              <ChaptersTable
                chapters={filteredChapters}
                onEdit={handleEditChapter}
                onDelete={handleDeleteChapter}
                onDragEnd={handleDragEnd}
                onToggleStatus={handleToggleStatus}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChaptersManagement;
