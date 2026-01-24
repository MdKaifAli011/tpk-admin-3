"use client";
import React from "react";
import { useRouter } from "next/navigation";
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaClipboardList,
  FaPowerOff,
  FaLock,
  FaInfoCircle,
} from "react-icons/fa";
import { FiCheck } from "react-icons/fi";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import { useMultipleVisitStats } from "../../hooks/useVisitStats";

const ExamTable = ({ exams, onEdit, onDelete, onView, onToggleStatus, onManageInfo }) => {
  const { canEdit, canDelete, canReorder, role } = usePermissions();
  const router = useRouter();
  
  // Fetch visit statistics for all exams
  const { statsMap, loading: statsLoading } = useMultipleVisitStats(exams, 'exam');

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

  const handleExamClick = (exam) => {
    router.push(`/admin/exam/${exam._id}`);
  };
  if (!exams || exams.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-5xl mb-3 animate-float">📝</div>
        <h3 className="text-sm sm:text-sm font-bold text-gray-800 mb-1.5">
          No Exams Found
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Create your first exam to get started with organizing your assessments
          and tracking performance.
        </p>
        <div className="mt-4">
          <div className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-medium">
            <FaClipboardList className="w-3.5 h-3.5" />
            <span>Ready to create your first exam?</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exam Details
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Preview
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Details
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
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
            {exams.map((exam, index) => (
              <tr
                key={exam._id || exam.id || index}
                className={`hover:bg-gray-50 transition-colors ${exam.status === "inactive" ? "opacity-60" : ""
                  }`}
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span
                      onClick={() => handleExamClick(exam)}
                      className={`text-sm font-medium truncate cursor-pointer hover:text-blue-600 transition-colors ${exam.status === "inactive"
                        ? "text-gray-500 line-through"
                        : "text-gray-900"
                        }`}
                    >
                      {exam.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${exam.status === "active"
                        ? "bg-green-100 text-green-800"
                        : exam.status === "inactive"
                          ? "bg-red-100 text-red-800"
                          : exam.status === "draft"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {(exam.status || "active").charAt(0).toUpperCase() +
                        (exam.status || "active").slice(1)}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-1 whitespace-nowrap w-24">
                  {exam.image ? (
                    <div className="w-8 h-8 rounded border border-gray-200 overflow-hidden bg-gray-50 shadow-sm">
                      <img
                        src={exam.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400">No Image</span>
                  )}
                </td>
                <td className="px-2 py-1 whitespace-nowrap w-24">
                  <span className={`text-xs ${exam.description?.length > 0 ? "text-indigo-600 font-medium" : "text-gray-400"
                    }`}>
                    {exam.description?.length || 0} items
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap w-32">
                  <span
                    className={`text-sm ${exam.contentInfo?.hasContent
                      ? "text-gray-700"
                      : "text-gray-400 italic"
                      }`}
                  >
                    {formatContentDate(exam.contentInfo)}
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap w-16 text-center">
                  {exam.contentInfo?.hasMeta ? (
                    <div className="flex justify-center">
                      <FiCheck className="text-green-600 w-5 h-5 font-black" style={{ strokeWidth: 5 }} title="Meta data filled" />
                    </div>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-center">
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-12 rounded mx-auto"></div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {statsMap[exam._id]?.totalVisits || 0}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({statsMap[exam._id]?.uniqueVisits || 0} unique)
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-center">
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-8 rounded mx-auto"></div>
                  ) : (
                    <span className="text-sm text-gray-900">
                      {statsMap[exam._id]?.todayVisits || 0}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-right w-32">
                  <div className="flex items-center justify-end gap-1">
                    {onManageInfo && (
                      <button
                        onClick={() => onManageInfo(exam)}
                        className="p-1 bg-purple-50 text-purple-600 rounded-lg transition-colors hover:bg-purple-100"
                        title="Manage Exam Info"
                      >
                        <FaInfoCircle className="text-sm" />
                      </button>
                    )}
                    <button
                      onClick={() => handleExamClick(exam)}
                      className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                      title="View Exam Details"
                    >
                      <FaEye className="text-sm" />
                    </button>
                    {onEdit &&
                      (canEdit ? (
                        <button
                          onClick={() => onEdit(exam)}
                          className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                          title="Edit Exam"
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
                          onClick={() => onDelete(exam)}
                          className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                          title="Delete Exam"
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
                          onClick={() => onToggleStatus(exam)}
                          className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                          title={
                            exam.status === "active"
                              ? "Deactivate Exam"
                              : "Activate Exam"
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

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {exams.map((exam, index) => (
          <div
            key={exam._id || exam.id || index}
            className={`p-1.5 hover:bg-gray-50 transition-colors ${exam.status === "inactive" ? "opacity-60" : ""
              }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {exam.image && (
                    <div className="w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0 shadow-sm">
                      <img src={exam.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <h3
                      onClick={() => handleExamClick(exam)}
                      className={`text-sm font-semibold cursor-pointer hover:text-blue-600 transition-colors ${exam.status === "inactive" ? "text-gray-500 line-through" : "text-gray-900"
                        }`}
                    >
                      {exam.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] ${exam.description?.length > 0 ? "text-indigo-600 font-medium" : "text-gray-400"
                        }`}>
                        {exam.description?.length || 0} highlights
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${exam.status === "active"
                      ? "bg-green-100 text-green-800"
                      : exam.status === "inactive"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {(exam.status || "active").toUpperCase()}
                  </span>
                  <span
                    className={`text-[10px] ${exam.contentInfo?.hasContent ? "text-gray-600" : "text-gray-400 italic"
                      }`}
                  >
                    Content: {formatContentDate(exam.contentInfo)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">Meta:</span>
                    {exam.contentInfo?.hasMeta ? (
                      <FiCheck className="text-green-600 w-4 h-4" style={{ strokeWidth: 4 }} />
                    ) : (
                      <span className="text-gray-400 text-[10px]">-</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3">
                {onManageInfo && (
                  <button
                    onClick={() => onManageInfo(exam)}
                    className="p-1 bg-purple-50 text-purple-600 rounded-lg transition-colors hover:bg-purple-100"
                    title="Manage Exam Info"
                  >
                    <FaInfoCircle className="text-sm" />
                  </button>
                )}
                <button
                  onClick={() => handleExamClick(exam)}
                  className="p-1 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                  title="View Exam Details"
                >
                  <FaEye className="text-sm" />
                </button>
                {onEdit &&
                  (canEdit ? (
                    <button
                      onClick={() => onEdit(exam)}
                      className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                      title="Edit Exam"
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
                      onClick={() => onDelete(exam)}
                      className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                      title="Delete Exam"
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
                      onClick={() => onToggleStatus(exam)}
                      className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                      title={
                        exam.status === "active"
                          ? "Deactivate Exam"
                          : "Activate Exam"
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
  );
};

export default ExamTable;
