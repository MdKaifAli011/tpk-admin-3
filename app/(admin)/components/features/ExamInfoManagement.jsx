"use client";
import React, { useState, useEffect } from "react";
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

    // Get available subjects (subjects not yet selected)
    const availableSubjects = subjects.filter(
        (subject) => !formData.subjects.some((s) => s.subjectId === subject._id)
    );

    // Check if all subjects are selected
    const allSubjectsSelected = subjects.length > 0 && availableSubjects.length === 0;

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

    const handleAddSubject = () => {
        if (allSubjectsSelected || availableSubjects.length === 0) {
            return;
        }

        // Add all available subjects at once
        const newSubjects = availableSubjects.map((subject) => ({
            subjectId: subject._id,
            subjectName: subject.name,
            numberOfQuestions: "",
            maximumMarks: "",
            weightage: "",
        }));

        setFormData((prev) => ({
            ...prev,
            subjects: [...prev.subjects, ...newSubjects],
        }));
    };

    const handleRemoveSubject = (index) => {
        setFormData((prev) => ({
            ...prev,
            subjects: prev.subjects.filter((_, i) => i !== index),
        }));
    };

    const handleSubjectChange = (index, field, value) => {
        // Don't allow changing subjectId once it's set
        if (field === "subjectId") {
            return;
        }

        setFormData((prev) => {
            const newSubjects = [...prev.subjects];
            newSubjects[index] = {
                ...newSubjects[index],
                [field]: value,
            };

            return {
                ...prev,
                subjects: newSubjects,
            };
        });
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
            setFormError("At least one subject is required");
            return;
        }

        // Validate subjects
        for (let i = 0; i < formData.subjects.length; i++) {
            const subject = formData.subjects[i];
            if (!subject.subjectId) {
                setFormError(`Subject ${i + 1}: Please select a subject`);
                return;
            }
            if (!subject.numberOfQuestions || subject.numberOfQuestions <= 0) {
                setFormError(`Subject ${i + 1}: Number of questions must be greater than 0`);
                return;
            }
            if (!subject.maximumMarks || subject.maximumMarks <= 0) {
                setFormError(`Subject ${i + 1}: Maximum marks must be greater than 0`);
                return;
            }
            if (!subject.weightage || subject.weightage < 0 || subject.weightage > 100) {
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

                            {/* Maximum Marks */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FaChartBar className="inline mr-2" />
                                    Maximum Marks *
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

                    {/* Subjects */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">
                                    <FaGraduationCap className="inline mr-2" />
                                    Subjects *
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {subjects.length > 0
                                        ? `${subjects.length} available subject${subjects.length > 1 ? "s" : ""}`
                                        : "No subjects available for this exam"}
                                    {formData.subjects.length > 0 &&
                                        ` • ${formData.subjects.length} selected`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddSubject}
                                disabled={allSubjectsSelected || availableSubjects.length === 0}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${allSubjectsSelected || availableSubjects.length === 0
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-[#0056FF] hover:bg-[#0044CC] text-white"
                                    }`}
                                title={
                                    allSubjectsSelected
                                        ? "All subjects are already selected"
                                        : availableSubjects.length === 0
                                            ? "No subjects available"
                                            : `Add ${availableSubjects.length} available subject${availableSubjects.length > 1 ? "s" : ""}`
                                }
                            >
                                <FaPlus className="text-xs" />
                                {allSubjectsSelected
                                    ? "All Selected"
                                    : availableSubjects.length > 0
                                        ? `Add ${availableSubjects.length} Subject${availableSubjects.length > 1 ? "s" : ""}`
                                        : "No Subjects"}
                            </button>
                        </div>

                        {formData.subjects.length === 0 ? (
                            <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                                <FaGraduationCap className="text-3xl text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 mb-1">
                                    No subjects added yet
                                </p>
                                <p className="text-xs text-gray-400">
                                    {subjects.length > 0
                                        ? "Click the button above to add available subjects"
                                        : "Please add subjects to this exam first"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.subjects.map((subject, index) => {
                                    const subjectData = subjects.find((s) => s._id === subject.subjectId);
                                    return (
                                        <div
                                            key={`${subject.subjectId}-${index}`}
                                            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Subject {index + 1}
                                                    </span>
                                                    {subjectData && (
                                                        <span className="ml-2 text-xs text-gray-500">
                                                            ({subjectData.name})
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSubject(index)}
                                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                                    title="Remove Subject"
                                                >
                                                    <FaTrash className="text-sm" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Subject *
                                                    </label>
                                                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700">
                                                        {subject.subjectName || "N/A"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Number of Questions *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={subject.numberOfQuestions}
                                                        onChange={(e) =>
                                                            handleSubjectChange(
                                                                index,
                                                                "numberOfQuestions",
                                                                e.target.value
                                                            )
                                                        }
                                                        required
                                                        min="0"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                                        placeholder="Enter number"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Maximum Marks *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={subject.maximumMarks}
                                                        onChange={(e) =>
                                                            handleSubjectChange(index, "maximumMarks", e.target.value)
                                                        }
                                                        required
                                                        min="0"
                                                        step="0.01"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                                        placeholder="Enter marks"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Weightage (%) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={subject.weightage}
                                                        onChange={(e) =>
                                                            handleSubjectChange(index, "weightage", e.target.value)
                                                        }
                                                        required
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                                        placeholder="0-100"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
            </div>
        </>
    );
};

export default ExamInfoManagement;
