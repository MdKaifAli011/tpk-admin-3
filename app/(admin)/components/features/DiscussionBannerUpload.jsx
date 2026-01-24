"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import * as FaIcons from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import {
  LoadingWrapper,
  SkeletonPageContent,
  LoadingSpinner,
} from "../ui/SkeletonLoader";
import api from "@/lib/api";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";

const DiscussionBannerUpload = () => {
  const { canEdit, role } = usePermissions();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [altText, setAltText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [existingBanner, setExistingBanner] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);

  const { toasts, removeToast, success, error: showError } = useToast();

  // Fetch exams on component mount
  useEffect(() => {
    fetchExams();
  }, []);

  // Fetch existing banner when exam is selected
  useEffect(() => {
    if (selectedExam) {
      fetchExistingBanner();
    } else {
      setExistingBanner(null);
      setBannerImage("");
      setAltText("");
      setPreviewUrl("");
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/exam?status=all");
      if (res.data.success) {
        setExams(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching exams:", err);
      showError("Failed to fetch exams");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingBanner = async () => {
    try {
      const res = await api.get(`/discussion/banner?examId=${selectedExam}`);
      if (res.data.success && res.data.data) {
        const banner = res.data.data;
        setExistingBanner(banner);
        setBannerImage(banner.bannerImage);
        setAltText(banner.altText || "");
        setIsActive(banner.isActive);
        setPreviewUrl(banner.bannerImage);
      } else {
        setExistingBanner(null);
        setBannerImage("");
        setAltText("");
        setIsActive(true);
        setPreviewUrl("");
      }
    } catch (err) {
      console.error("Error fetching existing banner:", err);
      // Don't show error for missing banners
    }
  };

  // Filter exams based on search
  const filteredExams = useMemo(() => {
    return exams.filter((exam) =>
      exam.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [exams, searchQuery]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check permissions
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFormError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image size should be less than 5MB");
      return;
    }

    try {
      setIsUploading(true);
      setFormError(null);
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        const imageUrl = res.data.data.url;
        setBannerImage(imageUrl);
        setPreviewUrl(imageUrl);
        success("Image uploaded successfully");
      } else {
        setFormError(res.data.message || "Failed to upload image");
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      setFormError("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBanner = async () => {
    // Check permissions
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    if (!selectedExam) {
      setFormError("Please select an exam");
      return;
    }

    if (!bannerImage) {
      setFormError("Please upload a banner image");
      return;
    }

    try {
      setIsUploading(true);
      setFormError(null);
      const res = await api.post('/discussion/banner', {
        examId: selectedExam,
        bannerImage: bannerImage,
        altText: altText || 'Discussion Forum Banner',
        isActive: isActive
      });

      if (res.data.success) {
        success(existingBanner ? "Banner updated successfully" : "Banner uploaded successfully");
        setExistingBanner(res.data.data);
      } else {
        setFormError(res.data.message || "Failed to save banner");
      }
    } catch (err) {
      console.error("Error saving banner:", err);
      setFormError("Failed to save banner");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBanner = async () => {
    // Check permissions
    if (!canEdit) {
      showError(getPermissionMessage("delete", role));
      return;
    }

    if (!selectedExam || !existingBanner) return;

    if (!confirm("Are you sure you want to delete this banner?")) return;

    try {
      setIsUploading(true);
      setFormError(null);
      const res = await api.delete(`/discussion/banner?examId=${selectedExam}`);

      if (res.data.success) {
        success("Banner deleted successfully");
        setExistingBanner(null);
        setBannerImage("");
        setAltText("");
        setPreviewUrl("");
        setIsActive(true);
      } else {
        setFormError(res.data.message || "Failed to delete banner");
      }
    } catch (err) {
      console.error("Error deleting banner:", err);
      setFormError("Failed to delete banner");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetForm = () => {
    setSelectedExam("");
    setBannerImage("");
    setAltText("");
    setIsActive(true);
    setPreviewUrl("");
    setExistingBanner(null);
    setFormError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Page Header - Consistent with ExamManagement */}
        <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-10 opacity-5 pointer-events-none">
            <FaIcons.FaImage size={80} />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-gray-900">
                Discussion Banner Management
              </h1>
              <p className="text-xs text-gray-600">
                Upload and manage exam-specific banners for the discussion forum interface.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-1.5 rounded-lg border border-white">
              <div className="px-3 py-1 text-center border-r border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Exams</p>
                <p className="text-base font-bold text-gray-900 leading-none mt-1">{exams.length}</p>
              </div>
              <div className="px-3 py-1 text-center">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1 justify-center">
                  <FaIcons.FaImage size={8} /> Banners
                </p>
                <p className="text-base font-bold text-purple-600 leading-none mt-1">
                  {exams.filter(exam => existingBanner && existingBanner.examId === exam._id).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Upload Form */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="space-y-0.5">
              <h2 className="text-xl font-semibold text-gray-900">
                Banner Upload Form
              </h2>
              <p className="text-sm text-gray-600">
                Select an exam and upload a banner image for the discussion forum.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Form Error */}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <FaIcons.FaExclamationTriangle className="text-red-500 mt-0.5" />
                <span className="text-sm text-red-700">{formError}</span>
              </div>
            )}

            {/* Exam Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Exam <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
                  disabled={isLoading}
                >
                  <option value="">Choose an exam...</option>
                  {filteredExams.map((exam) => (
                    <option key={exam._id} value={exam._id}>
                      {exam.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Search Exams
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search exams..."
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                  <FaIcons.FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <FaIcons.FaTimes className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {selectedExam && (
              <>
                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Banner Image <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Recommended: 1200x300px, Max: 5MB)</span>
                  </label>
                  
                  {/* Preview */}
                  {previewUrl && (
                    <div className="mb-4">
                      <img
                        src={previewUrl}
                        alt="Banner preview"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="banner-upload"
                      disabled={isUploading || !canEdit}
                    />
                    <label
                      htmlFor="banner-upload"
                      className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                        !canEdit
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                          : isUploading
                          ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                          : "border-purple-300 bg-purple-50 hover:border-purple-400 hover:bg-purple-100"
                      }`}
                    >
                      <FaIcons.FaUpload className={!canEdit ? "text-gray-400" : isUploading ? "text-gray-400" : "text-purple-600"} />
                      <span className={`text-sm font-medium ${!canEdit ? "text-gray-400" : isUploading ? "text-gray-400" : "text-purple-700"}`}>
                        {!canEdit ? "No permission" : isUploading ? "Uploading..." : "Choose Image"}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Alt Text */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Alt Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Enter alt text for accessibility"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={!canEdit}
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    disabled={!canEdit}
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Banner is active (visible to users)
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveBanner}
                    disabled={isUploading || !bannerImage || !canEdit}
                    className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        {existingBanner ? "Updating..." : "Uploading..."}
                      </>
                    ) : (
                      <>
                        <FaIcons.FaSave size={14} />
                        {existingBanner ? "Update Banner" : "Upload Banner"}
                      </>
                    )}
                  </button>

                  {existingBanner && canEdit && (
                    <button
                      onClick={handleDeleteBanner}
                      disabled={isUploading}
                      className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <FaIcons.FaTrash size={14} />
                      Delete Banner
                    </button>
                  )}

                  <button
                    onClick={handleResetForm}
                    disabled={isUploading}
                    className="px-6 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <FaIcons.FaTimes size={14} />
                    Reset
                  </button>
                </div>

                {/* Status */}
                {existingBanner && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <FaIcons.FaCheckCircle className="text-green-600" />
                    <span className="text-sm text-green-800">
                      Banner exists for this exam. You can update or delete it.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Existing Banners List */}
        {exams.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="space-y-0.5">
                <h2 className="text-xl font-semibold text-gray-900">
                  Existing Banners
                </h2>
                <p className="text-sm text-gray-600">
                  View and manage all uploaded discussion banners.
                </p>
              </div>
            </div>

            <LoadingWrapper isLoading={isLoading}>
              <div className="p-6">
                {filteredExams.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaIcons.FaSearch size={24} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No exams found</h3>
                    <p className="text-sm text-gray-500">
                      Try adjusting your search criteria.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredExams.map((exam) => {
                      const hasBanner = existingBanner && existingBanner.examId === exam._id;
                      return (
                        <div
                          key={exam._id}
                          className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
                            selectedExam === exam._id
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 bg-white"
                          }`}
                          onClick={() => setSelectedExam(exam._id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-sm">{exam.name}</h3>
                              <p className="text-xs text-gray-500 mt-1">
                                Status: <span className={`font-medium ${exam.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                                  {exam.status}
                                </span>
                              </p>
                            </div>
                            {hasBanner && (
                              <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                                Banner
                              </div>
                            )}
                          </div>
                          {hasBanner && existingBanner?.bannerImage && (
                            <img
                              src={existingBanner.bannerImage}
                              alt={exam.name}
                              className="w-full h-24 object-cover rounded border border-gray-200"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </LoadingWrapper>
          </div>
        )}
      </div>
    </>
  );
};

export default DiscussionBannerUpload;
