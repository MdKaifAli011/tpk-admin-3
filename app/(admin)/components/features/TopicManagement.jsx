"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import TopicsTable from "../table/TopicsTable";
import { LoadingWrapper, SkeletonChaptersTable, LoadingSpinner } from "../ui/SkeletonLoader";
import { FaEdit, FaPlus, FaTimes, FaLock, FaSearch, FaCheck, FaGripVertical } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import StatusCascadeModal from "../ui/StatusCascadeModal";
import api from "@/lib/api";
import { setTopicListCache } from "@/lib/topicListCache";
import { invalidateListCachesFrom } from "@/lib/listCacheInvalidation";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import { IoFilterOutline } from "react-icons/io5";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import PaginationBar from "../ui/PaginationBar";

const TopicManagement = () => {
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();
  const [filterState, setFilterState] = useFilterPersistence("topic", {
    filterExam: "",
    filterSubject: "",
    filterUnit: "",
    filterChapter: "",
    searchQuery: "",
    metaFilter: "all",
  });
  const { page, limit, filterExam, filterSubject, filterUnit, filterChapter, searchQuery, metaFilter } = filterState;
  const [searchInput, setSearchInput] = useDebouncedSearchQuery(searchQuery, setFilterState);

  const { toasts, removeToast, success, error: showError } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [topics, setTopics] = useState([]);
  const [countsByChapter, setCountsByChapter] = useState({});
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [filterUnits, setFilterUnits] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [filterChapters, setFilterChapters] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    examId: "",
    subjectId: "",
    unitId: "",
    chapterId: "",
    orderNumber: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    examId: "",
    subjectId: "",
    unitId: "",
    chapterId: "",
    orderNumber: "",
  });
  const [selectedChapters, setSelectedChapters] = useState([
    { chapterId: "", orderNumber: 1, topicsText: "" },
  ]); // Array of selected chapters with their order numbers and topics text
  const [nextOrderNumber, setNextOrderNumber] = useState(1);
  const [formError, setFormError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState({});
  const [cascadeModalOpen, setCascadeModalOpen] = useState(false);
  const [cascadeItem, setCascadeItem] = useState(null);
  const isFetchingRef = useRef(false);

  // Fetch topics from API with server-side chapterId + pagination
  const fetchTopics = useCallback(async () => {
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
      if (filterUnit) params.set("unitId", filterUnit);
      if (filterChapter) params.set("chapterId", filterChapter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const response = await api.get(`/topic?${params.toString()}`);

      if (response.data.success) {
        const fetchedTopics = response.data.data || [];
        setTopics(fetchedTopics);
        setCountsByChapter(response.data.countsByChapter || {});
        setTopicListCache(fetchedTopics, metaFilter);
        const pag = response.data?.pagination;
        if (pag) {
          setPagination({
            total: pag.total ?? 0,
            totalPages: pag.totalPages ?? 0,
            hasNextPage: !!pag.hasNextPage,
            hasPrevPage: !!pag.hasPrevPage,
          });
        }
      } else {
        throw new Error(response.data.message || "Failed to fetch topics");
      }
    } catch (error) {
      console.error("❌ Error fetching topics:", error);
      setError(
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch topics"
      );
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  }, [metaFilter, page, limit, filterExam, filterSubject, filterUnit, filterChapter, searchQuery]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Fetch exams from API
  const fetchExams = useCallback(async () => {
    try {
      // Fetch all exams (active and inactive) for dropdown
      const response = await api.get("/exam?status=all&limit=1000");
      if (response.data.success) {
        setExams(response.data.data || []);
      }
    } catch (error) {
      console.error("❌ Error fetching exams:", error);
    }
  }, []);

  // Fetch subjects from API
  const fetchSubjects = useCallback(async () => {
    try {
      // Fetch all subjects (active and inactive) for dropdown
      const response = await api.get("/subject?status=all&limit=10000");
      if (response.data.success) {
        setSubjects(response.data.data || []);
      }
    } catch (error) {
      console.error("❌ Error fetching subjects:", error);
    }
  }, []);

  // Fetch units from API based on exam and subject
  const fetchUnits = useCallback(async (examId, subjectId) => {
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
        setUnits([]);
      }
    } catch (error) {
      console.error("❌ Error fetching units:", error);
      setUnits([]);
    }
  }, []);

  // Fetch chapters from API based on unit
  const fetchChapters = useCallback(async (unitId) => {
    if (!unitId) {
      setChapters([]);
      return;
    }
    try {
      // Fetch chapters for the selected unit
      const response = await api.get(
        `/chapter?unitId=${unitId}&status=all&limit=1000`
      );
      if (response.data.success) {
        setChapters(response.data.data || []);
      } else {
        setChapters([]);
      }
    } catch (error) {
      console.error("❌ Error fetching chapters:", error);
      setChapters([]);
    }
  }, []);

  // Load exams and subjects in parallel on mount
  useEffect(() => {
    Promise.all([fetchExams(), fetchSubjects()]);
  }, [fetchExams, fetchSubjects]);

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

  // Chapters are already filtered by API call, so return all chapters
  const filteredChapters = useMemo(() => {
    // Chapters are already filtered by fetchChapters(unitId), so just return them
    // Sort by orderNumber in ascending order
    const sorted = (chapters || []).sort((a, b) => {
      const ao = a.orderNumber || 0;
      const bo = b.orderNumber || 0;
      return ao - bo;
    });
    return sorted;
  }, [chapters]);

  // Filter subjects for edit form
  const filteredEditSubjects = useMemo(() => {
    if (!editFormData.examId) {
      return subjects || [];
    }
    if (!subjects || subjects.length === 0) {
      return [];
    }
    // Filter subjects by selected exam (handle both populated and non-populated examId)
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

  // Chapters for edit form are already filtered by API call, so return all chapters
  const filteredEditChapters = useMemo(() => {
    // Chapters are already filtered by fetchChapters(unitId), so just return them
    // Sort by orderNumber in ascending order
    const sorted = (chapters || []).sort((a, b) => {
      const ao = a.orderNumber || 0;
      const bo = b.orderNumber || 0;
      return ao - bo;
    });
    return sorted;
  }, [chapters]);

  // Filter subjects based on selected exam for filters
  const filteredFilterSubjects = useMemo(() => {
    if (!filterExam) return [];
    return subjects.filter(
      (subject) =>
        subject.examId?._id === filterExam || subject.examId === filterExam
    );
  }, [subjects, filterExam]);

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

  // Fetch chapters for filter section
  const fetchChaptersForFilter = useCallback(async (unitId) => {
    if (!unitId) {
      setFilterChapters([]);
      return;
    }
    try {
      const response = await api.get(
        `/chapter?unitId=${unitId}&status=all&limit=1000`
      );
      if (response.data.success) {
        const chaptersData = response.data.data || [];
        // Sort by orderNumber in ascending order
        const sorted = chaptersData.sort((a, b) => {
          const ao = a.orderNumber || 0;
          const bo = b.orderNumber || 0;
          return ao - bo;
        });
        setFilterChapters(sorted);
      } else {
        console.error("Failed to fetch filter chapters:", response.data.message);
        setFilterChapters([]);
      }
    } catch (error) {
      console.error("Error fetching filter chapters:", error);
      setFilterChapters([]);
    }
  }, []);

  // Fetch chapters for filter section when filterUnit changes
  useEffect(() => {
    if (filterUnit) {
      fetchChaptersForFilter(filterUnit);
    } else {
      setFilterChapters([]);
    }
  }, [filterUnit, fetchChaptersForFilter]);

  // Filter chapters based on selected unit for filters
  const filteredFilterChapters = useMemo(() => {
    if (!filterUnit) return [];
    return filterChapters.filter(
      (chapter) =>
        chapter.unitId?._id === filterUnit || chapter.unitId === filterUnit
    );
  }, [filterChapters, filterUnit]);

  // Search is done server-side
  const filteredTopics = topics;

  // Get active filter count
  const activeFilterCount =
    (filterExam ? 1 : 0) +
    (filterSubject ? 1 : 0) +
    (filterUnit ? 1 : 0) +
    (filterChapter ? 1 : 0) +
    (searchQuery ? 1 : 0);

  // Clear all filters
  const clearFilters = () => {
    setSearchInput("");
    setFilterState({
      filterExam: "",
      filterSubject: "",
      filterUnit: "",
      filterChapter: "",
      searchQuery: "",
      page: 1,
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Reset subject when exam changes
      if (name === "examId" && value !== prev.examId) {
        newData.subjectId = "";
        newData.unitId = "";
        newData.chapterId = "";
        setUnits([]); // Clear units when exam changes
        setChapters([]); // Clear chapters when exam changes
      }

      // Reset unit when subject changes and fetch units for the selected exam and subject
      if (name === "subjectId" && value !== prev.subjectId) {
        newData.unitId = "";
        newData.chapterId = "";
        setChapters([]); // Clear chapters when subject changes
        // Fetch units for the selected exam and subject
        if (newData.examId && value) {
          fetchUnits(newData.examId, value);
        } else {
          setUnits([]);
        }
      }

      // Reset chapter when unit changes and fetch chapters for the selected unit
      if (name === "unitId" && value !== prev.unitId) {
        newData.chapterId = "";
        // Reset selected chapters when unit changes
        setSelectedChapters([{ chapterId: "", orderNumber: 1, topicsText: "" }]);
        // Fetch chapters for the selected unit
        if (value) {
          fetchChapters(value);
        } else {
          setChapters([]);
        }
      }

      return newData;
    });
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
        newData.chapterId = "";
        setUnits([]); // Clear units when exam changes
        setChapters([]); // Clear chapters when exam changes
      }

      // Reset unit when subject changes and fetch units for the selected exam and subject
      if (name === "subjectId" && value !== prev.subjectId) {
        newData.unitId = "";
        newData.chapterId = "";
        setChapters([]); // Clear chapters when subject changes
        // Fetch units for the selected exam and subject in edit form
        if (newData.examId && value) {
          fetchUnits(newData.examId, value);
        } else {
          setUnits([]);
        }
      }

      // Reset chapter when unit changes and fetch chapters for the selected unit
      if (name === "unitId" && value !== prev.unitId) {
        newData.chapterId = "";
        // Fetch chapters for the selected unit in edit form
        if (value) {
          fetchChapters(value);
        } else {
          setChapters([]);
        }
      }

      return newData;
    });
    setFormError(null);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setFormData({
      name: "",
      examId: "",
      subjectId: "",
      unitId: "",
      chapterId: "",
      orderNumber: "",
    });
    setSelectedChapters([{ chapterId: "", orderNumber: 1, topicsText: "" }]); // Reset to single chapter
    setFormError(null);
    setUnits([]); // Clear units when form is cancelled
    setChapters([]); // Clear chapters when form is cancelled
  };

  const handleCancelEditForm = () => {
    setShowEditForm(false);
    setEditingTopic(null);
    setEditFormData({
      name: "",
      examId: "",
      subjectId: "",
      unitId: "",
      chapterId: "",
      orderNumber: "",
    });
    setFormError(null);
    setUnits([]); // Clear units when edit form is cancelled
    setChapters([]); // Clear chapters when edit form is cancelled
  };

  const handleOpenAddForm = () => {
    setShowAddForm(true);
    setFormData({
      name: "",
      examId: "",
      subjectId: "",
      unitId: "",
      chapterId: "",
      orderNumber: "",
    });
    setSelectedChapters([{ chapterId: "", orderNumber: 1, topicsText: "" }]); // Reset to single chapter
    setFormError(null);
    setUnits([]); // Clear units when opening new form
    setChapters([]); // Clear chapters when opening new form
  };

  // No longer needed - using single textarea instead

  const getNextOrderNumber = useCallback(async (chapterId) => {
    if (!chapterId) return 1;
    try {
      const response = await api.get(`/topic?chapterId=${chapterId}&status=all&limit=1000`);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const existingTopics = response.data.data;
        const maxOrder = existingTopics.reduce(
          (max, topic) => Math.max(max, topic.orderNumber || 0),
          0
        );
        return maxOrder + 1;
      }
    } catch (error) {
      console.error("Error fetching next order number:", error);
    }
    return 1;
  }, []);

  // Update order numbers when chapters are selected
  useEffect(() => {
    if (showAddForm && formData.unitId) {
      // Update order numbers for all selected chapters
      const updateOrderNumbers = async () => {
        const chapterIds = selectedChapters.map((c) => c.chapterId).filter(Boolean);
        if (chapterIds.length === 0) return;

        const updatedChapters = await Promise.all(
          selectedChapters.map(async (chapter) => {
            if (chapter.chapterId) {
              const orderNumber = await getNextOrderNumber(chapter.chapterId);
              return { ...chapter, orderNumber };
            }
            return chapter;
          })
        );
        setSelectedChapters(updatedChapters);
      };
      updateOrderNumbers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapters.map((c) => c.chapterId).join(","), formData.unitId, showAddForm]);

  // Add another chapter selection
  const handleAddAnotherChapter = () => {
    setSelectedChapters((prev) => [
      ...prev,
      { chapterId: "", orderNumber: 1, topicsText: "" },
    ]);
  };

  // Remove a chapter selection
  const handleRemoveChapter = (index) => {
    if (selectedChapters.length > 1) {
      setSelectedChapters((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Handle chapter selection change
  const handleChapterSelectionChange = async (index, chapterId) => {
    const updatedChapters = [...selectedChapters];
    updatedChapters[index].chapterId = chapterId;
    updatedChapters[index].topicsText = ""; // Clear topics when chapter changes

    // Get order number for the selected chapter
    if (chapterId) {
      const orderNumber = await getNextOrderNumber(chapterId);
      updatedChapters[index].orderNumber = orderNumber;
    } else {
      updatedChapters[index].orderNumber = 1;
    }

    setSelectedChapters(updatedChapters);

    // Also update formData.chapterId for backward compatibility (use first selected)
    setFormData((prev) => ({
      ...prev,
      chapterId: updatedChapters[0]?.chapterId || "",
    }));
  };

  // Handle topics text change for a specific chapter
  const handleChapterTopicsChange = (index, topicsText) => {
    const updatedChapters = [...selectedChapters];
    updatedChapters[index].topicsText = topicsText;
    setSelectedChapters(updatedChapters);
  };

  const handleAddTopics = async (e) => {
    e.preventDefault();

    // Check permissions
    if (!canCreate) {
      setFormError(getPermissionMessage("create", role));
      showError(getPermissionMessage("create", role));
      return;
    }

    // Validate that at least one chapter is selected with topics
    const validChapters = selectedChapters.filter(
      (ch) => ch.chapterId && ch.topicsText.trim().length > 0
    );

    if (validChapters.length === 0) {
      setFormError("Please select at least one chapter and enter topics for it.");
      showError("Please select at least one chapter and enter topics for it.");
      return;
    }

    setIsFormLoading(true);
    setFormError(null);

    try {
      // Create topics for each chapter that has topics entered
      const allTopicsToCreate = [];

      for (const chapter of validChapters) {
        // Parse topics from textarea (split by newlines)
        const topicLines = chapter.topicsText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0); // Remove empty lines

        if (topicLines.length === 0) continue; // Skip if no topics

        const topicsForChapter = topicLines.map((topicName, index) => ({
          name: topicName,
          examId: formData.examId,
          subjectId: formData.subjectId,
          unitId: formData.unitId,
          chapterId: chapter.chapterId,
          orderNumber: chapter.orderNumber + index,
        }));
        allTopicsToCreate.push(...topicsForChapter);
      }

      if (allTopicsToCreate.length === 0) {
        setFormError("Please enter at least one topic name.");
        showError("Please enter at least one topic name.");
        setIsFormLoading(false);
        return;
      }

      // Create all topics in batches (API might have limits, but let's try all at once)
      const response = await api.post("/topic", allTopicsToCreate);

      if (response.data.success) {
        const newTopics = Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data];
        invalidateListCachesFrom("topic");
        await fetchTopics();
        handleCancelForm();
        success(
          `${newTopics.length} topic(s) created successfully for ${validChapters.length} chapter(s)`
        );
      } else {
        throw new Error(response.data.message || "Failed to create topics");
      }
    } catch (error) {
      console.error("❌ Error creating topics:", error);
      setFormError(
        error.response?.data?.message ||
        error.message ||
        "Failed to create topics"
      );
      showError(error.response?.data?.message || error.message || "Failed to create topics");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleEditTopic = (topicToEdit) => {
    // Check permissions
    if (!canEdit) {
      setFormError(getPermissionMessage("edit", role));
      showError(getPermissionMessage("edit", role));
      return;
    }

    const examId = topicToEdit.examId?._id || topicToEdit.examId;
    const subjectId = topicToEdit.subjectId?._id || topicToEdit.subjectId;
    const unitId = topicToEdit.unitId?._id || topicToEdit.unitId;
    const chapterId = topicToEdit.chapterId?._id || topicToEdit.chapterId;

    setEditingTopic(topicToEdit);
    setEditFormData({
      name: topicToEdit.name,
      examId: examId,
      subjectId: subjectId,
      unitId: unitId,
      chapterId: chapterId,
      orderNumber: topicToEdit.orderNumber?.toString() || "",
    });

    // Fetch units and chapters for the selected exam, subject, and unit when editing
    if (examId && subjectId) {
      fetchUnits(examId, subjectId).then(() => {
        if (unitId) {
          fetchChapters(unitId);
        }
      });
    }

    setShowEditForm(true);
  };

  const handleUpdateTopic = async (e) => {
    e.preventDefault();
    setIsFormLoading(true);
    setFormError(null);

    try {
      const response = await api.put(`/topic/${editingTopic._id}`, {
        name: editFormData.name,
        examId: editFormData.examId,
        subjectId: editFormData.subjectId,
        unitId: editFormData.unitId,
        chapterId: editFormData.chapterId,
        orderNumber: editFormData.orderNumber && editFormData.orderNumber.trim()
          ? parseInt(editFormData.orderNumber)
          : undefined,
      });

      if (response.data.success) {
        invalidateListCachesFrom("topic");
        await fetchTopics();
        handleCancelEditForm();
        success(
          `Topic "${response.data.data.name}" updated successfully`
        );
      } else {
        throw new Error(response.data.message || "Failed to update topic");
      }
    } catch (error) {
      console.error("❌ Error updating topic:", error);
      setFormError(
        error.response?.data?.message ||
        error.message ||
        "Failed to update topic"
      );
      showError(error.response?.data?.message || error.message || "Failed to update topic");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteTopic = async (topicToDelete) => {
    // Check permissions
    if (!canDelete) {
      setFormError(getPermissionMessage("delete", role));
      showError(getPermissionMessage("delete", role));
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete "${topicToDelete.name}"?`
      )
    ) {
      return;
    }

    setIsFormLoading(true);
    setError(null);

    try {
      const response = await api.delete(`/topic/${topicToDelete._id}`);

      if (response.data.success) {
        invalidateListCachesFrom("topic");
        await fetchTopics();
        success(`Topic "${topicToDelete.name}" deleted successfully`);
      } else {
        throw new Error(response.data.message || "Failed to delete topic");
      }
    } catch (error) {
      console.error("❌ Error deleting topic:", error);
      setError(
        error.response?.data?.message ||
        error.message ||
        "Failed to delete topic"
      );
      showError(error.response?.data?.message || error.message || "Failed to delete topic");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleToggleStatus = (topic) => {
    setCascadeItem(topic);
    setCascadeModalOpen(true);
  };

  const handleCascadeConfirm = async (newStatus, cascadeMode) => {
    if (!cascadeItem) return;
    const action = newStatus === "inactive" ? "deactivate" : "activate";
    try {
      setIsFormLoading(true);
      setError(null);
      const response = await api.patch(`/topic/${cascadeItem._id}/status`, {
        status: newStatus,
        cascadeMode: cascadeMode || "respect_manual",
      });
      if (response.data.success) {
        invalidateListCachesFrom("topic");
        await fetchTopics();
        success(
          `Topic "${cascadeItem.name}" and children ${action}d successfully`
        );
        setCascadeModalOpen(false);
        setCascadeItem(null);
      } else {
        throw new Error(response.data.message || `Failed to ${action} topic`);
      }
    } catch (error) {
      console.error(`❌ Error ${action}ing topic:`, error);
      setError(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${action} topic`
      );
      showError(error.response?.data?.message || error.message || `Failed to ${action} topic`);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleBulkToggleStatus = async (selectedTopics, newStatus) => {
    if (!selectedTopics || selectedTopics.length === 0) return Promise.resolve();
    const action = newStatus === "inactive" ? "deactivate" : "activate";
    const n = selectedTopics.length;
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${n} topic${n === 1 ? "" : "s"}? All their subtopics will also be ${action}d.`
      )
    ) {
      return Promise.resolve();
    }
    try {
      setIsFormLoading(true);
      setError(null);
      const results = await Promise.all(
        selectedTopics.map((topic) =>
          api.patch(`/topic/${topic._id}/status`, { status: newStatus })
        )
      );
      const allOk = results.every((r) => r?.data?.success);
      if (allOk) {
        invalidateListCachesFrom("topic");
        await fetchTopics();
        success(
          n === 1
            ? `Topic ${action}d successfully`
            : `${n} topics ${action}d successfully`
        );
      } else {
        throw new Error(results.find((r) => !r?.data?.success)?.data?.message || `Failed to ${action} some topics`);
      }
    } catch (error) {
      console.error(`❌ Error bulk ${action}ing topics:`, error);
      setError(
        error.response?.data?.message ||
        error.message ||
        `Failed to ${action} topics`
      );
      showError(error.response?.data?.message || error.message || `Failed to ${action} topics`);
      throw error;
    } finally {
      setIsFormLoading(false);
    }
  };

  const saveReorderForChapter = async (chapterId, newOrderedTopics) => {
    const payload = {
      topics: newOrderedTopics.map((t, i) => ({
        id: t._id,
        orderNumber: i + 1,
      })),
    };
    const response = await api.patch("/topic/reorder", payload);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to reorder topics");
    }
  };

  const handleReorderDraft = (chapterId, newOrderedTopics) => {
    setReorderDraft((prev) => ({ ...prev, [chapterId]: newOrderedTopics }));
  };

  const handleDoneReorder = async () => {
    if (!canReorder) {
      showError(getPermissionMessage("reorder", role));
      return;
    }
    const chapterIds = Object.keys(reorderDraft);
    if (chapterIds.length === 0) {
      setIsReorderMode(false);
      return;
    }
    try {
      setIsFormLoading(true);
      setError(null);
      await Promise.all(
        chapterIds.map((chapterId) => saveReorderForChapter(chapterId, reorderDraft[chapterId]))
      );
      invalidateListCachesFrom("topic");
      await fetchTopics();
      setReorderDraft({});
      setIsReorderMode(false);
      success("Topic order updated successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to reorder topics. Please try again.";
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
        levelLabel="Topic"
        itemName={cascadeItem?.name}
        currentStatus={cascadeItem?.status || "active"}
        onConfirm={handleCascadeConfirm}
        loading={isFormLoading}
      />
      <LoadingWrapper
        isLoading={isDataLoading && topics.length === 0 && !searchQuery}
        skeleton={<SkeletonChaptersTable />}
      >
        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 mb-1">
                  Topic Management
                </h1>
                <p className="text-xs text-gray-600">
                  Manage and organize your topics, create new topics, and track
                  topic performance across your educational platform.
                </p>
              </div>
              {canCreate ? (
                <button
                  onClick={handleOpenAddForm}
                  className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Add New Topic
                </button>
              ) : (
                <button
                  disabled
                  title={getPermissionMessage("create", role)}
                  className="px-2 py-1 bg-gray-300 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed"
                >
                  Add New Topic
                </button>
              )}
            </div>
          </div>

          {/* Add Topic Form */}
          {showAddForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add New Topics
                </h2>
                <button
                  onClick={handleCancelForm}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  disabled={isFormLoading}
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-sm font-medium text-red-800">
                      {formError}
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleAddTopics} className="space-y-6">
                {/* Selection Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam *
                    </label>
                    <select
                      name="examId"
                      value={formData.examId}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Exam</option>
                      {exams.map((exam) => (
                        <option key={exam._id} value={exam._id}>
                          {exam.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <select
                      name="subjectId"
                      value={formData.subjectId}
                      onChange={handleFormChange}
                      required
                      disabled={!formData.examId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select Subject</option>
                      {filteredSubjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <select
                      name="unitId"
                      value={formData.unitId}
                      onChange={handleFormChange}
                      required
                      disabled={!formData.subjectId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select Unit</option>
                      {filteredUnits.map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Multiple Chapter Selection with Individual Textareas */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">
                      Select Chapter(s) and Enter Topics *
                    </h3>
                    <p className="text-xs text-gray-500">
                      Select chapters and enter topics for each chapter separately. Each chapter has its own textarea.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {selectedChapters.map((chapter, index) => {
                      const chapterName =
                        filteredChapters.find((ch) => ch._id === chapter.chapterId)
                          ?.name || "Unselected Chapter";
                      const topicCount = chapter.topicsText
                        .split("\n")
                        .filter((line) => line.trim().length > 0).length;

                      return (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 bg-gray-50/50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                  Chapter {index + 1} *
                                </label>
                                <select
                                  value={chapter.chapterId}
                                  onChange={(e) =>
                                    handleChapterSelectionChange(
                                      index,
                                      e.target.value
                                    )
                                  }
                                  required
                                  disabled={!formData.unitId}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm bg-white"
                                >
                                  <option value="">Select Chapter</option>
                                  {filteredChapters
                                    .filter(
                                      (ch) =>
                                        !selectedChapters.some(
                                          (sc, i) =>
                                            i !== index &&
                                            sc.chapterId === ch._id
                                        )
                                    )
                                    .map((chapterOption) => (
                                      <option
                                        key={chapterOption._id}
                                        value={chapterOption._id}
                                      >
                                        {chapterOption.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              {selectedChapters.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChapter(index)}
                                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors mt-6"
                                  title="Remove this chapter"
                                >
                                  <FaTimes className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {chapter.chapterId && (
                            <>
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="block text-xs font-medium text-gray-700">
                                    Topics for: <span className="text-blue-600 font-semibold">{chapterName}</span>
                                  </label>
                                  <span className="text-xs text-gray-500">
                                    Order starts from: <span className="font-semibold">{chapter.orderNumber}</span>
                                  </span>
                                </div>
                                <textarea
                                  value={chapter.topicsText}
                                  onChange={(e) =>
                                    handleChapterTopicsChange(
                                      index,
                                      e.target.value
                                    )
                                  }
                                  placeholder={`Enter topics for ${chapterName}, one per line:&#10;Topic 1&#10;Topic 2&#10;Topic 3`}
                                  rows={6}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm bg-white"
                                />
                                <div className="mt-1.5 text-xs text-gray-500">
                                  {topicCount > 0 ? (
                                    <span className="text-green-600 font-medium">
                                      {topicCount} topic(s) entered for this chapter
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">
                                      Enter topics, one per line
                                    </span>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Another Chapter Button */}
                    {(() => {
                      // Check if there are any empty chapter selections (user hasn't selected a chapter yet)
                      const hasEmptySelection = selectedChapters.some(
                        (ch) => !ch.chapterId || ch.chapterId === ""
                      );

                      // Check if there are any unselected chapters available
                      const selectedChapterIds = selectedChapters
                        .map((ch) => ch.chapterId)
                        .filter(Boolean);
                      const availableChapters = filteredChapters.filter(
                        (ch) => !selectedChapterIds.includes(ch._id)
                      );

                      // Button should be enabled only if:
                      // 1. Unit is selected
                      // 2. No empty chapter selections exist (all existing selections are filled)
                      // 3. There are available chapters to select
                      const canAddMore =
                        formData.unitId &&
                        !hasEmptySelection &&
                        availableChapters.length > 0;

                      return (
                        <button
                          type="button"
                          onClick={handleAddAnotherChapter}
                          disabled={!canAddMore}
                          className={`text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${canAddMore
                            ? "text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100"
                            : "text-gray-400 bg-gray-100 cursor-not-allowed"
                            }`}
                          title={
                            !formData.unitId
                              ? "Please select a unit first"
                              : hasEmptySelection
                                ? "Please select a chapter for the current selection first"
                                : availableChapters.length === 0
                                  ? "All available chapters are already selected"
                                  : "Add another chapter"
                          }
                        >
                          <FaPlus className="w-3 h-3" />
                          Add Another Chapter
                        </button>
                      );
                    })()}
                  </div>

                  {/* Summary */}
                  {selectedChapters.some((ch) => ch.chapterId && ch.topicsText.trim().length > 0) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-900 mb-1">
                        Summary:
                      </div>
                      <div className="text-xs text-blue-700 space-y-0.5">
                        {selectedChapters
                          .filter((ch) => ch.chapterId && ch.topicsText.trim().length > 0)
                          .map((chapter, idx) => {
                            const chapterName =
                              filteredChapters.find((ch) => ch._id === chapter.chapterId)
                                ?.name || "Unknown";
                            const topicCount = chapter.topicsText
                              .split("\n")
                              .filter((line) => line.trim().length > 0).length;
                            return (
                              <div key={idx}>
                                • {chapterName}: {topicCount} topic(s)
                              </div>
                            );
                          })}
                        <div className="mt-2 pt-2 border-t border-blue-200 font-semibold">
                          Total:{" "}
                          {selectedChapters
                            .filter((ch) => ch.chapterId && ch.topicsText.trim().length > 0)
                            .reduce((sum, ch) => {
                              return (
                                sum +
                                ch.topicsText
                                  .split("\n")
                                  .filter((line) => line.trim().length > 0).length
                              );
                            }, 0)}{" "}
                          topics will be created
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={isFormLoading}
                  >
                    {isFormLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Adding...
                      </>
                    ) : (
                      `Add Topics`
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Topic Form */}
          {showEditForm && editingTopic && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaEdit className="size-3 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  Edit Topic: {editingTopic.name}
                </h2>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleUpdateTopic} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam *
                    </label>
                    <select
                      name="examId"
                      value={editFormData.examId}
                      onChange={handleEditFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Exam</option>
                      {exams.map((exam) => (
                        <option key={exam._id} value={exam._id}>
                          {exam.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <select
                      name="subjectId"
                      value={editFormData.subjectId}
                      onChange={handleEditFormChange}
                      required
                      disabled={!editFormData.examId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select Subject</option>
                      {filteredEditSubjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <select
                      name="unitId"
                      value={editFormData.unitId}
                      onChange={handleEditFormChange}
                      required
                      disabled={!editFormData.subjectId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select Unit</option>
                      {filteredEditUnits.map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chapter *
                    </label>
                    <select
                      name="chapterId"
                      value={editFormData.chapterId}
                      onChange={handleEditFormChange}
                      required
                      disabled={!editFormData.unitId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select Chapter</option>
                      {filteredEditChapters.map((chapter) => (
                        <option key={chapter._id} value={chapter._id}>
                          {chapter.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Topic Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order Number *
                    </label>
                    <input
                      type="number"
                      name="orderNumber"
                      value={editFormData.orderNumber}
                      onChange={handleEditFormChange}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={isFormLoading}
                  >
                    {isFormLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      "Update Topic"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Topics Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Topics List
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage your topics, view details, and perform actions
                    {isReorderMode && (
                      <span className="ml-1.5 text-blue-600 font-medium">— Drag rows within each chapter, then click Done to save</span>
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
                        title="Enable drag and drop to reorder topics per chapter"
                      >
                        <FaGripVertical className="w-4 h-4" />
                        Reorder position
                      </button>
                    )
                  )}
                  {/* Search Bar */}
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meta Status:</label>
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${showFilters
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-blue-400"
                      }`}
                  >
                    <IoFilterOutline />
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Filter by Exam */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Filter by Exam
                    </label>
                    <select
                      value={filterExam}
                      onChange={(e) => {
                        setFilterState({
                          filterExam: e.target.value,
                          filterSubject: "",
                          filterUnit: "",
                          filterChapter: "",
                          page: 1,
                        });
                      }}
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

                  {/* Filter by Subject */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Filter by Subject
                    </label>
                    <select
                      value={filterSubject}
                      onChange={(e) => {
                        setFilterState({
                          filterSubject: e.target.value,
                          filterUnit: "",
                          filterChapter: "",
                          page: 1,
                        });
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
                      onChange={(e) => {
                        setFilterState({
                          filterUnit: e.target.value,
                          filterChapter: "",
                          page: 1,
                        });
                      }}
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

                  {/* Filter by Chapter */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Filter by Chapter
                    </label>
                    <select
                      value={filterChapter}
                      onChange={(e) =>
                        setFilterState({ filterChapter: e.target.value, page: 1 })
                      }
                      disabled={!filterUnit}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">
                        {filterUnit ? "Select Unit First" : "All Chapters"}
                      </option>
                      {filteredFilterChapters.map((chapter) => (
                        <option key={chapter._id} value={chapter._id}>
                          {chapter.name}
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
                            setFilterState({
                              filterExam: "",
                              filterSubject: "",
                              filterUnit: "",
                              filterChapter: "",
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Subject:{" "}
                        {subjects.find((s) => s._id === filterSubject)?.name ||
                          "N/A"}
                        <button
                          onClick={() => {
                            setFilterState({
                              filterSubject: "",
                              filterUnit: "",
                              filterChapter: "",
                              page: 1,
                            });
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
                          onClick={() => {
                            setFilterState({
                              filterUnit: "",
                              filterChapter: "",
                              page: 1,
                            });
                          }}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {filterChapter && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Chapter:{" "}
                        {filterChapters.find((c) => c._id === filterChapter)?.name ||
                          "N/A"}
                        <button
                          onClick={() =>
                            setFilterState({ filterChapter: "", page: 1 })
                          }
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                        Search: {searchQuery}
                        <button
                          type="button"
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
              </div>
            )}

            <div className="p-2">
              <>
                <TopicsTable
                  topics={filteredTopics}
                  countsByChapter={countsByChapter}
                  onEdit={handleEditTopic}
                  onDelete={handleDeleteTopic}
                  onToggleStatus={handleToggleStatus}
                  onBulkToggleStatus={handleBulkToggleStatus}
                  onReorderDraft={handleReorderDraft}
                  reorderDraft={reorderDraft}
                  isReorderAllowed={isReorderMode && !searchQuery.trim()}
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
            </div>
          </div>
        </div>
      </LoadingWrapper>
    </>
  );
};

export default TopicManagement;
