"use client";
import React, { useState, useEffect, useRef } from "react";
import { LoadingWrapper, LoadingSpinner } from "../ui/SkeletonLoader";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaFile,
  FaFileAlt,
  FaEdit,
  FaTrash,
  FaLink,
  FaUpload,
  FaDownload,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
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

  const FileTable = ({ files, folders, subfolders, onEdit, onDelete, onToggleStatus }) => {
    const { role } = usePermissions();
  const getSubfolderName = (subfolderId) => {
    const subfolder = subfolders.find(
      (f) => f._id === subfolderId || f._id === (subfolderId?._id || subfolderId)
    );
    return subfolder?.name || "Unknown";
  };

  const getFolderName = (folderId) => {
    const folder = folders.find(
      (f) => f._id === folderId || f._id === (folderId?._id || folderId)
    );
    return folder?.name || "Unknown";
  };

  // Group files by subfolder
  const filesBySubfolder = {};
  const filesWithoutSubfolder = [];

  files.forEach((file) => {
    const fileFolderId = file.folderId?._id || file.folderId;
    const isSubfolder = subfolders.some(
      (sf) => sf._id === fileFolderId
    );
    
    if (isSubfolder) {
      if (!filesBySubfolder[fileFolderId]) {
        filesBySubfolder[fileFolderId] = [];
      }
      filesBySubfolder[fileFolderId].push(file);
    } else {
      filesWithoutSubfolder.push(file);
    }
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  if (!files || files.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-5xl mb-3">📄</div>
        <h3 className="text-sm font-bold text-gray-800 mb-1.5">
          No Files Found
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Add files to folders to organize your downloads.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Files grouped by subfolder */}
      {Object.keys(filesBySubfolder).length > 0 && (
        <>
          {Object.entries(filesBySubfolder).map(([subfolderId, subfolderFiles]) => {
            const subfolder = subfolders.find(
              (sf) => sf._id === subfolderId
            );
            const parentFolder = folders.find(
              (f) => f._id === (subfolder?.parentFolderId?._id || subfolder?.parentFolderId)
            );

            return (
              <div key={subfolderId} className="space-y-2">
                {/* Subfolder Header */}
                <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{subfolder?.name || "Unknown"}</h3>
                      {parentFolder && (
                        <p className="text-xs text-blue-100 mt-0.5">
                          Folder: {parentFolder.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Files Table */}
                <div className="bg-white rounded-b-lg border border-gray-200 border-t-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            File Details
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subfolderFiles.map((file, index) => (
                          <tr
                            key={file._id || index}
                            className={`hover:bg-gray-50 transition-colors ${
                              file.status === "inactive" ? "opacity-60" : ""
                            } ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {file.fileType === "url" ? (
                                  <FaLink className="w-4 h-4 text-blue-500 shrink-0" />
                                ) : (
                                  <FaFile className="w-4 h-4 text-gray-500 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900">
                                    {file.name}
                                  </div>
                                  {file.slug && (
                                    <div className="text-xs text-gray-500 mt-0.5 font-mono truncate" title={file.slug}>
                                      /{file.slug}
                                    </div>
                                  )}
                                  {file.description && (
                                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                      {file.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {file.fileType === "url" ? (
                                  <>
                                    <FaLink className="w-3 h-3" />
                                    URL
                                  </>
                                ) : (
                                  <>
                                    <FaUpload className="w-3 h-3" />
                                    Upload
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatFileSize(file.fileSize)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge
                                status={file.status}
                                onClick={() => onToggleStatus(file)}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <PermissionButton
                                  action="edit"
                                  onClick={() => onEdit(file)}
                                  className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                                  title="Edit File"
                                >
                                  <FaEdit className="text-sm" />
                                </PermissionButton>
                                <PermissionButton
                                  action="delete"
                                  onClick={() => onDelete(file)}
                                  className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                                  title="Delete File"
                                >
                                  <FaTrash className="text-sm" />
                                </PermissionButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Files without subfolder (directly in folder) */}
      {filesWithoutSubfolder.length > 0 && (
        <div className="space-y-2">
          <div className="bg-gray-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="text-sm font-semibold">Files (No Subfolder)</h3>
          </div>
          <div className="bg-white rounded-b-lg border border-gray-200 border-t-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Folder
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filesWithoutSubfolder.map((file, index) => (
                    <tr
                      key={file._id || index}
                      className={`hover:bg-gray-50 transition-colors ${
                        file.status === "inactive" ? "opacity-60" : ""
                      } ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {file.fileType === "url" ? (
                            <FaLink className="w-4 h-4 text-blue-500 shrink-0" />
                          ) : (
                            <FaFile className="w-4 h-4 text-gray-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {file.name}
                            </div>
                            {file.slug && (
                              <div className="text-xs text-gray-500 mt-0.5 font-mono truncate" title={file.slug}>
                                /{file.slug}
                              </div>
                            )}
                            {file.description && (
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {file.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getFolderName(file.folderId)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {file.fileType === "url" ? (
                            <>
                              <FaLink className="w-3 h-3" />
                              URL
                            </>
                          ) : (
                            <>
                              <FaUpload className="w-3 h-3" />
                              Upload
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatFileSize(file.fileSize)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={file.status}
                          onClick={() => onToggleStatus(file)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEdit(file)}
                            className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                            title="Edit File"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => onDelete(file)}
                            className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                            title="Delete File"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {Object.keys(filesBySubfolder).length === 0 && filesWithoutSubfolder.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-5xl mb-3">📄</div>
          <h3 className="text-sm font-bold text-gray-800 mb-1.5">
            No Files Found
          </h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Add files to subfolders to organize your downloads.
          </p>
        </div>
      )}
    </div>
  );
};

const DownloadFileManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [filePage, setFilePage] = useState(1);
  const [loadingMoreFiles, setLoadingMoreFiles] = useState(false);
  const [folders, setFolders] = useState([]);
  const [totalFolders, setTotalFolders] = useState(0);
  const [folderPage, setFolderPage] = useState(1);
  const [loadingMoreFolders, setLoadingMoreFolders] = useState(false);
  const [subfolders, setSubfolders] = useState([]);
  const [totalSubfolders, setTotalSubfolders] = useState(0);
  const [subfolderPage, setSubfolderPage] = useState(1);
  const [loadingMoreSubfolders, setLoadingMoreSubfolders] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedSubfolderId, setSelectedSubfolderId] = useState("");
  const [error, setError] = useState(null);

  const PAGE_SIZE = 50;

  const [formData, setFormData] = useState({
    name: "",
    folderId: "",
    fileType: "url",
    fileUrl: "",
    uploadedFile: "",
    fileSize: "",
    mimeType: "",
    description: "",
    status: "active",
  });

  const [formError, setFormError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  const fetchData = async (append = false) => {
    if (isFetchingRef.current && !append) return;
    if (append) setLoadingMoreFolders(true);
    else { isFetchingRef.current = true; setIsDataLoading(true); setError(null); }
    const page = append ? folderPage + 1 : 1;
    try {
      const foldersRes = await api.get(`/download/folder?status=all&parentFolderId=null&limit=${PAGE_SIZE}&page=${page}`);
      if (foldersRes.data?.success) {
        const list = foldersRes.data.data || [];
        const total = foldersRes.data.pagination?.total ?? list.length;
        if (append) {
          setFolders((prev) => [...prev, ...list]);
          setFolderPage(page);
        } else {
          setFolders(list);
          setFolderPage(1);
        }
        setTotalFolders(total);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setIsDataLoading(false);
      setLoadingMoreFolders(false);
      isFetchingRef.current = false;
    }
  };

  const fetchSubfolders = async (folderId, append = false) => {
    if (!folderId) {
      setSubfolders([]);
      setTotalSubfolders(0);
      setSubfolderPage(1);
      setSelectedSubfolderId("");
      setFiles([]);
      return;
    }
    if (append) setLoadingMoreSubfolders(true);
    else setIsDataLoading(true);
    const page = append ? subfolderPage + 1 : 1;
    try {
      const response = await api.get(`/download/folder?status=all&parentFolderId=${folderId}&limit=${PAGE_SIZE}&page=${page}`);
      if (response.data?.success) {
        const list = response.data.data || [];
        const total = response.data.pagination?.total ?? list.length;
        if (append) {
          setSubfolders((prev) => [...prev, ...list]);
          setSubfolderPage(page);
        } else {
          setSubfolders(list);
          setSubfolderPage(1);
        }
        setTotalSubfolders(total);
      }
    } catch (err) {
      console.error("Error fetching subfolders:", err);
      showError("Failed to fetch subfolders");
    } finally {
      setIsDataLoading(false);
      setLoadingMoreSubfolders(false);
    }
  };

  const fetchFiles = async (subfolderId, append = false) => {
    if (!subfolderId) {
      setFiles([]);
      setTotalFiles(0);
      setFilePage(1);
      return;
    }
    if (append) setLoadingMoreFiles(true);
    else setIsDataLoading(true);
    const page = append ? filePage + 1 : 1;
    try {
      const response = await api.get(`/download/file?status=all&folderId=${subfolderId}&limit=${PAGE_SIZE}&page=${page}`);
      if (response.data?.success) {
        const list = response.data.data || [];
        const total = response.data.pagination?.total ?? list.length;
        if (append) {
          setFiles((prev) => [...prev, ...list]);
          setFilePage(page);
        } else {
          setFiles(list);
          setFilePage(1);
        }
        setTotalFiles(total);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
      showError("Failed to fetch files");
    } finally {
      setIsDataLoading(false);
      setLoadingMoreFiles(false);
    }
  };

  const hasMoreFolders = folders.length < totalFolders;
  const hasMoreSubfolders = subfolders.length < totalSubfolders;
  const hasMoreFiles = files.length < totalFiles;

  // Fetch all files when folder is selected (to show all files in all subfolders)
  const fetchAllFilesForFolder = async (folderId) => {
    if (!folderId) {
      setFiles([]);
      return;
    }
    try {
      setIsDataLoading(true);
      // Get all subfolders first
      const subfoldersRes = await api.get(`/download/folder?status=all&parentFolderId=${folderId}`);
      if (subfoldersRes.data?.success) {
        const allSubfolders = subfoldersRes.data.data || [];
        setSubfolders(allSubfolders);
        
        // Fetch files for all subfolders
        if (allSubfolders.length > 0) {
          const subfolderIds = allSubfolders.map((sf) => sf._id);
          const filesPromises = subfolderIds.map((subfolderId) =>
            api.get(`/download/file?status=all&folderId=${subfolderId}`)
          );
          const filesResponses = await Promise.all(filesPromises);
          const allFiles = filesResponses
            .map((res) => res.data?.data || [])
            .flat();
          setFiles(allFiles);
        } else {
          // If no subfolders, fetch files directly in folder
          const filesRes = await api.get(`/download/file?status=all&folderId=${folderId}`);
          if (filesRes.data?.success) {
            setFiles(filesRes.data.data || []);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching all files:", error);
      showError("Failed to fetch files");
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
      // Fetch all files for this folder (from all subfolders)
      fetchAllFilesForFolder(selectedFolderId);
    } else {
      setSubfolders([]);
      setSelectedSubfolderId("");
      setFiles([]);
    }
  }, [selectedFolderId]);

  useEffect(() => {
    if (selectedSubfolderId) {
      fetchFiles(selectedSubfolderId);
      setFormData((prev) => ({ ...prev, folderId: selectedSubfolderId }));
    } else if (selectedFolderId) {
      // If subfolder is cleared but folder is selected, show all files
      fetchAllFilesForFolder(selectedFolderId);
      setFormData((prev) => ({ ...prev, folderId: "" }));
    } else {
      setFiles([]);
      setFormData((prev) => ({ ...prev, folderId: "" }));
    }
  }, [selectedSubfolderId]);

  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setFormError("Please enter a file name");
    if (!formData.folderId) return setFormError("Please select a subfolder");
    const sameFolderFiles = files.filter(
      (f) => (f.folderId?._id || f.folderId) === formData.folderId
    );
    const nameExists = sameFolderFiles.some(
      (f) => f.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (nameExists) {
      return setFormError("A file with this name already exists in this subfolder. Use a different name.");
    }

    try {
      setIsFormLoading(true);
      setFormError(null);
      const payload = {
        name: formData.name.trim(),
        folderId: formData.folderId,
        fileType: formData.fileType,
        fileUrl: formData.fileType === "url" ? formData.fileUrl.trim() : undefined,
        uploadedFile: formData.fileType === "upload" ? formData.uploadedFile.trim() : undefined,
        fileSize: formData.fileSize ? parseInt(formData.fileSize) : undefined,
        mimeType: formData.mimeType || undefined,
        description: formData.description || "",
        status: formData.status,
      };
      const response = await api.post("/download/file", payload);
      if (response.data.success) {
        if (selectedFolderId) {
          fetchAllFilesForFolder(selectedFolderId);
        } else if (selectedSubfolderId) {
          fetchFiles(selectedSubfolderId);
        }
        success(`File "${formData.name}" created!`);
        setFormData({
          name: "",
          folderId: "",
          fileType: "url",
          fileUrl: "",
          uploadedFile: "",
          fileSize: "",
          mimeType: "",
          description: "",
          status: "active",
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

  const handleEditFile = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setFormError("Please enter a file name");
    if (!formData.folderId) return setFormError("File must belong to a subfolder");
    const sameFolderFiles = files.filter(
      (f) => (f.folderId?._id || f.folderId) === formData.folderId
    );
    const nameExists = sameFolderFiles.some(
      (f) =>
        f._id !== editingFile?._id &&
        f.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (nameExists) {
      return setFormError("A file with this name already exists in this subfolder. Use a different name.");
    }

    try {
      setIsFormLoading(true);
      setFormError(null);
      const payload = {
        name: formData.name.trim(),
        folderId: formData.folderId,
        fileType: formData.fileType,
        fileUrl: formData.fileType === "url" ? formData.fileUrl.trim() : undefined,
        uploadedFile: formData.fileType === "upload" ? formData.uploadedFile.trim() : undefined,
        fileSize: formData.fileSize ? parseInt(formData.fileSize) : undefined,
        mimeType: formData.mimeType || undefined,
        description: formData.description || "",
        status: formData.status,
      };
      const response = await api.put(`/download/file/${editingFile._id}`, payload);
      if (response.data.success) {
        if (selectedFolderId) {
          fetchAllFilesForFolder(selectedFolderId);
        } else if (selectedSubfolderId) {
          fetchFiles(selectedSubfolderId);
        }
        success(`File "${formData.name}" updated!`);
        setShowEditForm(false);
        setEditingFile(null);
        setFormData({
          name: "",
          folderId: "",
          fileType: "url",
          fileUrl: "",
          uploadedFile: "",
          fileSize: "",
          mimeType: "",
          description: "",
          status: "active",
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

  const handleToggleStatus = async (file) => {
    const isActive = file.status === "active";
    const newStatus = isActive ? "inactive" : "active";
    try {
      const response = await api.put(`/download/file/${file._id}/status`, {
        status: newStatus,
      });
      if (response.data.success) {
        setFiles((prev) =>
          prev.map((f) =>
            f._id === file._id ? { ...f, status: newStatus } : f
          )
        );
        success(`Status updated to ${newStatus}`);
      }
    } catch (err) {
      showError("Failed to update status");
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Delete file "${file.name}"?`)) return;
    try {
      const response = await api.delete(`/download/file/${file._id}`);
      if (response.data.success) {
        if (selectedFolderId) {
          fetchAllFilesForFolder(selectedFolderId);
        } else if (selectedSubfolderId) {
          fetchFiles(selectedSubfolderId);
        } else {
          setFiles((prev) => prev.filter((f) => f._id !== file._id));
        }
        success("File deleted successfully");
      }
    } catch (err) {
      showError("Failed to delete file");
    }
  };

  const handleEdit = async (file) => {
    const fileFolderId = file.folderId?._id || file.folderId;
    setEditingFile(file);
    
    // Find which folder this file's subfolder belongs to
    let fileSubfolder = subfolders.find(
      (sf) => sf._id === fileFolderId
    );
    
    // If subfolder not found in current list, fetch it
    if (!fileSubfolder) {
      try {
        const subfolderRes = await api.get(`/download/folder/${fileFolderId}`);
        if (subfolderRes.data?.success) {
          fileSubfolder = subfolderRes.data.data;
          const parentFolderId = fileSubfolder.parentFolderId?._id || fileSubfolder.parentFolderId;
          
          // Set the parent folder and fetch its subfolders
          if (parentFolderId && parentFolderId !== selectedFolderId) {
            setSelectedFolderId(parentFolderId);
            await fetchSubfolders(parentFolderId);
            await fetchAllFilesForFolder(parentFolderId);
          }
        }
      } catch (err) {
        console.error("Error fetching subfolder:", err);
      }
    }
    
    if (fileSubfolder) {
      const parentFolderId = fileSubfolder.parentFolderId?._id || fileSubfolder.parentFolderId;
      if (parentFolderId && parentFolderId !== selectedFolderId) {
        setSelectedFolderId(parentFolderId);
        await fetchSubfolders(parentFolderId);
        await fetchAllFilesForFolder(parentFolderId);
      }
      if (fileFolderId !== selectedSubfolderId) {
        setSelectedSubfolderId(fileFolderId);
      }
    }
    
    setFormData({
      name: file.name,
      folderId: fileFolderId,
      fileType: file.fileType,
      fileUrl: file.fileUrl || "",
      uploadedFile: file.uploadedFile || "",
      fileSize: file.fileSize || "",
      mimeType: file.mimeType || "",
      description: file.description || "",
      status: file.status,
    });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const handleCancelForm = () => {
    setFormData({
      name: "",
      folderId: "",
      fileType: "url",
      fileUrl: "",
      uploadedFile: "",
      fileSize: "",
      mimeType: "",
      description: "",
      status: "active",
    });
    setFormError(null);
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingFile(null);
  };

  const handleFolderSelect = (e) => {
    const folderId = e.target.value;
    setSelectedFolderId(folderId);
    setSelectedSubfolderId("");
    setFiles([]);
  };

  const handleSubfolderSelect = (e) => {
    const subfolderId = e.target.value;
    setSelectedSubfolderId(subfolderId);
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
                Download File Management
              </h1>
              <p className="text-xs text-gray-600">
                Add and manage files in your subfolders. Support both URL links and file uploads.
              </p>
            </div>
            <button
              onClick={() => {
                if (!selectedFolderId) {
                  showError("Please select a folder first");
                  return;
                }
                if (subfolders.length === 0) {
                  showError("Please create subfolders first in Subfolder Management");
                  return;
                }
                if (!selectedSubfolderId) {
                  showError("Please select a subfolder first");
                  return;
                }
                setShowAddForm(true);
                setShowEditForm(false);
                setEditingFile(null);
                setFormData({
                  name: "",
                  folderId: selectedSubfolderId,
                  fileType: "url",
                  fileUrl: "",
                  uploadedFile: "",
                  fileSize: "",
                  mimeType: "",
                  description: "",
                  status: "active",
                });
              }}
              className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedFolderId || !selectedSubfolderId}
            >
              Add New File
            </button>
          </div>
        </div>

        {/* Folder and Subfolder Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-4">
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
            {hasMoreFolders && (
              <button
                type="button"
                onClick={() => fetchData(true)}
                disabled={loadingMoreFolders}
                className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-60 transition-colors shrink-0"
              >
                {loadingMoreFolders ? "Loading…" : `View more (${folders.length} of ${totalFolders})`}
              </button>
            )}
          </div>
          {selectedFolderId && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label
                htmlFor="subfolderSelect"
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                Select Subfolder: <span className="text-red-500">*</span>
              </label>
              <select
                id="subfolderSelect"
                value={selectedSubfolderId}
                onChange={handleSubfolderSelect}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                required
              >
                <option value="">-- Select a Subfolder --</option>
                {subfolders.map((sf) => (
                  <option key={sf._id} value={sf._id}>
                    {sf.name}
                  </option>
                ))}
              </select>
              {hasMoreSubfolders && (
                <button
                  type="button"
                  onClick={() => fetchSubfolders(selectedFolderId, true)}
                  disabled={loadingMoreSubfolders}
                  className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-60 transition-colors shrink-0"
                >
                  {loadingMoreSubfolders ? "Loading…" : `View more (${subfolders.length} of ${totalSubfolders})`}
                </button>
              )}
            </div>
          )}
          {!selectedFolderId && (
            <p className="text-xs text-gray-500">
              Please select a folder first, then select a subfolder to manage files
            </p>
          )}
          {selectedFolderId && subfolders.length === 0 && (
            <p className="text-xs text-yellow-600">
              No subfolders found in this folder. Please create subfolders first in Subfolder Management.
            </p>
          )}
        </div>

        {/* Add/Edit File Form */}
        {(showAddForm || showEditForm) && (selectedSubfolderId || editingFile) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {showEditForm ? "Edit File" : "Add New File"}
              </h2>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                disabled={isFormLoading}
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={showEditForm ? handleEditFile : handleAddFile} className="space-y-4">
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
                {/* File Name */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    File Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Enter file name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    required
                    disabled={isFormLoading}
                  />
                  <p className="text-xs text-gray-500">
                    URL slug is auto-generated from the name. Duplicate names in the same subfolder are not allowed.
                  </p>
                  {showEditForm && editingFile?.slug && (
                    <p className="text-xs text-gray-600 font-mono mt-1">
                      Current slug: /{editingFile.slug}
                    </p>
                  )}
                </div>

                {/* Subfolder (read-only, based on selection) */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="folderId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Subfolder <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="folderId"
                    name="folderId"
                    value={formData.folderId}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-gray-50"
                    required
                    disabled={isFormLoading || showEditForm}
                  >
                    <option value="">-- Select Subfolder --</option>
                    {subfolders.map((sf) => (
                      <option key={sf._id} value={sf._id}>
                        {sf.name}
                      </option>
                    ))}
                  </select>
                  {showEditForm && (
                    <p className="text-xs text-gray-500 mt-1">
                      Subfolder cannot be changed after creation
                    </p>
                  )}
                </div>

                {/* File Type */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="fileType"
                    className="block text-sm font-medium text-gray-700"
                  >
                    File Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="fileType"
                    name="fileType"
                    value={formData.fileType}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                    disabled={isFormLoading}
                  >
                    <option value="url">URL Link</option>
                    <option value="upload">File Upload</option>
                  </select>
                </div>

                {/* File URL (shown when fileType is "url") */}
                {formData.fileType === "url" && (
                  <div className="space-y-2 md:col-span-2">
                    <label
                      htmlFor="fileUrl"
                      className="block text-sm font-medium text-gray-700"
                    >
                      File URL <span className="text-gray-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <FaLink className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                      <input
                        type="url"
                        id="fileUrl"
                        name="fileUrl"
                        value={formData.fileUrl}
                        onChange={handleFormChange}
                        placeholder="https://example.com/file.pdf"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                        disabled={isFormLoading}
                      />
                    </div>
                  </div>
                )}

                {/* Uploaded File Path (shown when fileType is "upload") */}
                {formData.fileType === "upload" && (
                  <div className="space-y-2 md:col-span-2">
                    <label
                      htmlFor="uploadedFile"
                      className="block text-sm font-medium text-gray-700"
                    >
                      File Path <span className="text-gray-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <FaUpload className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        id="uploadedFile"
                        name="uploadedFile"
                        value={formData.uploadedFile}
                        onChange={handleFormChange}
                        placeholder="/uploads/files/document.pdf"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                        disabled={isFormLoading}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Note: File upload functionality can be integrated with your file storage system
                    </p>
                  </div>
                )}

                {/* File Size */}
                <div className="space-y-2">
                  <label
                    htmlFor="fileSize"
                    className="block text-sm font-medium text-gray-700"
                  >
                    File Size (bytes)
                  </label>
                  <input
                    type="number"
                    id="fileSize"
                    name="fileSize"
                    value={formData.fileSize}
                    onChange={handleFormChange}
                    placeholder="1024"
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
                </div>

                {/* MIME Type */}
                <div className="space-y-2">
                  <label
                    htmlFor="mimeType"
                    className="block text-sm font-medium text-gray-700"
                  >
                    MIME Type
                  </label>
                  <input
                    type="text"
                    id="mimeType"
                    name="mimeType"
                    value={formData.mimeType}
                    onChange={handleFormChange}
                    placeholder="application/pdf"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                    disabled={isFormLoading}
                  />
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
                    placeholder="Enter file description (optional)"
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
                      <span>{showEditForm ? "Update File" : "Add File"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Files List */}
        {selectedFolderId && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Files List
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedSubfolderId
                      ? "Manage files in the selected subfolder"
                      : "All files grouped by subfolder"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {isDataLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <LoadingSpinner size="medium" />
                    <p className="text-sm text-gray-500 mt-3">Loading files...</p>
                  </div>
                </div>
              ) : (
                <>
                  <FileTable
                    files={files}
                    folders={folders}
                    subfolders={subfolders}
                    onEdit={handleEdit}
                    onDelete={handleDeleteFile}
                    onToggleStatus={handleToggleStatus}
                  />
                  {selectedSubfolderId && hasMoreFiles && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => fetchFiles(selectedSubfolderId, true)}
                        disabled={loadingMoreFiles}
                        className="px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                      >
                        {loadingMoreFiles ? (
                          <>
                            <LoadingSpinner size="small" />
                            Loading…
                          </>
                        ) : (
                          <>View more ({files.length} of {totalFiles})</>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DownloadFileManagement;

