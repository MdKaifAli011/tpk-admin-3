"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaClipboardList,
  FaFileAlt,
} from "react-icons/fa";
import { LoadingWrapper, LoadingSpinner } from "../ui/SkeletonLoader";
import { ToastContainer, useToast } from "../ui/Toast";
import { PermissionButton } from "../common/PermissionButton";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

const StatusBadge = ({ status, onClick }) => {
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
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
        status
      )}`}
    >
      {(status || "draft").charAt(0).toUpperCase() +
        (status || "draft").slice(1)}
    </button>
  );
};

const PageTable = ({
  pages,
  onEdit,
  onDelete,
  onToggleStatus,
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
              <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pages.map((page, index) => (
              <tr
                key={page._id || page.id || index}
                className={`hover:bg-gray-50 transition-colors ${
                  page.status === "inactive" ? "opacity-60" : ""
                }`}
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-sm font-medium truncate cursor-pointer hover:text-blue-600 transition-colors ${
                        page.status === "inactive"
                          ? "text-gray-500 line-through"
                          : "text-gray-900"
                      }`}
                      onClick={() => onEdit(page)}
                    >
                      {page.title}
                    </div>
                    <div className="text-xs text-gray-400 font-mono truncate">
                      /pages/{page.slug}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-1 whitespace-nowrap w-32">
                  <StatusBadge
                    status={page.status}
                    onClick={() => onToggleStatus(page)}
                  />
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
                <td className="px-2 py-1 whitespace-nowrap text-right w-32">
                  <div className="flex items-center justify-end gap-1">
                    <PermissionButton
                      action="edit"
                      onClick={() => onEdit(page)}
                      className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                      title={getPermissionMessage("edit", role)}
                    >
                      <FaEdit className="text-sm" />
                    </PermissionButton>
                    <PermissionButton
                      action="delete"
                      onClick={() => onDelete(page)}
                      className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                      title={getPermissionMessage("delete", role)}
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

      <div className="md:hidden divide-y divide-gray-200">
        {pages.map((page, index) => (
          <div
            key={page._id || page.id || index}
            className={`p-1.5 hover:bg-gray-50 transition-colors ${
              page.status === "inactive" ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm font-semibold mb-1 cursor-pointer hover:text-blue-600 transition-colors ${
                    page.status === "inactive"
                      ? "text-gray-500 line-through"
                      : "text-gray-900"
                  }`}
                  onClick={() => onEdit(page)}
                >
                  {page.title}
                </h3>
                <div className="text-xs text-gray-400 font-mono truncate mb-1">
                  /pages/{page.slug}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge
                    status={page.status}
                    onClick={() => onToggleStatus(page)}
                  />
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
                <PermissionButton
                  action="edit"
                  onClick={() => onEdit(page)}
                  className="p-1 bg-blue-50 text-blue-600 rounded-lg"
                  title={getPermissionMessage("edit", role)}
                >
                  <FaEdit className="text-sm" />
                </PermissionButton>
                <PermissionButton
                  action="delete"
                  onClick={() => onDelete(page)}
                  className="p-1 bg-red-50 text-red-600 rounded-lg"
                  title={getPermissionMessage("delete", role)}
                >
                  <FaTrash className="text-sm" />
                </PermissionButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PageManagement = () => {
  const { role } = usePermissions();
  const router = useRouter();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);
      const res = await api.get("/page");
      if (res.data?.success) {
        setPages(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching pages:", err);
      setError("Failed to fetch pages");
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (page) => {
    const isActive = page.status === "active";
    const newStatus = isActive ? "inactive" : "active";
    try {
      const response = await api.put(`/page/${page.slug}`, {
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

  const handleDeletePage = async (page) => {
    if (!window.confirm(`Delete "${page.title}"?`)) return;
    try {
      const response = await api.delete(`/page/${page.slug}`);
      if (response.data?.success) {
        setPages((prev) => prev.filter((p) => p._id !== page._id));
        success("Page deleted successfully");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Page Management
              </h1>
              <p className="text-xs text-gray-600">
                Create and manage custom pages (About Us, Privacy, etc.). Slug is
                generated automatically from the title.
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/pages/new")}
              className="px-2 py-1 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
            >
              <FaPlus className="w-3.5 h-3.5" />
              Add New Page
            </button>
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
                  Edit content with the rich text editor; pages appear at
                  /pages/[slug]
                </p>
              </div>
            </div>
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
                  Us, Privacy Policy).
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
              <PageTable
                pages={pages}
                onEdit={(p) => router.push(`/admin/pages/${p.slug}`)}
                onDelete={handleDeletePage}
                onToggleStatus={handleToggleStatus}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PageManagement;
