"use client";
import React, { useMemo } from "react";
import { FaEdit, FaTrash, FaEye, FaPowerOff, FaLock } from "react-icons/fa";
import { FiCheck } from "react-icons/fi";
import { useRouter } from "next/navigation";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";

const TopicsTable = ({
  topics,
  onEdit,
  onDelete,
  onDragEnd,
  onToggleStatus,
}) => {
  const { canEdit, canDelete, canReorder, role } = usePermissions();
  const router = useRouter();

  // Use embedded visitStats (cron 3–4am); if missing show "—"
  const getVisitStats = (topic) => topic?.visitStats;

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

  const handleTopicClick = (topicId) => {
    router.push(`/admin/topic/${topicId}`);
  };

  // Group topics by Exam → Subject → Unit → Chapter
  const groupedTopics = useMemo(() => {
    if (!topics || topics.length === 0) {
      return [];
    }
    const groups = {};
    topics.forEach((topic) => {
      const examId = topic.examId?._id || topic.examId || "unassigned";
      const examName = topic.examId?.name || "Unassigned";
      const subjectId = topic.subjectId?._id || topic.subjectId || "unassigned";
      const subjectName = topic.subjectId?.name || "Unassigned";
      const unitId = topic.unitId?._id || topic.unitId || "unassigned";
      const unitName = topic.unitId?.name || "Unassigned";
      const chapterId = topic.chapterId?._id || topic.chapterId || "unassigned";
      const chapterName = topic.chapterId?.name || "Unassigned";
      const groupKey = `${examId}-${subjectId}-${unitId}-${chapterId}`;

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
          topics: [],
        };
      }
      groups[groupKey].topics.push(topic);
    });

    // Sort by exam name, then subject name, then unit name, then chapter name
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
      return a.chapterName.localeCompare(b.chapterName);
    });
  }, [topics]);

  if (!topics || topics.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-gray-400 text-5xl mb-3">📚</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          No Topics Found
        </h3>
        <p className="text-sm text-gray-500">
          Create your first topic to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedTopics.map((group, groupIndex) => {
        // Sort topics by orderNumber within each group
        const sortedTopics = [...group.topics].sort((a, b) => {
          const ao = a.orderNumber || Number.MAX_SAFE_INTEGER;
          const bo = b.orderNumber || Number.MAX_SAFE_INTEGER;
          return ao - bo;
        });

        return (
          <div
            key={`${group.examId}-${group.subjectId}-${group.unitId}-${group.chapterId}`}
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
                  style={{ backgroundColor: "#7C3AED" }}
                >
                  {group.chapterName}
                </span>
                <span className="text-gray-400">›</span>
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#374151" }}
                >
                  {sortedTopics.length}{" "}
                  {sortedTopics.length === 1 ? "Topic" : "Topics"}
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
                      Topic Name
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedTopics.map((topic, topicIndex) => {
                    return (
                      <tr
                        key={topic._id || topicIndex}
                        className={`hover:bg-gray-50 transition-colors ${topic.status === "inactive" ? "opacity-60" : ""
                          }`}
                      >
                        <td className="px-2 py-1 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                            {topic.orderNumber || topicIndex + 1}
                          </span>
                        </td>
                        <td className="px-2 py-1">
                          <span
                            onClick={() => handleTopicClick(topic._id)}
                            className={`cursor-pointer text-sm font-medium hover:text-blue-600 transition-colors ${topic.status === "inactive"
                              ? "text-gray-500 line-through"
                              : "text-gray-900"
                              }`}
                            title={topic.name}
                          >
                            {topic.name}
                          </span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap w-40">
                          <span className={`text-sm ${topic.contentInfo?.hasContent
                            ? "text-gray-700"
                            : "text-gray-400 italic"
                            }`}>
                            {formatContentDate(topic.contentInfo)}
                          </span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap w-16 text-center">
                          {topic.contentInfo?.hasMeta ? (
                            <div className="flex justify-center">
                              <FiCheck className="text-green-600 w-5 h-5 font-black" style={{ strokeWidth: 5 }} title="Meta data filled" />
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center">
                          {getVisitStats(topic) ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                {getVisitStats(topic).totalVisits ?? 0}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({getVisitStats(topic).uniqueVisits ?? 0} unique)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center">
                          {getVisitStats(topic) ? (
                            <span className="text-sm text-gray-900">
                              {getVisitStats(topic).todayVisits ?? 0}
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
                                handleTopicClick(topic._id);
                              }}
                              className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                              title="View Topic Details"
                            >
                              <FaEye className="text-sm" />
                            </button>
                            {onEdit &&
                              (canEdit ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(topic);
                                  }}
                                  className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                                  title="Edit Topic"
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
                                    onDelete(topic);
                                  }}
                                  className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                                  title="Delete Topic"
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
                                    onToggleStatus(topic);
                                  }}
                                  className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                                  title={
                                    topic.status === "active"
                                      ? "Deactivate Topic"
                                      : "Activate Topic"
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
              {sortedTopics.map((topic, topicIndex) => {
                const dragKey = `${groupIndex}-${topicIndex}`;
                return (
                  <div
                    key={topic._id || topicIndex}
                    className={`p-1.5 hover:bg-gray-50 transition-colors ${topic.status === "inactive" ? "opacity-60" : ""
                      }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3
                          onClick={() => handleTopicClick(topic._id)}
                          className={`text-sm font-semibold mb-1 cursor-pointer hover:text-blue-600 transition-colors ${topic.status === "inactive"
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                            }`}
                          title={topic.name}
                        >
                          {topic.name}
                        </h3>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                            #{topic.orderNumber || topicIndex + 1}
                          </span>
                          <span className={`text-sm ${topic.contentInfo?.hasContent
                            ? "text-gray-600"
                            : "text-gray-400 italic"
                            }`}>
                            Content: {formatContentDate(topic.contentInfo)}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Meta:</span>
                            {topic.contentInfo?.hasMeta ? (
                              <FiCheck className="text-green-600 w-4 h-4" style={{ strokeWidth: 4 }} />
                            ) : (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Visits:</span>
                            <span className="text-sm text-gray-900">
                              {getVisitStats(topic)?.totalVisits ?? "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">Today:</span>
                            <span className="text-sm text-gray-900">
                              {getVisitStats(topic)?.todayVisits ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTopicClick(topic._id);
                          }}
                          className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                          title="View Topic Details"
                        >
                          <FaEye className="text-sm" />
                        </button>
                        {onEdit &&
                          (canEdit ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(topic);
                              }}
                              className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                              title="Edit Topic"
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
                                onDelete(topic);
                              }}
                              className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                              title="Delete Topic"
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
                                onToggleStatus(topic);
                              }}
                              className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                              title={
                                topic.status === "active"
                                  ? "Deactivate Topic"
                                  : "Activate Topic"
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

export default TopicsTable;
