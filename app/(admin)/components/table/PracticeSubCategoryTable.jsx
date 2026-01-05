"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash, FaPowerOff, FaLock } from "react-icons/fa";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import { toTitleCase } from "../../../../utils/titleCase";

// Helper function to Title-Case text while preserving ALL-CAPS tokens (e.g., "NEET").


const PracticeSubCategoryTable = ({
  subCategories,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const { canEdit, canDelete, canReorder, role } = usePermissions();
  const router = useRouter();

  const handlePaperClick = (subCategory) => {
    router.push(
      `/admin/practice/subcategory/${subCategory._id || subCategory.id}`
    );
  };

  if (!subCategories || subCategories.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-gray-400 text-5xl mb-3">📄</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          No Papers Found
        </h3>
        <p className="text-sm text-gray-500">
          Add your first paper to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paper Name
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                URL Slug
              </th>
              <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Hierarchy Path
              </th>
              <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Duration
              </th>
              <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Max Marks
              </th>
              <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Questions
              </th>
              <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Negative Marks
              </th>
              <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Status
              </th>
              <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subCategories.map((subCategory, index) => (
              <tr
                key={subCategory._id || index}
                className={`hover:bg-gray-50 transition-colors ${subCategory.status === "inactive" ? "opacity-60" : ""
                  }`}
              >
                <td className="px-2 py-1 whitespace-nowrap">
                  <div
                    onClick={() => handlePaperClick(subCategory)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer transition-colors flex items-center"
                  >
                    {subCategory.orderNumber
                      ? `${subCategory.orderNumber}. `
                      : ""}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: (/<[a-z][\s\S]*>/i.test(subCategory.name))
                          ? subCategory.name
                          : toTitleCase(subCategory.name)
                      }}
                    />
                  </div>
                </td>
                <td className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis w-32">
                  <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                    {subCategory.slug || "-"}
                  </code>
                </td>
                <td className="px-2 py-1 w-40">
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {subCategory.subTopicId?.name ? (
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Subtopic:</span>{" "}
                        <span
                          className="px-2 py-0.5 rounded-md text-sm font-medium text-white"
                          style={{ backgroundColor: "#06B6D4" }}
                        >
                          {subCategory.subTopicId.name}
                        </span>
                      </span>
                    ) : subCategory.topicId?.name ? (
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Topic:</span>{" "}
                        <span
                          className="px-2 py-0.5 rounded-md text-sm font-medium text-white"
                          style={{ backgroundColor: "#F59E0B" }}
                        >
                          {subCategory.topicId.name}
                        </span>
                      </span>
                    ) : subCategory.chapterId?.name ? (
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Chapter:</span>{" "}
                        <span
                          className="px-2 py-0.5 rounded-md text-sm font-medium text-white"
                          style={{ backgroundColor: "#EC4899" }}
                        >
                          {subCategory.chapterId.name}
                        </span>
                      </span>
                    ) : subCategory.unitId?.name ? (
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Unit:</span>{" "}
                        <span
                          className="px-2 py-0.5 rounded-md text-sm font-medium text-white"
                          style={{ backgroundColor: "#8B5CF6" }}
                        >
                          {subCategory.unitId.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">
                        Not Assigned
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-center w-28">
                  <span className="text-sm text-gray-600">
                    {(() => {
                      if (subCategory.duration) return subCategory.duration;
                      const qCount = subCategory.numberOfQuestions || 0;
                      if (qCount === 0) return "N/A";
                      return `${Math.ceil((qCount * 30) / 60)} Min`;
                    })()}
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-center w-24">
                  <span className="text-sm font-medium text-gray-900">
                    {subCategory.maximumMarks || (subCategory.numberOfQuestions * 4) || 0}
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-center w-24">
                  <span className="text-sm font-medium text-gray-900">
                    {subCategory.numberOfQuestions || 0}
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-center w-28">
                  <span className="text-sm text-gray-600">
                    {subCategory.negativeMarks || (subCategory.numberOfQuestions > 0 ? 1 : 0)}
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-center w-24">
                  <span
                    className={`px-2 py-0.5 rounded-full text-sm font-medium ${subCategory.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                      }`}
                  >
                    {subCategory.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-right w-32">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit &&
                      (canEdit ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(subCategory);
                          }}
                          className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                          title="Edit Paper"
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
                            onDelete(subCategory);
                          }}
                          className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                          title="Delete Paper"
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
                            onToggleStatus(subCategory);
                          }}
                          className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                          title={
                            subCategory.status === "active"
                              ? "Deactivate Paper"
                              : "Activate Paper"
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
        {subCategories.map((subCategory, index) => (
          <div
            key={subCategory._id || index}
            className={`p-1.5 hover:bg-gray-50 transition-colors ${subCategory.status === "inactive" ? "opacity-60" : ""
              }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  onClick={() => handlePaperClick(subCategory)}
                  className={`text-sm font-semibold mb-1 cursor-pointer transition-colors flex items-center ${subCategory.status === "inactive"
                    ? "text-gray-500 line-through"
                    : "text-blue-600 hover:text-blue-800"
                    }`}
                >
                  {subCategory.orderNumber
                    ? `${subCategory.orderNumber}. `
                    : ""}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: (/<[a-z][\s\S]*>/i.test(subCategory.name))
                        ? subCategory.name
                        : toTitleCase(subCategory.name)
                    }}
                  />
                </h3>
                {subCategory.slug && (
                  <div className="mb-1">
                    <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                      /{subCategory.slug}
                    </code>
                  </div>
                )}
                <div className="mb-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    {subCategory.subTopicId?.name ? (
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Subtopic:</span>{" "}
                        <span
                          className="px-2 py-0.5 rounded-md text-sm font-medium text-white"
                          style={{ backgroundColor: "#06B6D4" }}
                        >
                          {subCategory.subTopicId.name}
                        </span>
                      </span>
                    ) : subCategory.topicId?.name ? (
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Topic:</span>{" "}
                        <span
                          className="px-2 py-0.5 rounded-md text-sm font-medium text-white"
                          style={{ backgroundColor: "#F59E0B" }}
                        >
                          {subCategory.topicId.name}
                        </span>
                      </span>
                    ) : subCategory.chapterId?.name ? (
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Chapter:</span>{" "}
                        <span
                          className="px-2 py-0.5 rounded-md text-sm font-medium text-white"
                          style={{ backgroundColor: "#EC4899" }}
                        >
                          {subCategory.chapterId.name}
                        </span>
                      </span>
                    ) : subCategory.unitId?.name ? (
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Unit:</span>{" "}
                        <span
                          className="px-2 py-0.5 rounded-md text-sm font-medium text-white"
                          style={{ backgroundColor: "#8B5CF6" }}
                        >
                          {subCategory.unitId.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">
                        Not Assigned
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Duration:</span>{" "}
                    {(() => {
                      if (subCategory.duration) return subCategory.duration;
                      const qCount = subCategory.numberOfQuestions || 0;
                      if (qCount === 0) return "N/A";
                      return `${Math.ceil((qCount * 30) / 60)} Min`;
                    })()}
                  </div>
                  <div>
                    <span className="font-medium">Max Marks:</span>{" "}
                    {subCategory.maximumMarks || (subCategory.numberOfQuestions * 4) || 0}
                  </div>
                  <div>
                    <span className="font-medium">Questions:</span>{" "}
                    {subCategory.numberOfQuestions || 0}
                  </div>
                  <div>
                    <span className="font-medium">Negative Marks:</span>{" "}
                    {subCategory.negativeMarks || (subCategory.numberOfQuestions > 0 ? 1 : 0)}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-sm font-medium inline-block ${subCategory.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        }`}
                    >
                      {subCategory.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onEdit &&
                  (canEdit ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(subCategory);
                      }}
                      className="p-1 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                      title="Edit Paper"
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
                        onDelete(subCategory);
                      }}
                      className="p-1 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                      title="Delete Paper"
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
                        onToggleStatus(subCategory);
                      }}
                      className="p-1 bg-orange-50 text-orange-600 rounded-lg transition-colors hover:bg-orange-100"
                      title={
                        subCategory.status === "active"
                          ? "Deactivate Paper"
                          : "Activate Paper"
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

export default PracticeSubCategoryTable;
