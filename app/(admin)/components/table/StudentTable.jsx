"use client";
import React, { useState, useMemo } from "react";
import { FaTrash, FaEye, FaLock } from "react-icons/fa";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";

const StudentTable = ({ students, onView, onDelete }) => {
  const { canDelete, role } = usePermissions();

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper function to format date for mobile (shorter)
  const formatDateShort = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Helper function to format last login
  const formatLastLogin = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  // Helper function to get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: {
        bg: "bg-green-50",
        text: "text-green-700",
        label: "Active",
      },
      inactive: {
        bg: "bg-gray-50",
        text: "text-gray-700",
        label: "Inactive",
      },
    };
    const config = statusConfig[status] || statusConfig.active;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
        {config.label}
      </span>
    );
  };

  if (!students || students.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          No Students Found
        </h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Registered students will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Country
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registered
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student, index) => {
              const studentId = student._id || student.id;
              const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim();

              return (
                <tr
                  key={studentId || index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {fullName || "N/A"}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <a
                      href={`mailto:${student.email}`}
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors truncate max-w-[200px]"
                      title={student.email}
                    >
                      {student.email}
                    </a>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {student.phoneNumber ? (
                      <a
                        href={`tel:${String(student.phoneNumber).trim()}`}
                        className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {String(student.phoneNumber).trim()}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400 italic">N/A</span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                      {student.className || "N/A"}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {student.country || "N/A"}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {getStatusBadge(student.status || "active")}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {formatLastLogin(student.lastLogin)}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <time
                      className="text-sm text-gray-500"
                      dateTime={student.createdAt}
                    >
                      {formatDateShort(student.createdAt)}
                    </time>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onView && (
                        <button
                          onClick={() => onView(student)}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                          title="View Student Details"
                        >
                          <FaEye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete &&
                        (canDelete ? (
                          <button
                            onClick={() => onDelete(student)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                            title="Delete Student"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            disabled
                            title={getPermissionMessage("delete", role)}
                            className="p-1.5 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                          >
                            <FaLock className="w-3.5 h-3.5" />
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet View */}
      <div className="md:hidden space-y-2">
        {students.map((student, index) => {
          const studentId = student._id || student.id;
          const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim();

          return (
            <div
              key={studentId || index}
              className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
            >
              {/* Header Section */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5 truncate">
                    {fullName || "N/A"}
                  </h3>
                  <a
                    href={`mailto:${student.email}`}
                    className="text-xs text-gray-500 hover:text-blue-600 transition-colors truncate block"
                  >
                    {student.email}
                  </a>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(student.status || "active")}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {student.phoneNumber && (
                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <a
                      href={`tel:${String(student.phoneNumber).trim()}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {String(student.phoneNumber).trim()}
                    </a>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Class</div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    {student.className || "N/A"}
                  </span>
                </div>
                {student.country && (
                  <div>
                    <div className="text-xs text-gray-500">Country</div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {student.country}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">Last Login</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatLastLogin(student.lastLogin)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Registered</div>
                  <time
                    className="text-sm font-medium text-gray-900"
                    dateTime={student.createdAt}
                  >
                    {formatDateShort(student.createdAt)}
                  </time>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                {onView && (
                  <button
                    onClick={() => onView(student)}
                    className="flex-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100 text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <FaEye className="w-3.5 h-3.5" />
                    View
                  </button>
                )}
                {onDelete &&
                  (canDelete ? (
                    <button
                      onClick={() => onDelete(student)}
                      className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100 text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <FaTrash className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  ) : (
                    <button
                      disabled
                      title={getPermissionMessage("delete", role)}
                      className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <FaLock className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentTable;

