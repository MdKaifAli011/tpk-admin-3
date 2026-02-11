"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash, FaEye, FaPowerOff, FaLock, FaGripVertical } from "react-icons/fa";
import { FiTrash, FiCheck } from "react-icons/fi";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";

const UnitsTable = ({ units, onEdit, onDelete, onToggleStatus, onReorderDraft, reorderDraft = {}, isReorderAllowed = true }) => {
  const { canEdit, canDelete, canReorder, role } = usePermissions();
  const router = useRouter();
  const [dragged, setDragged] = useState({ subjectId: null, index: null });
  const [dragOver, setDragOver] = useState({ subjectId: null, index: null });

  const canDrag = Boolean(canReorder && onReorderDraft && isReorderAllowed);

  const getVisitStats = (unit) => unit?.visitStats;

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

  const handleUnitClick = (unit) => {
    router.push(`/admin/unit/${unit._id}`);
  };

  const handleDragStart = (e, subjectId, index) => {
    if (!canDrag) return;
    setDragged({ subjectId, index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.setData("application/json", JSON.stringify({ subjectId, index }));
    try { e.target.closest("tr")?.classList.add("opacity-50", "ring-2", "ring-blue-400"); } catch (_) {}
  };

  const handleDragOver = (e, subjectId, index) => {
    if (!canDrag || dragged.subjectId === null || dragged.subjectId !== subjectId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver({ subjectId, index });
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver({ subjectId: null, index: null });
  };

  const handleDrop = (e, subjectId, toIndex) => {
    if (!canDrag) return;
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    const payload = e.dataTransfer.getData("application/json");
    let payloadSubjectId = subjectId;
    try {
      const parsed = JSON.parse(payload || "{}");
      if (parsed.subjectId) payloadSubjectId = parsed.subjectId;
    } catch (_) {}
    if (payloadSubjectId !== subjectId || Number.isNaN(fromIndex) || fromIndex === toIndex) {
      setDragOver({ subjectId: null, index: null });
      setDragged({ subjectId: null, index: null });
      return;
    }
    setDragOver({ subjectId: null, index: null });
    setDragged({ subjectId: null, index: null });
    try { e.target.closest("tr")?.classList.remove("opacity-50", "ring-2", "ring-blue-400"); } catch (_) {}
    const group = groupedUnits.find((g) => g.subjectId === subjectId);
    if (!group) return;
    const currentList = reorderDraft[subjectId] ?? [...group.units].sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
    const newOrder = [...currentList];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    onReorderDraft(subjectId, newOrder);
  };

  const handleDragEnd = (e) => {
    setDragged({ subjectId: null, index: null });
    setDragOver({ subjectId: null, index: null });
    try { e.target.closest("tr")?.classList.remove("opacity-50", "ring-2", "ring-blue-400"); } catch (_) {}
  };

  // Group units by Exam → Subject
  const groupedUnits = useMemo(() => {
    if (!units || units.length === 0) {
      return [];
    }
    const groups = {};
    units.forEach((unit) => {
      const examId = unit.examId?._id || unit.examId || "unassigned";
      const examName = unit.examId?.name || "Unassigned";
      const subjectId = unit.subjectId?._id || unit.subjectId || "unassigned";
      const subjectName = unit.subjectId?.name || "Unassigned";
      const groupKey = `${examId}-${subjectId}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          examId,
          examName,
          subjectId,
          subjectName,
          units: [],
        };
      }
      groups[groupKey].units.push(unit);
    });

    // Sort by exam name, then subject name
    return Object.values(groups).sort((a, b) => {
      if (a.examName !== b.examName) {
        return a.examName.localeCompare(b.examName);
      }
      return a.subjectName.localeCompare(b.subjectName);
    });
  }, [units]);

  const displayGroups = useMemo(
    () =>
      groupedUnits.map((g) => ({
        ...g,
        units: reorderDraft[g.subjectId] ?? [...g.units].sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)),
      })),
    [groupedUnits, reorderDraft]
  );

  if (!units || units.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-5xl mb-3">📘</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          No Units Found
        </h3>
        <p className="text-sm text-gray-500">
          Add your first unit to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {displayGroups.map((group, groupIndex) => {
        const sortedUnits = group.units;

        return (
          <div
            key={`${group.examId}-${group.subjectId}`}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
          >
            {/* Breadcrumb Header */}
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-medium text-white">
                {/* Exam */}
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#10B981" }}
                >
                  {group.examName}
                </span>
                <span className="text-gray-400">›</span>
                {/* Subject */}
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#9333EA" }}
                >
                  {group.subjectName}
                </span>
                <span className="text-gray-400">›</span>
                {/* Units */}
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#6B7280" }}
                >
                  {sortedUnits.length}{" "}
                  {sortedUnits.length === 1 ? "Unit" : "Units"}
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
                      Unit Name
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
                  {sortedUnits.map((unit, unitIndex) => {
                    const rowCanDrag = canDrag && sortedUnits.length > 1;
                    const isDragged = dragged.subjectId === group.subjectId && dragged.index === unitIndex;
                    const isDragOver = dragOver.subjectId === group.subjectId && dragOver.index === unitIndex && !isDragged;
                    return (
                      <tr
                        key={unit._id || unitIndex}
                        draggable={rowCanDrag}
                        onDragStart={(e) => handleDragStart(e, group.subjectId, unitIndex)}
                        onDragOver={(e) => handleDragOver(e, group.subjectId, unitIndex)}
                        onDrop={(e) => handleDrop(e, group.subjectId, unitIndex)}
                        onDragEnd={handleDragEnd}
                        className={`hover:bg-gray-50 transition-colors ${unit.status === "inactive" ? "opacity-60" : ""} ${
                          isDragged ? "opacity-50 ring-2 ring-blue-400" : ""
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
                            <span className="sr-only">Drag to reorder position {unitIndex + 1}</span>
                          </td>
                        )}
                        <td className="px-2 py-1 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                            {unit.orderNumber || unitIndex + 1}
                          </span>
                        </td>
                        <td className="px-2 py-1">
                          <span
                            onClick={() => handleUnitClick(unit)}
                            className={`cursor-pointer text-sm font-medium hover:text-blue-600 transition-colors ${unit.status === "inactive"
                              ? "text-gray-500 line-through"
                              : "text-gray-900"
                              }`}
                            title={unit.name}
                          >
                            {unit.name}
                          </span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap w-40">
                          <span className={`text-sm ${unit.contentInfo?.hasContent
                            ? "text-gray-700"
                            : "text-gray-400 italic"
                            }`}>
                            {formatContentDate(unit.contentInfo)}
                          </span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap w-16 text-center">
                          {unit.contentInfo?.hasMeta ? (
                            <div className="flex justify-center">
                              <FiCheck className="text-green-600 w-5 h-5 font-black" style={{ strokeWidth: 5 }} title="Meta data filled" />
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center">
                          {getVisitStats(unit) ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                {getVisitStats(unit).totalVisits ?? 0}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({getVisitStats(unit).uniqueVisits ?? 0} unique)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center">
                          {getVisitStats(unit) ? (
                            <span className="text-sm text-gray-900">
                              {getVisitStats(unit).todayVisits ?? 0}
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
                                handleUnitClick(unit);
                              }}
                              className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                              title="View Unit Details"
                            >
                              <FaEye className="text-sm" />
                            </button>
                            {canEdit ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(unit);
                                }}
                                className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                                title="Edit Unit"
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(unit);
                                }}
                                className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                                title="Delete Unit"
                              >
                                <FiTrash className="text-sm" />
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleStatus(unit);
                                  }}
                                  className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                                  title={
                                    unit.status === "active"
                                      ? "Deactivate Unit"
                                      : "Activate Unit"
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
              {sortedUnits.map((unit, unitIndex) => {
                const rowCanDrag = canDrag && sortedUnits.length > 1;
                const isDragged = dragged.subjectId === group.subjectId && dragged.index === unitIndex;
                const isDragOver = dragOver.subjectId === group.subjectId && dragOver.index === unitIndex && !isDragged;
                return (
                  <div
                    key={unit._id || unitIndex}
                    draggable={rowCanDrag}
                    onDragStart={(e) => handleDragStart(e, group.subjectId, unitIndex)}
                    onDragOver={(e) => handleDragOver(e, group.subjectId, unitIndex)}
                    onDrop={(e) => handleDrop(e, group.subjectId, unitIndex)}
                    onDragEnd={handleDragEnd}
                    className={`p-1.5 hover:bg-gray-50 transition-colors ${unit.status === "inactive" ? "opacity-60" : ""} ${
                      isDragged ? "opacity-50 ring-2 ring-blue-400 rounded" : ""
                    } ${isDragOver ? "bg-blue-50 border-2 border-blue-200 rounded" : ""}`}
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
                          onClick={() => handleUnitClick(unit)}
                          className={`text-sm font-semibold mb-1 cursor-pointer hover:text-blue-600 transition-colors ${unit.status === "inactive"
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                            }`}
                          title={unit.name}
                        >
                          {unit.name}
                        </h3>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                            #{unit.orderNumber || unitIndex + 1}
                          </span>
                          <span className={`text-sm ${unit.contentInfo?.hasContent
                            ? "text-gray-600"
                            : "text-gray-400 italic"
                            }`}>
                            Content: {formatContentDate(unit.contentInfo)}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Meta:</span>
                            {unit.contentInfo?.hasMeta ? (
                              <FiCheck className="text-green-600 w-4 h-4" style={{ strokeWidth: 4 }} />
                            ) : (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Visits:</span>
                            {getVisitStats(unit) ? (
                              <span className="text-sm text-gray-900">
                                {getVisitStats(unit).totalVisits ?? 0}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Today:</span>
                            {getVisitStats(unit) ? (
                              <span className="text-sm text-gray-900">
                                {getVisitStats(unit).todayVisits ?? 0}
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
                            handleUnitClick(unit);
                          }}
                          className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                          title="View Unit Details"
                        >
                          <FaEye className="text-sm" />
                        </button>
                        {canEdit ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(unit);
                            }}
                            className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                            title="Edit Unit"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(unit);
                            }}
                            className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                            title="Delete Unit"
                          >
                            <FiTrash className="text-sm" />
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
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleStatus(unit);
                              }}
                              className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                              title={
                                unit.status === "active"
                                  ? "Deactivate Unit"
                                  : "Activate Unit"
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

export default UnitsTable;
