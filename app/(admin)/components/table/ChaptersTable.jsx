"use client";
import React, { useMemo, useState } from "react";
import { FaEdit, FaTrash, FaEye, FaPowerOff, FaLock, FaGripVertical } from "react-icons/fa";
import { FiCheck } from "react-icons/fi";
import { useRouter } from "next/navigation";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";

const ChaptersTable = ({
  chapters,
  onEdit,
  onDelete,
  onToggleStatus,
  onReorderDraft,
  reorderDraft = {},
  isReorderAllowed = true,
}) => {
  const { canEdit, canDelete, canReorder, role } = usePermissions();
  const router = useRouter();
  const [dragged, setDragged] = useState({ unitId: null, index: null });
  const [dragOver, setDragOver] = useState({ unitId: null, index: null });

  const canDrag = Boolean(canReorder && onReorderDraft && isReorderAllowed);

  // Use embedded visitStats (cron 3–4am); if missing show "—"
  const getVisitStats = (chapter) => chapter?.visitStats;

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

  const handleChapterClick = (chapterId) => {
    router.push(`/admin/chapter/${chapterId}`);
  };

  const handleDragStart = (e, unitId, index) => {
    if (!canDrag) return;
    setDragged({ unitId, index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.setData("application/json", JSON.stringify({ unitId, index }));
    try { e.target.closest("tr")?.classList.add("opacity-50", "ring-2", "ring-blue-400"); } catch (_) { }
  };

  const handleDragOver = (e, unitId, index) => {
    if (!canDrag || dragged.unitId === null || dragged.unitId !== unitId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver({ unitId, index });
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver({ unitId: null, index: null });
  };

  const handleDrop = (e, unitId, toIndex) => {
    if (!canDrag) return;
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    const payload = e.dataTransfer.getData("application/json");
    let payloadUnitId = unitId;
    try {
      const parsed = JSON.parse(payload || "{}");
      if (parsed.unitId) payloadUnitId = parsed.unitId;
    } catch (_) { }
    if (payloadUnitId !== unitId || Number.isNaN(fromIndex) || fromIndex === toIndex) {
      setDragOver({ unitId: null, index: null });
      setDragged({ unitId: null, index: null });
      return;
    }
    setDragOver({ unitId: null, index: null });
    setDragged({ unitId: null, index: null });
    try { e.target.closest("tr")?.classList.remove("opacity-50", "ring-2", "ring-blue-400"); } catch (_) { }
    const group = groupedChapters.find((g) => g.unitId === unitId);
    if (!group) return;
    const currentList = reorderDraft[unitId] ?? [...group.chapters].sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
    const newOrder = [...currentList];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    onReorderDraft(unitId, newOrder);
  };

  const handleDragEnd = (e) => {
    setDragged({ unitId: null, index: null });
    setDragOver({ unitId: null, index: null });
    try { e.target.closest("tr")?.classList.remove("opacity-50", "ring-2", "ring-blue-400"); } catch (_) { }
  };

  // Group chapters by Exam → Subject → Unit
  const groupedChapters = useMemo(() => {
    if (!chapters || chapters.length === 0) {
      return [];
    }
    const groups = {};
    chapters.forEach((chapter) => {
      const examId = chapter.examId?._id || chapter.examId || "unassigned";
      const examName = chapter.examId?.name || "Unassigned";
      const subjectId =
        chapter.subjectId?._id || chapter.subjectId || "unassigned";
      const subjectName = chapter.subjectId?.name || "Unassigned";
      const unitId = chapter.unitId?._id || chapter.unitId || "unassigned";
      const unitName = chapter.unitId?.name || "Unassigned";
      const groupKey = `${examId}-${subjectId}-${unitId}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          examId,
          examName,
          subjectId,
          subjectName,
          unitId,
          unitName,
          chapters: [],
        };
      }
      groups[groupKey].chapters.push(chapter);
    });

    // Sort by exam name, then subject name, then unit name
    return Object.values(groups).sort((a, b) => {
      if (a.examName !== b.examName) {
        return a.examName.localeCompare(b.examName);
      }
      if (a.subjectName !== b.subjectName) {
        return a.subjectName.localeCompare(b.subjectName);
      }
      return a.unitName.localeCompare(b.unitName);
    });
  }, [chapters]);

  const displayGroups = useMemo(
    () =>
      groupedChapters.map((g) => ({
        ...g,
        chapters: reorderDraft[g.unitId] ?? [...g.chapters].sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)),
      })),
    [groupedChapters, reorderDraft]
  );

  if (!chapters || chapters.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-5xl mb-3">📘</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          No Chapters Found
        </h3>
        <p className="text-sm text-gray-500">
          Add your first chapter to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {displayGroups.map((group, groupIndex) => {
        const sortedChapters = group.chapters;

        return (
          <div
            key={`${group.examId}-${group.subjectId}-${group.unitId}`}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            style={{ animationDelay: `${groupIndex * 0.1}s` }}
          >
            {/* Breadcrumb Header */}
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-medium text-white">
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#10B981" }}
                >
                  {group.examName}
                </span>
                <span className="text-gray-400">›</span>
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#9333EA" }}
                >
                  {group.subjectName}
                </span>
                <span className="text-gray-400">›</span>
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#0056FF" }}
                >
                  {group.unitName}
                </span>
                <span className="text-gray-400">›</span>
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#374151" }}
                >
                  {sortedChapters.length}{" "}
                  {sortedChapters.length === 1 ? "Chapter" : "Chapters"}
                </span>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    {canDrag && (
                      <th className="px-1 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        Move
                      </th>
                    )}
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Order
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chapter Name
                    </th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Weightage
                    </th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Time (min)
                    </th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Questions
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
                  {sortedChapters.map((chapter, chapterIndex) => {
                    const rowCanDrag = canDrag && sortedChapters.length > 1;
                    const isDraggedRow = dragged.unitId === group.unitId && dragged.index === chapterIndex;
                    const isDragOverRow = dragOver.unitId === group.unitId && dragOver.index === chapterIndex && !isDraggedRow;
                    return (
                      <tr
                        key={chapter._id || chapterIndex}
                        draggable={rowCanDrag}
                        onDragStart={(e) => handleDragStart(e, group.unitId, chapterIndex)}
                        onDragOver={(e) => handleDragOver(e, group.unitId, chapterIndex)}
                        onDrop={(e) => handleDrop(e, group.unitId, chapterIndex)}
                        onDragEnd={handleDragEnd}
                        className={`hover:bg-gray-50 transition-colors ${chapter.status === "inactive" ? "opacity-60" : ""} ${isDraggedRow ? "opacity-50 ring-2 ring-blue-400" : ""
                          } ${isDragOverRow ? "bg-blue-50 border-y-2 border-blue-200" : ""}`}
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
                            <span className="sr-only">Drag to reorder position {chapterIndex + 1}</span>
                          </td>
                        )}
                        <td className="px-2 py-1 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                            {chapter.orderNumber || chapterIndex + 1}
                          </span>
                        </td>
                        <td className="px-2 py-1">
                          <span
                            onClick={() => handleChapterClick(chapter._id)}
                            className={`cursor-pointer text-sm font-medium hover:text-blue-600 transition-colors ${chapter.status === "inactive"
                              ? "text-gray-500 line-through"
                              : "text-gray-900"
                              }`}
                            title={chapter.name}
                          >
                            {chapter.name}
                          </span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap w-24 text-center text-sm text-gray-600 font-medium">
                          {chapter.weightage !== undefined ? `${chapter.weightage}%` : "-"}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap w-24 text-center text-sm text-gray-600 font-medium">
                          {chapter.time || "-"}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap w-24 text-center text-sm text-gray-600 font-medium">
                          {chapter.questions || "-"}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap w-40">
                          <span className={`text-sm ${chapter.contentInfo?.hasContent
                            ? "text-gray-700"
                            : "text-gray-400 italic"
                            }`}>
                            {formatContentDate(chapter.contentInfo)}
                          </span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap w-16 text-center">
                          {chapter.contentInfo?.hasMeta ? (
                            <div className="flex justify-center">
                              <FiCheck className="text-green-600 w-5 h-5 font-black" style={{ strokeWidth: 5 }} title="Meta data filled" />
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center">
                          {getVisitStats(chapter) ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                {getVisitStats(chapter).totalVisits ?? 0}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({getVisitStats(chapter).uniqueVisits ?? 0} unique)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center">
                          {getVisitStats(chapter) ? (
                            <span className="text-sm text-gray-900">
                              {getVisitStats(chapter).todayVisits ?? 0}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-right w-32">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleChapterClick(chapter._id)}
                              className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                              title="View Chapter Details"
                            >
                              <FaEye className="text-sm" />
                            </button>
                            {canEdit ? (
                              <button
                                onClick={() => onEdit?.(chapter)}
                                className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                                title="Edit Chapter"
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
                            )}
                            {canDelete ? (
                              <button
                                onClick={() => onDelete?.(chapter)}
                                className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                                title="Delete Chapter"
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
                            )}
                            {onToggleStatus &&
                              (canReorder ? (
                                <button
                                  onClick={() => onToggleStatus?.(chapter)}
                                  className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                                  title={
                                    chapter.status === "active"
                                      ? "Deactivate Chapter"
                                      : "Activate Chapter"
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {sortedChapters.map((chapter, chapterIndex) => {
                const rowCanDrag = canDrag && sortedChapters.length > 1;
                const isDraggedRow = dragged.unitId === group.unitId && dragged.index === chapterIndex;
                const isDragOverRow = dragOver.unitId === group.unitId && dragOver.index === chapterIndex && !isDraggedRow;
                return (
                  <div
                    key={chapter._id || chapterIndex}
                    draggable={rowCanDrag}
                    onDragStart={(e) => handleDragStart(e, group.unitId, chapterIndex)}
                    onDragOver={(e) => handleDragOver(e, group.unitId, chapterIndex)}
                    onDrop={(e) => handleDrop(e, group.unitId, chapterIndex)}
                    onDragEnd={handleDragEnd}
                    className={`p-1.5 hover:bg-gray-50 transition-colors ${chapter.status === "inactive" ? "opacity-60" : ""} ${isDraggedRow ? "opacity-50 ring-2 ring-blue-400 rounded" : ""
                      } ${isDragOverRow ? "bg-blue-50 border-2 border-blue-200 rounded" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      {canDrag && (
                        <div
                          className="shrink-0 pt-0.5 cursor-grab active:cursor-grabbing text-gray-400"
                          onClick={(e) => e.stopPropagation()}
                          title="Drag to reorder"
                        >
                          <FaGripVertical className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pr-2">
                        <h3
                          onClick={() => handleChapterClick(chapter._id)}
                          className={`text-sm font-semibold mb-1 cursor-pointer hover:text-blue-600 transition-colors ${chapter.status === "inactive"
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                            }`}
                          title={chapter.name}
                        >
                          {chapter.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                            #{chapter.orderNumber || chapterIndex + 1}
                          </span>
                          {chapter.weightage && chapter.weightage > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                              {chapter.weightage}%
                            </span>
                          )}
                          {chapter.time && chapter.time > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                              {chapter.time}m
                            </span>
                          )}
                          {chapter.questions && chapter.questions > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                              {chapter.questions}Q
                            </span>
                          )}
                          <span className={`text-sm ${chapter.contentInfo?.hasContent
                            ? "text-gray-600"
                            : "text-gray-400 italic"
                            }`}>
                            Content: {formatContentDate(chapter.contentInfo)}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Meta:</span>
                            {chapter.contentInfo?.hasMeta ? (
                              <FiCheck className="text-green-600 w-4 h-4" style={{ strokeWidth: 4 }} />
                            ) : (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Visits:</span>
                            <span className="text-sm text-gray-900">
                              {getVisitStats(chapter)?.totalVisits ?? "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Today:</span>
                            <span className="text-sm text-gray-900">
                              {getVisitStats(chapter)?.todayVisits ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleChapterClick(chapter._id)}
                          className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                          title="View Chapter Details"
                        >
                          <FaEye className="text-sm" />
                        </button>
                        {canEdit ? (
                          <button
                            onClick={() => onEdit?.(chapter)}
                            className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                            title="Edit Chapter"
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
                        )}
                        {canDelete ? (
                          <button
                            onClick={() => onDelete?.(chapter)}
                            className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                            title="Delete Chapter"
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
                        )}
                        {onToggleStatus &&
                          (canReorder ? (
                            <button
                              onClick={() => onToggleStatus?.(chapter)}
                              className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                              title={
                                chapter.status === "active"
                                  ? "Deactivate Chapter"
                                  : "Activate Chapter"
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
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChaptersTable;
