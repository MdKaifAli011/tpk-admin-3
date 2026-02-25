"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaImage,
  FaFile,
  FaFileAlt,
  FaClock,
  FaTrash,
  FaUpload,
  FaSearch,
  FaCheck,
  FaEdit,
  FaTimes,
  FaInfoCircle,
  FaChevronLeft,
  FaChevronRight,
  FaCopy,
  FaFolder,
  FaFolderOpen,
  FaPlus,
  FaEllipsisV,
  FaPlay,
  FaExpand,
  FaThLarge,
  FaList,
  FaUndo,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingWrapper, LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";
import { usePermissions } from "../../hooks/usePermissions";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const TYPES = [
  { id: "all", label: "All folders", icon: FaFolderOpen },
  { id: "image", label: "Images", icon: FaImage },
  { id: "video", label: "Videos", icon: FaFile },
  { id: "document", label: "Documents", icon: FaFileAlt },
  { id: "file", label: "Files", icon: FaFile },
];

const typeToExt = (type) => {
  const t = (type || "").toUpperCase();
  if (t === "IMAGE") return "IMG";
  if (t === "VIDEO") return "VID";
  if (t === "DOCUMENT") return "DOC";
  return "FILE";
};

const formatSize = (bytes) => {
  if (bytes == null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

/** DD-MM-YYYY HH:mm for list view */
const formatDateModified = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${h}:${m}`;
};

const getTypeLabel = (item) => {
  const name = (item?.fileName || item?.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return "PDF document";
  const t = (item?.type || "").toLowerCase();
  if (t === "image") return "JPEG image";
  if (t === "video") return "Video";
  if (t === "document") return "Word document";
  return "File";
};

/** URL-friendly path: lowercase, spaces → hyphens, safe chars only */
function slugifyPath(p) {
  if (typeof p !== "string" || !p.trim()) return "";
  return p
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "")
    .trim()
    .split("/")
    .map((seg) =>
      seg
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    )
    .filter(Boolean)
    .join("/");
}

export default function MediaManagement() {
  const [activeFilter, setActiveFilter] = useState("image");
  const [viewMode, setViewMode] = useState("library");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, totalPages: 0 });
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", altText: "", fileName: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentFolderPath, setCurrentFolderPath] = useState("");
  const [foldersTree, setFoldersTree] = useState([]);
  const [foldersFlat, setFoldersFlat] = useState([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [totalCountForType, setTotalCountForType] = useState(0);
  const [folderMenuOpen, setFolderMenuOpen] = useState(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [layoutView, setLayoutView] = useState("list"); // "grid" | "list"
  const [renameFolder, setRenameFolder] = useState(null); // { path, name } or null
  const [renameName, setRenameName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [deleteFolder, setDeleteFolder] = useState(null); // { path, name } or null
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [folderDeleteCounts, setFolderDeleteCounts] = useState(null); // { files, subfolders } when deleteFolder is set
  const [loadingFolderCounts, setLoadingFolderCounts] = useState(false);
  const [selectedFolderPaths, setSelectedFolderPaths] = useState(new Set());
  const [moveCopyModal, setMoveCopyModal] = useState(null); // null | "move" | "copy"
  const [moveCopyDestination, setMoveCopyDestination] = useState("");
  const [moveCopyLoading, setMoveCopyLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const { role } = usePermissions();
  const isAdmin = role === "admin";

  const openPreview = (item) => {
    if (item?.type === "image" || item?.type === "video") setPreviewItem(item);
  };

  const fetchFolders = useCallback(async (mediaType) => {
    try {
      const url = mediaType ? `/media/folders?type=${encodeURIComponent(mediaType)}` : "/media/folders";
      const res = await api.get(url);
      if (res.data?.success && res.data.data) {
        setFoldersTree(res.data.data.tree ?? []);
        setFoldersFlat(res.data.data.folders ?? []);
        setTotalCountForType(res.data.data.totalCount ?? 0);
      }
    } catch (err) {
      console.error("Folders fetch error:", err);
    }
  }, []);

  const fetchMedia = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (viewMode === "trash") params.set("trash", "true");
      else if (viewMode === "library") {
        if (activeFilter !== "all") params.set("type", activeFilter);
        if (currentFolderPath.trim()) params.set("folder", currentFolderPath.trim());
      }
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      if (searchDebounced.trim()) params.set("search", searchDebounced.trim());

      const res = await api.get(`/media?${params.toString()}`);
      if (res.data?.success) {
        setItems(res.data.data?.data ?? []);
        setPagination(res.data.data?.pagination ?? { page: 1, limit: pageSize, total: 0, totalPages: 0 });
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Media fetch error:", err);
      showError("Failed to load media");
      setItems([]);
    } finally {
      setLoading(false);
    }
  // showError intentionally omitted: stable deps to avoid refetch loop (toast returns new refs each render)
  }, [activeFilter, viewMode, searchDebounced, currentFolderPath, pageSize]);

  useEffect(() => {
    fetchMedia(1);
  }, [fetchMedia]);

  useEffect(() => {
    if (viewMode === "library") fetchFolders(activeFilter === "all" ? undefined : activeFilter);
    else fetchFolders();
  }, [viewMode, activeFilter, fetchFolders]);

  useEffect(() => {
    if (viewMode === "library") setCurrentFolderPath("");
  }, [activeFilter]);

  useEffect(() => {
    if (!deleteFolder?.path) {
      setFolderDeleteCounts(null);
      return;
    }
    setLoadingFolderCounts(true);
    setFolderDeleteCounts(null);
    api
      .get(`/media/folders/count?path=${encodeURIComponent(deleteFolder.path)}`)
      .then((res) => {
        if (res.data?.success && res.data.data) setFolderDeleteCounts(res.data.data);
        else setFolderDeleteCounts({ files: 0, subfolders: 0 });
      })
      .catch(() => setFolderDeleteCounts({ files: 0, subfolders: 0 }))
      .finally(() => setLoadingFolderCounts(false));
  }, [deleteFolder?.path]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim().replace(/[/\\]/g, "").replace(/\s+/g, " ") || "New folder";
    if (!name) return;
    setCreatingFolder(true);
    try {
      const res = await api.post("/media/folders", { name, parentPath: currentFolderPath });
      if (res.data?.success) {
        success("Folder created");
        setShowCreateFolder(false);
        setNewFolderName("");
        if (viewMode === "library") fetchFolders(activeFilter);
        else fetchFolders();
        setCurrentFolderPath(res.data.data?.path ?? slugifyPath(currentFolderPath ? `${currentFolderPath}/${name}` : name));
        fetchMedia(1);
      } else showError(res.data?.message || "Failed to create folder");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRenameFolder = async () => {
    if (!renameFolder?.path || !renameName.trim()) return;
    const newName = renameName.trim().replace(/[/\\]/g, "").replace(/\s+/g, " ");
    if (!newName) return;
    setRenamingFolder(true);
    try {
      const res = await api.patch("/media/folders", { path: renameFolder.path, newName });
      if (res.data?.success) {
        success("Folder renamed");
        setRenameFolder(null);
        setRenameName("");
        if (viewMode === "library") fetchFolders(activeFilter);
        else fetchFolders();
        fetchMedia(1);
      } else showError(res.data?.message || "Failed to rename folder");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to rename folder");
    } finally {
      setRenamingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolder?.path) return;
    setDeletingFolder(true);
    try {
      const res = await api.delete("/media/folders", { data: { path: deleteFolder.path } });
      if (res.data?.success) {
        success("Folder deleted");
        setSelectedFolderPaths((prev) => { const n = new Set(prev); n.delete(deleteFolder.path); return n; });
        setDeleteFolder(null);
        setFolderDeleteCounts(null);
        if (currentFolderPath === deleteFolder.path || currentFolderPath.startsWith(deleteFolder.path + "/")) {
          setCurrentFolderPath("");
        }
        if (viewMode === "library") fetchFolders(activeFilter);
        else fetchFolders();
        fetchMedia(1);
      } else showError(res.data?.message || "Failed to delete folder");
    } catch (err) {
      showError(err.response?.data?.message || err.response?.data?.error || "Only administrators can delete folders.");
    } finally {
      setDeletingFolder(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!previewItem) return;
    const onKey = (e) => { if (e.key === "Escape") setPreviewItem(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewItem]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    let done = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name.replace(/\.[^.]+$/, ""));
        if (currentFolderPath.trim()) formData.append("folder", currentFolderPath.trim());
        const res = await api.post("/media", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.success) done++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (done) {
      success(`${done} file(s) uploaded`);
      fetchMedia(pagination.page);
    }
    if (failed) showError(`${failed} file(s) failed to upload`);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectFolder = (folderPath) => {
    setSelectedFolderPaths((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const selectAll = () => {
    const allFilesSelected = selectedIds.size >= displayItems.length;
    const allFoldersSelected = selectedFolderPaths.size >= subfolders.length;
    if (allFilesSelected && allFoldersSelected) {
      setSelectedIds(new Set());
      setSelectedFolderPaths(new Set());
    } else {
      setSelectedIds(new Set(displayItems.map((i) => i._id)));
      setSelectedFolderPaths(new Set(subfolders.map((f) => f.path)));
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || "",
      altText: item.altText || "",
      fileName: item.fileName || "",
      folder: item.folder || "",
    });
  };

  const saveEdit = async () => {
    if (!editingItem?._id) return;
    setSavingEdit(true);
    try {
      const payload = { name: editForm.name, altText: editForm.altText, fileName: editForm.fileName, folder: editForm.folder ?? "" };
      const res = await api.patch(`/media/${editingItem._id}`, payload);
      if (res.data?.success) {
        success("Media updated");
        setEditingItem(null);
        fetchMedia(pagination.page);
      } else showError(res.data?.message || "Update failed");
    } catch (err) {
      showError(err.response?.data?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const moveToTrash = async (id) => {
    try {
      await api.delete(`/media/${id}`);
      success("Moved to trash");
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      fetchMedia(pagination.page);
    } catch {
      showError("Failed to move to trash");
    }
  };

  const restoreItem = async (id) => {
    try {
      await api.patch(`/media/${id}`, { restore: true });
      success("Restored");
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setEditingItem(null);
      fetchMedia(pagination.page);
    } catch {
      showError("Failed to restore");
    }
  };

  const deletePermanent = async (id) => {
    if (!confirm("Permanently delete this file? This cannot be undone.")) return;
    try {
      await api.delete(`/media/${id}?permanent=true`);
      success("Permanently deleted");
      setEditingItem(null);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      fetchMedia(pagination.page);
    } catch {
      showError("Failed to delete");
    }
  };

  const restoreSelectedItems = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      try {
        await api.patch(`/media/${id}`, { restore: true });
      } catch { /* ignore */ }
    }
    setSelectedIds(new Set());
    success(ids.length === 1 ? "Restored" : `${ids.length} items restored`);
    fetchMedia(pagination.page);
  };

  const copyUrl = (url) => {
    if (typeof navigator?.clipboard?.writeText === "function") {
      navigator.clipboard.writeText(url);
      success("URL copied to clipboard");
    }
  };

  const subfolders = viewMode === "library" ? foldersFlat.filter((f) => (f.parentPath || "") === currentFolderPath) : [];
  const breadcrumbSegments = currentFolderPath ? currentFolderPath.split("/").filter(Boolean) : [];
  const atRoot = viewMode === "library" && currentFolderPath === "";
  const displayItems = atRoot ? [] : items;

  const selectedItem = displayItems.find((i) => i._id === Array.from(selectedIds)[0]);

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="">
        <div className="pt-8">
          <div className="flex flex-col lg:flex-row min-h-[600px] gap-0">
            {/* Library sidebar — keep Images, Videos, Documents, Files, Recent, Trash */}
            <aside className="w-full shrink-0 border border-slate-200 rounded-xl bg-white lg:w-56  overflow-hidden">
              <div className="px-3 py-4">
                <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-slate-400">Library</p>
                <nav className="space-y-0.5">
                  {TYPES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setViewMode("library");
                        setActiveFilter(id);
                        setCurrentFolderPath("");
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        viewMode === "library" && activeFilter === id
                          ? "bg-[#0052CC] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${viewMode === "library" && activeFilter === id ? "text-white" : "text-slate-400"}`} />
                      <span className="font-medium">{label}</span>
                    </button>
                  ))}
                  <div className="my-2 border-t border-slate-200" />
                  <button
                    type="button"
                    onClick={() => setViewMode("recent")}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      viewMode === "recent" ? "bg-[#0052CC] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <FaClock className={`h-4 w-4 shrink-0 ${viewMode === "recent" ? "text-white" : "text-slate-400"}`} />
                    <span className="font-medium">Recent</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("trash")}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      viewMode === "trash" ? "bg-[#0052CC] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <FaTrash className={`h-4 w-4 shrink-0 ${viewMode === "trash" ? "text-white" : "text-slate-400"}`} />
                    <span className="font-medium">Trash</span>
                  </button>
                </nav>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 mx-4 min-w-0 flex flex-col">
              {/* Title + view toggle */}
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Media Management</h1>
                  <p className="text-sm text-slate-500 mt-0.5">Upload, organize, and manage your learning resources in a list view.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLayoutView("grid")}
                    className={`p-2 rounded-lg border transition-colors ${layoutView === "grid" ? "bg-[#E8EFFF] border-[#0052CC] text-[#0052CC]" : "bg-white border-slate-200 text-slate-400 hover:text-[#0052CC]"}`}
                    title="Grid view"
                  >
                    <FaThLarge className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutView("list")}
                    className={`p-2 rounded-lg border transition-colors ${layoutView === "list" ? "bg-[#E8EFFF] border-[#0052CC] text-[#0052CC]" : "bg-white border-slate-200 text-slate-400 hover:text-[#0052CC]"}`}
                    title="List view"
                  >
                    <FaList className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* White card: breadcrumbs + toolbar + table/grid + footer */}
              <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] overflow-hidden">
                {/* Breadcrumbs + Search + New Folder + Upload */}
                <div className="border-b border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <button type="button" onClick={() => setCurrentFolderPath("")} className="hover:text-[#0052CC] flex items-center gap-1 transition-colors">
                      <FaFolderOpen className="h-4 w-4" /> Root
                    </button>
                    <span className="text-slate-400">/</span>
                    <button type="button" onClick={() => setCurrentFolderPath("")} className="hover:text-[#0052CC] transition-colors">Media</button>
                    {viewMode === "trash" ? (
                      <>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-900 font-medium">Trash</span>
                      </>
                    ) : (
                      breadcrumbSegments.map((seg, i) => {
                        const pathUp = breadcrumbSegments.slice(0, i + 1).join("/");
                        const isLast = i === breadcrumbSegments.length - 1;
                        return (
                          <span key={pathUp} className="flex items-center gap-2">
                            <span className="text-slate-400">/</span>
                            <button
                              type="button"
                              onClick={() => setCurrentFolderPath(pathUp)}
                              className={`transition-colors ${isLast ? "text-slate-900 font-medium" : "hover:text-[#0052CC]"}`}
                            >
                              {seg}
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search files and folders..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-0 focus:ring-1 focus:ring-[#0052CC] rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {viewMode === "trash" ? (
                        <>
                          <button
                            type="button"
                            onClick={restoreSelectedItems}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-2 px-4 py-2 text-white font-medium text-sm bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            title="Restore selected items"
                          >
                            <FaUndo className="h-4 w-4" /> Restore
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ids = Array.from(selectedIds);
                              if (ids.length === 0) return;
                              if (!confirm(`Permanently delete ${ids.length} item(s)? This cannot be undone.`)) return;
                              for (const id of ids) {
                                try { await api.delete(`/media/${id}?permanent=true`); } catch { /* ignore */ }
                              }
                              setSelectedIds(new Set());
                              success(ids.length === 1 ? "Permanently deleted" : `${ids.length} items permanently deleted`);
                              fetchMedia(pagination.page);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-white font-medium text-sm bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            disabled={selectedIds.size === 0}
                            title="Permanently delete selected"
                          >
                            <FaTrash className="h-4 w-4" /> Delete permanently
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              const ids = Array.from(selectedIds);
                              const paths = Array.from(selectedFolderPaths);
                              if (ids.length === 0 && paths.length === 0) return;
                              if (paths.length > 0 && isAdmin) {
                                if (!confirm(`Delete ${paths.length} selected folder(s)?\n\nOnly empty folders can be deleted. Folders that contain files or subfolders will be skipped.`)) return;
                                let deleted = 0;
                                let skipped = 0;
                                for (const p of paths) {
                                  try {
                                    const res = await api.delete("/media/folders", { data: { path: p } });
                                    if (res.data?.success) deleted++;
                                    else skipped++;
                                  } catch {
                                    skipped++;
                                  }
                                }
                                setSelectedFolderPaths(new Set());
                                if (currentFolderPath && paths.some((p) => p === currentFolderPath || currentFolderPath.startsWith(p + "/"))) {
                                  setCurrentFolderPath("");
                                }
                                if (viewMode === "library") fetchFolders(activeFilter);
                                else fetchFolders();
                                if (deleted) success(deleted === 1 ? "1 folder deleted" : `${deleted} folder(s) deleted`);
                                if (skipped) showError(skipped === 1 ? "1 folder could not be deleted (not empty)" : `${skipped} folder(s) could not be deleted (not empty)`);
                              }
                              if (ids.length > 0) {
                                for (const id of ids) {
                                  try { await api.delete(`/media/${id}`); } catch { /* ignore */ }
                                }
                                setSelectedIds(new Set());
                                success(ids.length === 1 ? "Moved to trash" : `${ids.length} items moved to trash`);
                                fetchMedia(pagination.page);
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-white font-medium text-sm bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            disabled={selectedIds.size === 0 && (selectedFolderPaths.size === 0 || !isAdmin)}
                            title={selectedFolderPaths.size > 0 && selectedIds.size === 0 ? "Delete selected folders (empty only)" : "Move selected files to trash / delete selected folders"}
                          >
                            <FaTrash className="h-4 w-4" /> Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMoveCopyModal("move"); setMoveCopyDestination(currentFolderPath); }}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-2 px-4 py-2 text-slate-700 font-medium text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                            title="Move selected to another folder"
                          >
                            <FaFolderOpen className="h-4 w-4" /> Move
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMoveCopyModal("copy"); setMoveCopyDestination(currentFolderPath); }}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-2 px-4 py-2 text-slate-700 font-medium text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                            title="Copy selected to another folder"
                          >
                            <FaCopy className="h-4 w-4" /> Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowCreateFolder(true); setNewFolderName(""); setFolderMenuOpen(null); }}
                            className="flex items-center gap-2 px-4 py-2 text-slate-700 font-medium text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <FaFolder className="h-4 w-4" /> New Folder
                          </button>
                          <label className="flex items-center gap-2 px-4 py-2 text-white font-medium text-sm bg-[#0052CC] rounded-lg hover:bg-[#0044AA] transition-colors cursor-pointer">
                            <FaUpload className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} />
                            {uploading ? "Uploading…" : "Upload"}
                            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content: list (folders + files in one table) or grid */}
                <div className="flex-1 overflow-auto min-h-0">
                  {loading ? (
                    <LoadingWrapper><LoadingSpinner /></LoadingWrapper>
                  ) : layoutView === "list" ? (
                    (subfolders.length > 0 || displayItems.length > 0) ? (
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                          <tr>
                            <th className="w-12 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={(subfolders.length > 0 || displayItems.length > 0) && selectedIds.size === displayItems.length && selectedFolderPaths.size === subfolders.length}
                                onChange={selectAll}
                                className="rounded border-slate-300 text-[#0052CC] focus:ring-[#0052CC] h-4 w-4"
                              />
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Modified</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                            <th className="w-16 px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewMode === "library" && subfolders.map((f) => (
                            <tr
                              key={`folder-${f.path}`}
                              className={`group cursor-pointer transition-colors ${selectedFolderPaths.has(f.path) ? "bg-blue-50/30" : "hover:bg-slate-50"}`}
                              onClick={() => { setCurrentFolderPath(f.path); setFolderMenuOpen(null); }}
                            >
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedFolderPaths.has(f.path)}
                                  onChange={() => toggleSelectFolder(f.path)}
                                  className="rounded border-slate-300 text-[#0052CC] focus:ring-[#0052CC] h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <FaFolder className="h-6 w-6 shrink-0 text-yellow-500" />
                                  <span className="text-sm font-medium text-slate-700">{f.name || f.path}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500">—</td>
                              <td className="px-4 py-3 text-sm text-slate-500">File folder</td>
                              <td className="px-4 py-3 text-sm text-slate-500">—</td>
                              <td className="px-4 py-3 text-right">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === f.path ? null : f.path); }}
                                    className="p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Folder options"
                                  >
                                    <FaEllipsisV className="h-4 w-4" />
                                  </button>
                                  {folderMenuOpen === f.path && (
                                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                                      <button type="button" onClick={() => { setShowCreateFolder(true); setNewFolderName(""); setCurrentFolderPath(f.path); setFolderMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                        <FaPlus className="h-3.5 w-3.5 text-slate-400" /> New subfolder
                                      </button>
                                      <button type="button" onClick={() => { setRenameFolder({ path: f.path, name: f.name || f.path }); setRenameName(f.name || f.path); setFolderMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                        <FaEdit className="h-3.5 w-3.5 text-slate-400" /> Rename
                                      </button>
                                      {isAdmin && (
                                        <button type="button" onClick={() => { setDeleteFolder({ path: f.path, name: f.name || f.path }); setFolderMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                                          <FaTrash className="h-3.5 w-3.5" /> Delete
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {displayItems.map((item) => (
                            <tr
                              key={item._id}
                              className={`group cursor-pointer transition-colors ${selectedIds.has(item._id) ? "bg-blue-50/30" : "hover:bg-slate-50"}`}
                              onClick={() => toggleSelect(item._id)}
                              onDoubleClick={(e) => { e.stopPropagation(); openPreview(item); }}
                            >
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(item._id)}
                                  onChange={() => toggleSelect(item._id)}
                                  className="rounded border-slate-300 text-[#0052CC] focus:ring-[#0052CC] h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {item.type === "image" ? (
                                    <div className="w-6 h-6 rounded overflow-hidden bg-slate-100 shrink-0">
                                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ) : item.type === "video" ? (
                                    <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-800 shrink-0">
                                      <FaPlay className="h-3 w-3 text-white/90" />
                                    </div>
                                  ) : (
                                    <FaFileAlt className="h-6 w-6 text-blue-500 shrink-0" />
                                  )}
                                  <span className="text-sm font-medium text-slate-700 truncate">{item.name || item.fileName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500">{formatDateModified(item.createdAt)}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{getTypeLabel(item)}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{formatSize(item.size)}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setFileMenuOpen(fileMenuOpen === item._id ? null : item._id); }}
                                    className="p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Options"
                                  >
                                    <FaEllipsisV className="h-4 w-4" />
                                  </button>
                                  {fileMenuOpen === item._id && (
                                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                                      {(item.type === "image" || item.type === "video") && (
                                        <button type="button" onClick={() => { openPreview(item); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                          <FaExpand className="h-3.5 w-3.5 text-slate-400" /> View full
                                        </button>
                                      )}
                                      {viewMode === "trash" ? (
                                        <>
                                          <button type="button" onClick={() => { copyUrl(item.url); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                            <FaCopy className="h-3.5 w-3.5 text-slate-400" /> Copy URL
                                          </button>
                                          <button type="button" onClick={() => { restoreItem(item._id); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50">
                                            <FaUndo className="h-3.5 w-3.5" /> Restore
                                          </button>
                                          <button type="button" onClick={() => { deletePermanent(item._id); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                                            <FaTrash className="h-3.5 w-3.5" /> Delete permanently
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button type="button" onClick={() => { openEdit(item); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                            <FaEdit className="h-3.5 w-3.5 text-slate-400" /> Edit
                                          </button>
                                          <button type="button" onClick={() => { copyUrl(item.url); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                            <FaCopy className="h-3.5 w-3.5 text-slate-400" /> Copy URL
                                          </button>
                                          <button type="button" onClick={() => { setSelectedIds(new Set([item._id])); setMoveCopyModal("move"); setMoveCopyDestination(currentFolderPath); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                            <FaFolderOpen className="h-3.5 w-3.5 text-slate-400" /> Move to folder
                                          </button>
                                          <button type="button" onClick={() => { setSelectedIds(new Set([item._id])); setMoveCopyModal("copy"); setMoveCopyDestination(currentFolderPath); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                            <FaCopy className="h-3.5 w-3.5 text-slate-400" /> Copy to folder
                                          </button>
                                          <button type="button" onClick={() => { moveToTrash(item._id); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                                            <FaTrash className="h-3.5 w-3.5" /> Move to trash
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                          <FaImage className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-base font-medium text-slate-800">No media found</p>
                        <p className="mt-1 text-sm text-slate-500 text-center max-w-xs">
                          {viewMode === "trash" ? "Trash is empty." : "Upload files or choose another folder or type."}
                        </p>
                        {viewMode === "library" && (
                          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0052CC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0044AA] disabled:opacity-60">
                            <FaUpload className="h-4 w-4" /> Upload files
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                  <>
                  {(subfolders.length > 0 || displayItems.length > 0) ? (
                  <div className="p-4">
                    {viewMode === "library" && subfolders.length > 0 && (
                      <div className="flex flex-wrap gap-3 mb-4">
                        {subfolders.map((f) => (
                          <button
                            key={f.path}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleSelectFolder(f.path); }}
                            onDoubleClick={(e) => { e.stopPropagation(); setCurrentFolderPath(f.path); setFolderMenuOpen(null); }}
                            className={`flex min-w-[120px] items-center gap-2.5 rounded-xl border px-3 py-2.5 shadow-sm transition-colors ${
                              selectedFolderPaths.has(f.path)
                                ? "border-[#0052CC] bg-[#E8EFFF] ring-2 ring-[#0052CC] ring-offset-2"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {selectedFolderPaths.has(f.path) && (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0052CC] text-white">
                                <FaCheck className="h-3 w-3" />
                              </span>
                            )}
                            <FaFolder className="h-6 w-6 text-yellow-500 shrink-0" />
                            <span className="text-sm font-medium text-slate-700 truncate">{f.name || f.path}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {displayItems.map((item) => (
                      <div
                        key={item._id}
                        className={`group relative overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
                          selectedIds.has(item._id)
                            ? "border-slate-900 ring-2 ring-slate-900 ring-offset-2 shadow-md"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                        }`}
                      >
                        <div
                          className="relative aspect-square flex cursor-pointer items-center justify-center overflow-hidden bg-slate-100"
                          onClick={() => toggleSelect(item._id)}
                          onDoubleClick={(e) => { e.stopPropagation(); openPreview(item); }}
                        >
                          {item.type === "image" ? (
                            <>
                              <img
                                src={item.url}
                                alt={item.altText || item.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="rounded-full bg-white/90 p-2.5 shadow-lg">
                                  <FaExpand className="h-5 w-5 text-slate-700" />
                                </span>
                              </div>
                            </>
                          ) : item.type === "video" ? (
                            <div
                              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900"
                              onClick={(e) => { e.stopPropagation(); openPreview(item); }}
                            >
                              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-xl transition-transform group-hover:scale-110">
                                <FaPlay className="h-7 w-7 ml-1" />
                              </span>
                              <span className="mt-2 text-xs font-medium text-white/90">Play video</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-200">
                                <FaFileAlt className="h-7 w-7 text-slate-500" />
                              </div>
                              <span className="block truncate px-2 text-xs font-medium text-slate-500">{item.fileName}</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute left-2 top-2 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                          {typeToExt(item.type)}
                        </div>
                        {selectedIds.has(item._id) && (
                          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-md">
                            <FaCheck className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div className="relative border-t border-slate-100 bg-white p-3">
                          <p className="truncate pr-9 text-sm font-medium text-slate-900" title={item.name}>
                            {item.name || item.fileName}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFileMenuOpen(fileMenuOpen === item._id ? null : item._id); }}
                            className="absolute bottom-3 right-2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            aria-label="File options"
                          >
                            <FaEllipsisV className="h-4 w-4" />
                          </button>
                          {fileMenuOpen === item._id && (
                            <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl" onClick={(e) => e.stopPropagation()}>
                              {(item.type === "image" || item.type === "video") && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openPreview(item); setFileMenuOpen(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <FaExpand className="h-3.5 w-3.5 text-slate-400" /> View full
                                </button>
                              )}
                              {viewMode === "trash" ? (
                                <>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); copyUrl(item.url); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                                    <FaCopy className="h-3.5 w-3.5 text-slate-400" /> Copy URL
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); restoreItem(item._id); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-emerald-700 hover:bg-emerald-50">
                                    <FaUndo className="h-3.5 w-3.5" /> Restore
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); deletePermanent(item._id); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
                                    <FaTrash className="h-3.5 w-3.5" /> Delete permanently
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(item); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                                    <FaEdit className="h-3.5 w-3.5 text-slate-400" /> Edit
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); copyUrl(item.url); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                                    <FaCopy className="h-3.5 w-3.5 text-slate-400" /> Copy URL
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedIds(new Set([item._id])); setMoveCopyModal("move"); setMoveCopyDestination(currentFolderPath); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                                    <FaFolderOpen className="h-3.5 w-3.5 text-slate-400" /> Move to folder
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedIds(new Set([item._id])); setMoveCopyModal("copy"); setMoveCopyDestination(currentFolderPath); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                                    <FaCopy className="h-3.5 w-3.5 text-slate-400" /> Copy to folder
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); moveToTrash(item._id); setFileMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
                                    <FaTrash className="h-3.5 w-3.5" /> Move to trash
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <FaImage className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-base font-medium text-slate-800">No media found</p>
                      <p className="mt-1 text-sm text-slate-500 text-center max-w-xs">
                        {viewMode === "trash" ? "Trash is empty." : "Upload files or choose another folder or type."}
                      </p>
                      {viewMode === "library" && (
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0052CC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0044AA] disabled:opacity-60">
                          <FaUpload className="h-4 w-4" /> Upload files
                        </button>
                      )}
                    </div>
                  )}
                  </>
                  )
                }
                </div>

                {/* Footer bar — items count, selected, and pagination (10, 20, 50, 100) */}
                <div className="h-12 border-t border-slate-200 px-6 flex items-center justify-between bg-slate-50 text-xs text-slate-500 shrink-0">
                  <div className="flex items-center gap-4">
                    <span>{subfolders.length + displayItems.length} items</span>
                    {(selectedIds.size > 0 || selectedFolderPaths.size > 0) && (
                      <>
                        <span className="w-px h-3 bg-slate-300" />
                        <span className="font-medium text-[#0052CC]">
                          {selectedFolderPaths.size > 0 && selectedIds.size > 0
                            ? `${selectedFolderPaths.size} folder(s), ${selectedIds.size} file(s) selected`
                            : selectedFolderPaths.size > 0
                              ? `${selectedFolderPaths.size} folder(s) selected`
                              : `${selectedIds.size} item${selectedIds.size !== 1 ? "s" : ""} selected${selectedItem && selectedIds.size === 1 && selectedItem.size != null ? ` (${formatSize(selectedItem.size)})` : ""}`}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">Items per page:</span>
                    <div className="flex items-center gap-1">
                      {[10, 20, 50, 100].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => { setPageSize(n); }}
                          className={`min-w-[2rem] px-2 py-1 rounded border text-sm font-medium transition-colors ${pageSize === n ? "bg-[#0052CC] border-[#0052CC] text-white" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => fetchMedia(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <FaChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="min-w-[4rem] text-center text-sm text-slate-600">
                        Page {pagination.page} of {pagination.totalPages || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => fetchMedia(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <FaChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

        {/* Full preview modal — image lightbox / video player */}
        {previewItem && (previewItem.type === "image" || previewItem.type === "video") && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4"
            onClick={() => setPreviewItem(null)}
          >
            <div
              className="relative flex max-h-full w-full max-w-6xl items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="absolute -right-2 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-0 md:top-0"
                aria-label="Close"
              >
                <FaTimes className="h-6 w-6" />
              </button>
              {previewItem.type === "image" ? (
                <div className="flex max-h-[90vh] max-w-full flex-col items-center">
                  <img
                    src={previewItem.url}
                    alt={previewItem.altText || previewItem.name}
                    className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-slate-800/80 px-4 py-3 text-sm text-white backdrop-blur-sm">
                    <span className="font-medium truncate max-w-[280px]" title={previewItem.name}>
                      {previewItem.name || previewItem.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); copyUrl(previewItem.url); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 font-medium hover:bg-white/30"
                    >
                      <FaCopy className="h-3.5 w-3.5" /> Copy URL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-4xl">
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl">
                    <video
                      src={previewItem.url}
                      controls
                      autoPlay
                      className="h-full w-full"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-slate-800/80 px-4 py-3 text-sm text-white backdrop-blur-sm">
                    <span className="font-medium truncate max-w-[280px]" title={previewItem.name}>
                      {previewItem.name || previewItem.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); copyUrl(previewItem.url); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 font-medium hover:bg-white/30"
                    >
                      <FaCopy className="h-3.5 w-3.5" /> Copy URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Edit media</h2>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 overflow-auto p-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Display name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Alt text</label>
                  <input
                    type="text"
                    value={editForm.altText}
                    onChange={(e) => setEditForm((f) => ({ ...f, altText: e.target.value }))}
                    placeholder="For accessibility & SEO"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">File name</label>
                  <input
                    type="text"
                    value={editForm.fileName}
                    onChange={(e) => setEditForm((f) => ({ ...f, fileName: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Folder</label>
                  <select
                    value={editForm.folder ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, folder: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                  >
                    <option value="">All files (root)</option>
                    {foldersFlat.map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={editingItem.url}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => copyUrl(editingItem.url)}
                      className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={savingEdit}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingEdit ? "Saving…" : "Save"}
                  </button>
                  {editingItem.deletedAt ? (
                    <button
                      type="button"
                      onClick={() => restoreItem(editingItem._id)}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => moveToTrash(editingItem._id)}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      Move to trash
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deletePermanent(editingItem._id)}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                  >
                    Delete permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create folder modal */}
        {showCreateFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">New folder</h2>
                <button
                  type="button"
                  onClick={() => { setShowCreateFolder(false); setNewFolderName(""); }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Folder name</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Events, 2024"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  />
                </div>
                {currentFolderPath ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-500">
                    Location: <span className="font-medium text-slate-700">{currentFolderPath}</span>
                  </p>
                ) : null}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    disabled={creatingFolder || !newFolderName.trim()}
                    className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {creatingFolder ? "Creating…" : "Create folder"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateFolder(false); setNewFolderName(""); }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Move / Copy to folder modal */}
        {moveCopyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {moveCopyModal === "move" ? "Move to folder" : "Copy to folder"}
                </h2>
                <button
                  type="button"
                  onClick={() => { if (!moveCopyLoading) { setMoveCopyModal(null); setMoveCopyDestination(""); } }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                  disabled={moveCopyLoading}
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                <p className="text-sm text-slate-500 mb-3">
                  {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected. Choose destination:
                </p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setMoveCopyDestination("")}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${moveCopyDestination === "" ? "bg-[#E8EFFF] text-[#0052CC] font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    <FaFolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                    Root (Media)
                  </button>
                  {foldersFlat.map((f) => (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => setMoveCopyDestination(f.path)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${moveCopyDestination === f.path ? "bg-[#E8EFFF] text-[#0052CC] font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      <FaFolder className="h-4 w-4 shrink-0 text-yellow-500" />
                      <span className="truncate">{f.name || f.path}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={async () => {
                    const ids = Array.from(selectedIds);
                    if (ids.length === 0) return;
                    setMoveCopyLoading(true);
                    try {
                      if (moveCopyModal === "move") {
                        for (const id of ids) {
                          try { await api.patch(`/media/${id}`, { folder: moveCopyDestination }); } catch { /* ignore */ }
                        }
                        setSelectedIds(new Set());
                        success(ids.length === 1 ? "Moved" : `${ids.length} items moved`);
                      } else {
                        for (const id of ids) {
                          try { await api.post(`/media/${id}/copy`, { folder: moveCopyDestination }); } catch { /* ignore */ }
                        }
                        success(ids.length === 1 ? "Copied" : `${ids.length} items copied`);
                      }
                      setMoveCopyModal(null);
                      setMoveCopyDestination("");
                      fetchMedia(pagination.page);
                    } catch (e) {
                      showError("Failed to complete");
                    } finally {
                      setMoveCopyLoading(false);
                    }
                  }}
                  disabled={moveCopyLoading}
                  className="flex-1 rounded-lg bg-[#0052CC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0044AA] disabled:opacity-50"
                >
                  {moveCopyLoading ? "Please wait…" : moveCopyModal === "move" ? "Move here" : "Copy here"}
                </button>
                <button
                  type="button"
                  onClick={() => { if (!moveCopyLoading) { setMoveCopyModal(null); setMoveCopyDestination(""); } }}
                  disabled={moveCopyLoading}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rename folder modal */}
        {renameFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Rename folder</h2>
                <button
                  type="button"
                  onClick={() => { setRenameFolder(null); setRenameName(""); }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Folder name</label>
                  <input
                    type="text"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder="e.g. Events, 2024"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                    onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
                  />
                </div>
                <p className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-500">
                  Path: <span className="font-medium text-slate-700">{renameFolder.path}</span>
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleRenameFolder}
                    disabled={renamingFolder || !renameName.trim()}
                    className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {renamingFolder ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRenameFolder(null); setRenameName(""); }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete folder confirm modal */}
        {deleteFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Delete folder</h2>
                <button
                  type="button"
                  onClick={() => { setDeleteFolder(null); setFolderDeleteCounts(null); }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 p-5">
                {loadingFolderCounts ? (
                  <div className="flex items-center justify-center py-6">
                    <LoadingSpinner />
                  </div>
                ) : folderDeleteCounts && (folderDeleteCounts.files > 0 || folderDeleteCounts.subfolders > 0) ? (
                  <>
                    <p className="text-sm text-slate-600">
                      The folder <span className="font-medium text-slate-900">&quot;{deleteFolder.name}&quot;</span> is not empty.
                    </p>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <p className="font-medium">This folder contains:</p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5">
                        {folderDeleteCounts.files > 0 && (
                          <li>{folderDeleteCounts.files} file{folderDeleteCounts.files !== 1 ? "s" : ""}</li>
                        )}
                        {folderDeleteCounts.subfolders > 0 && (
                          <li>{folderDeleteCounts.subfolders} subfolder{folderDeleteCounts.subfolders !== 1 ? "s" : ""}</li>
                        )}
                      </ul>
                      <p className="mt-2 text-amber-700">The folder must be empty before it can be deleted. Move or delete the contents first.</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setCurrentFolderPath(deleteFolder.path); setDeleteFolder(null); setFolderDeleteCounts(null); fetchMedia(1); }}
                        className="flex-1 rounded-lg bg-[#0052CC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0044AA]"
                      >
                        Go to folder
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteFolder(null); setFolderDeleteCounts(null); }}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      Delete folder <span className="font-medium text-slate-900">&quot;{deleteFolder.name}&quot;</span>? This cannot be undone.
                    </p>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleDeleteFolder}
                        disabled={deletingFolder}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingFolder ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteFolder(null); setFolderDeleteCounts(null); }}
                        disabled={deletingFolder}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
    </>
  );
}
