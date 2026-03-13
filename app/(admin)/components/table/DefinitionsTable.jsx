"use client";
import React, { useMemo, useState } from "react";
import { FaEdit, FaTrash, FaEye, FaPowerOff, FaLock, FaGripVertical } from "react-icons/fa";
import { FiCheck } from "react-icons/fi";
import { useRouter } from "next/navigation";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";

const DefinitionsTable = ({
  definitions,
  onEdit,
  onDelete,
  onToggleStatus,
  onBulkToggleStatus,
  onReorderDraft,
  reorderDraft = {},
  isReorderAllowed = true,
}) => {
  const { canEdit, canDelete, canReorder, role } = usePermissions();
  const router = useRouter();
  const [dragged, setDragged] = useState({ subTopicId: null, index: null });
  const [dragOver, setDragOver] = useState({ subTopicId: null, index: null });
  const [selectedBySubTopic, setSelectedBySubTopic] = useState({});

  const canDrag = Boolean(canReorder && onReorderDraft && isReorderAllowed);
  const canBulkToggle = Boolean(canReorder && onBulkToggleStatus);

  const getSelectedForSubTopic = (subTopicId) => selectedBySubTopic[subTopicId] || new Set();
  const toggleDefinitionSelection = (subTopicId, definitionId) => {
    setSelectedBySubTopic((prev) => {
      const set = new Set(prev[subTopicId] || []);
      if (set.has(definitionId)) set.delete(definitionId);
      else set.add(definitionId);
      const next = { ...prev };
      if (set.size === 0) delete next[subTopicId];
      else next[subTopicId] = set;
      return next;
    });
  };
  const toggleSelectAllInSubTopic = (subTopicId, subTopicDefinitions) => {
    const current = getSelectedForSubTopic(subTopicId);
    const allIds = subTopicDefinitions.map((d) => d._id).filter(Boolean);
    const allSelected = allIds.length > 0 && allIds.every((id) => current.has(id));
    setSelectedBySubTopic((prev) => {
      const next = { ...prev };
      if (allSelected) delete next[subTopicId];
      else next[subTopicId] = new Set(allIds);
      return next;
    });
  };
  const clearSubTopicSelection = (subTopicId) => {
    setSelectedBySubTopic((prev) => {
      const next = { ...prev };
      delete next[subTopicId];
      return next;
    });
  };

  // Use embedded visitStats (cron 3–4am); if missing show "—"
  const getVisitStats = (definition) => definition?.visitStats;

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

  const handleDefinitionClick = (definitionId) => {
    router.push(`/admin/definitions/${definitionId}`);
  };

  const handleDragStart = (e, subTopicId, index) => {
    if (!canDrag) return;
    setDragged({ subTopicId, index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.setData("application/json", JSON.stringify({ subTopicId, index }));
    try { e.target.closest("tr")?.classList.add("opacity-50", "ring-2", "ring-blue-400"); } catch (_) {}
  };

  const handleDragOver = (e, subTopicId, index) => {
    if (!canDrag || dragged.subTopicId === null || dragged.subTopicId !== subTopicId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver({ subTopicId, index });
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver({ subTopicId: null, index: null });
  };

  const handleDrop = (e, subTopicId, toIndex) => {
    if (!canDrag) return;
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    const payload = e.dataTransfer.getData("application/json");
    let payloadSubTopicId = subTopicId;
    try {
      const parsed = JSON.parse(payload || "{}");
      if (parsed.subTopicId) payloadSubTopicId = parsed.subTopicId;
    } catch (_) {}
    if (payloadSubTopicId !== subTopicId || Number.isNaN(fromIndex) || fromIndex === toIndex) {
      setDragOver({ subTopicId: null, index: null });
      setDragged({ subTopicId: null, index: null });
      return;
    }
    setDragOver({ subTopicId: null, index: null });
    setDragged({ subTopicId: null, index: null });
    try { e.target.closest("tr")?.classList.remove("opacity-50", "ring-2", "ring-blue-400"); } catch (_) {}
    const group = groupedDefinitions.find((g) => g.subTopicId === subTopicId);
    if (!group) return;
    const currentList = reorderDraft[subTopicId] ?? [...group.definitions].sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
    const newOrder = [...currentList];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    onReorderDraft(subTopicId, newOrder);
  };

  const handleDragEnd = (e) => {
    setDragged({ subTopicId: null, index: null });
    setDragOver({ subTopicId: null, index: null });
    try { e.target.closest("tr")?.classList.remove("opacity-50", "ring-2", "ring-blue-400"); } catch (_) {}
  };

  // Group definitions by Exam → Subject → Unit → Chapter → Topic → SubTopic
  const groupedDefinitions = useMemo(() => {
    if (!definitions || definitions.length === 0) {
      return [];
    }
    const groups = {};
    definitions.forEach((definition) => {
      const examId = definition.examId?._id || definition.examId || "unassigned";
      const examName = definition.examId?.name || "Unassigned";
      const subjectId = definition.subjectId?._id || definition.subjectId || "unassigned";
      const subjectName = definition.subjectId?.name || "Unassigned";
      const unitId = definition.unitId?._id || definition.unitId || "unassigned";
      const unitName = definition.unitId?.name || "Unassigned";
      const chapterId = definition.chapterId?._id || definition.chapterId || "unassigned";
      const chapterName = definition.chapterId?.name || "Unassigned";
      const topicId = definition.topicId?._id || definition.topicId || "unassigned";
      const topicName = definition.topicId?.name || "Unassigned";
      const subTopicId = definition.subTopicId?._id || definition.subTopicId || "unassigned";
      const subTopicName = definition.subTopicId?.name || "Unassigned";
      const groupKey = `${examId}-${subjectId}-${unitId}-${chapterId}-${topicId}-${subTopicId}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          examId,
          examName,
          subjectId,
          subjectName,
          unitId,
          unitName,
          chapterId,
          chapterName,
          topicId,
          topicName,
          subTopicId,
          subTopicName,
          definitions: [],
        };
      }
      groups[groupKey].definitions.push(definition);
    });

    // Sort by exam name, then subject name, then unit name, then chapter name, then topic name, then subtopic name
    return Object.values(groups).sort((a, b) => {
      if (a.examName !== b.examName) {
        return a.examName.localeCompare(b.examName);
      }
      if (a.subjectName !== b.subjectName) {
        return a.subjectName.localeCompare(b.subjectName);
      }
      if (a.unitName !== b.unitName) {
        return a.unitName.localeCompare(b.unitName);
      }
      if (a.chapterName !== b.chapterName) {
        return a.chapterName.localeCompare(b.chapterName);
      }
      if (a.topicName !== b.topicName) {
        return a.topicName.localeCompare(b.topicName);
      }
      return a.subTopicName.localeCompare(b.subTopicName);
    });
  }, [definitions]);

  const displayGroups = useMemo(
    () =>
      groupedDefinitions.map((g) => ({
        ...g,
        definitions: reorderDraft[g.subTopicId] ?? [...g.definitions].sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)),
      })),
    [groupedDefinitions, reorderDraft]
  );

  if (!definitions || definitions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-gray-400 text-5xl mb-3">📖</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          No Definitions Found
        </h3>
        <p className="text-sm text-gray-500">
          Create your first definition to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {displayGroups.map((group, groupIndex) => {
        const sortedDefinitions = group.definitions;

        return (
          <div
            key={`${group.examId}-${group.subjectId}-${group.unitId}-${group.chapterId}-${group.topicId}-${group.subTopicId}`}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            style={{ animationDelay: `${groupIndex * 0.1}s` }}
          >
            {/* Breadcrumb Header + Bulk actions */}
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
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
                    style={{ backgroundColor: "#EF4444" }}
                  >
                    {group.chapterName}
                  </span>
                  <span className="text-gray-400">›</span>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#F59E0B" }}
                  >
                    {group.topicName}
                  </span>
                  <span className="text-gray-400">›</span>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#7C3AED" }}
                  >
                    {group.subTopicName}
                  </span>
                  <span className="text-gray-400">›</span>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#374151" }}
                  >
                    {sortedDefinitions.length}{" "}
                    {sortedDefinitions.length === 1 ? "Definition" : "Definitions"}
                  </span>
                </div>
                {canBulkToggle && (() => {
                  const selectedIds = getSelectedForSubTopic(group.subTopicId);
                  const count = selectedIds.size;
                  const selectedDefinitions = sortedDefinitions.filter((d) => d._id && selectedIds.has(d._id));
                  if (count === 0) {
                    return (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelectAllInSubTopic(group.subTopicId, sortedDefinitions); }}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                      >
                        Select all in this subtopic
                      </button>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-600">
                        {count} selected
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const p = onBulkToggleStatus(selectedDefinitions, "active");
                          if (p && typeof p.then === "function") {
                            p.then(() => clearSubTopicSelection(group.subTopicId)).catch(() => {});
                          } else {
                            clearSubTopicSelection(group.subTopicId);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                      >
                        Activate
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const p = onBulkToggleStatus(selectedDefinitions, "inactive");
                          if (p && typeof p.then === "function") {
                            p.then(() => clearSubTopicSelection(group.subTopicId)).catch(() => {});
                          } else {
                            clearSubTopicSelection(group.subTopicId);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                      >
                        Deactivate
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); clearSubTopicSelection(group.subTopicId); }}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto rounded-b-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {canBulkToggle && (
                      <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          checked={sortedDefinitions.length > 0 && sortedDefinitions.every((d) => getSelectedForSubTopic(group.subTopicId).has(d._id))}
                          onChange={() => toggleSelectAllInSubTopic(group.subTopicId, sortedDefinitions)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          title="Select all in this subtopic"
                        />
                      </th>
                    )}
                    {canDrag && (
                      <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        Move
                      </th>
                    )}
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-14">
                      Order
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                      Definition Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                      Content
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-14">
                      Meta
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Visits
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Today
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody
                  className="bg-white divide-y divide-gray-200"
                  onDragLeave={handleDragLeave}
                >
                  {sortedDefinitions.map((definition, definitionIndex) => {
                    const rowCanDrag = canDrag && sortedDefinitions.length > 1;
                    const isDraggedRow = dragged.subTopicId === group.subTopicId && dragged.index === definitionIndex;
                    const isDragOverRow = dragOver.subTopicId === group.subTopicId && dragOver.index === definitionIndex && !isDraggedRow;
                    return (
                      <tr
                        key={definition._id || definitionIndex}
                        draggable={rowCanDrag}
                        onDragStart={(e) => handleDragStart(e, group.subTopicId, definitionIndex)}
                        onDragOver={(e) => handleDragOver(e, group.subTopicId, definitionIndex)}
                        onDrop={(e) => handleDrop(e, group.subTopicId, definitionIndex)}
                        onDragEnd={handleDragEnd}
                        className={`hover:bg-gray-50/80 transition-colors ${definition.status === "inactive" ? "opacity-60" : ""} ${
                          isDraggedRow ? "opacity-50 ring-2 ring-blue-400" : ""
                        } ${isDragOverRow ? "bg-blue-50 border-y-2 border-blue-200" : ""}`}
                      >
                        {canBulkToggle && (
                          <td className="px-1 py-2 text-center w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={getSelectedForSubTopic(group.subTopicId).has(definition._id)}
                              onChange={() => toggleDefinitionSelection(group.subTopicId, definition._id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              title="Select definition"
                            />
                          </td>
                        )}
                        {canDrag && (
                          <td
                            className="px-1 py-2 text-center w-10 cursor-grab active:cursor-grabbing"
                            onClick={(e) => e.stopPropagation()}
                            title="Drag to reorder"
                          >
                            <span className="inline-flex text-gray-400 hover:text-gray-600" aria-hidden>
                              <FaGripVertical className="w-4 h-4" />
                            </span>
                            <span className="sr-only">Drag to reorder position {definitionIndex + 1}</span>
                          </td>
                        )}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                            {definition.orderNumber || definitionIndex + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            onClick={() => handleDefinitionClick(definition._id)}
                            className={`cursor-pointer text-sm font-medium hover:text-blue-600 transition-colors truncate block max-w-[240px] ${definition.status === "inactive"
                              ? "text-gray-500 line-through"
                              : "text-gray-900"
                              }`}
                            title={definition.name}
                          >
                            {definition.name}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap w-36">
                          <span className={`text-sm ${definition.contentInfo?.hasContent
                            ? "text-gray-700"
                            : "text-gray-400 italic"
                            }`}>
                            {formatContentDate(definition.contentInfo)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center w-14">
                          {definition.contentInfo?.hasMeta ? (
                            <div className="flex justify-center">
                              <FiCheck className="text-green-600 w-5 h-5 font-black" style={{ strokeWidth: 5 }} title="Meta data filled" />
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center w-24">
                          {getVisitStats(definition) ? (
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {getVisitStats(definition).totalVisits ?? 0}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({getVisitStats(definition).uniqueVisits ?? 0} unique)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center w-16">
                          {getVisitStats(definition) ? (
                            <span className="text-sm text-gray-900">
                              {getVisitStats(definition).todayVisits ?? 0}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right w-28">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDefinitionClick(definition._id);
                              }}
                              className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                              title="View Definition Details"
                            >
                              <FaEye className="text-sm" />
                            </button>
                            {onEdit &&
                              (canEdit ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(definition);
                                  }}
                                  className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                                  title="Edit Definition"
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
                                    onDelete(definition);
                                  }}
                                  className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                                  title="Delete Definition"
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
                                    onToggleStatus(definition);
                                  }}
                                  className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                                  title={
                                    definition.status === "active"
                                      ? "Deactivate Definition"
                                      : "Activate Definition"
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
              {sortedDefinitions.map((definition, definitionIndex) => {
                const rowCanDrag = canDrag && sortedDefinitions.length > 1;
                const isDraggedRow = dragged.subTopicId === group.subTopicId && dragged.index === definitionIndex;
                const isDragOverRow = dragOver.subTopicId === group.subTopicId && dragOver.index === definitionIndex && !isDraggedRow;
                return (
                  <div
                    key={definition._id || definitionIndex}
                    draggable={rowCanDrag}
                    onDragStart={(e) => handleDragStart(e, group.subTopicId, definitionIndex)}
                    onDragOver={(e) => handleDragOver(e, group.subTopicId, definitionIndex)}
                    onDrop={(e) => handleDrop(e, group.subTopicId, definitionIndex)}
                    onDragEnd={handleDragEnd}
                    className={`p-1.5 hover:bg-gray-50 transition-colors ${definition.status === "inactive" ? "opacity-60" : ""} ${
                      isDraggedRow ? "opacity-50 ring-2 ring-blue-400 rounded" : ""
                    } ${isDragOverRow ? "bg-blue-50 border-2 border-blue-200 rounded" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      {canBulkToggle && (
                        <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={getSelectedForSubTopic(group.subTopicId).has(definition._id)}
                            onChange={() => toggleDefinitionSelection(group.subTopicId, definition._id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            title="Select definition"
                          />
                        </div>
                      )}
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
                          onClick={() => handleDefinitionClick(definition._id)}
                          className={`text-sm font-semibold mb-1 cursor-pointer hover:text-blue-600 transition-colors ${definition.status === "inactive"
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                            }`}
                          title={definition.name}
                        >
                          {definition.name}
                        </h3>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                            #{definition.orderNumber || definitionIndex + 1}
                          </span>
                          <span className={`text-sm ${definition.contentInfo?.hasContent
                            ? "text-gray-600"
                            : "text-gray-400 italic"
                            }`}>
                            Content: {formatContentDate(definition.contentInfo)}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Meta:</span>
                            {definition.contentInfo?.hasMeta ? (
                              <FiCheck className="text-green-600 w-4 h-4" style={{ strokeWidth: 4 }} />
                            ) : (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Visits:</span>
                            <span className="text-sm text-gray-900">
                              {getVisitStats(definition)?.totalVisits ?? "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Today:</span>
                            <span className="text-sm text-gray-900">
                              {getVisitStats(definition)?.todayVisits ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDefinitionClick(definition._id);
                          }}
                          className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                          title="View Definition Details"
                        >
                          <FaEye className="text-sm" />
                        </button>
                        {onEdit &&
                          (canEdit ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(definition);
                              }}
                              className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                              title="Edit Definition"
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
                                onDelete(definition);
                              }}
                              className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                              title="Delete Definition"
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
                                onToggleStatus(definition);
                              }}
                              className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                              title={
                                definition.status === "active"
                                  ? "Deactivate Definition"
                                  : "Activate Definition"
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

export default DefinitionsTable;

