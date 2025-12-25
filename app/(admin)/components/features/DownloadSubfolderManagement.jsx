"use client";
import React, { useState, useEffect, useRef } from "react";
import { LoadingWrapper, LoadingSpinner } from "../ui/SkeletonLoader";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaFolder,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";

const StatusBadge = ({ status, onClick }) => {
  const getStatusStyles = (s) => {
    switch (s) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
        status
      )}`}
    >
      {(status || "active").charAt(0).toUpperCase() +
        (status || "active").slice(1)}
    </button>
  );
};

const SubfolderList = ({ subfolders, onEdit, onDelete, onToggleStatus }) => {
  if (!subfolders || subfolders.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-5xl mb-3">📂</div>
        <h3 className="text-sm font-bold text-gray-800 mb-1.5">
          No Subfolders Found
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Create subfolders inside the selected folder to organize your files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {subfolders.map((subfolder) => (
        <div
          key={subfolder._id}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <FaFolder className="w-5 h-5 text-indigo-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {subfolder.name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {subfolder.parentFolderId?.name || "Unknown"} {subfolder.description && `• ${subfolder.description}`}
            </div>
          </div>
          <StatusBadge
            status={subfolder.status}
            onClick={() => onToggleStatus(subfolder)}
          />
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(subfolder)}
              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
              title="Edit Subfolder"
            >
              <FaEdit className="text-sm" />
            </button>
            <button
              onClick={() => onDelete(subfolder)}
              className="p-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
              title="Delete Subfolder"
            >
              <FaTrash className="text-sm" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const DownloadSubfolderManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSubfolder, setEditingSubfolder] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [subfolders, setSubfolders] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    parentFolderId: "",
    status: "active",
    description: "",
  });

  const [formError, setFormError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);

      const foldersRes = await api.get("/download/folder?status=all&parentFolderId=null");

      if (foldersRes.data?.success) {
        setFolders(foldersRes.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data");
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchSubfolders = async (folderId) => {
    if (!folderId) {
      setSubfolders([]);
      return;
    }
    try {
      setIsDataLoading(true);
      const response = await api.get(`/download/folder?status=all&parentFolderId=${folderId}`);
      if (response.data?.success) {
        setSubfolders(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching subfolders:", error);
      showError("Failed to fetch subfolders");
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedFolderId) {
      fetchSubfolders(selectedFolderId);
    } else {
      setSubfolders([]);
    }
  }, [selectedFolderId]);

  const handleAddSubfolder = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setFormError("Please enter a subfolder name");
    if (!formData.parentFolderId) return setFormError("Please select a parent folder");

    try {
      setIsFormLoading(true);
      setFormError(null);
      const payload = {
        name: formData.name.trim(),
        parentFolderId: formData.parentFolderId,
        status: formData.status,
        description: formData.description || "",
      };
      const response = await api.post("/download/folder", payload);
      if (response.data.success) {
        fetchSubfolders(selectedFolderId);
        success(`Subfolder "${formData.name}" created!`);
        setFormData({
          name: "",
          parentFolderId: selectedFolderId,
          status: "active",
          description: "",
        });
        setShowAddForm(false);
      } else {
        setFormError(response.data.message || "Failed");
        showError(response.data.message);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed";
      setFormError(msg);
      showError(msg);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleEditSubfolder = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setFormError("Please enter a subfolder name");
    if (!formData.parentFolderId) return setFormError("Please select a parent folder");

    try {
      setIsFormLoading(true);
      setFormError(null);
      const payload = {
        name: formData.name.trim(),
        parentFolderId: formData.parentFolderId,
        status: formData.status,
        description: formData.description || "",
      };
      const response = await api.put(`/download/folder/${editingSubfolder._id}`, payload);
      if (response.data.success) {
        fetchSubfolders(selectedFolderId);
        success(`Subfolder "${formData.name}" updated!`);
        setShowEditForm(false);
        setEditingSubfolder(null);
        setFormData({
          name: "",
          parentFolderId: selectedFolderId,
          status: "active",
          description: "",
        });
      } else {
        setFormError(response.data.message || "Failed");
        showError(response.data.message);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed";
      setFormError(msg);
      showError(msg);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
    
    // When parent folder changes, update selected folder and fetch subfolders
    if (name === "parentFolderId") {
      setSelectedFolderId(value);
      if (value) {
        fetchSubfolders(value);
      } else {
        setSubfolders([]);
      }
    }
  };

  const handleToggleStatus = async (subfolder) => {
    const isActive = subfolder.status === "active";
    const newStatus = isActive ? "inactive" : "active";
    try {
      const response = await api.put(`/download/folder/${subfolder._id}/status`, {
        status: newStatus,
      });
      if (response.data.success) {
        setSubfolders((prev) =>
          prev.map((f) =>
            f._id === subfolder._id ? { ...f, status: newStatus } : f
          )
        );
        success(`Status updated to ${newStatus}`);
      }
    } catch (err) {
      showError("Failed to update status");
    }
  };

  const handleDeleteSubfolder = async (subfolder) => {
    if (!window.confirm(`Delete subfolder "${subfolder.name}" and all its contents?`)) return;
    try {
      const response = await api.delete(`/download/folder/${subfolder._id}`);
      if (response.data.success) {
        setSubfolders((prev) => prev.filter((f) => f._id !== subfolder._id));
        success("Subfolder deleted successfully");
      }
    } catch (err) {
      showError("Failed to delete subfolder");
    }
  };

  const handleEdit = (subfolder) => {
    setEditingSubfolder(subfolder);
    setFormData({
      name: subfolder.name,
      parentFolderId: subfolder.parentFolderId?._id || subfolder.parentFolderId || selectedFolderId,
      status: subfolder.status,
      description: subfolder.description || "",
    });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const handleCancelForm = () => {
    setFormData({
      name: "",
      parentFolderId: selectedFolderId,
      status: "active",
      description: "",
    });
    setFormError(null);
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingSubfolder(null);
  };

  const handleFolderSelect = (e) => {
    const folderId = e.target.value;
    setSelectedFolderId(folderId);
    if (folderId) {
      fetchSubfolders(folderId);
      setFormData((prev) => ({ ...prev, parentFolderId: folderId }));
    } else {
      setSubfolders([]);
      setFormData((prev) => ({ ...prev, parentFolderId: "" }));
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
                Download Subfolder Management
              </h1>
              <p className="text-xs text-gray-600">
                Create and manage subfolders inside your root folders.
              </p>
            </div>
            <button
              onClick={() => {
                if (!selectedFolderId) {
                  showError("Please select a folder first");
                  return;
                }
                setShowAddForm(true);
                setShowEditForm(false);
                setEditingSubfolder(null);
                setFormData({
                  name: "",
                  parentFolderId: selectedFolderId,
                  status: "active",
                  description: "",
                });
              }}
              className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedFolderId}
            >
              Add New Subfolder
            </button>
          </div>
        </div>

        {/* Folder Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label
              htmlFor="folderSelect"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Select Folder: <span className="text-red-500">*</span>
            </label>
            <select
              id="folderSelect"
              value={selectedFolderId}
              onChange={handleFolderSelect}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
              required
            >
              <option value="">-- Select a Folder --</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} {f.examId?.name && `(${f.examId.name})`}
                </option>
              ))}
            </select>
          </div>
          {!selectedFolderId && (
            <p className="text-xs text-gray-500 mt-2">
              Please select a folder to view and manage its subfolders
            </p>
          )}
        </div>

        {/* Add/Edit Subfolder Form */}
        {(showAddForm || showEditForm) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {showEditForm ? "Edit Subfolder" : "Add New Subfolder"}
              </h2>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                disabled={isFormLoading}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={showEditForm ? handleEditSubfolder : handleAddSubfolder} className="space-y-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subfolder Name */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Subfolder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Enter subfolder name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    required
                    disabled={isFormLoading}
                  />
                </div>

                {/* Parent Folder */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="parentFolderId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Parent Folder <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="parentFolderId"
                    name="parentFolderId"
                    value={formData.parentFolderId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                    disabled={isFormLoading || showEditForm}
                  >
                    <option value="">-- Select Folder --</option>
                    {folders.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} {f.examId?.name && `(${f.examId.name})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    disabled={isFormLoading}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Enter subfolder description (optional)"
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all resize-none"
                    disabled={isFormLoading}
                  />
                </div>
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
                      <span>{showEditForm ? "Updating..." : "Adding..."}</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>{showEditForm ? "Update Subfolder" : "Add Subfolder"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subfolders List */}
        {selectedFolderId && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Subfolders
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage subfolders in the selected folder
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {isDataLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <LoadingSpinner size="medium" />
                    <p className="text-sm text-gray-500 mt-3">Loading subfolders...</p>
                  </div>
                </div>
              ) : (
                <SubfolderList
                  subfolders={subfolders}
                  onEdit={handleEdit}
                  onDelete={handleDeleteSubfolder}
                  onToggleStatus={handleToggleStatus}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DownloadSubfolderManagement;

