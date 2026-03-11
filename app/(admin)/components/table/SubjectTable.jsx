"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash, FaEye, FaPowerOff, FaLock, FaGraduationCap, FaGripVertical } from "react-icons/fa";
import { FiCheck } from "react-icons/fi";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";

const SubjectTable = ({ subjects, onEdit, onDelete, onToggleStatus, onTogglePractice, onReorderDraft, reorderDraft = {}, isReorderAllowed = true }) => {
  const { canEdit, canDelete, canReorder, role } = usePermissions();
  const router = useRouter();
  const [dragged, setDragged] = useState({ examId: null, index: null });
  const [dragOver, setDragOver] = useState({ examId: null, index: null });

  const canDrag = Boolean(canReorder && onReorderDraft && isReorderAllowed);

  const getVisitStats = (subject) => subject?.visitStats;

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

  const handleDragStart = (e, examId, index) => {
    if (!canDrag) return;
    setDragged({ examId, index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.setData("application/json", JSON.stringify({ examId, index }));
    try { e.target.closest("tr")?.classList.add("opacity-50", "ring-2", "ring-blue-400"); } catch (_) { }
  };

  const handleDragOver = (e, examId, index) => {
    if (!canDrag || dragged.examId === null || dragged.examId !== examId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver({ examId, index });
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver({ examId: null, index: null });
  };

  const handleDrop = (e, examId, toIndex) => {
    if (!canDrag) return;
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    const payload = e.dataTransfer.getData("application/json");
    let payloadExamId = examId;
    try {
      const parsed = JSON.parse(payload || "{}");
      if (parsed.examId) payloadExamId = parsed.examId;
    } catch (_) { }
    if (payloadExamId !== examId || Number.isNaN(fromIndex) || fromIndex === toIndex) {
      setDragOver({ examId: null, index: null });
      setDragged({ examId: null, index: null });
      return;
    }
    setDragOver({ examId: null, index: null });
    setDragged({ examId: null, index: null });
    try { e.target.closest("tr")?.classList.remove("opacity-50", "ring-2", "ring-blue-400"); } catch (_) { }
    const group = groupedSubjects.find((g) => g.examId === examId);
    if (!group) return;
    const currentList = reorderDraft[examId] ?? group.subjects;
    const newOrder = [...currentList];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    onReorderDraft(examId, newOrder);
  };

  const handleDragEnd = (e) => {
    setDragged({ examId: null, index: null });
    setDragOver({ examId: null, index: null });
    try { e.target.closest("tr")?.classList.remove("opacity-50", "ring-2", "ring-blue-400"); } catch (_) { }
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

  const displayGroups = useMemo(
    () =>
      groupedSubjects.map((g) => ({
        ...g,
        subjects: reorderDraft[g.examId] ?? g.subjects,
      })),
    [groupedSubjects, reorderDraft]
  );

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
      {displayGroups.map((group, groupIndex) => (
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
                  {canDrag && (
                    <th className="px-1 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      Order
                    </th>
                  )}
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject Name
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Content
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    Meta
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Visits
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Today
                  </th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className="bg-white divide-y divide-gray-200"
                onDragLeave={handleDragLeave}
              >
                {group.subjects.map((subject, index) => {
                  const rowCanDrag = canDrag && group.subjects.length > 1;
                  const isDragged = dragged.examId === group.examId && dragged.index === index;
                  const isDragOver = dragOver.examId === group.examId && dragOver.index === index && !isDragged;
                  return (
                    <tr
                      key={subject._id || subject.id || index}
                      draggable={rowCanDrag}
                      onDragStart={(e) => handleDragStart(e, group.examId, index)}
                      onDragOver={(e) => handleDragOver(e, group.examId, index)}
                      onDrop={(e) => handleDrop(e, group.examId, index)}
                      onDragEnd={handleDragEnd}
                      className={`hover:bg-gray-50 transition-colors ${subject.status === "inactive" ? "opacity-60" : ""} ${isDragged ? "opacity-50 ring-2 ring-blue-400" : ""
                        } ${isDragOver ? "bg-blue-50 border-y-2 border-blue-200" : ""}`}
                    >
                      {canDrag && (
                        <td
                          className="px-1 py-2 text-center w-10 cursor-grab active:cursor-grabbing"
                          onClick={(e) => e.stopPropagation()}
                          title="Drag to reorder"
                        >
                          <span className="inline-flex text-gray-400 hover:text-gray-600" aria-hidden>
                            <FaGripVertical className="w-4 h-4" />
                          </span>
                          <span className="sr-only">Drag to reorder position {index + 1}</span>
                        </td>
                      )}
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
                      <td className="px-2 py-1 whitespace-nowrap w-16 text-center">
                        {subject.contentInfo?.hasMeta ? (
                          <div className="flex justify-center">
                            <FiCheck className="text-green-600 w-5 h-5 font-black" style={{ strokeWidth: 5 }} title="Meta data filled" />
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-center">
                        {getVisitStats(subject) ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {getVisitStats(subject).totalVisits ?? 0}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({getVisitStats(subject).uniqueVisits ?? 0} unique)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-center">
                        {getVisitStats(subject) ? (
                          <span className="text-sm text-gray-900">
                            {getVisitStats(subject).todayVisits ?? 0}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
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
                          {onTogglePractice &&
                            (canReorder ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePractice(subject);
                                }}
                                className={`p-1 rounded-lg transition-colors ${subject.practiceDisabled
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-green-50 text-green-600 hover:bg-green-100"
                                  }`}
                                title={
                                  subject.practiceDisabled
                                    ? "Enable Practice Tests"
                                    : "Disable Practice Tests"
                                }
                              >
                                <FaGraduationCap className="text-sm" />
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tablet/Mobile View */}
          <div className="lg:hidden divide-y divide-gray-200">
            {group.subjects.map((subject, index) => {
              const rowCanDrag = canDrag && group.subjects.length > 1;
              const isDragged = dragged.examId === group.examId && dragged.index === index;
              const isDragOver = dragOver.examId === group.examId && dragOver.index === index && !isDragged;
              return (
                <div
                  key={subject._id || subject.id || index}
                  draggable={rowCanDrag}
                  onDragStart={(e) => handleDragStart(e, group.examId, index)}
                  onDragOver={(e) => handleDragOver(e, group.examId, index)}
                  onDrop={(e) => handleDrop(e, group.examId, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-1.5 hover:bg-gray-50 transition-colors ${subject.status === "inactive" ? "opacity-60" : ""} ${isDragged ? "opacity-50 ring-2 ring-blue-400 rounded" : ""
                    } ${isDragOver ? "bg-blue-50 border-2 border-blue-200 rounded" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {canDrag && (
                      <div
                        className="shrink-0 pt-0.5 cursor-grab active:cursor-grabbing text-gray-400"
                        onClick={(e) => e.stopPropagation()}
                        title="Drag to reorder"
                      >
                        <FaGripVertical className="w-4 h-4" />
                      </div>
                    )}
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
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500">Meta:</span>
                          {subject.contentInfo?.hasMeta ? (
                            <FiCheck className="text-green-600 w-4 h-4" style={{ strokeWidth: 4 }} />
                          ) : (
                            <span className="text-gray-400 text-[10px]">-</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500">Visits:</span>
                          {getVisitStats(subject) ? (
                            <span className="text-sm text-gray-900">
                              {getVisitStats(subject).totalVisits ?? 0}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500">Today:</span>
                          {getVisitStats(subject) ? (
                            <span className="text-sm text-gray-900">
                              {getVisitStats(subject).todayVisits ?? 0}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
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
                      {onTogglePractice &&
                        (canReorder ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePractice(subject);
                            }}
                            className={`p-1 rounded-lg transition-colors ${subject.practiceDisabled
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                              }`}
                            title={
                              subject.practiceDisabled
                                ? "Enable Practice Tests"
                                : "Disable Practice Tests"
                            }
                          >
                            <FaGraduationCap className="text-sm" />
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
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SubjectTable;
