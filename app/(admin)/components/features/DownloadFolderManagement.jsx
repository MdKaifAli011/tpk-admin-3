"use client";
import React, { useState, useEffect, useRef } from "react";
import { LoadingWrapper, LoadingSpinner } from "../ui/SkeletonLoader";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaFolder,
  FaFolderOpen,
  FaEdit,
  FaTrash,
  FaChevronRight,
  FaChevronDown,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import DownloadListPagination from "../common/DownloadListPagination";
import DownloadListSearchBar from "../common/DownloadListSearchBar";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";

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

const FolderList = ({ folders, onEdit, onDelete, onToggleStatus }) => {
  if (!folders || folders.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-5xl mb-3">📁</div>
        <h3 className="text-sm font-bold text-gray-800 mb-1.5">
          No Folders Found
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Create your first folder to start organizing your downloads.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {folders.map((folder) => (
        <div
          key={folder._id}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <FaFolder className="w-5 h-5 text-blue-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {folder.name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {folder.examId?.name || "General"}{" "}
              {folder.description && `• ${folder.description}`}
            </div>
          </div>
          <StatusBadge
            status={folder.status}
            onClick={() => onToggleStatus(folder)}
          />
          <div className="flex items-center gap-1">
            <PermissionButton
              action="edit"
              onClick={() => onEdit(folder)}
              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
              title="Edit Folder"
            >
              <FaEdit className="text-sm" />
            </PermissionButton>
            <PermissionButton
              action="delete"
              onClick={() => onDelete(folder)}
              className="p-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
              title="Delete Folder"
            >
              <FaTrash className="text-sm" />
            </PermissionButton>
          </div>
        </div>
      ))}
    </div>
  );
};

const DownloadFolderManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [totalFolders, setTotalFolders] = useState(0);
  const [folderPage, setFolderPage] = useState(1);
  const [folderPageSize, setFolderPageSize] = useState(50);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [folderSearchInput, setFolderSearchInput] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    examId: "",
    status: "active",
    description: "",
  });

  const [formError, setFormError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  const fetchFolders = async (page = 1, limit = folderPageSize, searchOverride) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsDataLoading(true);
    setError(null);
    const effectiveSearch =
      searchOverride !== undefined ? searchOverride : folderSearch;
    const q = String(effectiveSearch || "").trim();
    const searchParam = q ? `&search=${encodeURIComponent(q)}` : "";
    const examParam = selectedExam
      ? `&examId=${encodeURIComponent(selectedExam)}`
      : "";
    try {
      const foldersRes = await api.get(
        `/download/folder?status=all&parentFolderId=null&limit=${limit}&page=${page}${examParam}${searchParam}`
      );
      if (foldersRes.data?.success) {
        const list = foldersRes.data.data || [];
        const total = foldersRes.data.pagination?.total ?? list.length;
        if (list.length === 0 && page > 1 && total > 0) {
          isFetchingRef.current = false;
          setIsDataLoading(false);
          await fetchFolders(page - 1, limit, effectiveSearch);
          return;
        }
        setFolders(list);
        setFolderPage(page);
        setTotalFolders(total);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  };

  const loadExams = async () => {
    try {
      const examsRes = await api.get("/exam?status=active");
      if (examsRes?.data?.success) setExams(examsRes.data.data || []);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  const examFilterInitialized = useRef(false);

  useEffect(() => {
    loadExams();
    fetchFolders(1, folderPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  useEffect(() => {
    if (!examFilterInitialized.current) {
      examFilterInitialized.current = true;
      return;
    }
    fetchFolders(1, folderPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when exam filter changes
  }, [selectedExam]);

  const applyFolderSearch = () => {
    const q = folderSearchInput.trim();
    setFolderSearch(q);
    fetchFolders(1, folderPageSize, q);
  };

  const clearFolderSearch = () => {
    setFolderSearchInput("");
    setFolderSearch("");
    fetchFolders(1, folderPageSize, "");
  };

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!formData.name.trim())
      return setFormError("Please enter a folder name");

    try {
      setIsFormLoading(true);
      setFormError(null);
      const payload = {
        name: formData.name.trim(),
        parentFolderId: formData.parentFolderId || null,
        examId: formData.examId || null,
        status: formData.status,
        description: formData.description || "",
      };
      const response = await api.post("/download/folder", payload);
      if (response.data.success) {
        fetchFolders(1, folderPageSize);
        success(`Folder "${formData.name}" created!`);
        setFormData({
          name: "",
          parentFolderId: "",
          examId: "",
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

  const handleEditFolder = async (e) => {
    e.preventDefault();
    if (!formData.name.trim())
      return setFormError("Please enter a folder name");

    try {
      setIsFormLoading(true);
      setFormError(null);
      const payload = {
        name: formData.name.trim(),
        parentFolderId: null, // Root folders only
        examId: formData.examId || null,
        status: formData.status,
        description: formData.description || "",
      };
      const response = await api.put(
        `/download/folder/${editingFolder._id}`,
        payload
      );
      if (response.data.success) {
        fetchFolders(folderPage, folderPageSize);
        success(`Folder "${formData.name}" updated!`);
        setShowEditForm(false);
        setEditingFolder(null);
        setFormData({
          name: "",
          parentFolderId: "",
          examId: "",
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
  };

  const handleToggleStatus = async (folder) => {
    const isActive = folder.status === "active";
    const newStatus = isActive ? "inactive" : "active";
    try {
      const response = await api.put(`/download/folder/${folder._id}/status`, {
        status: newStatus,
      });
      if (response.data.success) {
        setFolders((prev) =>
          prev.map((f) =>
            f._id === folder._id ? { ...f, status: newStatus } : f
          )
        );
        success(`Status updated to ${newStatus}`);
      }
    } catch (err) {
      showError("Failed to update status");
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Delete folder "${folder.name}" and all its contents?`))
      return;
    try {
      const response = await api.delete(`/download/folder/${folder._id}`);
      if (response.data.success) {
        fetchFolders(folderPage, folderPageSize);
        success("Folder deleted successfully");
      }
    } catch (err) {
      showError("Failed to delete folder");
    }
  };

  const handleEdit = (folder) => {
    setEditingFolder(folder);
    setFormData({
      name: folder.name,
      examId: folder.examId?._id || folder.examId || "",
      status: folder.status,
      description: folder.description || "",
    });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const handleCancelForm = () => {
    setFormData({
      name: "",
      examId: "",
      status: "active",
      description: "",
    });
    setFormError(null);
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingFolder(null);
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="min-w-0 flex-1 max-w-xl">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">
                  Download Folder Management
                </h1>
                <p className="text-xs text-gray-600">
                  Create and organize folders and subfolders for your downloads.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-[min(100%,22rem)] lg:max-w-2xl">
                <DownloadListSearchBar
                  variant="toolbar"
                  inputId="folder-mgmt-search"
                  inputAriaLabel="Search folders"
                  value={folderSearchInput}
                  onChange={setFolderSearchInput}
                  onSearch={applyFolderSearch}
                  onClear={clearFolderSearch}
                  activeQuery={folderSearch}
                  placeholder="Search folders…"
                  loading={isDataLoading}
                  className="flex-1 min-w-0 sm:pt-0.5"
                />
                <PermissionButton
                  action="create"
                  onClick={() => {
                    setShowAddForm(true);
                    setShowEditForm(false);
                    setEditingFolder(null);
                  }}
                  className="shrink-0 self-end sm:self-center px-3 py-2 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm whitespace-nowrap"
                >
                  Add New Folder
                </PermissionButton>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Folder Form */}
        {(showAddForm || showEditForm) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {showEditForm ? "Edit Folder" : "Add New Folder"}
              </h2>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                disabled={isFormLoading}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={showEditForm ? handleEditFolder : handleAddFolder}
              className="space-y-4"
            >
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
                {/* Folder Name */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Folder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Enter folder name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    required
                    disabled={isFormLoading}
                  />
                </div>

                {/* Exam */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="examId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Exam <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="examId"
                    name="examId"
                    value={formData.examId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                    disabled={isFormLoading}
                  >
                    <option value="">-- Select Exam --</option>
                    {exams.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.name}
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
                    placeholder="Enter folder description (optional)"
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
                      <span>
                        {showEditForm ? "Update Folder" : "Add Folder"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Exam Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label
              htmlFor="examFilter"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Filter by Exam:
            </label>
            <select
              id="examFilter"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
            >
              <option value="">-- All Exams --</option>
              {exams.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Folders List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Root Folders
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your root folders (create subfolders in Subfolder
                  Management)
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            {isDataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <LoadingSpinner size="medium" />
                  <p className="text-sm text-gray-500 mt-3">
                    Loading folders...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <FolderList
                  folders={folders}
                  onEdit={handleEdit}
                  onDelete={handleDeleteFolder}
                  onToggleStatus={handleToggleStatus}
                />
                <DownloadListPagination
                  page={folderPage}
                  totalItems={totalFolders}
                  pageSize={folderPageSize}
                  onPageChange={(p) => fetchFolders(p, folderPageSize)}
                  onPageSizeChange={(s) => {
                    setFolderPageSize(s);
                    fetchFolders(1, s);
                  }}
                  loading={isDataLoading}
                  itemLabel="folders"
                  hint="Use Previous / Next for more pages. Per page sets how many folders load at once."
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DownloadFolderManagement;
