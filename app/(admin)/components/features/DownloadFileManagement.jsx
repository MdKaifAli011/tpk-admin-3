"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  FaCheck,
  FaFolder,
  FaFolderOpen,
  FaSearch,
  FaArrowUp,
  FaSyncAlt,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import api from "@/lib/api";
import DownloadListPagination from "../common/DownloadListPagination";
import DownloadListSearchBar from "../common/DownloadListSearchBar";
import { validateMediaFileClient } from "@/lib/mediaUploadRules";

/** True if URL or uploaded path is set for this file record. */
function isDownloadResourcePresent(file) {
  if (!file) return false;
  if (file.fileType === "url") {
    return !!(file.fileUrl && String(file.fileUrl).trim());
  }
  return !!(file.uploadedFile && String(file.uploadedFile).trim());
}

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
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            File Available
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
                            <td className="px-4 py-3 text-center">
                              {isDownloadResourcePresent(file) ? (
                                <FaCheck
                                  className="w-5 h-5 text-green-600 inline-block"
                                  title="URL or file path added"
                                  aria-label="File available"
                                />
                              ) : (
                                <FaTimes
                                  className="w-5 h-5 text-red-500 inline-block"
                                  title="No URL or file path yet"
                                  aria-label="File not available"
                                />
                              )}
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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Available
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
                      <td className="px-4 py-3 text-center">
                        {isDownloadResourcePresent(file) ? (
                          <FaCheck
                            className="w-5 h-5 text-green-600 inline-block"
                            title="URL or file path added"
                            aria-label="File available"
                          />
                        ) : (
                          <FaTimes
                            className="w-5 h-5 text-red-500 inline-block"
                            title="No URL or file path yet"
                            aria-label="File not available"
                          />
                        )}
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

/** Root / subfolder dropdowns load up to this many rows (no per-page UI on this screen). */
const DROPDOWN_LIST_LIMIT = 500;

const MEDIA_BROWSER_DOC_LIMIT = 100;

function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const b = Number(n);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Ensure media URL is absolute:
 * - hosted env => https://your-domain/...
 * - local env => http://localhost:port/...
 */
function toAbsoluteMediaUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) {
    if (typeof window !== "undefined" && window.location?.protocol) {
      return `${window.location.protocol}${value}`;
    }
    return `https:${value}`;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    try {
      return new URL(value, window.location.origin).toString();
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Modal: browse Media Library folders and pick a document (PDF, Office, etc.) for the download "upload" URL/path.
 */
function MediaLibraryDocumentPicker({
  open,
  onClose,
  onPick,
  showError,
  showSuccess,
  canUpload,
}) {
  const [folderPath, setFolderPath] = useState("");
  const [foldersFlat, setFoldersFlat] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadInputRef = useRef(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");

  const subfoldersHere = useMemo(
    () =>
      foldersFlat.filter((f) => (f.parentPath || "") === folderPath).sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [foldersFlat, folderPath],
  );

  const breadcrumbParts = useMemo(
    () => (folderPath ? folderPath.split("/").filter(Boolean) : []),
    [folderPath],
  );
  const parentFolderPath = useMemo(() => {
    if (!folderPath) return "";
    const parts = folderPath.split("/").filter(Boolean);
    if (parts.length <= 1) return "";
    return parts.slice(0, -1).join("/");
  }, [folderPath]);

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const res = await api.get("/media/folders");
      if (res.data?.success && res.data.data) {
        setFoldersFlat(res.data.data.folders ?? []);
      } else {
        setFoldersFlat([]);
      }
    } catch (err) {
      console.error("Media folders fetch:", err);
      showError("Could not load media folders. Check permissions and try again.");
      setFoldersFlat([]);
    } finally {
      setLoadingFolders(false);
    }
  }, [showError]);

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const params = new URLSearchParams({
        type: "document",
        folder: folderPath,
        page: "1",
        limit: String(MEDIA_BROWSER_DOC_LIMIT),
      });
      if (searchApplied.trim()) params.set("search", searchApplied.trim());
      const res = await api.get(`/media?${params.toString()}`);
      if (res.data?.success) {
        setDocs(res.data.data?.data ?? []);
      } else {
        setDocs([]);
      }
    } catch (err) {
      console.error("Media documents fetch:", err);
      showError("Could not load documents from the media library.");
      setDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [folderPath, searchApplied, showError]);

  const handleUploadFromModal = useCallback(
    async (event) => {
      const file = event?.target?.files?.[0];
      if (!file) return;

      const precheck = validateMediaFileClient(file);
      if (!precheck.ok) {
        showError(precheck.message || "File is not allowed.");
        if (uploadInputRef.current) uploadInputRef.current.value = "";
        return;
      }
      if (precheck.category !== "document") {
        showError("Only documents can be uploaded from this picker. Use PDF or Office files.");
        if (uploadInputRef.current) uploadInputRef.current.value = "";
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", file.name.replace(/\.[^.]+$/, ""));
        if (folderPath.trim()) fd.append("folder", folderPath.trim());

        const res = await api.post("/media", fd, {
          onUploadProgress: (progressEvent) => {
            const loaded = progressEvent?.loaded ?? 0;
            const total = progressEvent?.total ?? 0;
            if (!total) return;
            setUploadProgress(Math.min(100, Math.round((loaded / total) * 100)));
          },
        });

        if (res.data?.success) {
          showSuccess(`Uploaded "${file.name}"`);
          await Promise.all([loadFolders(), loadDocuments()]);
        } else {
          showError(res.data?.message || "Upload failed.");
        }
      } catch (err) {
        showError(err?.response?.data?.message || "Upload failed.");
      } finally {
        setUploading(false);
        setUploadProgress(0);
        if (uploadInputRef.current) uploadInputRef.current.value = "";
      }
    },
    [folderPath, loadDocuments, loadFolders, showError, showSuccess],
  );

  useEffect(() => {
    if (!open) return;
    setFolderPath("");
    setSearchInput("");
    setSearchApplied("");
    setUploadProgress(0);
    setUploading(false);
    loadFolders();
  }, [open, loadFolders]);

  useEffect(() => {
    if (!open) return;
    loadDocuments();
  }, [open, loadDocuments]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const navigateToPath = (path) => {
    setFolderPath(typeof path === "string" ? path : "");
    setSearchApplied("");
    setSearchInput("");
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-doc-picker-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(92vh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id="media-doc-picker-title" className="text-lg font-semibold text-gray-900">
              Browse media library — documents
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Pick a file stored in Media Management. Its public URL will fill the download file path.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
          {/* Folders */}
          <div className="flex w-full shrink-0 flex-col border-b border-gray-200 sm:w-56 sm:border-b-0 sm:border-r sm:border-gray-200">
            <div className="border-b border-gray-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Folders
            </div>
            <div className="min-h-[140px] max-h-[220px] overflow-y-auto sm:max-h-none sm:flex-1">
              {loadingFolders ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="small" />
                </div>
              ) : (
                <nav className="p-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => navigateToPath("")}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                      folderPath === "" ? "bg-blue-50 font-medium text-blue-800" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <FaFolderOpen className="h-4 w-4 shrink-0 text-amber-600" />
                    Root
                  </button>
                  {subfoldersHere.map((f) => (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => navigateToPath(f.path)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                        folderPath === f.path ? "bg-blue-50 font-medium text-blue-800" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <FaFolder className="h-4 w-4 shrink-0 text-yellow-600" />
                      <span className="truncate">{f.name || f.path}</span>
                    </button>
                  ))}
                  {subfoldersHere.length === 0 && (
                    <p className="px-2 py-3 text-xs text-gray-500">
                      No child folders here. You can upload a document directly to this folder.
                    </p>
                  )}
                </nav>
              )}
            </div>
          </div>

          {/* Documents list */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 space-y-2 border-b border-gray-100 bg-gray-50/40 px-3 py-2 sm:px-4">
              <div className="flex flex-wrap items-center gap-1 text-xs text-gray-600">
                <span className="font-medium text-gray-500">Path:</span>
                <button type="button" className="text-blue-600 hover:underline" onClick={() => navigateToPath("")}>
                  media
                </button>
                {breadcrumbParts.map((seg, i) => {
                  const pathUp = breadcrumbParts.slice(0, i + 1).join("/");
                  const label = foldersFlat.find((x) => x.path === pathUp)?.name || seg;
                  return (
                    <span key={pathUp} className="flex items-center gap-1">
                      <span className="text-gray-300">/</span>
                      <button type="button" className="truncate max-w-[120px] text-blue-600 hover:underline" onClick={() => navigateToPath(pathUp)} title={pathUp}>
                        {label}
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateToPath(parentFolderPath)}
                  disabled={!folderPath}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Go up one folder"
                >
                  <FaArrowUp className="h-3 w-3" /> Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loadFolders();
                    loadDocuments();
                  }}
                  disabled={loadingDocs || loadingFolders}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Refresh files and folders"
                >
                  <FaSyncAlt className={`h-3 w-3 ${loadingDocs || loadingFolders ? "animate-spin" : ""}`} />
                  Refresh
                </button>

                <div className="relative min-w-0 flex-1">
                  <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setSearchApplied(searchInput.trim());
                      }
                    }}
                    placeholder="Search in this folder…"
                    className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSearchApplied(searchInput.trim())}
                  className="shrink-0 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
                >
                  Search
                </button>
                {canUpload && (
                  <label className="shrink-0 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#0056FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0044CC]">
                    <FaUpload className={`h-3.5 w-3.5 ${uploading ? "animate-pulse" : ""}`} />
                    {uploading ? "Uploading…" : "Upload doc"}
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
                      className="hidden"
                      onChange={handleUploadFromModal}
                      disabled={uploading}
                    />
                  </label>
                )}
                {searchApplied ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearchApplied("");
                    }}
                    className="shrink-0 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {uploading && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-[#0056FF] transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingDocs ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <LoadingSpinner size="medium" />
                  <p className="mt-2 text-sm text-gray-500">Loading documents…</p>
                </div>
              ) : docs.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-gray-500">
                  No documents in this folder{searchApplied ? " matching your search" : ""}. Upload PDFs or Office files in{" "}
                  <span className="font-medium text-gray-700">Media Management</span>, or open another folder.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {docs.map((item) => {
                    const displayName = (item.name || item.fileName || "").trim() || "Untitled";
                    const showStoredName =
                      item.name &&
                      item.fileName &&
                      String(item.name).trim() !== String(item.fileName).trim();
                    return (
                      <li
                        key={item._id}
                        className="flex items-center gap-3 px-3 py-2.5 sm:px-4 hover:bg-gray-50/80"
                      >
                        <FaFileAlt className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900" title={displayName}>
                            {displayName}
                          </p>
                          {showStoredName ? (
                            <p className="truncate text-xs text-gray-500" title={item.fileName}>
                              {item.fileName}
                            </p>
                          ) : null}
                          <p className="text-[11px] text-gray-400">{formatBytes(item.size)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <a
                            href={toAbsoluteMediaUrl(item.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Preview
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              onPick({
                                url: toAbsoluteMediaUrl(item.url),
                                size: item.size,
                                mimeType: item.mimeType || "",
                                name: item.name || item.fileName,
                              });
                            }}
                            className="rounded-md bg-[#0056FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0044CC]"
                          >
                            Use this file
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {docs.length >= MEDIA_BROWSER_DOC_LIMIT ? (
              <p className="shrink-0 border-t border-gray-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                Showing the first {MEDIA_BROWSER_DOC_LIMIT} documents. Refine the folder or search in Media Management for more.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const DownloadFileManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMediaLibraryBrowser, setShowMediaLibraryBrowser] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [filePage, setFilePage] = useState(1);
  const [filePageSize, setFilePageSize] = useState(50);
  const [folders, setFolders] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedSubfolderId, setSelectedSubfolderId] = useState("");
  const [fileSearchInput, setFileSearchInput] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [error, setError] = useState(null);

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
  const { canCreate } = usePermissions();
  const isFetchingRef = useRef(false);

  const loadFoldersForDropdown = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsDataLoading(true);
    setError(null);
    try {
      const foldersRes = await api.get(
        `/download/folder?status=all&parentFolderId=null&limit=${DROPDOWN_LIST_LIMIT}&page=1`
      );
      if (foldersRes.data?.success) {
        setFolders(foldersRes.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  };

  const loadSubfoldersForDropdown = async (folderId) => {
    if (!folderId) {
      setSubfolders([]);
      setSelectedSubfolderId("");
      setFiles([]);
      setTotalFiles(0);
      setFilePage(1);
      return;
    }
    setIsDataLoading(true);
    try {
      const response = await api.get(
        `/download/folder?status=all&parentFolderId=${folderId}&limit=${DROPDOWN_LIST_LIMIT}&page=1`
      );
      if (response.data?.success) {
        setSubfolders(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching subfolders:", err);
      showError("Failed to fetch subfolders");
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchFiles = async (subfolderId, page = 1, limit = filePageSize, searchOverride) => {
    if (!subfolderId) {
      setFiles([]);
      setTotalFiles(0);
      setFilePage(1);
      return;
    }
    setIsDataLoading(true);
    const effectiveSearch =
      searchOverride !== undefined ? searchOverride : fileSearch;
    const q = String(effectiveSearch || "").trim();
    const searchParam = q ? `&search=${encodeURIComponent(q)}` : "";
    try {
      const response = await api.get(
        `/download/file?status=all&folderId=${subfolderId}&limit=${limit}&page=${page}${searchParam}`
      );
      if (response.data?.success) {
        const list = response.data.data || [];
        const total = response.data.pagination?.total ?? list.length;
        if (list.length === 0 && page > 1 && total > 0) {
          setIsDataLoading(false);
          await fetchFiles(subfolderId, page - 1, limit, effectiveSearch);
          return;
        }
        setFiles(list);
        setFilePage(page);
        setTotalFiles(total);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
      showError("Failed to fetch files");
    } finally {
      setIsDataLoading(false);
    }
  };

  /** Files on root folder + all its subfolders (paginated). */
  const fetchFilesForRootFolder = async (
    folderId,
    page = 1,
    limit = filePageSize,
    searchOverride
  ) => {
    if (!folderId) {
      setFiles([]);
      setTotalFiles(0);
      setFilePage(1);
      return;
    }
    setIsDataLoading(true);
    const effectiveSearch =
      searchOverride !== undefined ? searchOverride : fileSearch;
    const q = String(effectiveSearch || "").trim();
    const searchParam = q ? `&search=${encodeURIComponent(q)}` : "";
    try {
      const response = await api.get(
        `/download/file?status=all&rootFolderId=${folderId}&limit=${limit}&page=${page}${searchParam}`
      );
      if (response.data?.success) {
        const list = response.data.data || [];
        const total = response.data.pagination?.total ?? list.length;
        if (list.length === 0 && page > 1 && total > 0) {
          setIsDataLoading(false);
          await fetchFilesForRootFolder(folderId, page - 1, limit, effectiveSearch);
          return;
        }
        setFiles(list);
        setFilePage(page);
        setTotalFiles(total);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
      showError("Failed to fetch files");
    } finally {
      setIsDataLoading(false);
    }
  };

  const refreshFilesForCurrentSelection = async () => {
    if (selectedSubfolderId) {
      await fetchFiles(selectedSubfolderId, 1, filePageSize, fileSearch);
    } else if (selectedFolderId) {
      await fetchFilesForRootFolder(selectedFolderId, 1, filePageSize, fileSearch);
    }
  };

  useEffect(() => {
    loadFoldersForDropdown();
  }, []);

  useEffect(() => {
    setFileSearchInput("");
    setFileSearch("");
    if (selectedFolderId) {
      loadSubfoldersForDropdown(selectedFolderId);
    } else {
      setSubfolders([]);
      setSelectedSubfolderId("");
      setFiles([]);
      setTotalFiles(0);
      setFilePage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolderId]);

  useEffect(() => {
    if (!selectedFolderId) return;
    setFileSearchInput("");
    setFileSearch("");
    if (selectedSubfolderId) {
      fetchFiles(selectedSubfolderId, 1, filePageSize, "");
      setFormData((prev) => ({ ...prev, folderId: selectedSubfolderId }));
    } else {
      fetchFilesForRootFolder(selectedFolderId, 1, filePageSize, "");
      setFormData((prev) => ({ ...prev, folderId: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolderId, selectedSubfolderId]);

  const applyFileSearch = () => {
    if (!selectedFolderId) return;
    const q = fileSearchInput.trim();
    setFileSearch(q);
    if (selectedSubfolderId) {
      fetchFiles(selectedSubfolderId, 1, filePageSize, q);
    } else {
      fetchFilesForRootFolder(selectedFolderId, 1, filePageSize, q);
    }
  };

  const clearFileSearch = () => {
    if (!selectedFolderId) return;
    setFileSearchInput("");
    setFileSearch("");
    if (selectedSubfolderId) {
      fetchFiles(selectedSubfolderId, 1, filePageSize, "");
    } else {
      fetchFilesForRootFolder(selectedFolderId, 1, filePageSize, "");
    }
  };

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
        fileSize:
          formData.fileType === "upload" && formData.fileSize !== "" && !Number.isNaN(Number(formData.fileSize))
            ? Number(formData.fileSize)
            : undefined,
        mimeType:
          formData.fileType === "upload" && String(formData.mimeType || "").trim()
            ? String(formData.mimeType).trim()
            : undefined,
        description: formData.description || "",
        status: formData.status,
      };
      const response = await api.post("/download/file", payload);
      if (response.data.success) {
        await refreshFilesForCurrentSelection();
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
        fileSize:
          formData.fileType === "upload" && formData.fileSize !== "" && !Number.isNaN(Number(formData.fileSize))
            ? Number(formData.fileSize)
            : undefined,
        mimeType:
          formData.fileType === "upload" && String(formData.mimeType || "").trim()
            ? String(formData.mimeType).trim()
            : undefined,
        description: formData.description || "",
        status: formData.status,
      };
      const response = await api.put(`/download/file/${editingFile._id}`, payload);
      if (response.data.success) {
        await refreshFilesForCurrentSelection();
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
    if (name === "uploadedFile") {
      setFormData((prev) => ({
        ...prev,
        uploadedFile: value,
        fileSize: "",
        mimeType: "",
      }));
      setFormError(null);
      return;
    }
    if (name === "fileType") {
      if (value === "url") {
        setFormData((prev) => ({
          ...prev,
          fileType: value,
          uploadedFile: "",
          fileSize: "",
          mimeType: "",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          fileType: value,
          fileUrl: "",
        }));
      }
      setFormError(null);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleFileTypeTabChange = (value) => {
    if (value === "url") {
      setFormData((prev) => ({
        ...prev,
        fileType: "url",
        uploadedFile: "",
        fileSize: "",
        mimeType: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        fileType: "upload",
        fileUrl: "",
      }));
    }
    setFormError(null);
  };

  const handleMediaLibraryPick = useCallback((picked) => {
    const absoluteUrl = toAbsoluteMediaUrl(picked.url);
    setFormData((prev) => ({
      ...prev,
      fileType: "upload",
      uploadedFile: absoluteUrl,
      fileSize: picked.size != null ? String(picked.size) : "",
      mimeType: picked.mimeType || "",
      name: prev.name.trim() ? prev.name : (picked.name || "").trim() || prev.name,
    }));
    setShowMediaLibraryBrowser(false);
    setFormError(null);
    success("Document selected from media library");
  }, [success]);

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
        await refreshFilesForCurrentSelection();
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
    
    // If not in loaded subfolders, fetch folder doc (root or subfolder)
    if (!fileSubfolder) {
      try {
        const folderRes = await api.get(`/download/folder/${fileFolderId}`);
        if (folderRes.data?.success) {
          fileSubfolder = folderRes.data.data;
        }
      } catch (err) {
        console.error("Error fetching folder:", err);
      }
    }

    if (fileSubfolder) {
      const parentFolderId = fileSubfolder.parentFolderId?._id || fileSubfolder.parentFolderId;
      if (!parentFolderId) {
        // File lives on root folder (no subfolder)
        setSelectedFolderId(String(fileFolderId));
        setSelectedSubfolderId("");
      } else {
        setSelectedFolderId(String(parentFolderId));
        if (String(fileFolderId) !== String(selectedSubfolderId)) {
          setSelectedSubfolderId(String(fileFolderId));
        }
      }
    }
    
    setFormData({
      name: file.name,
      folderId: fileFolderId,
      fileType: file.fileType,
      fileUrl: file.fileUrl || "",
      uploadedFile: file.uploadedFile || "",
      fileSize: file.fileSize != null && file.fileSize !== "" ? String(file.fileSize) : "",
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
    setShowMediaLibraryBrowser(false);
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
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="min-w-0 flex-1 max-w-xl">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">
                  Download File Management
                </h1>
                <p className="text-xs text-gray-600">
                  Add and manage files in your subfolders. Support both URL links and file uploads.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-[min(100%,22rem)] lg:max-w-2xl">
                <DownloadListSearchBar
                  variant="toolbar"
                  inputId="file-mgmt-file-search"
                  inputAriaLabel="Search files"
                  value={fileSearchInput}
                  onChange={setFileSearchInput}
                  onSearch={applyFileSearch}
                  onClear={clearFileSearch}
                  activeQuery={fileSearch}
                  placeholder={
                    selectedFolderId
                      ? "Search files…"
                      : "Select a folder below first"
                  }
                  loading={isDataLoading}
                  disabled={!selectedFolderId}
                  className="flex-1 min-w-0 sm:pt-0.5"
                />
                <button
                  type="button"
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
                  className="shrink-0 self-end sm:self-center px-3 py-2 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
                  disabled={!selectedFolderId || !selectedSubfolderId}
                >
                  Add New File
                </button>
              </div>
            </div>
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
                  <label className="block text-sm font-medium text-gray-700">
                    File Type <span className="text-red-500">*</span>
                  </label>
                  <div
                    className="inline-flex rounded-lg border border-blue-200 bg-white p-1 shadow-sm"
                    role="tablist"
                    aria-label="File Type"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={formData.fileType === "url"}
                      onClick={() => handleFileTypeTabChange("url")}
                      disabled={isFormLoading}
                      className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                        formData.fileType === "url"
                          ? "bg-[#0056FF] text-white shadow-sm"
                          : "text-gray-700 hover:bg-blue-50"
                      } disabled:opacity-50`}
                    >
                      URL
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={formData.fileType === "upload"}
                      onClick={() => handleFileTypeTabChange("upload")}
                      disabled={isFormLoading}
                      className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                        formData.fileType === "upload"
                          ? "bg-[#0056FF] text-white shadow-sm"
                          : "text-gray-700 hover:bg-blue-50"
                      } disabled:opacity-50`}
                    >
                      Upload
                    </button>
                  </div>
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
                      File URL / path <span className="text-gray-400">(optional)</span>
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      <div className="relative min-w-0 flex-1">
                        <FaUpload className="absolute left-3 top-3.5 text-gray-400 w-4 h-4 pointer-events-none" />
                        <input
                          type="text"
                          id="uploadedFile"
                          name="uploadedFile"
                          value={formData.uploadedFile}
                          onChange={handleFormChange}
                          placeholder="https://… or /path/from/media — use Browse to pick from Media Library"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 transition-all"
                          disabled={isFormLoading}
                        />
                      </div>
                      <PermissionButton
                        action="edit"
                        type="button"
                        onClick={() => setShowMediaLibraryBrowser(true)}
                        disabled={isFormLoading}
                        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                        title="Open folder browser for documents in Media Management"
                      >
                        <FaFolderOpen className="h-4 w-4 shrink-0" />
                        Browse library
                      </PermissionButton>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Use <strong className="font-medium text-gray-700">Browse library</strong> to navigate media folders and attach a document. You can still paste any public URL or path manually.
                    </p>
                    {(formData.mimeType || formData.fileSize) && (
                      <p className="text-xs text-gray-600 rounded-md bg-gray-50 border border-gray-100 px-2 py-1.5">
                        {formData.mimeType ? (
                          <span>
                            MIME: <span className="font-mono">{formData.mimeType}</span>
                            {formData.fileSize ? " · " : ""}
                          </span>
                        ) : null}
                        {formData.fileSize ? (
                          <span>
                            Size: <span className="font-medium">{formatBytes(Number(formData.fileSize))}</span>
                          </span>
                        ) : null}
                      </p>
                    )}
                  </div>
                )}

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
                  <DownloadListPagination
                    page={filePage}
                    totalItems={totalFiles}
                    pageSize={filePageSize}
                    onPageChange={(p) => {
                      if (selectedSubfolderId) {
                        fetchFiles(selectedSubfolderId, p, filePageSize);
                      } else {
                        fetchFilesForRootFolder(selectedFolderId, p, filePageSize);
                      }
                    }}
                    onPageSizeChange={(s) => {
                      setFilePageSize(s);
                      if (selectedSubfolderId) {
                        fetchFiles(selectedSubfolderId, 1, s);
                      } else {
                        fetchFilesForRootFolder(selectedFolderId, 1, s);
                      }
                    }}
                    loading={isDataLoading}
                    itemLabel="files"
                    hint="Page through files for the current folder/subfolder selection."
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <MediaLibraryDocumentPicker
        open={showMediaLibraryBrowser}
        onClose={() => setShowMediaLibraryBrowser(false)}
        onPick={handleMediaLibraryPick}
        showError={showError}
        showSuccess={success}
        canUpload={canCreate}
      />
    </>
  );
};

export default DownloadFileManagement;

