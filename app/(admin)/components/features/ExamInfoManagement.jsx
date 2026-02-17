"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    FaSave,
    FaTimes,
    FaPlus,
    FaTrash,
    FaCalendarAlt,
    FaGraduationCap,
    FaChartBar,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import {
    LoadingWrapper,
    LoadingSpinner,
} from "../ui/SkeletonLoader";
import TimeWeightageHierarchy from "./TimeWeightageHierarchy";

const ExamInfoManagement = ({ examId }) => {
    const router = useRouter();
    const { toasts, removeToast, success, error: showError } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [exam, setExam] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [formData, setFormData] = useState({
        examDate: "",
        examCut: {
            SC_ST: "",
            OBC: "",
            General: "",
            NRIs: "",
        },
        maximumMarks: "",
        subjects: [],
    });
    const [formError, setFormError] = useState(null);
    const [examInfoId, setExamInfoId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Get today's date in YYYY-MM-DD format for date input min attribute
    const todayDate = new Date().toISOString().split("T")[0];

    // Refetch exam info (e.g. after adding/removing subjects in Time & Weightage)
    const refetchExamInfo = useCallback(async () => {
        if (!examId) return;
        try {
            const examInfoResponse = await api.get(`/exam-info?examId=${examId}`);
            if (examInfoResponse.data?.success && examInfoResponse.data.data?.length > 0) {
                const existingInfo = examInfoResponse.data.data[0];
                setExamInfoId(existingInfo._id);
                setFormData((prev) => ({
                    ...prev,
                    examDate: existingInfo.examDate
                        ? new Date(existingInfo.examDate).toISOString().split("T")[0]
                        : prev.examDate,
                    examCut: {
                        SC_ST: existingInfo.examCut?.SC_ST?.toString() ?? prev.examCut.SC_ST,
                        OBC: existingInfo.examCut?.OBC?.toString() ?? prev.examCut.OBC,
                        General: existingInfo.examCut?.General?.toString() ?? prev.examCut.General,
                        NRIs: existingInfo.examCut?.NRIs?.toString() ?? prev.examCut.NRIs,
                    },
                    maximumMarks: existingInfo.maximumMarks?.toString() ?? prev.maximumMarks,
                    subjects: existingInfo.subjects || [],
                }));
            }
        } catch (e) {
            console.error("Refetch exam info failed", e);
        }
    }, [examId]);

    // Fetch exam and subjects
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Fetch exam
                const examResponse = await api.get(`/exam/${examId}`);
                if (examResponse.data?.success) {
                    setExam(examResponse.data.data);
                }

                // Fetch subjects for this exam
                const subjectsResponse = await api.get(`/subject?examId=${examId}&status=active`);
                if (subjectsResponse.data?.success) {
                    setSubjects(subjectsResponse.data.data || []);
                }

                // Fetch existing exam info if it exists
                try {
                    const examInfoResponse = await api.get(`/exam-info?examId=${examId}`);
                    if (examInfoResponse.data?.success && examInfoResponse.data.data?.length > 0) {
                        const existingInfo = examInfoResponse.data.data[0];
                        setExamInfoId(existingInfo._id);
                        setFormData({
                            examDate: existingInfo.examDate
                                ? new Date(existingInfo.examDate).toISOString().split("T")[0]
                                : "",
                            examCut: {
                                SC_ST: existingInfo.examCut?.SC_ST?.toString() || "",
                                OBC: existingInfo.examCut?.OBC?.toString() || "",
                                General: existingInfo.examCut?.General?.toString() || "",
                                NRIs: existingInfo.examCut?.NRIs?.toString() || "",
                            },
                            maximumMarks: existingInfo.maximumMarks?.toString() || "",
                            subjects: existingInfo.subjects || [],
                        });
                    }
                } catch (error) {
                    // No existing exam info, that's fine
                    console.log("No existing exam info found");
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                showError("Failed to load exam data");
            } finally {
                setIsLoading(false);
            }
        };

        if (examId) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith("examCut.")) {
            const cutType = name.split(".")[1];
            setFormData((prev) => ({
                ...prev,
                examCut: {
                    ...prev.examCut,
                    [cutType]: value,
                },
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        // Validation
        if (!formData.examDate) {
            setFormError("Exam date is required");
            return;
        }

        // Validate that exam date is not in the past
        const selectedDate = new Date(formData.examDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to compare dates only
        if (selectedDate < today) {
            setFormError("Exam date cannot be in the past. Please select today or a future date.");
            return;
        }

        if (!formData.maximumMarks || formData.maximumMarks <= 0) {
            setFormError("Maximum marks must be greater than 0");
            return;
        }

        if (formData.subjects.length === 0) {
            setFormError("Add at least one subject in the Time & Weightage section below before saving.");
            return;
        }

        // Validate subjects (from Time & Weightage)
        for (let i = 0; i < formData.subjects.length; i++) {
            const subject = formData.subjects[i];
            if (!subject.subjectId) {
                setFormError(`Subject ${i + 1}: invalid`);
                return;
            }
            const nq = parseInt(subject.numberOfQuestions, 10);
            const mm = parseFloat(subject.maximumMarks);
            const w = parseFloat(subject.weightage);
            if (isNaN(nq) || nq <= 0) {
                setFormError(`Subject ${i + 1}: Number of questions must be greater than 0`);
                return;
            }
            if (isNaN(mm) || mm <= 0) {
                setFormError(`Subject ${i + 1}: Maximum marks must be greater than 0`);
                return;
            }
            if (isNaN(w) || w < 0 || w > 100) {
                setFormError(`Subject ${i + 1}: Weightage must be between 0 and 100`);
                return;
            }
        }

        try {
            setIsSaving(true);

            const payload = {
                examId,
                examDate: formData.examDate,
                examCut: {
                    SC_ST: formData.examCut.SC_ST ? parseFloat(formData.examCut.SC_ST) : null,
                    OBC: formData.examCut.OBC ? parseFloat(formData.examCut.OBC) : null,
                    General: formData.examCut.General ? parseFloat(formData.examCut.General) : null,
                    NRIs: formData.examCut.NRIs ? parseFloat(formData.examCut.NRIs) : null,
                },
                maximumMarks: parseFloat(formData.maximumMarks),
                subjects: formData.subjects.map((s) => ({
                    subjectId: s.subjectId,
                    subjectName: s.subjectName,
                    numberOfQuestions: parseInt(s.numberOfQuestions),
                    maximumMarks: parseFloat(s.maximumMarks),
                    weightage: parseFloat(s.weightage),
                    studyHours: s.studyHours !== "" && s.studyHours != null ? parseFloat(s.studyHours) : null,
                })),
            };

            // Check if exam info exists
            let response;
            if (examInfoId) {
                // Update existing
                response = await api.put(`/exam-info/${examInfoId}`, payload);
            } else {
                // Create new
                response = await api.post("/exam-info", payload);
                if (response.data.success && response.data.data?._id) {
                    setExamInfoId(response.data.data._id);
                }
            }

            if (response.data.success) {
                success("Exam info saved successfully!");
                setTimeout(() => {
                    router.push("/admin/exam");
                }, 1500);
            } else {
                setFormError(response.data.message || "Failed to save exam info");
                showError(response.data.message || "Failed to save exam info");
            }
        } catch (error) {
            console.error("Error saving exam info:", error);
            const errorMessage =
                error.response?.data?.message ||
                "Failed to save exam info. Please try again.";
            setFormError(errorMessage);
            showError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!examInfoId) {
            showError("No exam info to delete");
            return;
        }

        // Confirm deletion
        if (!window.confirm("Are you sure you want to delete this exam info? This action cannot be undone.")) {
            return;
        }

        try {
            setIsDeleting(true);
            const response = await api.delete(`/exam-info/${examInfoId}`);

            if (response.data.success) {
                success("Exam info deleted successfully!");
                setTimeout(() => {
                    router.push("/admin/exam");
                }, 1500);
            } else {
                showError(response.data.message || "Failed to delete exam info");
            }
        } catch (error) {
            console.error("Error deleting exam info:", error);
            const errorMessage =
                error.response?.data?.message ||
                "Failed to delete exam info. Please try again.";
            showError(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 top-16 left-0 lg:left-64 bg-gray-50 flex items-center justify-center z-40">
                <div className="flex flex-col items-center justify-center gap-4">
                    <LoadingSpinner />
                    <p className="text-sm text-gray-600">Loading exam information...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <div className="space-y-6">
                {/* Page Header */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900 mb-1">
                                {exam ? `Exam Info: ${exam.name}` : "Exam Info"}
                            </h1>
                            <p className="text-xs text-gray-600">
                                Manage exam date, cut-off marks, and subject details
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/admin/exam")}
                            className="px-3 py-1.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors border border-gray-200 flex items-center gap-2"
                            title="Back to Exams"
                        >
                            <FaTimes className="text-xs" />
                            Back
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        {/* Form Error Display */}
                        {formError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <p className="text-sm font-medium text-red-800">{formError}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Exam Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FaCalendarAlt className="inline mr-2" />
                                    Exam Date *
                                </label>
                                <input
                                    type="date"
                                    name="examDate"
                                    value={formData.examDate}
                                    onChange={handleInputChange}
                                    required
                                    min={todayDate}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Only future dates are allowed
                                </p>
                            </div>

                            {/* Maximum Marks / Total Marks */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FaChartBar className="inline mr-2" />
                                    Total Marks (Maximum Marks) *
                                </label>
                                <input
                                    type="number"
                                    name="maximumMarks"
                                    value={formData.maximumMarks}
                                    onChange={handleInputChange}
                                    required
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Total marks for the exam. Used for expected score range on the student dashboard.
                                </p>
                            </div>

                            {/* Exam Cut-off Marks */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-4">
                                    <FaGraduationCap className="inline mr-2" />
                                    Exam Cut-off Marks (Optional)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            SC/ST
                                        </label>
                                        <input
                                            type="number"
                                            name="examCut.SC_ST"
                                            value={formData.examCut.SC_ST}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            OBC
                                        </label>
                                        <input
                                            type="number"
                                            name="examCut.OBC"
                                            value={formData.examCut.OBC}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            General
                                        </label>
                                        <input
                                            type="number"
                                            name="examCut.General"
                                            value={formData.examCut.General}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            NRIs
                                        </label>
                                        <input
                                            type="number"
                                            name="examCut.NRIs"
                                            value={formData.examCut.NRIs}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-3">
                        {/* Delete Button - Only show if exam info exists */}
                        {examInfoId ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting || isSaving}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                            >
                                {isDeleting ? (
                                    <>
                                        <LoadingSpinner />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <FaTrash />
                                        Delete Exam Info
                                    </>
                                )}
                            </button>
                        ) : (
                            <div></div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => router.push("/admin/exam")}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || isDeleting}
                                className="px-4 py-2 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                            >
                                {isSaving ? (
                                    <>
                                        <LoadingSpinner />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FaSave />
                                        {examInfoId ? "Update Exam Info" : "Save Exam Info"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Time & Weightage: add/remove subjects, edit time & weightage, then Save all */}
                {examId && (
                    <section className="mt-8 pt-8 border-t border-gray-200" aria-label="Time and weightage by level">
                        <TimeWeightageHierarchy
                            examId={examId}
                            examInfoId={examInfoId}
                            formData={formData}
                            allSubjects={subjects}
                            onExamInfoChange={refetchExamInfo}
                        />
                    </section>
                )}
            </div>
        </>
    );
};

export default ExamInfoManagement;
