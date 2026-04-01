"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaClipboardList,
  FaFileAlt,
  FaFilter,
  FaEye,
  FaUndo,
} from "react-icons/fa";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import { ToastContainer, useToast } from "../ui/Toast";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import PaginationBar from "../ui/PaginationBar";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

function getPublicPageUrl(page) {
  const examSlug = page.exam?.slug || (typeof page.exam === "string" ? page.exam : null);
  if (examSlug) {
    return `${basePath}/${examSlug}/pages/${page.slug}`;
  }
  return `${basePath}/pages/${page.slug}`;
}

const StatusBadge = ({ status, onClick, disabled }) => {
  const getStatusStyles = (s) => {
    switch (s) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
        status
      )} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {(status || "draft").charAt(0).toUpperCase() +
        (status || "draft").slice(1)}
    </button>
  );
};

const DeleteConfirmModal = ({ page, onConfirm, onCancel }) => {
  if (!page) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete page?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete &quot;{page.title}&quot;? The page will be hidden from the site but you can restore it later from this list.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const PageTable = ({
  pages,
  onEdit,
  onDelete,
  onToggleStatus,
  onRestore,
  onView,
}) => {
  const { role } = usePermissions();
  if (!pages || pages.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-5xl mb-3 animate-float">📄</div>
        <h3 className="text-sm sm:text-sm font-bold text-gray-800 mb-1.5">
          No Pages Found
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Create your first page to display custom content on your site (e.g.
          About Us, Privacy Policy).
        </p>
        <div className="mt-4">
          <div className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-medium">
            <FaFileAlt className="w-3.5 h-3.5" />
            <span>Ready to create your first page?</span>
          </div>
        </div>
      </div>
    );
  }

  const pathLabel = (page) => {
    const examSlug = page.exam?.slug || (typeof page.exam === "string" ? page.exam : null);
    if (examSlug) return `/${examSlug}/pages/${page.slug}`;
    return `/pages/${page.slug}`;
  };

  const row = (page, index, isMobile) => {
    const isDeleted = !!page.deletedAt;
    return (
      <React.Fragment key={page._id || page.id || index}>
        {!isMobile && (
          <tr
            className={`hover:bg-gray-50 transition-colors ${
              page.status === "inactive" || isDeleted ? "opacity-75" : ""
            } ${isDeleted ? "bg-gray-50" : ""}`}
          >
            <td className="px-3 py-2 whitespace-nowrap">
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-medium truncate cursor-pointer hover:text-blue-600 transition-colors ${
                    page.status === "inactive" ? "text-gray-500 line-through" : "text-gray-900"
                  }`}
                  onClick={() => !isDeleted && onEdit(page)}
                >
                  {page.title}
                </div>
                <div className="text-xs text-gray-400 font-mono truncate">
                  {pathLabel(page)}
                </div>
                {isDeleted && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                    Deleted
                  </span>
                )}
              </div>
            </td>
            <td className="px-2 py-1 whitespace-nowrap w-32">
              {isDeleted ? (
                <span className="text-xs text-gray-500">—</span>
              ) : (
                <StatusBadge
                  status={page.status}
                  onClick={() => onToggleStatus(page)}
                />
              )}
            </td>
            <td className="px-2 py-1 whitespace-nowrap w-40">
              <span className="text-xs text-gray-500">
                {new Date(page.updatedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </td>
            <td className="px-2 py-1 whitespace-nowrap text-right w-40">
              <div className="flex items-center justify-end gap-1 flex-wrap">
                {!isDeleted && (
                  <button
                    onClick={() => onView(page)}
                    className="p-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="View page"
                  >
                    <FaEye className="text-sm" />
                  </button>
                )}
                {!isDeleted && (
                  <PermissionButton
                    action="edit"
                    onClick={() => onEdit(page)}
                    className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                    title={getPermissionMessage("edit", role)}
                  >
                    <FaEdit className="text-sm" />
                  </PermissionButton>
                )}
                {isDeleted ? (
                  <button
                    onClick={() => onRestore(page)}
                    className="p-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                    title="Restore page"
                  >
                    <FaUndo className="text-sm" />
                  </button>
                ) : (
                  <PermissionButton
                    action="delete"
                    onClick={() => onDelete(page)}
                    className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                    title={getPermissionMessage("delete", role)}
                  >
                    <FaTrash className="text-sm" />
                  </PermissionButton>
                )}
              </div>
            </td>
          </tr>
        )}
        {isMobile && (
          <div
            className={`p-1.5 hover:bg-gray-50 transition-colors ${isDeleted ? "bg-gray-50" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm font-semibold mb-1 ${!isDeleted ? "cursor-pointer hover:text-blue-600" : ""} ${
                    page.status === "inactive" ? "text-gray-500 line-through" : "text-gray-900"
                  }`}
                  onClick={() => !isDeleted && onEdit(page)}
                >
                  {page.title}
                </h3>
                <div className="text-xs text-gray-400 font-mono truncate mb-1">
                  {pathLabel(page)}
                </div>
                {isDeleted && (
                  <span className="inline-block mb-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                    Deleted
                  </span>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isDeleted && (
                    <StatusBadge
                      status={page.status}
                      onClick={() => onToggleStatus(page)}
                    />
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(page.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3">
                {!isDeleted && (
                  <button
                    onClick={() => onView(page)}
                    className="p-1 bg-gray-100 text-gray-700 rounded-lg"
                    title="View page"
                  >
                    <FaEye className="text-sm" />
                  </button>
                )}
                {!isDeleted && (
                  <PermissionButton
                    action="edit"
                    onClick={() => onEdit(page)}
                    className="p-1 bg-blue-50 text-blue-600 rounded-lg"
                    title={getPermissionMessage("edit", role)}
                  >
                    <FaEdit className="text-sm" />
                  </PermissionButton>
                )}
                {isDeleted ? (
                  <button
                    onClick={() => onRestore(page)}
                    className="p-1 bg-emerald-50 text-emerald-600 rounded-lg"
                    title="Restore"
                  >
                    <FaUndo className="text-sm" />
                  </button>
                ) : (
                  <PermissionButton
                    action="delete"
                    onClick={() => onDelete(page)}
                    className="p-1 bg-red-50 text-red-600 rounded-lg"
                    title={getPermissionMessage("delete", role)}
                  >
                    <FaTrash className="text-sm" />
                  </PermissionButton>
                )}
              </div>
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Page
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Status
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Updated
              </th>
              <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pages.map((page, index) => row(page, index, false))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-200">
        {pages.map((page, index) => row(page, index, true))}
      </div>
    </div>
  );
};

const PageManagement = () => {
  const { role } = usePermissions();
  const router = useRouter();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const [exams, setExams] = useState([]);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalPage, setDeleteModalPage] = useState(null);
  const [filterState, setFilterState] = useFilterPersistence("page", { examFilter: "all", statusFilter: "all", searchQuery: "" });
  const { page: pageNum, limit, examFilter, statusFilter, searchQuery } = filterState;
  const [searchInput, setSearchInput] = useDebouncedSearchQuery(searchQuery, setFilterState);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/exam?status=all&limit=1000");
        if (!cancelled && res.data?.success) setExams(res.data.data || []);
      } catch {
        if (!cancelled) setExams([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
      });
      if (examFilter !== "all") params.set("exam", examFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await api.get(`/page?${params.toString()}`);
      if (res.data?.success) {
        setPages(res.data.data || []);
        const pag = res.data?.pagination;
        if (pag) {
          setPagination({
            total: pag.total ?? 0,
            totalPages: pag.totalPages ?? 0,
            hasNextPage: !!pag.hasNextPage,
            hasPrevPage: !!pag.hasPrevPage,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching pages:", err);
      setError("Failed to fetch pages");
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  }, [pageNum, limit, examFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async (page) => {
    if (page.deletedAt) return;
    const isActive = page.status === "active";
    const newStatus = isActive ? "inactive" : "active";
    const examParam = page.exam?.slug ? `?exam=${page.exam.slug}` : "";
    try {
      const response = await api.put(`/page/${page.slug}${examParam}`, {
        status: newStatus,
      });
      if (response.data?.success) {
        setPages((prev) =>
          prev.map((p) =>
            p._id === page._id ? { ...p, status: newStatus } : p
          )
        );
        success(`Status updated to ${newStatus}`);
      }
    } catch (err) {
      showError("Failed to update status");
    }
  };

  const handleDeleteClick = (page) => setDeleteModalPage(page);
  const handleDeleteConfirm = async () => {
    if (!deleteModalPage) return;
    const page = deleteModalPage;
    setDeleteModalPage(null);
    const examParam = page.exam?.slug ? `?exam=${page.exam.slug}` : "";
    try {
      const response = await api.delete(`/page/${page.slug}${examParam}`);
      if (response.data?.success) {
        setPages((prev) =>
          prev.map((p) =>
            p._id === page._id ? { ...p, deletedAt: response.data.data?.deletedAt || new Date().toISOString() } : p
          )
        );
        success("Page deleted. You can restore it from this list.");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to delete");
    }
  };

  const handleRestore = async (page) => {
    const examSlug = page.exam?.slug || (typeof page.exam === "string" ? page.exam : null);
    const examParam = examSlug ? `?exam=${encodeURIComponent(examSlug)}` : "";
    try {
      const response = await api.put(`/page/${page.slug}${examParam}`, {
        deletedAt: null,
        exam: examSlug || "site",
      });
      if (response.data?.success) {
        setPages((prev) =>
          prev.map((p) =>
            p._id === page._id ? { ...response.data.data } : p
          )
        );
        success("Page restored.");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to restore");
    }
  };

  const handleView = (page) => {
    const url = getPublicPageUrl(page);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const getEditHref = (page) => {
    const base = `/admin/pages/${page.slug}`;
    const examSlug = page.exam?.slug || (typeof page.exam === "string" ? page.exam : null);
    return examSlug ? `${base}?exam=${examSlug}` : base;
  };

  const activeFilterCount = (examFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (searchQuery.trim() ? 1 : 0);
  const clearFilters = () => {
    setFilterState({ examFilter: "all", statusFilter: "all", searchQuery: "", page: 1 });
    setSearchInput("");
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <DeleteConfirmModal
        page={deleteModalPage}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalPage(null)}
      />
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Page Management
              </h1>
              <p className="text-xs text-gray-600">
                Create and manage custom pages. Site-level: /self-study/pages/[slug]. Exam-level: /self-study/[exam]/pages/[slug].
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push("/admin/pages/new")}
                className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
              >
                <FaPlus className="w-3.5 h-3.5" />
                Site-level page
              </button>
              <select
                className="px-2 py-1 border border-gray-300 rounded-lg text-xs font-medium bg-white text-gray-700"
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) router.push(`/admin/pages/new?exam=${v}`);
                }}
              >
                <option value="">Create exam page…</option>
                {exams.map((ex) => (
                  <option key={ex._id} value={ex.slug || ex._id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Pages List
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  View, edit, or restore pages. Use filters for site-level vs exam-level.
                </p>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  showFilters
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FaFilter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search pages…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                  <select
                    value={examFilter}
                    onChange={(e) => setFilterState({ examFilter: e.target.value, page: 1 })}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All pages</option>
                    <option value="site">Site-level only (/self-study/pages/…)</option>
                    {exams.map((ex) => (
                      <option key={ex._id} value={ex.slug || ex._id}>
                        Exam: {ex.name} (/{ex.slug}/pages/…)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setFilterState({ statusFilter: e.target.value, page: 1 })}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            {isDataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <LoadingSpinner size="medium" />
                  <p className="text-sm text-gray-500 mt-3">Loading pages...</p>
                </div>
              </div>
            ) : pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <FaClipboardList className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Pages Yet
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm">
                  Create a page to show custom content on your site (e.g. About
                  Us, Privacy Policy) or under an exam.
                </p>
                <button
                  onClick={() => router.push("/admin/pages/new")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <FaPlus className="w-4 h-4" />
                  Create Your First Page
                </button>
              </div>
            ) : (
              <>
                <PageTable
                  pages={pages}
                  onEdit={(p) => router.push(getEditHref(p))}
                  onDelete={handleDeleteClick}
                  onToggleStatus={handleToggleStatus}
                  onRestore={handleRestore}
                  onView={handleView}
                />
                {(pagination.totalPages > 0 || pagination.total > 0) && (
                  <PaginationBar
                    page={pageNum}
                    limit={limit}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    hasNextPage={pagination.hasNextPage}
                    hasPrevPage={pagination.hasPrevPage}
                    onPageChange={(p) => setFilterState({ page: p })}
                    onLimitChange={(l) => setFilterState({ limit: l, page: 1 })}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PageManagement;
