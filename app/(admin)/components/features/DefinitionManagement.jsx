"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import DefinitionsTable from "../table/DefinitionsTable";
import { LoadingWrapper, SkeletonChaptersTable, LoadingSpinner } from "../ui/SkeletonLoader";
import { FaEdit, FaPlus, FaTimes, FaLock, FaSearch, FaCheck, FaGripVertical } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";

const DefinitionManagement = () => {
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();
  const { toasts, removeToast, success, error: showError } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [definitions, setDefinitions] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [filterUnits, setFilterUnits] = useState([]); // Separate units for filter section
  const [chapters, setChapters] = useState([]);
  const [filterChapters, setFilterChapters] = useState([]); // Separate chapters for filter section
  const [topics, setTopics] = useState([]);
  const [filterTopics, setFilterTopics] = useState([]); // Separate topics for filter section
  const [subTopics, setSubTopics] = useState([]);
  const [filterSubTopics, setFilterSubTopics] = useState([]); // Separate subtopics for filter section
  const [formData, setFormData] = useState({
    name: "",
    examId: "",
    subjectId: "",
    unitId: "",
    chapterId: "",
    topicId: "",
    subTopicId: "",
    orderNumber: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    examId: "",
    subjectId: "",
    unitId: "",
    chapterId: "",
    topicId: "",
    subTopicId: "",
    orderNumber: "",
  });
  const [selectedSubTopics, setSelectedSubTopics] = useState([
    { subTopicId: "", orderNumber: 1, definitionsText: "" },
  ]); // Array of selected subtopics with their order numbers and definitions text
  const [nextOrderNumber, setNextOrderNumber] = useState(1);
  const [formError, setFormError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterExam, setFilterExam] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterChapter, setFilterChapter] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterSubTopic, setFilterSubTopic] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState({});
  const isFetchingRef = useRef(false);
  const [metaFilter, setMetaFilter] = useState("all"); // all, filled, notFilled

  // Fetch definitions from API using Axios
  const fetchDefinitions = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setIsDataLoading(true);
      setError(null);
      const response = await api.get(`/definition?status=all&limit=10000&metaStatus=${metaFilter}`);

      if (response.data.success) {
        setDefinitions(response.data.data);
      } else {
        throw new Error(response.data.message || "Failed to fetch definitions");
      }
    } catch (error) {
      console.error("❌ Error fetching definitions:", error);
      setError(
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch definitions"
      );
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  }, [metaFilter]);

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
        const topicsData = response.data.data || [];
        // Sort by orderNumber in ascending order
        const sorted = topicsData.sort((a, b) => {
          const ao = a.orderNumber || 0;
          const bo = b.orderNumber || 0;
          return ao - bo;
        });
        setTopics(sorted);
      } else {
        setTopics([]);
      }
    } catch (error) {
      console.error("❌ Error fetching topics:", error);
      setTopics([]);
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
        const chaptersData = response.data.data || [];
        // Sort by orderNumber in ascending order
        const sorted = chaptersData.sort((a, b) => {
          const ao = a.orderNumber || 0;
          const bo = b.orderNumber || 0;
          return ao - bo;
        });
        setChapters(sorted);
      } else {
        setChapters([]);
      }
    } catch (error) {
      console.error("❌ Error fetching chapters:", error);
      setChapters([]);
    }
  }, []);

  // Fetch subtopics from API based on topic
  const fetchSubTopics = useCallback(async (topicId) => {
    if (!topicId) {
      setSubTopics([]);
      return;
    }
    try {
      // Fetch subtopics for the selected topic
      const response = await api.get(
        `/subtopic?topicId=${topicId}&status=all&limit=1000`
      );
      if (response.data.success) {
        const subtopicsData = response.data.data || [];
        // Sort by orderNumber in ascending order
        const sorted = subtopicsData.sort((a, b) => {
          const ao = a.orderNumber || 0;
          const bo = b.orderNumber || 0;
          return ao - bo;
        });
        setSubTopics(sorted);
      } else {
        setSubTopics([]);
      }
    } catch (error) {
      console.error("❌ Error fetching subtopics:", error);
      setSubTopics([]);
    }
  }, []);


  // Load data on component mount
  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions, metaFilter]);

  useEffect(() => {
    fetchExams();
    fetchSubjects();
    // Don't fetch units, topics, and subtopics on mount - will fetch when parent is selected
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

  // Topics are already filtered by API call, so return all topics
  const filteredTopics = useMemo(() => {
    // Topics are already filtered by fetchTopics(unitId), so just return them
    // Sort by orderNumber in ascending order
    const sorted = (topics || []).sort((a, b) => {
      const ao = a.orderNumber || 0;
      const bo = b.orderNumber || 0;
      return ao - bo;
    });
    return sorted;
  }, [topics]);

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

  // SubTopics are already filtered by API call, so return all subtopics
  const filteredSubTopics = useMemo(() => {
    // SubTopics are already filtered by fetchSubTopics(topicId), so just return them
    // Sort by orderNumber in ascending order
    const sorted = (subTopics || []).sort((a, b) => {
      const ao = a.orderNumber || 0;
      const bo = b.orderNumber || 0;
      return ao - bo;
    });
    return sorted;
  }, [subTopics]);

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

  // Topics for edit form are already filtered by API call, so return all topics
  const filteredEditTopics = useMemo(() => {
    // Topics are already filtered by fetchTopics(unitId), so just return them
    // Sort by orderNumber in ascending order
    const sorted = (topics || []).sort((a, b) => {
      const ao = a.orderNumber || 0;
      const bo = b.orderNumber || 0;
      return ao - bo;
    });
    return sorted;
  }, [topics]);

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

  // SubTopics for edit form are already filtered by API call, so return all subtopics
  const filteredEditSubTopics = useMemo(() => {
    // SubTopics are already filtered by fetchSubTopics(topicId), so just return them
    // Sort by orderNumber in ascending order
    const sorted = (subTopics || []).sort((a, b) => {
      const ao = a.orderNumber || 0;
      const bo = b.orderNumber || 0;
      return ao - bo;
    });
    return sorted;
  }, [subTopics]);

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
        topic.chapterId?._id === filterChapter || topic.chapterId === filterChapter
    );
  }, [filterTopics, filterChapter]);

  // Fetch subtopics for filter section
  const fetchSubTopicsForFilter = useCallback(async (topicId) => {
    if (!topicId) {
      setFilterSubTopics([]);
      return;
    }
    try {
      const response = await api.get(
        `/subtopic?topicId=${topicId}&status=all&limit=1000`
      );
      if (response.data.success) {
        const subtopicsData = response.data.data || [];
        // Sort by orderNumber in ascending order
        const sorted = subtopicsData.sort((a, b) => {
          const ao = a.orderNumber || 0;
          const bo = b.orderNumber || 0;
          return ao - bo;
        });
        setFilterSubTopics(sorted);
      } else {
        console.error("Failed to fetch filter subtopics:", response.data.message);
        setFilterSubTopics([]);
      }
    } catch (error) {
      console.error("Error fetching filter subtopics:", error);
      setFilterSubTopics([]);
    }
  }, []);

  // Fetch subtopics for filter section when filterTopic changes
  useEffect(() => {
    if (filterTopic) {
      fetchSubTopicsForFilter(filterTopic);
    } else {
      setFilterSubTopics([]);
    }
  }, [filterTopic, fetchSubTopicsForFilter]);

  // Filter subtopics based on selected topic for filters
  const filteredFilterSubTopics = useMemo(() => {
    if (!filterTopic) return [];
    return filterSubTopics.filter(
      (subtopic) =>
        subtopic.topicId?._id === filterTopic || subtopic.topicId === filterTopic
    );
  }, [filterSubTopics, filterTopic]);

  // Filter definitions based on filters
  const filteredDefinitions = useMemo(() => {
    let result = definitions;
    if (filterExam) {
      result = result.filter(
        (definition) =>
          definition.examId?._id === filterExam || definition.examId === filterExam
      );
    }
    if (filterSubject) {
      result = result.filter(
        (definition) =>
          definition.subjectId?._id === filterSubject ||
          definition.subjectId === filterSubject
      );
    }
    if (filterUnit) {
      result = result.filter(
        (definition) =>
          definition.unitId?._id === filterUnit || definition.unitId === filterUnit
      );
    }
    if (filterChapter) {
      result = result.filter(
        (definition) =>
          definition.chapterId?._id === filterChapter ||
          definition.chapterId === filterChapter
      );
    }
    if (filterTopic) {
      result = result.filter(
        (definition) =>
          definition.topicId?._id === filterTopic ||
          definition.topicId === filterTopic
      );
    }
    if (filterSubTopic) {
      result = result.filter(
        (definition) =>
          definition.subTopicId?._id === filterSubTopic ||
          definition.subTopicId === filterSubTopic
      );
    }
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((definition) =>
        definition.name?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [definitions, filterExam, filterSubject, filterUnit, filterChapter, filterTopic, filterSubTopic, searchQuery]);

  // Get active filter count
  const activeFilterCount =
    (filterExam ? 1 : 0) +
    (filterSubject ? 1 : 0) +
    (filterUnit ? 1 : 0) +
    (filterChapter ? 1 : 0) +
    (filterTopic ? 1 : 0) +
    (filterSubTopic ? 1 : 0);

  // Clear all filters
  const clearFilters = () => {
    setFilterExam("");
    setFilterSubject("");
    setFilterUnit("");
    setFilterChapter("");
    setFilterTopic("");
    setFilterSubTopic("");
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
        newData.subTopicId = "";
        setUnits([]); // Clear units when exam changes
        setChapters([]); // Clear chapters when exam changes
        setTopics([]); // Clear topics when exam changes
        setSubTopics([]); // Clear subtopics when exam changes
      }

      // Reset unit when subject changes and fetch units for the selected exam and subject
      if (name === "subjectId" && value !== prev.subjectId) {
        newData.unitId = "";
        newData.chapterId = "";
        newData.topicId = "";
        newData.subTopicId = "";
        setChapters([]); // Clear chapters when subject changes
        setTopics([]); // Clear topics when subject changes
        setSubTopics([]); // Clear subtopics when subject changes
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
        newData.subTopicId = "";
        setTopics([]); // Clear topics when unit changes
        setSubTopics([]); // Clear subtopics when unit changes
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
        newData.subTopicId = "";
        setSubTopics([]); // Clear subtopics when chapter changes
        // Fetch topics for the selected chapter
        if (value) {
          fetchTopics(value);
        } else {
          setTopics([]);
        }
      }

      // Reset subtopic when topic changes and fetch subtopics for the selected topic
      if (name === "topicId" && value !== prev.topicId) {
        newData.subTopicId = "";
        // Reset selected subtopics when topic changes
        setSelectedSubTopics([{ subTopicId: "", orderNumber: 1, definitionsText: "" }]);
        // Fetch subtopics for the selected topic
        if (value) {
          fetchSubTopics(value);
        } else {
          setSubTopics([]);
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
        newData.subTopicId = "";
        setUnits([]); // Clear units when exam changes
        setChapters([]); // Clear chapters when exam changes
        setTopics([]); // Clear topics when exam changes
        setSubTopics([]); // Clear subtopics when exam changes
      }

      // Reset unit when subject changes and fetch units for the selected exam and subject
      if (name === "subjectId" && value !== prev.subjectId) {
        newData.unitId = "";
        newData.chapterId = "";
        newData.topicId = "";
        newData.subTopicId = "";
        setChapters([]); // Clear chapters when subject changes
        setTopics([]); // Clear topics when subject changes
        setSubTopics([]); // Clear subtopics when subject changes
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
        newData.subTopicId = "";
        setTopics([]); // Clear topics when unit changes
        setSubTopics([]); // Clear subtopics when unit changes
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
        newData.subTopicId = "";
        setSubTopics([]); // Clear subtopics when chapter changes
        // Fetch topics for the selected chapter in edit form
        if (value) {
          fetchTopics(value);
        } else {
          setTopics([]);
        }
      }

      // Reset subtopic when topic changes and fetch subtopics for the selected topic
      if (name === "topicId" && value !== prev.topicId) {
        newData.subTopicId = "";
        // Fetch subtopics for the selected topic in edit form
        if (value) {
          fetchSubTopics(value);
        } else {
          setSubTopics([]);
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
      subTopicId: "",
      orderNumber: "",
    });
    setSelectedSubTopics([{ subTopicId: "", orderNumber: 1, definitionsText: "" }]); // Reset to single subtopic
    setFormError(null);
    setUnits([]); // Clear units when form is cancelled
    setChapters([]); // Clear chapters when form is cancelled
    setTopics([]); // Clear topics when form is cancelled
    setSubTopics([]); // Clear subtopics when form is cancelled
  };

  const handleCancelEditForm = () => {
    setShowEditForm(false);
    setEditingDefinition(null);
    setEditFormData({
      name: "",
      examId: "",
      subjectId: "",
      unitId: "",
      chapterId: "",
      topicId: "",
      subTopicId: "",
      orderNumber: "",
    });
    setFormError(null);
    setUnits([]); // Clear units when edit form is cancelled
    setChapters([]); // Clear chapters when edit form is cancelled
    setTopics([]); // Clear topics when edit form is cancelled
    setSubTopics([]); // Clear subtopics when edit form is cancelled
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
      subTopicId: "",
      orderNumber: "",
    });
    setSelectedSubTopics([{ subTopicId: "", orderNumber: 1, definitionsText: "" }]); // Reset to single subtopic
    setFormError(null);
    setUnits([]); // Clear units when opening new form
    setChapters([]); // Clear chapters when opening new form
    setTopics([]); // Clear topics when opening new form
    setSubTopics([]); // Clear subtopics when opening new form
  };

  // Add another subtopic selection
  const handleAddAnotherSubTopic = () => {
    setSelectedSubTopics((prev) => [
      ...prev,
      { subTopicId: "", orderNumber: 1, definitionsText: "" },
    ]);
  };

  // Remove a subtopic selection
  const handleRemoveSubTopic = (index) => {
    if (selectedSubTopics.length > 1) {
      setSelectedSubTopics((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Handle subtopic selection change
  const handleSubTopicSelectionChange = async (index, subTopicId) => {
    const updatedSubTopics = [...selectedSubTopics];
    updatedSubTopics[index].subTopicId = subTopicId;
    updatedSubTopics[index].definitionsText = ""; // Clear definitions when subtopic changes

    // Get order number for the selected subtopic
    if (subTopicId) {
      const orderNumber = await getNextOrderNumber(subTopicId);
      updatedSubTopics[index].orderNumber = orderNumber;
    } else {
      updatedSubTopics[index].orderNumber = 1;
    }

    setSelectedSubTopics(updatedSubTopics);

    // Also update formData.subTopicId for backward compatibility (use first selected)
    setFormData((prev) => ({
      ...prev,
      subTopicId: updatedSubTopics[0]?.subTopicId || "",
    }));
  };

  // Handle definitions text change for a specific subtopic
  const handleSubTopicDefinitionsChange = (index, definitionsText) => {
    const updatedSubTopics = [...selectedSubTopics];
    updatedSubTopics[index].definitionsText = definitionsText;
    setSelectedSubTopics(updatedSubTopics);
  };

  const getNextOrderNumber = useCallback(async (subTopicId) => {
    if (!subTopicId) return 1;
    try {
      const response = await api.get(`/definition?subTopicId=${subTopicId}&status=all&limit=1000`);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const existingDefinitions = response.data.data;
        const maxOrder = existingDefinitions.reduce(
          (max, definition) => Math.max(max, definition.orderNumber || 0),
          0
        );
        return maxOrder + 1;
      }
    } catch (error) {
      console.error("Error fetching next order number:", error);
    }
    return 1;
  }, []);

  // Update order numbers when subtopics are selected
  useEffect(() => {
    if (showAddForm && formData.topicId) {
      // Update order numbers for all selected subtopics
      const updateOrderNumbers = async () => {
        const subTopicIds = selectedSubTopics.map((st) => st.subTopicId).filter(Boolean);
        if (subTopicIds.length === 0) return;

        const updatedSubTopics = await Promise.all(
          selectedSubTopics.map(async (subTopic) => {
            if (subTopic.subTopicId) {
              const orderNumber = await getNextOrderNumber(subTopic.subTopicId);
              return { ...subTopic, orderNumber };
            }
            return subTopic;
          })
        );
        setSelectedSubTopics(updatedSubTopics);
      };
      updateOrderNumbers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [selectedSubTopics.map((st) => st.subTopicId).join(","), formData.topicId, showAddForm]);

  const handleAddDefinitions = async (e) => {
    e.preventDefault();

    // Check permissions
    if (!canCreate) {
      setFormError(getPermissionMessage("create", role));
      showError(getPermissionMessage("create", role));
      return;
    }

    // Validate required fields
    if (!formData.examId || !formData.subjectId || !formData.unitId || !formData.chapterId || !formData.topicId) {
      setFormError("Please select Exam, Subject, Unit, Chapter, and Topic");
      showError("Please select Exam, Subject, Unit, Chapter, and Topic");
      setIsFormLoading(false);
      return;
    }

    // Validate that at least one subtopic is selected with definitions
    const validSubTopics = selectedSubTopics.filter(
      (st) => st.subTopicId && st.definitionsText.trim().length > 0
    );

    if (validSubTopics.length === 0) {
      setFormError("Please select at least one subtopic and enter definitions for it.");
      showError("Please select at least one subtopic and enter definitions for it.");
      setIsFormLoading(false);
      return;
    }

    setIsFormLoading(true);
    setFormError(null);

    try {
      // Create definitions for each subtopic that has definitions entered
      const allDefinitionsToCreate = [];

      for (const subTopic of validSubTopics) {
        // Parse definitions from textarea (split by newlines)
        const definitionLines = subTopic.definitionsText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0); // Remove empty lines

        if (definitionLines.length === 0) continue; // Skip if no definitions

        // Check for duplicate names within the same subtopic (case-insensitive)
        const nameCounts = new Map();
        const duplicates = [];
        definitionLines.forEach((name, index) => {
          const normalizedName = name.toLowerCase();
          if (nameCounts.has(normalizedName)) {
            if (!duplicates.includes(normalizedName)) {
              duplicates.push(normalizedName);
            }
          } else {
            nameCounts.set(normalizedName, 1);
          }
        });

        if (duplicates.length > 0) {
          const subTopicName = filteredSubTopics.find((st) => st._id === subTopic.subTopicId)?.name || "this subtopic";
          const errorMessage = `Duplicate definition names are not allowed in "${subTopicName}". Please remove duplicates: ${duplicates.map(d => `"${d}"`).join(", ")}`;
          setFormError(errorMessage);
          showError(errorMessage);
          setIsFormLoading(false);
          return;
        }

        // Check for duplicates with existing definitions in the database for this subtopic
        try {
          const existingDefinitions = await api.get(`/definition?subTopicId=${subTopic.subTopicId}&status=all&limit=1000`);
          if (existingDefinitions.data.success && existingDefinitions.data.data) {
            const existingNames = new Set(
              existingDefinitions.data.data.map((def) => def.name.toLowerCase())
            );
            const conflictingNames = definitionLines.filter((name) =>
              existingNames.has(name.toLowerCase())
            );

            if (conflictingNames.length > 0) {
              const subTopicName = filteredSubTopics.find((st) => st._id === subTopic.subTopicId)?.name || "this subtopic";
              const errorMessage = `Definition name(s) already exist in "${subTopicName}": ${conflictingNames.map(n => `"${n}"`).join(", ")}. Please use unique names.`;
              setFormError(errorMessage);
              showError(errorMessage);
              setIsFormLoading(false);
              return;
            }
          }
        } catch (checkError) {
          console.error("Error checking existing definitions:", checkError);
          // Continue with creation if check fails - server will validate
        }

        // Get the starting order number for this specific subtopic
        // This ensures each subtopic has its own independent order number sequence
        const startingOrderNumber = await getNextOrderNumber(subTopic.subTopicId);

        const definitionsForSubTopic = definitionLines.map((definitionName, index) => ({
          name: definitionName,
          examId: formData.examId,
          subjectId: formData.subjectId,
          unitId: formData.unitId,
          chapterId: formData.chapterId, // Ensure chapterId is always sent
          topicId: formData.topicId,
          subTopicId: subTopic.subTopicId,
          orderNumber: startingOrderNumber + index, // Each subtopic starts from its own calculated order number
        }));
        allDefinitionsToCreate.push(...definitionsForSubTopic);
      }

      if (allDefinitionsToCreate.length === 0) {
        setFormError("Please enter at least one definition name.");
        showError("Please enter at least one definition name.");
        setIsFormLoading(false);
        return;
      }

      const response = await api.post("/definition", allDefinitionsToCreate);

      if (response.data.success) {
        const newDefinitions = Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data];
        setDefinitions((prevDefinitions) => [...prevDefinitions, ...newDefinitions]);
        handleCancelForm();
        success(
          `${newDefinitions.length} definition(s) created successfully for ${validSubTopics.length} subtopic(s)`
        );
      } else {
        throw new Error(response.data.message || "Failed to create definitions");
      }
    } catch (error) {
      console.error("❌ Error creating definitions:", error);

      const errorMessage = error.response?.data?.message || error.message || "Failed to create definitions";
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleEditDefinition = async (definitionToEdit) => {
    // Check permissions
    if (!canEdit) {
      setFormError(getPermissionMessage("edit", role));
      showError(getPermissionMessage("edit", role));
      return;
    }

    const examId = definitionToEdit.examId?._id || definitionToEdit.examId;
    const subjectId = definitionToEdit.subjectId?._id || definitionToEdit.subjectId;
    const unitId = definitionToEdit.unitId?._id || definitionToEdit.unitId;
    let chapterId = definitionToEdit.chapterId?._id || definitionToEdit.chapterId;
    const topicId = definitionToEdit.topicId?._id || definitionToEdit.topicId;
    const subTopicId = definitionToEdit.subTopicId?._id || definitionToEdit.subTopicId;

    // Auto-populate chapterId from topicId if missing
    if (!chapterId && topicId) {
      try {
        const topicResponse = await api.get(`/topic/${topicId}`);
        if (topicResponse.data.success && topicResponse.data.data?.chapterId) {
          chapterId = topicResponse.data.data.chapterId._id || topicResponse.data.data.chapterId;
          console.log(`Auto-populated chapterId ${chapterId} from topicId ${topicId} for editing definition`);
        }
      } catch (error) {
        console.error("Error fetching chapterId from topic:", error);
      }
    }

    setEditingDefinition(definitionToEdit);
    setEditFormData({
      name: definitionToEdit.name,
      examId: examId,
      subjectId: subjectId,
      unitId: unitId,
      chapterId: chapterId || "",
      topicId: topicId,
      subTopicId: subTopicId,
      orderNumber: definitionToEdit.orderNumber?.toString() || "",
    });

    // Fetch units, chapters, topics, and subtopics for the selected exam, subject, unit, chapter, and topic when editing
    if (examId && subjectId) {
      fetchUnits(examId, subjectId).then(() => {
        if (unitId) {
          fetchChapters(unitId).then(() => {
            // If chapterId was auto-populated, fetch topics for that chapter
            if (chapterId) {
              fetchTopics(chapterId).then(() => {
                if (topicId) {
                  fetchSubTopics(topicId);
                }
              });
            } else if (topicId) {
              // If chapterId is still missing after auto-population, just fetch subtopics
              // Topics will be empty but that's okay - user needs to select chapter first
              fetchSubTopics(topicId);
            }
          });
        }
      });
    }

    setShowEditForm(true);
  };

  const handleUpdateDefinition = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!editFormData.examId || !editFormData.subjectId || !editFormData.unitId || !editFormData.chapterId || !editFormData.topicId || !editFormData.subTopicId) {
      setFormError("Please select Exam, Subject, Unit, Chapter, Topic, and SubTopic");
      showError("Please select Exam, Subject, Unit, Chapter, Topic, and SubTopic");
      setIsFormLoading(false);
      return;
    }

    setIsFormLoading(true);
    setFormError(null);

    try {
      const response = await api.put(`/definition/${editingDefinition._id}`, {
        name: editFormData.name,
        examId: editFormData.examId,
        subjectId: editFormData.subjectId,
        unitId: editFormData.unitId,
        chapterId: editFormData.chapterId || null, // Ensure chapterId is sent (null if empty, will be auto-populated)
        topicId: editFormData.topicId,
        subTopicId: editFormData.subTopicId,
        orderNumber: editFormData.orderNumber && editFormData.orderNumber.trim()
          ? parseInt(editFormData.orderNumber)
          : undefined,
      });

      if (response.data.success) {
        setDefinitions((prevDefinitions) =>
          prevDefinitions.map((d) =>
            d._id === editingDefinition._id ? response.data.data : d
          )
        );
        handleCancelEditForm();
        success(
          `Definition "${response.data.data.name}" updated successfully`
        );
      } else {
        throw new Error(response.data.message || "Failed to update definition");
      }
    } catch (error) {
      console.error("❌ Error updating definition:", error);
      setFormError(
        error.response?.data?.message ||
        error.message ||
        "Failed to update definition"
      );
      showError(error.response?.data?.message || error.message || "Failed to update definition");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteDefinition = async (definitionToDelete) => {
    // Check permissions
    if (!canDelete) {
      setFormError(getPermissionMessage("delete", role));
      showError(getPermissionMessage("delete", role));
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete "${definitionToDelete.name}"?`
      )
    ) {
      return;
    }

    setIsFormLoading(true);
    setError(null);

    try {
      const response = await api.delete(`/definition/${definitionToDelete._id}`);

      if (response.data.success) {
        setDefinitions((prevDefinitions) =>
          prevDefinitions.filter((d) => d._id !== definitionToDelete._id)
        );
        success(`Definition "${definitionToDelete.name}" deleted successfully`);
      } else {
        throw new Error(response.data.message || "Failed to delete definition");
      }
    } catch (error) {
      console.error("❌ Error deleting definition:", error);
      setError(
        error.response?.data?.message ||
        error.message ||
        "Failed to delete definition"
      );
      showError(error.response?.data?.message || error.message || "Failed to delete definition");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleToggleStatus = async (definition) => {
    const currentStatus = definition.status || "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "deactivate" : "activate";

    if (
      window.confirm(
        `Are you sure you want to ${action} "${definition.name}"?`
      )
    ) {
      try {
        setIsFormLoading(true);
        setError(null);

        const response = await api.patch(`/definition/${definition._id}/status`, {
          status: newStatus,
        });

        if (response.data.success) {
          // Update the definition status in the list
          setDefinitions((prev) =>
            prev.map((d) =>
              d._id === definition._id ? { ...d, status: newStatus } : d
            )
          );
          success(
            `Definition "${definition.name}" ${action}d successfully`
          );
        } else {
          throw new Error(response.data.message || `Failed to ${action} definition`);
        }
      } catch (error) {
        console.error(`❌ Error ${action}ing definition:`, error);
        setError(
          error.response?.data?.message ||
          error.message ||
          `Failed to ${action} definition`
        );
        showError(error.response?.data?.message || error.message || `Failed to ${action} definition`);
      } finally {
        setIsFormLoading(false);
      }
    }
  };

  const saveReorderForSubTopic = async (subTopicId, newOrderedDefinitions) => {
    const payload = {
      definitions: newOrderedDefinitions.map((d, i) => ({
        id: d._id,
        orderNumber: i + 1,
      })),
    };
    const response = await api.patch("/definition/reorder", payload);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to reorder definitions");
    }
  };

  const handleReorderDraft = (subTopicId, newOrderedDefinitions) => {
    setReorderDraft((prev) => ({ ...prev, [subTopicId]: newOrderedDefinitions }));
  };

  const handleDoneReorder = async () => {
    if (!canReorder) {
      showError(getPermissionMessage("reorder", role));
      return;
    }
    const subTopicIds = Object.keys(reorderDraft);
    if (subTopicIds.length === 0) {
      setIsReorderMode(false);
      return;
    }
    try {
      setIsFormLoading(true);
      setError(null);
      await Promise.all(
        subTopicIds.map((subTopicId) => saveReorderForSubTopic(subTopicId, reorderDraft[subTopicId]))
      );
      await fetchDefinitions();
      setReorderDraft({});
      setIsReorderMode(false);
      success("Definition order updated successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to reorder definitions. Please try again.";
      showError(msg);
    } finally {
      setIsFormLoading(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
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
                Definition Management
              </h1>
              <p className="text-xs text-gray-600">
                Manage and organize your definitions, create new definitions, and track
                definition performance across your educational platform.
              </p>
            </div>
            {canCreate ? (
              <button
                onClick={handleOpenAddForm}
                className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors"
              >
                Add New Definition
              </button>
            ) : (
              <button
                disabled
                title={getPermissionMessage("create", role)}
                className="px-2 py-1 bg-gray-300 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed"
              >
                Add New Definition
              </button>
            )}
          </div>
        </div>

        {/* Add Definition Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New Definitions
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

            <form onSubmit={handleAddDefinitions} className="space-y-6">
              {/* Selection Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic *
                  </label>
                  <select
                    name="topicId"
                    value={formData.topicId}
                    onChange={handleFormChange}
                    required
                    disabled={!formData.chapterId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select Topic</option>
                    {filteredTopics.map((topic) => (
                      <option key={topic._id} value={topic._id}>
                        {topic.name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Multiple SubTopic Selection with Individual Textareas */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    Select SubTopic(s) and Enter Definitions *
                  </h3>
                  <p className="text-xs text-gray-500">
                    Select subtopics and enter definitions for each subtopic separately. Each subtopic has its own textarea.
                    <span className="text-red-600 font-medium"> Each definition name must be unique within the same subtopic.</span>
                  </p>
                </div>

                <div className="space-y-6">
                  {selectedSubTopics.map((subTopic, index) => {
                    const subTopicName =
                      filteredSubTopics.find((st) => st._id === subTopic.subTopicId)
                        ?.name || "Unselected SubTopic";
                    const definitionCount = subTopic.definitionsText
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
                                SubTopic {index + 1} *
                              </label>
                              <select
                                value={subTopic.subTopicId}
                                onChange={(e) =>
                                  handleSubTopicSelectionChange(
                                    index,
                                    e.target.value
                                  )
                                }
                                required
                                disabled={!formData.topicId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm bg-white"
                              >
                                <option value="">Select SubTopic</option>
                                {filteredSubTopics
                                  .filter(
                                    (st) =>
                                      !selectedSubTopics.some(
                                        (sst, i) =>
                                          i !== index &&
                                          sst.subTopicId === st._id
                                      )
                                  )
                                  .map((subTopicOption) => (
                                    <option
                                      key={subTopicOption._id}
                                      value={subTopicOption._id}
                                    >
                                      {subTopicOption.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            {selectedSubTopics.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSubTopic(index)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors mt-6"
                                title="Remove this subtopic"
                              >
                                <FaTimes className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {subTopic.subTopicId && (
                          <>
                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-medium text-gray-700">
                                  Definitions for: <span className="text-blue-600 font-semibold">{subTopicName}</span>
                                </label>
                                <span className="text-xs text-gray-500">
                                  Order starts from: <span className="font-semibold">{subTopic.orderNumber}</span>
                                </span>
                              </div>
                              <textarea
                                value={subTopic.definitionsText}
                                onChange={(e) =>
                                  handleSubTopicDefinitionsChange(
                                    index,
                                    e.target.value
                                  )
                                }
                                placeholder={`Enter definitions for ${subTopicName}, one per line (unique names only):&#10;Definition 1&#10;Definition 2&#10;Definition 3`}
                                rows={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm bg-white"
                              />
                              <div className="mt-1.5 text-xs text-gray-500">
                                {definitionCount > 0 ? (
                                  <span className="text-green-600 font-medium">
                                    {definitionCount} definition(s) entered for this subtopic
                                    {(() => {
                                      // Check for duplicates in the entered text
                                      const lines = subTopic.definitionsText
                                        .split("\n")
                                        .map((line) => line.trim())
                                        .filter((line) => line.length > 0);
                                      const nameCounts = new Map();
                                      const hasDuplicates = lines.some((name) => {
                                        const normalized = name.toLowerCase();
                                        if (nameCounts.has(normalized)) {
                                          return true;
                                        }
                                        nameCounts.set(normalized, 1);
                                        return false;
                                      });

                                      if (hasDuplicates) {
                                        return (
                                          <span className="text-red-600 ml-1 font-semibold">
                                            ⚠️ Duplicate names detected! Please remove duplicates.
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">
                                    Enter definitions, one per line. Each name must be unique.
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Another SubTopic Button */}
                  {(() => {
                    // Check if there are any empty subtopic selections (user hasn't selected a subtopic yet)
                    const hasEmptySelection = selectedSubTopics.some(
                      (st) => !st.subTopicId || st.subTopicId === ""
                    );

                    // Check if there are any unselected subtopics available
                    const selectedSubTopicIds = selectedSubTopics
                      .map((st) => st.subTopicId)
                      .filter(Boolean);
                    const availableSubTopics = filteredSubTopics.filter(
                      (st) => !selectedSubTopicIds.includes(st._id)
                    );

                    // Button should be enabled only if:
                    // 1. Topic is selected
                    // 2. No empty subtopic selections exist (all existing selections are filled)
                    // 3. There are available subtopics to select
                    const canAddMore =
                      formData.topicId &&
                      !hasEmptySelection &&
                      availableSubTopics.length > 0;

                    return (
                      <button
                        type="button"
                        onClick={handleAddAnotherSubTopic}
                        disabled={!canAddMore}
                        className={`text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${canAddMore
                          ? "text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100"
                          : "text-gray-400 bg-gray-100 cursor-not-allowed"
                          }`}
                        title={
                          !formData.topicId
                            ? "Please select a topic first"
                            : hasEmptySelection
                              ? "Please select a subtopic for the current selection first"
                              : availableSubTopics.length === 0
                                ? "All available subtopics are already selected"
                                : "Add another subtopic"
                        }
                      >
                        <FaPlus className="w-3 h-3" />
                        Add Another SubTopic
                      </button>
                    );
                  })()}
                </div>

                {/* Summary */}
                {selectedSubTopics.some((st) => st.subTopicId && st.definitionsText.trim().length > 0) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-blue-900 mb-1">
                      Summary:
                    </div>
                    <div className="text-xs text-blue-700 space-y-0.5">
                      {selectedSubTopics
                        .filter((st) => st.subTopicId && st.definitionsText.trim().length > 0)
                        .map((subTopic, idx) => {
                          const subTopicName =
                            filteredSubTopics.find((st) => st._id === subTopic.subTopicId)
                              ?.name || "Unknown";
                          const definitionCount = subTopic.definitionsText
                            .split("\n")
                            .filter((line) => line.trim().length > 0).length;
                          return (
                            <div key={idx}>
                              • {subTopicName}: {definitionCount} definition(s)
                            </div>
                          );
                        })}
                      <div className="mt-2 pt-2 border-t border-blue-200 font-semibold">
                        Total:{" "}
                        {selectedSubTopics
                          .filter((st) => st.subTopicId && st.definitionsText.trim().length > 0)
                          .reduce((sum, st) => {
                            return (
                              sum +
                              st.definitionsText
                                .split("\n")
                                .filter((line) => line.trim().length > 0).length
                            );
                          }, 0)}{" "}
                        definitions will be created
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
                    `Add Definitions`
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Definition Form */}
        {showEditForm && editingDefinition && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaEdit className="size-3 text-blue-600" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">
                Edit Definition: {editingDefinition.name}
              </h2>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateDefinition} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SubTopic *
                  </label>
                  <select
                    name="subTopicId"
                    value={editFormData.subTopicId}
                    onChange={handleEditFormChange}
                    required
                    disabled={!editFormData.topicId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select SubTopic</option>
                    {filteredEditSubTopics.map((subtopic) => (
                      <option key={subtopic._id} value={subtopic._id}>
                        {subtopic.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Definition Name *
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
                    "Update Definition"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Definitions Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Definitions List
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your definitions, view details, and perform actions
                  {isReorderMode && (
                    <span className="ml-1.5 text-blue-600 font-medium">— Drag rows within each subtopic, then click Done to save</span>
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
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                      title="Enable drag and drop to reorder definitions per subtopic"
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
                {/* Filter by Exam */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Filter by Exam
                  </label>
                  <select
                    value={filterExam}
                    onChange={(e) => {
                      setFilterExam(e.target.value);
                      setFilterSubject("");
                      setFilterUnit("");
                      setFilterChapter("");
                      setFilterTopic("");
                      setFilterSubTopic("");
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
                      setFilterSubject(e.target.value);
                      setFilterUnit("");
                      setFilterChapter("");
                      setFilterTopic("");
                      setFilterSubTopic("");
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
                      setFilterUnit(e.target.value);
                      setFilterChapter("");
                      setFilterTopic("");
                      setFilterSubTopic("");
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
                      setFilterChapter(e.target.value);
                      setFilterTopic("");
                      setFilterSubTopic("");
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
                    onChange={(e) => {
                      setFilterTopic(e.target.value);
                      setFilterSubTopic("");
                    }}
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

                {/* Filter by SubTopic */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Filter by SubTopic
                  </label>
                  <select
                    value={filterSubTopic}
                    onChange={(e) => setFilterSubTopic(e.target.value)}
                    disabled={!filterTopic}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">
                      {filterTopic ? "Select Topic First" : "All SubTopics"}
                    </option>
                    {filteredFilterSubTopics.map((subtopic) => (
                      <option key={subtopic._id} value={subtopic._id}>
                        {subtopic.name}
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
                          setFilterChapter("");
                          setFilterTopic("");
                          setFilterSubTopic("");
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
                          setFilterChapter("");
                          setFilterTopic("");
                          setFilterSubTopic("");
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
                          setFilterUnit("");
                          setFilterChapter("");
                          setFilterTopic("");
                          setFilterSubTopic("");
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
                      {filterChapters.find((c) => c._id === filterChapter)?.name || "N/A"}
                      <button
                        onClick={() => {
                          setFilterChapter("");
                          setFilterTopic("");
                          setFilterSubTopic("");
                        }}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filterTopic && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Topic:{" "}
                      {filterTopics.find((t) => t._id === filterTopic)?.name || "N/A"}
                      <button
                        onClick={() => {
                          setFilterTopic("");
                          setFilterSubTopic("");
                        }}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filterSubTopic && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      SubTopic:{" "}
                      {filterSubTopics.find((st) => st._id === filterSubTopic)?.name || "N/A"}
                      <button
                        onClick={() => {
                          setFilterSubTopic("");
                        }}
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

          <div className="p-2 ">
            <DefinitionsTable
              definitions={filteredDefinitions}
              onEdit={handleEditDefinition}
              onDelete={handleDeleteDefinition}
              onToggleStatus={handleToggleStatus}
              onReorderDraft={handleReorderDraft}
              reorderDraft={reorderDraft}
              isReorderAllowed={isReorderMode && !searchQuery.trim()}
            />
          </div>
        </div>
      </div>
    </LoadingWrapper>
    </>
  );
};

export default DefinitionManagement;
