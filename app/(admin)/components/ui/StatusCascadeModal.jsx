"use client";

import React, { useState, useEffect } from "react";
import { FaTimes, FaPowerOff } from "react-icons/fa";

const CASCADE_MODES = [
  {
    value: "respect_manual",
    label: "Respect manual changes",
    description: "Children you previously set to inactive will stay inactive.",
  },
  {
    value: "force_all",
    label: "Force update all children",
    description: "Set every child to the same status (ignore manual choices).",
  },
  {
    value: "direct_only",
    label: "Apply only to direct children",
    description: "Update only immediate children; deeper levels unchanged.",
  },
];

/**
 * Modal shown when toggling status on a parent level (Exam, Subject, Unit, Chapter, Topic, SubTopic).
 * Lets admin choose cascade behavior: respect_manual (default), force_all, or direct_only.
 */
export default function StatusCascadeModal({
  open,
  onClose,
  levelLabel,
  itemName,
  currentStatus,
  onConfirm,
  loading = false,
}) {
  const [cascadeMode, setCascadeMode] = useState("respect_manual");
  const newStatus = currentStatus === "active" ? "inactive" : "active";

  useEffect(() => {
    if (open) setCascadeMode("respect_manual");
  }, [open]);

  if (!open) return null;

  const handleApply = () => {
    onConfirm(newStatus, cascadeMode);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaPowerOff className="text-orange-500" />
            Change Status
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Level: </span>
            <span className="text-sm text-gray-900">{levelLabel}</span>
            {itemName && (
              <>
                <span className="text-sm text-gray-500 mx-1">—</span>
                <span className="text-sm font-medium text-gray-900">{itemName}</span>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New status</label>
            <div className="flex gap-2">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                  newStatus === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {newStatus === "active" ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Children behavior
            </label>
            <div className="space-y-2">
              {CASCADE_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    cascadeMode === mode.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="cascadeMode"
                    value={mode.value}
                    checked={cascadeMode === mode.value}
                    onChange={() => setCascadeMode(mode.value)}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{mode.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{mode.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Applying…
              </>
            ) : (
              "Apply"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
