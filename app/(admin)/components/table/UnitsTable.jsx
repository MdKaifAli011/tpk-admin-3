"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash, FaEye, FaPowerOff, FaLock } from "react-icons/fa";
import { FiTrash, FiCheck } from "react-icons/fi";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";

const UnitsTable = ({ units, onEdit, onDelete, onDragEnd, onToggleStatus }) => {
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

  const handleUnitClick = (unit) => {
    router.push(`/admin/unit/${unit._id}`);
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
      {groupedUnits.map((group, groupIndex) => {
        // Sort units by orderNumber within each group
        const sortedUnits = [...group.units].sort((a, b) => {
          const ao = a.orderNumber || Number.MAX_SAFE_INTEGER;
          const bo = b.orderNumber || Number.MAX_SAFE_INTEGER;
          return ao - bo;
        });

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
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Order
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Name
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Preview
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      Content
                    </th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Meta
                    </th>
                    <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedUnits.map((unit, unitIndex) => {
                    return (
                      <tr
                        key={unit._id || unitIndex}
                        className={`hover:bg-gray-50 transition-colors ${unit.status === "inactive" ? "opacity-60" : ""
                          }`}
                      >
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
                        <td className="px-2 py-1 whitespace-nowrap w-24">
                          <span className="text-[10px] text-gray-400">No Image</span>
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
                const dragKey = `${groupIndex}-${unitIndex}`;
                return (
                  <div
                    key={unit._id || unitIndex}
                    className={`p-1.5 hover:bg-gray-50 transition-colors ${unit.status === "inactive" ? "opacity-60" : ""
                      }`}
                  >
                    <div className="flex justify-between items-start gap-2">
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
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
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
