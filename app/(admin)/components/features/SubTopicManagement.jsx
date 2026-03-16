"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import SubTopicsTable from "../table/SubTopicsTable";
import { LoadingWrapper, SkeletonChaptersTable, LoadingSpinner } from "../ui/SkeletonLoader";
import { FaEdit, FaPlus, FaTimes, FaLock, FaSearch, FaCheck, FaGripVertical } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import StatusCascadeModal from "../ui/StatusCascadeModal";
import api from "@/lib/api";
import { setSubTopicListCache } from "@/lib/subTopicListCache";
import { invalidateListCachesFrom } from "@/lib/listCacheInvalidation";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import { IoFilterOutline } from "react-icons/io5";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import PaginationBar from "../ui/PaginationBar";

const SubTopicsManagement = () => {
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();
  const [filterState, setFilterState] = useFilterPersistence("subtopic", {
    filterExam: "",
    filterSubject: "",
    filterUnit: "",
    filterChapter: "",
    filterTopic: "",
    searchQuery: "",
    metaFilter: "all",
  });
  const { page, limit, filterExam, filterSubject, filterUnit, filterChapter, filterTopic, searchQuery, metaFilter } = filterState;
  const [searchInput, setSearchInput] = useDebouncedSearchQuery(searchQuery, setFilterState);

  const { toasts, removeToast, success, error: showError } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSubTopic, setEditingSubTopic] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subTopics, setSubTopics] = useState([]);
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
  const [topics, setTopics] = useState([]);
  const [filterTopics, setFilterTopics] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    examId: "",
    subjectId: "",
    unitId: "",
    chapterId: "",
    topicId: "",
    orderNumber: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    examId: "",
    subjectId: "",
    unitId: "",
    chapterId: "",
    topicId: "",
    orderNumber: "",
  });
  const [selectedTopics, setSelectedTopics] = useState([
    { topicId: "", orderNumber: 1, subTopicsText: "" },
  ]); // Array of selected topics with their order numbers and subtopics text
  const [nextOrderNumber, setNextOrderNumber] = useState(1);
  const [formError, setFormError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState({});
  const [cascadeModalOpen, setCascadeModalOpen] = useState(false);
  const [cascadeItem, setCascadeItem] = useState(null);
  const isFetchingRef = useRef(false);

  // Fetch sub topics from API with server-side topicId + pagination
  const fetchSubTopics = useCallback(async () => {
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
      if (filterTopic) params.set("topicId", filterTopic);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const response = await api.get(`/subtopic?${params.toString()}`);

      if (response.data.success) {
        const fetchedSubTopics = response.data.data || [];
        setSubTopics(fetchedSubTopics);
        setSubTopicListCache(fetchedSubTopics, metaFilter);
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
        throw new Error(response.data.message || "Failed to fetch sub topics");
      }
    } catch (error) {
      console.error("❌ Error fetching sub topics:", error);
      setError(
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch sub topics"
      );
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  }, [metaFilter, page, limit, filterExam, filterSubject, filterUnit, filterChapter, filterTopic, searchQuery]);

  useEffect(() => {
    fetchSubTopics();
  }, [fetchSubTopics]);

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

  // Fetch topics from API based on chapter
  const fetchTopics = useCallback(async (chapterId) => {
    if (!chapterId) {
      setTopics([]);
      return;
    }
    try {
      // Fetch topics for the selected chapter
      const response = await api.get(
        `/topic?chapterId=${chapterId}&status=all&limit=1000`
      );
      if (response.data.success) {
        setTopics(response.data.data || []);
      } else {
        setTopics([]);
      }
    } catch (error) {
      console.error("❌ Error fetching topics:", error);
      setTopics([]);
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

  // Topics are already filtered by API call, so return all topics
  const filteredTopics = useMemo(() => {
    // Topics are already filtered by fetchTopics(chapterId), so just return them
    // Sort by orderNumber in ascending order
    const sorted = (topics || []).sort((a, b) => {
      const ao = a.orderNumber || 0;
      const bo = b.orderNumber || 0;
      return ao - bo;
    });
    return sorted;
  }, [topics]);

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

  // Topics for edit form are already filtered by API call, so return all topics
  const filteredEditTopics = useMemo(() => {
    // Topics are already filtered by fetchTopics(chapterId), so just return them
    // Sort by orderNumber in ascending order
    const sorted = (topics || []).sort((a, b) => {
      const ao = a.orderNumber || 0;
      const bo = b.orderNumber || 0;
      return ao - bo;
    });
    return sorted;
  }, [topics]);

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

  // Fetch topics for filter section
  const fetchTopicsForFilter = useCallback(async (chapterId) => {
    if (!chapterId) {
      setFilterTopics([]);
      return;
    }
    try {
      const response = await api.get(
        `/topic?chapterId=${chapterId}&status=all&limit=1000`
      );
      if (response.data.success) {
        const topicsData = response.data.data || [];
        // Sort by orderNumber in ascending order
        const sorted = topicsData.sort((a, b) => {
          const ao = a.orderNumber || 0;
          const bo = b.orderNumber || 0;
          return ao - bo;
        });
        setFilterTopics(sorted);
      } else {
        console.error("Failed to fetch filter topics:", response.data.message);
        setFilterTopics([]);
      }
    } catch (error) {
      console.error("Error fetching filter topics:", error);
      setFilterTopics([]);
    }
  }, []);

  // Fetch topics for filter section when filterChapter changes
  useEffect(() => {
    if (filterChapter) {
      fetchTopicsForFilter(filterChapter);
    } else {
      setFilterTopics([]);
    }
  }, [filterChapter, fetchTopicsForFilter]);

  // Filter topics based on selected chapter for filters
  const filteredFilterTopics = useMemo(() => {
    if (!filterChapter) return [];
    return filterTopics.filter(
      (topic) =>
        topic.chapterId?._id === filterChapter ||
        topic.chapterId === filterChapter
    );
  }, [filterTopics, filterChapter]);

  // Search is done server-side
  const filteredSubTopics = subTopics;

  // Get active filter count
  const activeFilterCount =
    (filterExam ? 1 : 0) +
    (filterSubject ? 1 : 0) +
    (filterUnit ? 1 : 0) +
    (filterChapter ? 1 : 0) +
    (filterTopic ? 1 : 0) +
    (searchQuery ? 1 : 0);

  // Clear all filters
  const clearFilters = () => {
    setFilterState({
      filterExam: "",
      filterSubject: "",
      filterUnit: "",
      filterChapter: "",
      filterTopic: "",
      searchQuery: "",
      page: 1,
    });
    setFilterTopics([]);
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
        newData.topicId = "";
        setUnits([]); // Clear units when exam changes
        setChapters([]); // Clear chapters when exam changes
        setTopics([]); // Clear topics when exam changes
      }

      // Reset unit when subject changes and fetch units for the selected exam and subject
      if (name === "subjectId" && value !== prev.subjectId) {
        newData.unitId = "";
        newData.chapterId = "";
        newData.topicId = "";
        setChapters([]); // Clear chapters when subject changes
        setTopics([]); // Clear topics when subject changes
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
        newData.topicId = "";
        setTopics([]); // Clear topics when unit changes
        // Fetch chapters for the selected unit
        if (value) {
          fetchChapters(value);
        } else {
          setChapters([]);
        }
      }

      // Reset topic when chapter changes and fetch topics for the selected chapter
      if (name === "chapterId" && value !== prev.chapterId) {
        newData.topicId = "";
        // Reset selected topics when chapter changes
        setSelectedTopics([{ topicId: "", orderNumber: 1, subTopicsText: "" }]);
        // Fetch topics for the selected chapter
        if (value) {
          fetchTopics(value);
        } else {
          setTopics([]);
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
        newData.topicId = "";
        setUnits([]); // Clear units when exam changes
        setChapters([]); // Clear chapters when exam changes
        setTopics([]); // Clear topics when exam changes
      }

      // Reset unit when subject changes and fetch units for the selected exam and subject
      if (name === "subjectId" && value !== prev.subjectId) {
        newData.unitId = "";
        newData.chapterId = "";
        newData.topicId = "";
        setChapters([]); // Clear chapters when subject changes
        setTopics([]); // Clear topics when subject changes
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
        newData.topicId = "";
        setTopics([]); // Clear topics when unit changes
        // Fetch chapters for the selected unit in edit form
        if (value) {
          fetchChapters(value);
        } else {
          setChapters([]);
        }
      }

      // Reset topic when chapter changes and fetch topics for the selected chapter
      if (name === "chapterId" && value !== prev.chapterId) {
        newData.topicId = "";
        // Fetch topics for the selected chapter in edit form
        if (value) {
          fetchTopics(value);
        } else {
          setTopics([]);
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
      topicId: "",
      orderNumber: "",
    });
    setSelectedTopics([{ topicId: "", orderNumber: 1, subTopicsText: "" }]); // Reset to single topic
    setNextOrderNumber(1);
    setFormError(null);
    setUnits([]); // Clear units when form is cancelled
    setChapters([]); // Clear chapters when form is cancelled
    setTopics([]); // Clear topics when form is cancelled
  };

  const handleCancelEditForm = () => {
    setShowEditForm(false);
    setEditingSubTopic(null);
    setEditFormData({
      name: "",
      examId: "",
      subjectId: "",
      unitId: "",
      chapterId: "",
      topicId: "",
      orderNumber: "",
    });
    setFormError(null);
    setUnits([]); // Clear units when edit form is cancelled
    setChapters([]); // Clear chapters when edit form is cancelled
    setTopics([]); // Clear topics when edit form is cancelled
  };

  const handleOpenAddForm = () => {
    setShowAddForm(true);
    setFormData({
      name: "",
      examId: "",
      subjectId: "",
      unitId: "",
      chapterId: "",
      topicId: "",
      orderNumber: "",
    });
    setSelectedTopics([{ topicId: "", orderNumber: 1, subTopicsText: "" }]); // Reset to single topic
    setNextOrderNumber(1);
    setFormError(null);
    setUnits([]); // Clear units when opening new form
    setChapters([]); // Clear chapters when opening new form
    setTopics([]); // Clear topics when opening new form
  };

  // Add another topic selection
  const handleAddAnotherTopic = () => {
    setSelectedTopics((prev) => [
      ...prev,
      { topicId: "", orderNumber: 1, subTopicsText: "" },
    ]);
  };

  // Remove a topic selection
  const handleRemoveTopic = (index) => {
    if (selectedTopics.length > 1) {
      setSelectedTopics((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Handle topic selection change
  const handleTopicSelectionChange = async (index, topicId) => {
    const updatedTopics = [...selectedTopics];
    updatedTopics[index].topicId = topicId;
    updatedTopics[index].subTopicsText = ""; // Clear subtopics when topic changes

    // Get order number for the selected topic
    if (topicId) {
      const orderNumber = await getNextOrderNumber(topicId);
      updatedTopics[index].orderNumber = orderNumber;
    } else {
      updatedTopics[index].orderNumber = 1;
    }

    setSelectedTopics(updatedTopics);

    // Also update formData.topicId for backward compatibility (use first selected)
    setFormData((prev) => ({
      ...prev,
      topicId: updatedTopics[0]?.topicId || "",
    }));
  };

  // Handle subtopics text change for a specific topic
  const handleTopicSubTopicsChange = (index, subTopicsText) => {
    const updatedTopics = [...selectedTopics];
    updatedTopics[index].subTopicsText = subTopicsText;
    setSelectedTopics(updatedTopics);
  };

  const getNextOrderNumber = useCallback(async (topicId) => {
    if (!topicId) return 1;
    try {
      const response = await api.get(`/subtopic?topicId=${topicId}&status=all&limit=1000`);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const existingSubTopics = response.data.data;
        const maxOrder = existingSubTopics.reduce(
          (max, subTopic) => Math.max(max, subTopic.orderNumber || 0),
          0
        );
        return maxOrder + 1;
      }
    } catch (error) {
      console.error("Error fetching next order number:", error);
    }
    return 1;
  }, []);

  // Update order numbers when topics are selected
  useEffect(() => {
    if (showAddForm && formData.chapterId) {
      // Update order numbers for all selected topics
      const updateOrderNumbers = async () => {
        const topicIds = selectedTopics.map((t) => t.topicId).filter(Boolean);
        if (topicIds.length === 0) return;

        const updatedTopics = await Promise.all(
          selectedTopics.map(async (topic) => {
            if (topic.topicId) {
              const orderNumber = await getNextOrderNumber(topic.topicId);
              return { ...topic, orderNumber };
            }
            return topic;
          })
        );
        setSelectedTopics(updatedTopics);
      };
      updateOrderNumbers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [selectedTopics.map((t) => t.topicId).join(","), formData.chapterId, showAddForm]);

  const handleAddSubTopics = async (e) => {
    e.preventDefault();

    // Check permissions
    if (!canCreate) {
      setFormError(getPermissionMessage("create", role));
      showError(getPermissionMessage("create", role));
      return;
    }

    // Validate that at least one topic is selected with subtopics
    const validTopics = selectedTopics.filter(
      (t) => t.topicId && t.subTopicsText.trim().length > 0
    );

    if (validTopics.length === 0) {
      setFormError("Please select at least one topic and enter subtopics for it.");
      showError("Please select at least one topic and enter subtopics for it.");
      return;
    }

    setIsFormLoading(true);
    setFormError(null);

    try {
      // Create subtopics for each topic that has subtopics entered
      const allSubTopicsToCreate = [];

      for (const topic of validTopics) {
        // Parse subtopics from textarea (split by newlines)
        const subTopicLines = topic.subTopicsText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0); // Remove empty lines

        if (subTopicLines.length === 0) continue; // Skip if no subtopics

        const subTopicsForTopic = subTopicLines.map((subTopicName, index) => ({
          name: subTopicName,
          examId: formData.examId,
          subjectId: formData.subjectId,
          unitId: formData.unitId,
          chapterId: formData.chapterId,
          topicId: topic.topicId,
          orderNumber: topic.orderNumber + index,
        }));
        allSubTopicsToCreate.push(...subTopicsForTopic);
      }

      if (allSubTopicsToCreate.length === 0) {
        setFormError("Please enter at least one subtopic name.");
        showError("Please enter at least one subtopic name.");
        setIsFormLoading(false);
        return;
      }

      const response = await api.post("/subtopic", allSubTopicsToCreate);

      if (response.data.success) {
        const newSubTopics = Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data];
        invalidateListCachesFrom("subtopic");
        await fetchSubTopics();
        handleCancelForm();
        success(
          `${newSubTopics.length} sub topic(s) created successfully for ${validTopics.length} topic(s)`
        );
      } else {
        throw new Error(response.data.message || "Failed to create sub topics");
      }
    } catch (error) {
      console.error("❌ Error creating sub topics:", error);
      setFormError(
        error.response?.data?.message ||
        error.message ||
        "Failed to create sub topics"
      );
      showError(error.response?.data?.message || error.message || "Failed to create sub topics");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleEditSubTopic = (subTopicToEdit) => {
    // Check permissions
    if (!canEdit) {
      setFormError(getPermissionMessage("edit", role));
      showError(getPermissionMessage("edit", role));
      return;
    }

    const examId = subTopicToEdit.examId?._id || subTopicToEdit.examId;
    const subjectId = subTopicToEdit.subjectId?._id || subTopicToEdit.subjectId;
    const unitId = subTopicToEdit.unitId?._id || subTopicToEdit.unitId;
    const chapterId = subTopicToEdit.chapterId?._id || subTopicToEdit.chapterId;
    const topicId = subTopicToEdit.topicId?._id || subTopicToEdit.topicId;

    setEditingSubTopic(subTopicToEdit);
    setEditFormData({
      name: subTopicToEdit.name,
      examId: examId,
      subjectId: subjectId,
      unitId: unitId,
      chapterId: chapterId,
      topicId: topicId,
      orderNumber: subTopicToEdit.orderNumber?.toString() || "",
    });

    // Fetch units, chapters, and topics for the selected exam, subject, unit, and chapter when editing
    if (examId && subjectId) {
      fetchUnits(examId, subjectId).then(() => {
        if (unitId) {
          fetchChapters(unitId).then(() => {
            if (chapterId) {
              fetchTopics(chapterId);
            }
          });
        }
      });
    }

    setShowEditForm(true);
  };

  const handleUpdateSubTopic = async (e) => {
    e.preventDefault();
    setIsFormLoading(true);
    setFormError(null);

    try {
      const response = await api.put(`/subtopic/${editingSubTopic._id}`, {
        name: editFormData.name,
        examId: editFormData.examId,
        subjectId: editFormData.subjectId,
        unitId: editFormData.unitId,
        chapterId: editFormData.chapterId,
        topicId: editFormData.topicId,
        orderNumber: editFormData.orderNumber && editFormData.orderNumber.trim()
          ? parseInt(editFormData.orderNumber)
          : undefined,
      });

      if (response.data.success) {
        invalidateListCachesFrom("subtopic");
        await fetchSubTopics();
        handleCancelEditForm();
        success(
          `Sub Topic "${response.data.data.name}" updated successfully`
        );
      } else {
        throw new Error(response.data.message || "Failed to update sub topic");
      }
    } catch (error) {
      console.error("❌ Error updating sub topic:", error);
      setFormError(
        error.response?.data?.message ||
        error.message ||
        "Failed to update sub topic"
      );
      showError(error.response?.data?.message || error.message || "Failed to update sub topic");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteSubTopic = async (subTopicToDelete) => {
    // Check permissions
    if (!canDelete) {
      setFormError(getPermissionMessage("delete", role));
      showError(getPermissionMessage("delete", role));
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete "${subTopicToDelete.name}"?`
      )
    ) {
      return;
    }

    setIsFormLoading(true);
    setError(null);

    try {
      const response = await api.delete(`/subtopic/${subTopicToDelete._id}`);

      if (response.data.success) {
        invalidateListCachesFrom("subtopic");
        await fetchSubTopics();
        success(
          `Sub Topic "${subTopicToDelete.name}" deleted successfully`
        );
      } else {
        throw new Error(response.data.message || "Failed to delete sub topic");
      }
    } catch (error) {
      console.error("❌ Error deleting sub topic:", error);
      setError(
        error.response?.data?.message ||
        error.message ||
        "Failed to delete sub topic"
      );
      showError(error.response?.data?.message || error.message || "Failed to delete sub topic");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleToggleStatus = (subTopic) => {
    setCascadeItem(subTopic);
    setCascadeModalOpen(true);
  };

  const handleCascadeConfirm = async (newStatus, cascadeMode) => {
    if (!cascadeItem) return;
    const action = newStatus === "inactive" ? "deactivate" : "activate";
    try {
      setIsFormLoading(true);
      setError(null);
      const response = await api.patch(`/subtopic/${cascadeItem._id}/status`, {
        status: newStatus,
        cascadeMode: cascadeMode || "respect_manual",
      });
      if (response.data.success) {
        invalidateListCachesFrom("subtopic");
        await fetchSubTopics();
        success(`SubTopic "${cascadeItem.name}" ${action}d successfully`);
        setCascadeModalOpen(false);
        setCascadeItem(null);
      } else {
        throw new Error(
          response.data.message || `Failed to ${action} sub topic`
        );
      }
    } catch (error) {
      console.error(`❌ Error ${action}ing subtopic:`, error);
      setError(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${action} subtopic`
      );
      showError(error.response?.data?.message || error.message || `Failed to ${action} subtopic`);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleBulkToggleStatus = async (selectedSubTopics, newStatus) => {
    if (!selectedSubTopics || selectedSubTopics.length === 0) return Promise.resolve();
    const action = newStatus === "inactive" ? "deactivate" : "activate";
    const n = selectedSubTopics.length;
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${n} subtopic${n === 1 ? "" : "s"}? Their definitions will also be ${action}d.`
      )
    ) {
      return Promise.resolve();
    }
    try {
      setIsFormLoading(true);
      setError(null);
      const results = await Promise.all(
        selectedSubTopics.map((st) =>
          api.patch(`/subtopic/${st._id}/status`, { status: newStatus })
        )
      );
      const allOk = results.every((r) => r?.data?.success);
      if (allOk) {
        invalidateListCachesFrom("subtopic");
        await fetchSubTopics();
        success(
          n === 1
            ? `SubTopic ${action}d successfully`
            : `${n} subtopics ${action}d successfully`
        );
      } else {
        throw new Error(
          results.find((r) => !r?.data?.success)?.data?.message ||
            `Failed to ${action} some subtopics`
        );
      }
    } catch (error) {
      console.error(`Error bulk ${action}ing subtopics:`, error);
      setError(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${action} subtopics`
      );
      showError(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${action} subtopics`
      );
      throw error;
    } finally {
      setIsFormLoading(false);
    }
  };

  const saveReorderForTopic = async (topicId, newOrderedSubTopics) => {
    const payload = {
      subTopics: newOrderedSubTopics.map((st, i) => ({
        id: st._id,
        orderNumber: i + 1,
      })),
    };
    const response = await api.patch("/subtopic/reorder", payload);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to reorder subtopics");
    }
  };

  const handleReorderDraft = (topicId, newOrderedSubTopics) => {
    setReorderDraft((prev) => ({ ...prev, [topicId]: newOrderedSubTopics }));
  };

  const handleDoneReorder = async () => {
    if (!canReorder) {
      showError(getPermissionMessage("reorder", role));
      return;
    }
    const topicIds = Object.keys(reorderDraft);
    if (topicIds.length === 0) {
      setIsReorderMode(false);
      return;
    }
    try {
      setIsFormLoading(true);
      setError(null);
      await Promise.all(
        topicIds.map((topicId) => saveReorderForTopic(topicId, reorderDraft[topicId]))
      );
      invalidateListCachesFrom("subtopic");
      await fetchSubTopics();
      setReorderDraft({});
      setIsReorderMode(false);
      success("SubTopic order updated successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to reorder subtopics. Please try again.";
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
        levelLabel="Sub Topic"
        itemName={cascadeItem?.name}
        currentStatus={cascadeItem?.status || "active"}
        onConfirm={handleCascadeConfirm}
        loading={isFormLoading}
      />
      <LoadingWrapper
        isLoading={isDataLoading}
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
                  Sub Topic Management
                </h1>
                <p className="text-xs text-gray-600">
                  Manage and organize your sub topics, create new sub topics, and track sub topic performance across your educational platform.
                </p>
              </div>
              {canCreate ? (
                <button
                  onClick={handleOpenAddForm}
                  className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Add New Sub Topic
                </button>
              ) : (
                <button
                  disabled
                  title={getPermissionMessage("create", role)}
                  className="px-2 py-1 bg-gray-300 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed"
                >
                  Add New Sub Topic
                </button>
              )}
            </div>
          </div>

          {/* Add Sub Topic Form */}
          {showAddForm && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaPlus className="size-3 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  Add New Sub Topics
                </h2>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddSubTopics} className="space-y-6">
                {/* Selection Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chapter *
                    </label>
                    <select
                      name="chapterId"
                      value={formData.chapterId}
                      onChange={handleFormChange}
                      required
                      disabled={!formData.unitId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select Chapter</option>
                      {filteredChapters.map((chapter) => (
                        <option key={chapter._id} value={chapter._id}>
                          {chapter.name}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Multiple Topic Selection with Individual Textareas */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">
                      Select Topic(s) and Enter Sub Topics *
                    </h3>
                    <p className="text-xs text-gray-500">
                      Select topics and enter subtopics for each topic separately. Each topic has its own textarea.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {selectedTopics.map((topic, index) => {
                      const topicName =
                        filteredTopics.find((t) => t._id === topic.topicId)
                          ?.name || "Unselected Topic";
                      const subTopicCount = topic.subTopicsText
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
                                  Topic {index + 1} *
                                </label>
                                <select
                                  value={topic.topicId}
                                  onChange={(e) =>
                                    handleTopicSelectionChange(
                                      index,
                                      e.target.value
                                    )
                                  }
                                  required
                                  disabled={!formData.chapterId}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm bg-white"
                                >
                                  <option value="">Select Topic</option>
                                  {filteredTopics
                                    .filter(
                                      (t) =>
                                        !selectedTopics.some(
                                          (st, i) =>
                                            i !== index &&
                                            st.topicId === t._id
                                        )
                                    )
                                    .map((topicOption) => (
                                      <option
                                        key={topicOption._id}
                                        value={topicOption._id}
                                      >
                                        {topicOption.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              {selectedTopics.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTopic(index)}
                                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors mt-6"
                                  title="Remove this topic"
                                >
                                  <FaTimes className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {topic.topicId && (
                            <>
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="block text-xs font-medium text-gray-700">
                                    Sub Topics for: <span className="text-blue-600 font-semibold">{topicName}</span>
                                  </label>
                                  <span className="text-xs text-gray-500">
                                    Order starts from: <span className="font-semibold">{topic.orderNumber}</span>
                                  </span>
                                </div>
                                <textarea
                                  value={topic.subTopicsText}
                                  onChange={(e) =>
                                    handleTopicSubTopicsChange(
                                      index,
                                      e.target.value
                                    )
                                  }
                                  placeholder={`Enter subtopics for ${topicName}, one per line:&#10;Sub Topic 1&#10;Sub Topic 2&#10;Sub Topic 3`}
                                  rows={6}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm bg-white"
                                />
                                <div className="mt-1.5 text-xs text-gray-500">
                                  {subTopicCount > 0 ? (
                                    <span className="text-green-600 font-medium">
                                      {subTopicCount} subtopic(s) entered for this topic
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">
                                      Enter subtopics, one per line
                                    </span>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Another Topic Button */}
                    {(() => {
                      // Check if there are any empty topic selections (user hasn't selected a topic yet)
                      const hasEmptySelection = selectedTopics.some(
                        (t) => !t.topicId || t.topicId === ""
                      );

                      // Check if there are any unselected topics available
                      const selectedTopicIds = selectedTopics
                        .map((t) => t.topicId)
                        .filter(Boolean);
                      const availableTopics = filteredTopics.filter(
                        (t) => !selectedTopicIds.includes(t._id)
                      );

                      // Button should be enabled only if:
                      // 1. Chapter is selected
                      // 2. No empty topic selections exist (all existing selections are filled)
                      // 3. There are available topics to select
                      const canAddMore =
                        formData.chapterId &&
                        !hasEmptySelection &&
                        availableTopics.length > 0;

                      return (
                        <button
                          type="button"
                          onClick={handleAddAnotherTopic}
                          disabled={!canAddMore}
                          className={`text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${canAddMore
                            ? "text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100"
                            : "text-gray-400 bg-gray-100 cursor-not-allowed"
                            }`}
                          title={
                            !formData.chapterId
                              ? "Please select a chapter first"
                              : hasEmptySelection
                                ? "Please select a topic for the current selection first"
                                : availableTopics.length === 0
                                  ? "All available topics are already selected"
                                  : "Add another topic"
                          }
                        >
                          <FaPlus className="w-3 h-3" />
                          Add Another Topic
                        </button>
                      );
                    })()}
                  </div>

                  {/* Summary */}
                  {selectedTopics.some((t) => t.topicId && t.subTopicsText.trim().length > 0) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-900 mb-1">
                        Summary:
                      </div>
                      <div className="text-xs text-blue-700 space-y-0.5">
                        {selectedTopics
                          .filter((t) => t.topicId && t.subTopicsText.trim().length > 0)
                          .map((topic, idx) => {
                            const topicName =
                              filteredTopics.find((t) => t._id === topic.topicId)
                                ?.name || "Unknown";
                            const subTopicCount = topic.subTopicsText
                              .split("\n")
                              .filter((line) => line.trim().length > 0).length;
                            return (
                              <div key={idx}>
                                • {topicName}: {subTopicCount} subtopic(s)
                              </div>
                            );
                          })}
                        <div className="mt-2 pt-2 border-t border-blue-200 font-semibold">
                          Total:{" "}
                          {selectedTopics
                            .filter((t) => t.topicId && t.subTopicsText.trim().length > 0)
                            .reduce((sum, t) => {
                              return (
                                sum +
                                t.subTopicsText
                                  .split("\n")
                                  .filter((line) => line.trim().length > 0).length
                              );
                            }, 0)}{" "}
                          subtopics will be created
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
                      `Add Sub Topics`
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Sub Topic Form */}
          {showEditForm && editingSubTopic && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaEdit className="size-3 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  Edit Sub Topic: {editingSubTopic.name}
                </h2>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleUpdateSubTopic} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Topic *
                    </label>
                    <select
                      name="topicId"
                      value={editFormData.topicId}
                      onChange={handleEditFormChange}
                      required
                      disabled={!editFormData.chapterId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select Topic</option>
                      {filteredEditTopics.map((topic) => (
                        <option key={topic._id} value={topic._id}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sub Topic Name *
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
                      "Update Sub Topic"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sub Topics Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    SubTopics List
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage your subtopics, view details, and perform actions
                    {isReorderMode && (
                      <span className="ml-1.5 text-blue-600 font-medium">— Drag rows within each topic, then click Done to save</span>
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
                        title="Enable drag and drop to reorder subtopics per topic"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
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
                          filterUnit: "",
                          filterChapter: "",
                          filterTopic: "",
                          page: 1,
                        });
                        setFilterTopics([]);
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
                        setFilterState({
                          filterSubject: e.target.value,
                          filterUnit: "",
                          filterChapter: "",
                          filterTopic: "",
                          page: 1,
                        });
                        setFilterTopics([]);
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
                          filterTopic: "",
                          page: 1,
                        });
                        setFilterTopics([]);
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
                      onChange={(e) => {
                        setFilterState({
                          filterChapter: e.target.value,
                          filterTopic: "",
                          page: 1,
                        });
                        if (!e.target.value) setFilterTopics([]);
                      }}
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

                  {/* Filter by Topic */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Filter by Topic
                    </label>
                    <select
                      value={filterTopic}
                      onChange={(e) =>
                        setFilterState({ filterTopic: e.target.value, page: 1 })
                      }
                      disabled={!filterChapter}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">
                        {filterChapter ? "Select Chapter First" : "All Topics"}
                      </option>
                      {filteredFilterTopics.map((topic) => (
                        <option key={topic._id} value={topic._id}>
                          {topic.name}
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
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        Exam:{" "}
                        {exams.find((e) => e._id === filterExam)?.name || "N/A"}
                        <button
                          onClick={() => {
                            setFilterState({
                              filterExam: "",
                              filterSubject: "",
                              filterUnit: "",
                              filterChapter: "",
                              filterTopic: "",
                              page: 1,
                            });
                            setFilterTopics([]);
                          }}
                          className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {filterSubject && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                        Subject:{" "}
                        {subjects.find((s) => s._id === filterSubject)?.name ||
                          "N/A"}
                        <button
                          onClick={() => {
                            setFilterState({
                              filterSubject: "",
                              filterUnit: "",
                              filterChapter: "",
                              filterTopic: "",
                              page: 1,
                            });
                            setFilterTopics([]);
                          }}
                          className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {filterUnit && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        Unit:{" "}
                        {filterUnits.find((u) => u._id === filterUnit)?.name || "N/A"}
                        <button
                          onClick={() => {
                            setFilterState({
                              filterUnit: "",
                              filterChapter: "",
                              filterTopic: "",
                              page: 1,
                            });
                            setFilterTopics([]);
                          }}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {filterChapter && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                        Chapter:{" "}
                        {filterChapters.find((c) => c._id === filterChapter)?.name ||
                          "N/A"}
                        <button
                          onClick={() => {
                            setFilterState({
                              filterChapter: "",
                              filterTopic: "",
                              page: 1,
                            });
                            setFilterTopics([]);
                          }}
                          className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {filterTopic && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                        Topic:{" "}
                        {filterTopics.find((t) => t._id === filterTopic)?.name || "N/A"}
                        <button
                          onClick={() =>
                            setFilterState({ filterTopic: "", page: 1 })
                          }
                          className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                        Search: {searchQuery}
                        <button
                          onClick={() =>
                            setFilterState({ searchQuery: "", page: 1 })
                          }
                          className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    <button
                      onClick={clearFilters}
                      className="ml-auto px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-xs font-semibold transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="p-2">
              <SubTopicsTable
                subTopics={filteredSubTopics}
                onEdit={handleEditSubTopic}
                onDelete={handleDeleteSubTopic}
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
            </div>
          </div>
        </div>
      </LoadingWrapper>
    </>
  );
};

export default SubTopicsManagement;
