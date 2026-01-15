"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash, FaEye, FaPowerOff, FaLock } from "react-icons/fa";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";

const SubjectTable = ({ subjects, onEdit, onDelete, onToggleStatus }) => {
  const { canEdit, canDelete, canReorder, role } = usePermissions();
  const router = useRouter();

  // Helper function to format content date
  const formatContentDate = (contentInfo) => {
    if (!contentInfo || !contentInfo.hasContent || !contentInfo.contentDate) {
      return "unavailable";
    }
    const date = new Date(contentInfo.contentDate);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSubjectClick = (subject) => {
    router.push(`/admin/subject/${subject._id}`);
  };

  // Group subjects by Exam
  const groupedSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) {
      return [];
    }

    const groups = {};
    subjects.forEach((subject) => {
      // Handle different examId formats:
      // 1. Populated object: { _id: "...", name: "..." }
      // 2. ObjectId string: "..."
      // 3. Null/undefined: unassigned
      let examId = "unassigned";
      let examName = "Unassigned";

      if (subject.examId) {
        if (typeof subject.examId === "object" && subject.examId !== null) {
          // Populated object
          examId = subject.examId._id?.toString() || subject.examId.id?.toString() || "unassigned";
          examName = subject.examId.name || "Unassigned";
        } else if (typeof subject.examId === "string") {
          // ObjectId string
          examId = subject.examId;
          examName = "Unassigned";
        }
      }

      // Use examId as key (convert to string for consistency)
      const groupKey = String(examId);

      if (!groups[groupKey]) {
        groups[groupKey] = {
          examId: groupKey,
          examName,
          subjects: [],
        };
      }
      groups[groupKey].subjects.push(subject);
    });

    // Sort groups alphabetically by exam name
    return Object.values(groups).sort((a, b) =>
      a.examName.localeCompare(b.examName)
    );
  }, [subjects]);

  if (!subjects || subjects.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-gray-400 text-5xl mb-3">📘</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          No Subjects Found
        </h3>
        <p className="text-sm text-gray-500">
          Add your first subject to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedSubjects.map((group, groupIndex) => (
        <div
          key={group.examId}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
        >
          {/* Breadcrumb Header */}
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <div className="flex items-center gap-1.5 flex-wrap text-xs font-medium text-white">
              {/* Exam Name */}
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#10B981" }}
              >
                {group.examName}
              </span>
              <span className="text-gray-400">›</span>
              {/* Subject Count */}
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#6B7280" }}
              >
                {group.subjects.length}{" "}
                {group.subjects.length === 1 ? "Subject" : "Subjects"}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject Name
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Content
                  </th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {group.subjects.map((subject, index) => (
                  <tr
                    key={subject._id || subject.id || index}
                    className={`hover:bg-gray-50 transition-colors ${subject.status === "inactive" ? "opacity-60" : ""
                      }`}
                  >
                    <td
                      className={`px-2 py-1 whitespace-nowrap text-sm font-medium cursor-pointer hover:text-blue-600 transition-colors ${subject.status === "inactive"
                          ? "text-gray-500 line-through"
                          : "text-gray-900"
                        }`}
                      onClick={() => handleSubjectClick(subject)}
                      title={subject.name}
                    >
                      {subject.name}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap w-40">
                      <span
                        className={`text-sm ${subject.contentInfo?.hasContent
                            ? "text-gray-700"
                            : "text-gray-400 italic"
                          }`}
                      >
                        {formatContentDate(subject.contentInfo)}
                      </span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-right w-32">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubjectClick(subject);
                          }}
                          className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                          title="View Subject Details"
                        >
                          <FaEye className="text-sm" />
                        </button>
                        {onEdit &&
                          (canEdit ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(subject);
                              }}
                              className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                              title="Edit Subject"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                          ) : (
                            <button
                              disabled
                              title={getPermissionMessage("edit", role)}
                              className="p-1 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                            >
                              <FaLock className="text-sm" />
                            </button>
                          ))}
                        {onDelete &&
                          (canDelete ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(subject);
                              }}
                              className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                              title="Delete Subject"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          ) : (
                            <button
                              disabled
                              title={getPermissionMessage("delete", role)}
                              className="p-1 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                            >
                              <FaLock className="text-sm" />
                            </button>
                          ))}
                        {onToggleStatus &&
                          (canReorder ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleStatus(subject);
                              }}
                              className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                              title={
                                subject.status === "active"
                                  ? "Deactivate Subject"
                                  : "Activate Subject"
                              }
                            >
                              <FaPowerOff className="text-sm" />
                            </button>
                          ) : (
                            <button
                              disabled
                              title={getPermissionMessage("reorder", role)}
                              className="p-1 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                            >
                              <FaLock className="text-sm" />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tablet/Mobile View */}
          <div className="lg:hidden divide-y divide-gray-200">
            {group.subjects.map((subject, index) => (
              <div
                key={subject._id || subject.id || index}
                className={`p-1.5 hover:bg-gray-50 transition-colors ${subject.status === "inactive" ? "opacity-60" : ""
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex-1 min-w-0 pr-2 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleSubjectClick(subject)}
                  >
                    <h3
                      className={`text-sm font-semibold mb-1 ${subject.status === "inactive"
                          ? "text-gray-500 line-through"
                          : "text-gray-900"
                        }`}
                      title={subject.name}
                    >
                      {subject.name}
                    </h3>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-sm font-medium ${subject.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                          }`}
                      >
                        {subject.status === "active" ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`text-sm ${subject.contentInfo?.hasContent
                            ? "text-gray-600"
                            : "text-gray-400 italic"
                          }`}
                      >
                        Content: {formatContentDate(subject.contentInfo)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubjectClick(subject);
                      }}
                      className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                      title="View Subject Details"
                    >
                      <FaEye className="text-sm" />
                    </button>
                    {onEdit &&
                      (canEdit ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(subject);
                          }}
                          className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                          title="Edit Subject"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                      ) : (
                        <button
                          disabled
                          title={getPermissionMessage("edit", role)}
                          className="p-1 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                        >
                          <FaLock className="text-sm" />
                        </button>
                      ))}
                    {onDelete &&
                      (canDelete ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(subject);
                          }}
                          className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                          title="Delete Subject"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      ) : (
                        <button
                          disabled
                          title={getPermissionMessage("delete", role)}
                          className="p-1 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                        >
                          <FaLock className="text-sm" />
                        </button>
                      ))}
                    {onToggleStatus &&
                      (canReorder ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(subject);
                          }}
                          className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                          title={
                            subject.status === "active"
                              ? "Deactivate Subject"
                              : "Activate Subject"
                          }
                        >
                          <FaPowerOff className="text-sm" />
                        </button>
                      ) : (
                        <button
                          disabled
                          title={getPermissionMessage("reorder", role)}
                          className="p-1 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                        >
                          <FaLock className="text-sm" />
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SubjectTable;
