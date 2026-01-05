"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaLock,
  FaEdit,
  FaTrash,
  FaPowerOff,
  FaVideo,
  FaCheckCircle,
  FaFilter,
  FaExclamationTriangle,
  FaArrowLeft,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import { LoadingWrapper, SkeletonPageContent } from "../ui/SkeletonLoader";
import Pagination from "@/components/shared/Pagination";
import { FaDownload, FaUpload } from "react-icons/fa";
import { parseCSV, validateCSVData, downloadCSV } from "@/utils/csvParser";
import RichTextEditor from "../ui/RichTextEditor";
import loadMathJax from "@/app/(main)/lib/utils/mathJaxLoader";

// Helper function to Title-Case text while preserving ALL-CAPS tokens (e.g., "NEET").
const titleCasePreserveAcronyms = (text) => {
  if (!text) return "";
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const m = token.match(/^([^A-Za-z0-9]*)([A-Za-z0-9]+)([^A-Za-z0-9]*)$/);
      if (!m) return token;
      const [, prefix, core, suffix] = m;
      const hasLetter = /[A-Za-z]/.test(core);
      const isAllCaps =
        hasLetter && core === core.toUpperCase() && core !== core.toLowerCase();
      const nextCore = isAllCaps
        ? core
        : core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
      return `${prefix}${nextCore}${suffix}`;
    })
    .join(" ");
};

// Helper function to validate ObjectId format
const isValidObjectId = (id) => {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-fA-F]{24}$/.test(id.trim());
};

const PracticeQuestionManagement = ({ subCategoryId }) => {
  const router = useRouter();
  const { canCreate, canEdit, canDelete, canReorder, role } = usePermissions();

  // Check if user can import data (only admin and super_moderator)
  const canImport = role === "admin" || role === "super_moderator";
  const [showAddForm, setShowAddForm] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [currentSubCategory, setCurrentSubCategory] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const questionsListRef = useRef(null);
  const formRef = useRef(null);
  const prevPageRef = useRef(1);
  const [formData, setFormData] = useState({
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answer: "",
    orderNumber: "",
    videoLink: "",
    detailsExplanation: "",
  });
  const [formError, setFormError] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);
  const showErrorRef = useRef(showError);

  // Keep showError ref updated
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  // Handle MathJax typesetting when questions change
  useEffect(() => {
    if (typeof window !== "undefined" && !isQuestionsLoading && questions.length > 0) {
      loadMathJax().then((MathJaxInstance) => {
        if (MathJaxInstance && MathJaxInstance.Hub) {
          MathJaxInstance.Hub.Queue(["Typeset", MathJaxInstance.Hub, questionsListRef.current]);
        }
      }).catch(err => console.error("MathJax load error:", err));
    }
  }, [questions, isQuestionsLoading]);

  // ✅ Fetch Current SubCategory Details
  const fetchCurrentSubCategory = useCallback(async () => {
    if (!subCategoryId) {
      setCurrentSubCategory(null);
      return;
    }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsDataLoading(true);
    setError(null);
    try {
      const response = await api.get(`/practice/subcategory/${subCategoryId}`);
      if (response.data?.success) {
        setCurrentSubCategory(response.data.data);
      } else {
        const errorMsg =
          response.data?.message || "Failed to load paper details";
        setError(errorMsg);
        showErrorRef.current(errorMsg);
      }
    } catch (err) {
      console.error("❌ Error fetching current subcategory:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to load paper details";
      setError(errorMessage);
      showErrorRef.current(errorMessage);
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  }, [subCategoryId]);

  useEffect(() => {
    fetchCurrentSubCategory();
  }, [fetchCurrentSubCategory]);

  // ✅ Fetch Questions with Pagination
  const fetchQuestions = useCallback(
    async (page = 1, limit = 10) => {
      if (!subCategoryId) {
        setQuestions([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        return;
      }
      setIsQuestionsLoading(true);
      try {
        const response = await api.get(
          `/practice/question?subCategoryId=${subCategoryId}&status=all&page=${page}&limit=${limit}`
        );
        if (response.data?.success) {
          setQuestions(response.data.data || []);
          // Update pagination from response
          if (response.data.pagination) {
            setPagination({
              page: response.data.pagination.page || page,
              limit: response.data.pagination.limit || limit,
              total: response.data.pagination.total || 0,
              totalPages: response.data.pagination.totalPages || 0,
            });
          }
        } else {
          setQuestions([]);
          setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        }
      } catch (err) {
        console.error("❌ Error fetching questions:", err);
        showErrorRef.current("Failed to load questions");
        setQuestions([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      } finally {
        setIsQuestionsLoading(false);
      }
    },
    [subCategoryId]
  );

  // Reset pagination when subCategoryId changes
  useEffect(() => {
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
  }, [subCategoryId]);

  useEffect(() => {
    fetchQuestions(pagination.page, pagination.limit);
  }, [fetchQuestions, pagination.page, pagination.limit, subCategoryId]);

  // Clear selection when page changes or questions change
  useEffect(() => {
    setSelectedQuestions([]);
  }, [pagination.page, questions.length]);

  // Scroll to top when page changes and questions finish loading
  useEffect(() => {
    // Only scroll if page actually changed (not on initial load)
    if (
      pagination.page !== prevPageRef.current &&
      !isQuestionsLoading &&
      questions.length > 0
    ) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (questionsListRef.current) {
          questionsListRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
      prevPageRef.current = pagination.page;
    }
  }, [pagination.page, isQuestionsLoading, questions.length]);

  // Scroll to form when it opens (especially when editing)
  useEffect(() => {
    if (showAddForm && formRef.current) {
      // Small delay to ensure form is rendered
      setTimeout(() => {
        formRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [showAddForm]);

  // Calculate next order number when form opens
  useEffect(() => {
    if (showAddForm && subCategoryId && !editingQuestion) {
      const maxOrder =
        questions.length > 0
          ? Math.max(...questions.map((q) => q.orderNumber || 0))
          : 0;
      setFormData((prev) => ({
        ...prev,
        orderNumber: (maxOrder + 1).toString(),
      }));
    }
  }, [showAddForm, subCategoryId, editingQuestion, questions]);

  // ✅ Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError(null);
  };

  // ✅ Handle Cancel Form
  const handleCancelForm = () => {
    setFormData({
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      answer: "",
      orderNumber: "",
      videoLink: "",
      detailsExplanation: "",
    });
    setFormError(null);
    setEditingQuestion(null);
    setShowAddForm(false);
  };

  // ✅ Handle Edit Question
  const handleEditQuestion = (question) => {
    if (!canEdit) {
      showErrorRef.current(getPermissionMessage("edit", role));
      return;
    }
    setEditingQuestion(question);
    setFormData({
      question: question.question || "",
      optionA: question.optionA || "",
      optionB: question.optionB || "",
      optionC: question.optionC || "",
      optionD: question.optionD || "",
      answer: question.answer || "",
      orderNumber: question.orderNumber?.toString() || "",
      videoLink: question.videoLink || "",
      detailsExplanation: question.detailsExplanation || "",
    });
    setShowAddForm(true);
    setFormError(null);
  };

  // ✅ Handle Delete Question
  const handleDeleteQuestion = async (questionToDelete) => {
    if (!canDelete) {
      showErrorRef.current(getPermissionMessage("delete", role));
      return;
    }
    if (!window.confirm(`Are you sure you want to delete this question?`))
      return;

    try {
      setIsFormLoading(true);
      const response = await api.delete(
        `/practice/question/${questionToDelete._id}`
      );
      if (response.data?.success) {
        await fetchQuestions(pagination.page, pagination.limit);
        success("Question deleted successfully!");
      } else {
        throw new Error(response.data?.message || "Failed to delete question");
      }
    } catch (err) {
      console.error("❌ Error deleting question:", err);
      showErrorRef.current(
        err.response?.data?.message || "Failed to delete question"
      );
    } finally {
      setIsFormLoading(false);
    }
  };

  // ✅ Handle Toggle Question Selection
  const handleToggleQuestionSelection = (questionId) => {
    setSelectedQuestions((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  // ✅ Handle Select All Questions
  const handleSelectAll = () => {
    if (selectedQuestions.length === questions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(questions.map((q) => q._id));
    }
  };

  // ✅ Handle Bulk Delete Questions
  const handleBulkDelete = async () => {
    if (!canDelete) {
      showErrorRef.current(getPermissionMessage("delete", role));
      return;
    }

    if (selectedQuestions.length === 0) {
      showErrorRef.current("Please select at least one question to delete");
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedQuestions.length} question(s)?\n\nAfter deletion, the remaining questions will be automatically reordered.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setIsDeleting(true);
      setError(null);

      // Delete all selected questions
      const deletePromises = selectedQuestions.map((questionId) =>
        api.delete(`/practice/question/${questionId}`)
      );

      const results = await Promise.allSettled(deletePromises);
      const failed = results.filter((r) => r.status === "rejected");

      if (failed.length > 0) {
        showErrorRef.current(
          `Failed to delete ${failed.length} question(s). Please try again.`
        );
        return;
      }

      // Fetch all remaining questions for this subcategory to reorder
      const allQuestionsResponse = await api.get(
        `/practice/question?subCategoryId=${subCategoryId}&status=all&page=1&limit=1000`
      );

      if (allQuestionsResponse.data?.success) {
        const remainingQuestions = allQuestionsResponse.data.data || [];

        // Sort by current orderNumber
        remainingQuestions.sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );

        // Reorder: assign sequential order numbers starting from 1
        const reorderPromises = remainingQuestions.map((question, index) => {
          const newOrderNumber = index + 1;
          if (question.orderNumber !== newOrderNumber) {
            return api.put(`/practice/question/${question._id}`, {
              question: question.question,
              optionA: question.optionA,
              optionB: question.optionB,
              optionC: question.optionC,
              optionD: question.optionD,
              answer: question.answer,
              videoLink: question.videoLink || "",
              detailsExplanation: question.detailsExplanation || "",
              orderNumber: newOrderNumber,
            });
          }
          return Promise.resolve({ data: { success: true } });
        });

        await Promise.all(reorderPromises);
      }

      // Clear selection and refresh questions
      setSelectedQuestions([]);
      await fetchQuestions(pagination.page, pagination.limit);
      success(
        `Successfully deleted ${selectedQuestions.length} question(s) and reordered remaining questions!`
      );
    } catch (err) {
      console.error("❌ Error deleting questions:", err);
      showErrorRef.current(
        err.response?.data?.message || "Failed to delete questions"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ Download CSV Template with subCategoryId
  const handleDownloadTemplate = () => {
    // Check permission
    if (!canImport) {
      showErrorRef.current(
        "Only administrators and super moderators can download CSV templates"
      );
      return;
    }

    if (!subCategoryId) {
      showErrorRef.current(
        "SubCategory ID is required for downloading template"
      );
      return;
    }

    const template = `question,optionA,optionB,optionC,optionD,answer,videoLink,detailsExplanation,orderNumber,status
"What is 2+2?","2","3","4","5","C","https://example.com/video1","<p>The answer is <strong>4</strong> because 2+2 equals 4</p>","1","active"
"What is the capital of India?","Mumbai","Delhi","Kolkata","Chennai","B","https://example.com/video2","<p>Delhi is the <em>capital</em> of India</p>","2","active"`;

    // Generate meaningful filename with subcategory name
    const subCategoryName = currentSubCategory?.name || "Paper";
    // Sanitize filename: remove special characters and replace spaces with hyphens
    const sanitizedName = subCategoryName
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const fileName = `practice-questions-template-${sanitizedName}-${subCategoryId.slice(
      -6
    )}.csv`;

    downloadCSV(template, fileName);
    success("CSV template downloaded successfully!");
    setShowDownloadModal(false);
  };

  // ✅ Process CSV Import (after confirmation)
  const processCSVImport = async (parsedData) => {
    // Check permission
    if (!canImport) {
      showErrorRef.current(
        "Only administrators and super moderators can import data"
      );
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      // Process each row
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const rowNum = i + 2; // +2 because row 1 is header

        try {
          // Validate answer
          const answer = row.answer?.trim()?.toUpperCase();
          if (!answer || !["A", "B", "C", "D"].includes(answer)) {
            errors.push(`Row ${rowNum}: Answer must be A, B, C, or D`);
            errorCount++;
            continue;
          }

          const payload = {
            subCategoryId: subCategoryId,
            question: row.question.trim(),
            optionA: row.optionA.trim(),
            optionB: row.optionB.trim(),
            optionC: row.optionC.trim(),
            optionD: row.optionD.trim(),
            answer: answer,
            videoLink: row.videoLink?.trim() || "",
            detailsExplanation: row.detailsExplanation?.trim() || "",
            status: row.status?.trim()?.toLowerCase() || "active",
          };

          if (row.orderNumber && row.orderNumber.trim()) {
            payload.orderNumber = parseInt(row.orderNumber);
          }

          const response = await api.post("/practice/question", payload);
          if (response.data?.success) {
            successCount++;
          } else {
            errors.push(
              `Row ${rowNum}: ${response.data?.message || "Failed to create"}`
            );
            errorCount++;
          }
        } catch (err) {
          // Handle permission errors (403) - stop import immediately
          if (err?.response?.status === 403) {
            const permissionError = err?.response?.data?.message ||
              "You don't have permission to create practice questions";
            setImportError(permissionError);
            showErrorRef.current(permissionError);
            setIsImporting(false);
            setShowImportModal(false);
            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            return; // Stop processing remaining rows
          }

          errors.push(
            `Row ${rowNum}: ${err?.response?.data?.message || err?.message || "Unknown error"
            }`
          );
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        success(`Successfully imported ${successCount} question(s)!`);
        await fetchQuestions(pagination.page, pagination.limit);
      }
      if (errorCount > 0) {
        setImportError(errors.join("\n"));
        showErrorRef.current(
          `Failed to import ${errorCount} question(s). Check errors below.`
        );
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setShowImportModal(false);
    } catch (err) {
      // Handle permission errors (403) with user-friendly message
      if (err?.response?.status === 403) {
        const permissionError = err?.response?.data?.message ||
          "You don't have permission to create practice questions. Only administrators and super moderators can import questions.";
        setImportError(permissionError);
        showErrorRef.current(permissionError);
      } else {
        console.error("❌ Error importing CSV:", err);
        const errorMessage = err?.response?.data?.message || err?.message || "Failed to import CSV file";
        setImportError(errorMessage);
        showErrorRef.current(errorMessage);
      }
    } finally {
      setIsImporting(false);
    }
  };

  // ✅ Handle CSV Import with Confirmation
  const handleCSVImport = async (event) => {
    // Check permission
    if (!canImport) {
      showErrorRef.current(
        "Only administrators and super moderators can import data"
      );
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      showErrorRef.current("Please upload a CSV file");
      return;
    }

    if (!subCategoryId) {
      showErrorRef.current(
        "SubCategory ID is required for importing questions"
      );
      return;
    }

    try {
      const text = await file.text();
      const parsedData = parseCSV(text);

      // Validate required fields
      const validation = validateCSVData(parsedData, [
        "question",
        "optionA",
        "optionB",
        "optionC",
        "optionD",
        "answer",
      ]);
      if (!validation.isValid) {
        setImportError(validation.errors.join("\n"));
        showErrorRef.current("CSV validation failed. Please check the errors.");
        return;
      }

      // Count total questions
      const totalQuestions = parsedData.length;

      // Show confirmation dialog
      const confirmMessage = `You are about to import ${totalQuestions} question(s) from the CSV file.\n\nSubCategory: ${currentSubCategory?.name || "N/A"
        }\n\nDo you want to proceed with the import?`;

      if (window.confirm(confirmMessage)) {
        // User confirmed, proceed with import
        await processCSVImport(parsedData);
      } else {
        // User cancelled, reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (err) {
      console.error("❌ Error reading CSV file:", err);
      const errorMessage = err?.message || "Failed to read CSV file";
      setImportError(errorMessage);
      showErrorRef.current(errorMessage);
      // Reset file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle rich text changes
  const handleQuestionChange = useCallback((content) => {
    setFormData((prev) => ({ ...prev, question: content }));
  }, []);

  const handleExplanationChange = useCallback((content) => {
    setFormData((prev) => ({ ...prev, detailsExplanation: content }));
  }, []);

  // ✅ Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.question?.trim()) {
      setFormError("Question is required");
      return;
    }
    if (!formData.optionA?.trim()) {
      setFormError("Option A is required");
      return;
    }
    if (!formData.optionB?.trim()) {
      setFormError("Option B is required");
      return;
    }
    if (!formData.optionC?.trim()) {
      setFormError("Option C is required");
      return;
    }
    if (!formData.optionD?.trim()) {
      setFormError("Option D is required");
      return;
    }
    if (!formData.answer) {
      setFormError("Please select the correct answer");
      return;
    }
    if (!["A", "B", "C", "D"].includes(formData.answer.toUpperCase())) {
      setFormError("Answer must be A, B, C, or D");
      return;
    }

    setIsFormLoading(true);
    try {
      const payload = {
        subCategoryId: subCategoryId,
        question: formData.question.trim(),
        optionA: formData.optionA.trim(),
        optionB: formData.optionB.trim(),
        optionC: formData.optionC.trim(),
        optionD: formData.optionD.trim(),
        answer: formData.answer.toUpperCase(),
        videoLink: formData.videoLink?.trim() || "",
        detailsExplanation: formData.detailsExplanation?.trim() || "",
      };

      // Add orderNumber if provided
      if (formData.orderNumber && formData.orderNumber.trim()) {
        payload.orderNumber = parseInt(formData.orderNumber);
      }

      let response;
      if (editingQuestion) {
        response = await api.put(
          `/practice/question/${editingQuestion._id}`,
          payload
        );
      } else {
        response = await api.post("/practice/question", payload);
      }

      if (response.data?.success) {
        // If creating a new question, go to last page. If updating, stay on current page.
        if (editingQuestion) {
          await fetchQuestions(pagination.page, pagination.limit);
        } else {
          // For new questions, fetch the last page to show the newly created question
          // First, we need to get the total count, but for simplicity, just refresh current page
          await fetchQuestions(pagination.page, pagination.limit);
        }
        success(
          `Question ${editingQuestion ? "updated" : "created"} successfully!`
        );
        handleCancelForm();
      } else {
        throw new Error(response.data?.message || "Failed to save question");
      }
    } catch (err) {
      // Handle permission errors (403) with user-friendly message
      if (err?.response?.status === 403) {
        const permissionError = err?.response?.data?.message ||
          "You don't have permission to create practice questions. Only administrators and super moderators can create questions.";
        setFormError(permissionError);
        showError(permissionError);
      } else {
        console.error("❌ Error creating question:", err);
        const errorMessage = err?.response?.data?.message || err?.message || "Failed to create question";
        setFormError(errorMessage);
        showError(errorMessage);
      }
    } finally {
      setIsFormLoading(false);
    }
  };

  // Show error if subCategoryId is not provided
  if (!subCategoryId) {
    return (
      <>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="bg-white rounded-lg border border-red-200 p-6 shadow-sm">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Paper Not Found
            </h2>
            <p className="text-gray-600">
              Please select a paper to manage questions.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (isDataLoading) {
    return (
      <>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <LoadingWrapper>
          <SkeletonPageContent />
        </LoadingWrapper>
      </>
    );
  }

  // Show error state if fetch failed
  if (error && !currentSubCategory) {
    return (
      <>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="bg-white rounded-lg border border-red-200 p-6 shadow-sm">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Failed to Load Paper
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchCurrentSubCategory()}
              className="px-4 py-2 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                title="Go Back"
              >
                <FaArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 mb-1">
                  {currentSubCategory?.name ? titleCasePreserveAcronyms(currentSubCategory.name) : "Practice Question Management"}
                </h1>
                <p className="text-xs text-gray-600">
                  {currentSubCategory
                    ? `Manage questions for ${currentSubCategory.name}. Add, edit, and organize practice questions for this paper.`
                    : "Manage and organize your practice questions, create new questions, and track question performance across your educational platform."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Import/Export buttons - Only for admin and super_moderator */}
              {canImport && (
                <>
                  <button
                    onClick={() => {
                      if (!subCategoryId) {
                        showErrorRef.current(
                          "SubCategory ID is required for downloading template"
                        );
                        return;
                      }
                      setShowDownloadModal(true);
                    }}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                    title="Download CSV Template"
                  >
                    <span className="hidden sm:inline">Download Template</span>
                    <span className="sm:hidden">Download</span>
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
                    title="Import from CSV"
                  >
                    <span className="hidden sm:inline">Import CSV</span>
                    <span className="sm:hidden">Import</span>
                  </button>
                </>
              )}
              {!canImport && (
                <>
                  <button
                    disabled
                    title="Only administrators and super moderators can download CSV templates"
                    className="px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Download Template</span>
                    <span className="sm:hidden">Download</span>
                  </button>
                  <button
                    disabled
                    title="Only administrators and super moderators can import data"
                    className="px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Import CSV</span>
                    <span className="sm:hidden">Import</span>
                  </button>
                </>
              )}
              {canCreate ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Add Question
                </button>
              ) : (
                <button
                  disabled
                  title={getPermissionMessage("create", role)}
                  className="px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium cursor-not-allowed"
                >
                  Add Question
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Add Question Form */}
        {showAddForm && (
          <div
            ref={formRef}
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingQuestion ? "Edit Question" : "Add New Question"}
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
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question */}
              <div>
                <label
                  htmlFor="question"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Question <span className="text-red-500">*</span>
                </label>
                <div className="prose-sm max-w-none">
                  <RichTextEditor
                    value={formData.question}
                    onChange={handleQuestionChange}
                    required
                    placeholder="Enter the question here..."
                  />
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A */}
                <div>
                  <label
                    htmlFor="optionA"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Option A <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="optionA"
                    name="optionA"
                    value={formData.optionA}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    placeholder="Enter option A"
                  />
                </div>

                {/* Option B */}
                <div>
                  <label
                    htmlFor="optionB"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Option B <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="optionB"
                    name="optionB"
                    value={formData.optionB}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    placeholder="Enter option B"
                  />
                </div>

                {/* Option C */}
                <div>
                  <label
                    htmlFor="optionC"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Option C <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="optionC"
                    name="optionC"
                    value={formData.optionC}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    placeholder="Enter option C"
                  />
                </div>

                {/* Option D */}
                <div>
                  <label
                    htmlFor="optionD"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Option D <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="optionD"
                    name="optionD"
                    value={formData.optionD}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    placeholder="Enter option D"
                  />
                </div>
              </div>

              {/* Answer Selection & Order Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="answer"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Correct Answer <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="answer"
                    name="answer"
                    value={formData.answer}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                  >
                    <option value="">Select correct answer</option>
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="orderNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
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
                  />
                </div>
              </div>

              {/* Video Link */}
              <div>
                <label
                  htmlFor="videoLink"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Video Link/URL
                </label>
                <input
                  type="url"
                  id="videoLink"
                  name="videoLink"
                  value={formData.videoLink}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                  placeholder="https://example.com/video or YouTube URL"
                />
              </div>

              {/* Details Explanation */}
              <div>
                <label
                  htmlFor="detailsExplanation"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Details Explanation
                </label>
                <div className="prose-sm max-w-none">
                  <RichTextEditor
                    value={formData.detailsExplanation}
                    onChange={handleExplanationChange}
                    placeholder="Enter detailed explanation for the answer..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  disabled={isFormLoading}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFormLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFormLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>Save Question</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Download CSV Template Modal */}
        {showDownloadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Download CSV Template
                  </h2>
                  <button
                    onClick={() => setShowDownloadModal(false)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Template Information:
                  </p>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p>
                      <strong>SubCategory ID:</strong> {subCategoryId}
                    </p>
                    <p className="mt-2">
                      The CSV template will be generated for this SubCategory.
                      All questions imported using this template will be
                      associated with this SubCategory.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-700">
                    <strong>Note:</strong> The template does not include
                    subCategoryId in the CSV file because it's already set for
                    this page. Just fill in the question details and import.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <FaDownload className="w-4 h-4" />
                  <span>Download Template</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import CSV Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Import Questions from CSV
                  </h2>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportError(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                    disabled={isImporting}
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {importError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <FaExclamationTriangle className="text-red-500" />
                      <p className="text-sm font-medium text-red-800">
                        Import Errors:
                      </p>
                    </div>
                    <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                      {importError}
                    </pre>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select CSV File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    disabled={isImporting}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500">
                    Download the template CSV file first, fill it with your
                    data, then upload it here.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    CSV Format Requirements:
                  </p>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>
                      Required fields: <strong>question</strong>,{" "}
                      <strong>optionA</strong>, <strong>optionB</strong>,{" "}
                      <strong>optionC</strong>, <strong>optionD</strong>,{" "}
                      <strong>answer</strong>
                    </li>
                    <li>
                      Optional fields: videoLink, detailsExplanation,
                      orderNumber, status
                    </li>
                    <li>answer must be A, B, C, or D (case-insensitive)</li>
                    <li>status must be "active" or "inactive"</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportError(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  disabled={isImporting}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions List - MCQ Display */}
        <div
          ref={questionsListRef}
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Questions List {pagination.total > 0 && `(${pagination.total})`}
              </h2>
              {questions.length > 0 && canDelete && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        questions.length > 0 &&
                        selectedQuestions.length === questions.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Select All</span>
                  </label>
                  {selectedQuestions.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FaTrash className="w-3 h-3" />
                      <span>Delete Selected ({selectedQuestions.length})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Items per page selector */}
            {pagination.total > 0 && (
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-400 text-sm" />
                <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
                  Show:
                </label>
                <select
                  id="itemsPerPage"
                  value={pagination.limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value, 10);
                    setPagination((prev) => ({
                      ...prev,
                      limit: newLimit,
                      page: 1, // Reset to first page when changing limit
                    }));
                    setSelectedQuestions([]); // Clear selection when changing page size
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          <LoadingWrapper
            isLoading={isQuestionsLoading}
            skeleton={<SkeletonPageContent />}
          >
            {questions.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-400 text-6xl mb-4">❓</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Questions Found
                </h3>
                <p className="text-sm text-gray-500">
                  Add your first question to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {questions.map((question, index) => {
                  // Calculate the actual question number based on pagination
                  const questionNumber =
                    (pagination.page - 1) * pagination.limit + index + 1;

                  const isSelected = selectedQuestions.includes(question._id);

                  return (
                    <div
                      key={question._id || index}
                      className={`bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-all ${isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                        }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            {canDelete && (
                              <label className="cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleToggleQuestionSelection(question._id)
                                  }
                                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </label>
                            )}
                            <span className="flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-700 rounded-full font-semibold text-base">
                              {questionNumber}
                            </span>
                            <div
                              className="text-lg font-semibold text-gray-900 rich-text-content flex-1 min-w-0"
                              dangerouslySetInnerHTML={{ __html: question.question }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          {canEdit && (
                            <button
                              onClick={() => handleEditQuestion(question)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                              title="Edit Question"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteQuestion(question)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                              title="Delete Question"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {["A", "B", "C", "D"].map((option) => {
                          const optionKey = `option${option}`;
                          const optionText = question[optionKey];
                          const isCorrect = question.answer === option;
                          return (
                            <div
                              key={option}
                              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-default ${isCorrect
                                ? "bg-green-50 border-green-300"
                                : "bg-white border-gray-200 hover:border-gray-300"
                                }`}
                            >
                              <div
                                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${isCorrect
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-300 text-gray-700"
                                  }`}
                              >
                                {option}
                              </div>
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                <div
                                  className={`text-sm font-medium flex-1 rich-text-content min-w-0 ${isCorrect
                                    ? "text-gray-800"
                                    : "text-gray-700"
                                    }`}
                                  dangerouslySetInnerHTML={{ __html: optionText }}
                                />
                                {isCorrect && (
                                  <FaCheckCircle className="text-green-500 shrink-0 text-lg" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Additional Info */}
                      <div className="space-y-4 pt-4 border-t border-gray-200">
                        {/* Correct Answer Badge */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-600">
                            Correct Answer:
                          </span>
                          <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Option {question.answer}
                          </span>
                        </div>

                        {/* Video Link */}
                        {question.videoLink && (
                          <div className="flex items-center gap-2">
                            <FaVideo className="text-gray-400 text-base" />
                            <a
                              href={question.videoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            >
                              Watch Video Explanation
                            </a>
                          </div>
                        )}

                        {/* Details Explanation */}
                        {question.detailsExplanation && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                              Explanation:
                            </h4>
                            <div
                              className="text-sm text-gray-600 leading-relaxed rich-text-content"
                              dangerouslySetInnerHTML={{ __html: question.detailsExplanation }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </LoadingWrapper>

          {/* Pagination */}
          {pagination.totalPages > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} questions
                </div>
                {pagination.totalPages > 1 && (
                  <div className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                )}
              </div>
              {pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(newPage) => {
                    setPagination((prev) => ({ ...prev, page: newPage }));
                  }}
                  showPrevNext={true}
                  maxVisible={5}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PracticeQuestionManagement;
