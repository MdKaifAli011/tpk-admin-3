"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback, useReducer } from "react";
import * as FaIcons from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import {
  LoadingWrapper,
  LoadingSpinner,
} from "../ui/SkeletonLoader";
import api from "@/lib/api";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import { getUrlWithBasePath, cleanUrlFromBasePath } from "@/utils/basePath";

const DiscussionBannerUpload = () => {
  const { canEdit, role } = usePermissions();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedExamName, setSelectedExamName] = useState("");
  const [banners, setBanners] = useState([]);
  const [altText, setAltText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [existingBannerCollection, setExistingBannerCollection] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [formError, setFormError] = useState(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [bannerImage, setBannerImage] = useState(null);
  const fileInputRef = useRef(null);
  const isFetchingRef = useRef(false); // ✅ API LOOP PREVENTION
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const { toasts, removeToast, success, error: showError } = useToast();

  // ✅ PERFECTED: File-system + Basepath compatible
  const getImageUrl = useCallback((url) => {
    return getUrlWithBasePath(url);
  }, []);

  // ✅ PERFECTED: Clean URL for backend storage
  const cleanImageUrl = useCallback((url) => {
    return cleanUrlFromBasePath(url);
  }, []);

  // Fetch exams + exam names (regular function with ref)
  const fetchExams = async () => {
    if (isFetchingRef.current) return; // Prevent duplicate calls
    isFetchingRef.current = true;
    
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
      isFetchingRef.current = false;
    }
  };

  // ✅ PERFECTED: File-system scanning API WITH LOOP PREVENTION
  const fetchExistingBannerCollection = async () => {
    if (!selectedExam || isFetchingRef.current) return; // ✅ LOOP PREVENTION
    
    isFetchingRef.current = true;
    
    try {
      const res = await api.get(`/discussion/banner?examId=${selectedExam}`);

      if (res.data.success && res.data.data) {
        const bannerCollection = res.data.data;
        const bannersList = (bannerCollection.banners || []).map((banner, index) => {
          const fullUrl = getImageUrl(banner.url);
          console.log(`🔍 Banner ${index + 1}:`, {
            originalUrl: banner.url,
            fullUrl: fullUrl,
            filename: banner.filename
          });
          return {
            ...banner,
            url: fullUrl, // Use centralized getImageUrl function
            index
          };
        });

        const defaultIndex = Math.max(0, Math.min(
          bannerCollection.defaultBannerIndex || 0,
          bannersList.length - 1
        ));

        setExistingBannerCollection(bannerCollection);
        setBanners(bannersList);
        setSelectedExamName(bannerCollection.examName || "");
        setCurrentBannerIndex(defaultIndex);
        setPreviewUrl(bannersList[defaultIndex]?.url || "");
        setAltText(bannersList[defaultIndex]?.altText || "");
        setIsActive(bannersList[defaultIndex]?.isActive !== false);
      } else {
        setExistingBannerCollection(null);
        setBanners([]);
        setSelectedExamName("");
        setCurrentBannerIndex(0);
        setPreviewUrl("");
        setAltText("");
        setIsActive(true);
      }
    } catch (err) {
      console.error("Error fetching banner collection:", err);
      setBanners([]);
      setExistingBannerCollection(null);
    } finally {
      isFetchingRef.current = false; // ✅ LOOP PREVENTION
    }
  };

  // Filter exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) =>
      exam.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [exams, searchQuery]);

  // Reset state
  const resetBannerState = useCallback(() => {
    setExistingBannerCollection(null);
    setBanners([]);
    setCurrentBannerIndex(0);
    setPreviewUrl("");
    setAltText("");
    setIsActive(true);
    setBannerImage(null);
    setSelectedExamName("");
  }, []);

  // ✅ FIXED Effects - NO API LOOP
  useEffect(() => {
    fetchExams();
  }, []); // Only run once on mount

  useEffect(() => {
    if (selectedExam) {
      const timeoutId = setTimeout(() => {
        fetchExistingBannerCollection();
      }, 100); // ✅ Debounce to prevent rapid calls
      
      return () => clearTimeout(timeoutId);
    } else {
      resetBannerState();
    }
  }, [selectedExam]); // Only depend on selectedExam

  // ✅ PERFECTED: Upload + immediate preview
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFormError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image size should be less than 5MB");
      return;
    }

    try {
      setIsUploading(true);
      setFormError(null);
      
      // Immediate preview
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);
      setBannerImage(file);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('examId', selectedExam);

      const res = await api.post('/upload/banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        const newBanner = {
          url: getImageUrl(res.data.data.url),
          filename: res.data.data.filename,
          altText: altText || 'Discussion Forum Banner',
          isActive: isActive,
          index: res.data.data.bannerIndex || banners.length
        };
        
        console.log("🆕 New banner added:", {
          apiResponse: res.data.data,
          newBanner: newBanner
        });
        
        setBanners(prev => [...prev, newBanner]);
        setPreviewUrl(newBanner.url);
        success("Banner uploaded successfully!");
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setFormError(res.data.message || "Failed to upload banner");
        setPreviewUrl("");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setFormError(err.response?.data?.message || "Failed to upload banner");
      setPreviewUrl("");
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ PERFECTED: File-system config save (no DB)
  const handleSaveBanner = async () => {
    if (!canEdit) {
      showError(getPermissionMessage("edit", role));
      return;
    }

    if (!selectedExam) {
      setFormError("Please select an exam");
      return;
    }

    if (banners.length === 0) {
      setFormError("Please upload at least one banner");
      return;
    }

    try {
      setIsUploading(true);
      setFormError(null);

      const payload = {
        examId: selectedExam,
        banners: banners.map(b => ({
          url: cleanImageUrl(b.url),
          filename: b.filename,
          altText: b.altText,
          isActive: b.isActive
        })),
        defaultBannerIndex: currentBannerIndex
      };

      console.log("💾 Saving banner config:", payload);

      const res = await api.post('/discussion/banner', payload);

      if (res.data.success) {
        success("Banner configuration saved successfully!");
        // ✅ FIXED: Debounced refresh with flag check
        setTimeout(() => {
          if (!isFetchingRef.current) {
            fetchExistingBannerCollection();
          }
        }, 500);
      } else {
        throw new Error(res.data.message || "Failed to save banners");
      }
    } catch (err) {
      console.error("Save error:", err);
      setFormError(err.response?.data?.message || "Failed to save banner configuration");
    } finally {
      setIsUploading(false);
    }
  };

  // Delete banner (physical file)
  const handleDeleteBanner = async (bannerIndex) => {
    if (!canEdit) {
      showError(getPermissionMessage("delete", role));
      return;
    }

    if (!confirm(`Delete "${banners[bannerIndex]?.filename}"?`)) return;

    try {
      setIsUploading(true);
      const res = await api.put(`/discussion/banner?examId=${selectedExam}`, {
        action: 'removeBanner',
        bannerIndex
      });

      if (res.data.success) {
        success("Banner deleted successfully");
        // ✅ FIXED: Single refresh call
        await fetchExistingBannerCollection();
      } else {
        setFormError(res.data.message || "Failed to delete banner");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setFormError(err.response?.data?.message || "Failed to delete banner");
    } finally {
      setIsUploading(false);
    }
  };

  // Set default banner
  const handleSetDefaultBanner = async (bannerIndex) => {
    if (!canEdit) return;

    try {
      setIsUploading(true);
      const res = await api.put(`/discussion/banner?examId=${selectedExam}`, {
        action: 'setDefault',
        bannerIndex
      });

      if (res.data.success) {
        setCurrentBannerIndex(bannerIndex);
        success("Default banner updated");
        // ✅ FIXED: Single refresh call
        await fetchExistingBannerCollection();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update default banner");
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ DRAG AND DROP HANDLERS
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    try {
      setIsUploading(true);
      
      // Reorder banners array
      const reorderedBanners = [...banners];
      const draggedBanner = reorderedBanners[draggedIndex];
      reorderedBanners.splice(draggedIndex, 1);
      reorderedBanners.splice(dropIndex, 0, draggedBanner);
      
      // Update backend
      const res = await api.put(`/discussion/banner?examId=${selectedExam}`, {
        action: 'reorder',
        banners: reorderedBanners.map(b => ({
          url: cleanImageUrl(b.url),
          filename: b.filename,
          altText: b.altText,
          isActive: b.isActive !== false
        }))
      });

      if (res.data.success) {
        setBanners(reorderedBanners);
        
        // Update current banner index if needed
        if (currentBannerIndex === draggedIndex) {
          setCurrentBannerIndex(dropIndex);
        } else if (draggedIndex < currentBannerIndex && dropIndex >= currentBannerIndex) {
          setCurrentBannerIndex(currentBannerIndex - 1);
        } else if (draggedIndex > currentBannerIndex && dropIndex <= currentBannerIndex) {
          setCurrentBannerIndex(currentBannerIndex + 1);
        }
        
        success("Banners reordered successfully");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to reorder banners");
    } finally {
      setIsUploading(false);
      setDraggedIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleResetForm = () => {
    setSelectedExam("");
    resetBannerState();
    setFormError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (bannerImage && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  // Stats
  const examsWithBanners = useMemo(() => {
    return exams.filter(exam => {
      return existingBannerCollection?.examId === exam._id;
    });
  }, [exams, existingBannerCollection]);

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 rounded-xl border border-gray-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-10 opacity-10 pointer-events-none">
            <FaIcons.FaImage size={100} />
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Discussion Banner Management
              </h1>
              <p className="text-sm text-gray-600 max-w-md">
                Upload & manage exam-specific banners stored in <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">public/images/banner/[exam]/</code>
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm p-3 rounded-xl border">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Exams</p>
                <p className="text-lg font-bold text-gray-900">{exams.length}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wide flex items-center gap-1 justify-center">
                  <FaIcons.FaImage size={12} /> Configured
                </p>
                <p className="text-lg font-bold text-purple-600">{examsWithBanners.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900">Banner Upload & Configuration</h2>
          </div>

          <div className="p-6 space-y-6">
            {formError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <FaIcons.FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-800 leading-relaxed">{formError}</span>
              </div>
            )}

            {/* Exam Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Select Exam <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedExam}
                  onChange={(e) => {
                    setSelectedExam(e.target.value);
                    setSelectedExamName(filteredExams.find(exam => exam._id === e.target.value)?.name || "");
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all bg-white shadow-sm"
                  disabled={isLoading}
                >
                  <option value="">Choose an exam...</option>
                  {filteredExams.map((exam) => (
                    <option key={exam._id} value={exam._id}>
                      {exam.name}
                    </option>
                  ))}
                </select>
                {selectedExamName && (
                  <p className="text-xs text-gray-500 mt-1">Managing: <strong>{selectedExamName}</strong></p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Search Exams</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by exam name..."
                    className="w-full pl-10 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all shadow-sm"
                  />
                  <FaIcons.FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      <FaIcons.FaTimes className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {selectedExam && (
              <>
                {/* Upload Area */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Banner Image <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Max: 5MB, Recommended: 1200x300px)</span>
                  </label>
                  
                  {previewUrl && (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                        onError={(e) => {
                          console.error("Preview failed:", previewUrl);
                          e.target.style.display = 'none';
                        }}
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center">
                          <LoadingSpinner size="md" />
                        </div>
                      )}
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
                      className={`block w-full p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all shadow-sm ${
                        !canEdit
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed text-gray-400"
                          : isUploading
                          ? "border-gray-300 bg-gray-50 cursor-not-allowed text-gray-500"
                          : "border-purple-300 bg-purple-50 hover:border-purple-400 hover:bg-purple-100 text-purple-700 hover:shadow-md"
                      }`}
                    >
                      <FaIcons.FaCloudUploadAlt className="mx-auto mb-2 text-3xl opacity-75" />
                      <div>
                        {!canEdit ? "No edit permission" : isUploading ? "Uploading..." : "Click to upload image"}
                      </div>
                      <p className="text-xs mt-1 opacity-75">
                        {isUploading ? "" : "PNG, JPG, GIF, WebP up to 5MB"}
                      </p>
                    </label>
                  </div>
                </div>

                {/* Banner Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Alt Text</label>
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Accessibility text (optional)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
                      disabled={!canEdit || isUploading}
                    />
                  </div>
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mr-3"
                      disabled={!canEdit || isUploading}
                    />
                    <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                      Banner is active
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={handleSaveBanner}
                    disabled={isUploading || banners.length === 0 || !canEdit}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 flex-1"
                  >
                    {isUploading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Saving Configuration...
                      </>
                    ) : (
                      <>
                        <FaIcons.FaSave size={16} />
                        {existingBannerCollection ? "Update Config" : "Save Config"}
                      </>
                    )}
                  </button>

                  {banners.length > 0 && canEdit && (
                    <>
                      <button
                        onClick={() => handleDeleteBanner(currentBannerIndex)}
                        disabled={isUploading || !existingBannerCollection}
                        className="px-8 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 flex-1 sm:flex-none"
                      >
                        <FaIcons.FaTrash size={16} />
                        Delete Current
                      </button>
                      <button
                        onClick={() => handleSetDefaultBanner(currentBannerIndex)}
                        disabled={isUploading}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 flex-1 sm:flex-none"
                      >
                        <FaIcons.FaStar size={16} />
                        Set Default
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleResetForm}
                    disabled={isUploading}
                    className="px-8 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 flex-1 sm:flex-none"
                  >
                    <FaIcons.FaTimes size={16} />
                    Reset
                  </button>
                </div>

                {banners.length > 0 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <FaIcons.FaCheckCircle className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-emerald-800">
                        Ready! Found {banners.length} banner{banners.length !== 1 ? 's' : ''} for {selectedExamName}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Current Banners */}
        {selectedExam && banners.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-xl font-semibold text-gray-900">
                Current Banners ({banners.length})
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <FaIcons.FaInfoCircle className="inline mr-2" />
                  Drag and drop banners to reorder their position. Click &quot;Set Default&quot; to make a banner the primary one.
                </p>
                {banners.length > 1 && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                    Position {currentBannerIndex + 1} is the default banner
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {banners.map((banner, index) => (
                  <div
                    key={banner.filename || index}
                    draggable={canEdit && !isUploading}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`group relative border-2 rounded-xl p-6 hover:shadow-xl transition-all cursor-move hover:scale-[1.02] ${
                      draggedIndex === index
                        ? "opacity-50 scale-95"
                        : dragOverIndex === index
                        ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100"
                        : currentBannerIndex === index
                        ? "border-purple-500 bg-purple-50 ring-4 ring-purple-100 shadow-2xl"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={() => {
                      if (draggedIndex === null) {
                        setCurrentBannerIndex(index);
                        setPreviewUrl(banner.url);
                        setAltText(banner.altText || "");
                        setIsActive(banner.isActive !== false);
                      }
                    }}
                  >
                    {/* Drag Handle */}
                    {canEdit && (
                      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-gray-800 text-white p-2 rounded-lg cursor-move shadow-lg">
                          <FaIcons.FaGripVertical size={12} />
                        </div>
                      </div>
                    )}

                    {/* Position Badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                        currentBannerIndex === index
                          ? "bg-purple-600 text-white"
                          : "bg-gray-600 text-white"
                      }`}>
                        #{index + 1}
                      </div>
                    </div>

                    <div className="relative mb-4 mt-8">
                      <img
                        src={banner.url}
                        alt={banner.altText || "Banner"}
                        className="w-full h-32 object-cover rounded-lg border border-gray-100 shadow-sm"
                        onLoad={(e) => {
                          console.log("✅ Banner loaded successfully:", banner.url);
                        }}
                        onError={(e) => {
                          console.error("❌ Banner failed to load:", banner.url);
                          console.error("❌ Full banner object:", banner);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      {currentBannerIndex === index && (
                        <div className="absolute -inset-2 bg-purple-500/10 rounded-lg flex items-center justify-center pointer-events-none">
                          <FaIcons.FaCrown className="text-purple-600 text-xl" />
                        </div>
                      )}
                      {draggedIndex === index && (
                        <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center pointer-events-none">
                          <div className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold">
                            Dragging...
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded-lg truncate">
                        {banner.filename}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-1">{banner.altText || "No alt text"}</p>
                      <div className="flex items-center justify-between pt-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          banner.isActive !== false 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {banner.isActive !== false ? "Active" : "Inactive"}
                        </span>
                        {canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefaultBanner(index);
                            }}
                            disabled={isUploading}
                            className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all shadow-sm ${
                              currentBannerIndex === index
                                ? "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-300"
                                : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-sm"
                            }`}
                          >
                            {currentBannerIndex === index ? "⭐ Default" : "Set Default"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Exams */}
        {exams.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-xl font-semibold text-gray-900">All Exams</h2>
              <p className="text-sm text-gray-600">Click any exam to manage banners</p>
            </div>
            <LoadingWrapper isLoading={isLoading}>
              <div className="p-6">
                {filteredExams.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <FaIcons.FaSearch size={28} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No exams found</h3>
                    <p className="text-gray-500">Try adjusting your search</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredExams.map((exam) => {
                      const hasBanners = existingBannerCollection?.examId === exam._id;
                      return (
                        <div
                          key={exam._id}
                          className={`group border-2 rounded-xl p-6 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                            selectedExam === exam._id
                              ? "border-purple-500 bg-purple-50 ring-4 ring-purple-100 shadow-2xl"
                              : "border-gray-200 bg-white hover:border-purple-200"
                          }`}
                          onClick={() => setSelectedExam(exam._id)}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-bold text-gray-900 text-base mb-1 truncate">{exam.name}</h3>
                              <p className="text-xs text-gray-500">
                                Status: <span className={`font-semibold px-2 py-0.5 rounded-full ${
                                  exam.status === 'active' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {exam.status}
                                </span>
                              </p>
                            </div>
                            {hasBanners && (
                              <div className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1.5 rounded-full font-semibold ml-2">
                                {banners.length} banner{banners.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                          
                          {hasBanners && banners[0] && (
                            <div className="w-full h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                              <img
                                src={banners[0].url}
                                alt={`${exam.name} banner`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentNode.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center"><svg class="w-8 h-8 text-white opacity-75" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg></div>';
                                }}
                              />
                            </div>
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
