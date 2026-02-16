"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaChevronDown, FaChevronRight, FaSave, FaSpinner } from "react-icons/fa";
import api from "@/lib/api";
import { useToast } from "../ui/Toast";

const LEVEL_LABELS = {
  subject: "Subject",
  unit: "Unit",
  chapter: "Chapter",
  topic: "Topic",
  subtopic: "Subtopic",
  definition: "Definition",
};

const LEVEL_COLORS = {
  subject: "bg-blue-100 text-blue-800 border-blue-200",
  unit: "bg-amber-100 text-amber-800 border-amber-200",
  chapter: "bg-emerald-100 text-emerald-800 border-emerald-200",
  topic: "bg-purple-100 text-purple-800 border-purple-200",
  subtopic: "bg-cyan-100 text-cyan-800 border-cyan-200",
  definition: "bg-slate-100 text-slate-800 border-slate-200",
};

/** Immutable update: set time/weightage/studyHours on node with _id in tree */
function updateNodeInTree(nodes, nodeId, updates) {
  if (!nodes || !Array.isArray(nodes)) return nodes;
  const idStr = String(nodeId);
  return nodes.map((node) => {
    if (String(node._id) === idStr) {
      return {
        ...node,
        time: updates.time !== undefined ? updates.time : node.time,
        weightage: updates.weightage !== undefined ? updates.weightage : node.weightage,
        studyHours: updates.studyHours !== undefined ? updates.studyHours : node.studyHours,
        children: node.children,
      };
    }
    if (node.children?.length) {
      return { ...node, children: updateNodeInTree(node.children, nodeId, updates) };
    }
    return node;
  });
}

function Row({ node, depth, path = [], onChange, onExpandCollapse }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSubject = node.level === "subject";
  const currentPath = [...path, node.name];

  const time = node.time ?? "";
  const weightage = node.weightage ?? "";
  const studyHours = node.studyHours ?? "";

  const handleChange = useCallback(
    (field, value) => {
      const v = value === "" ? null : (field === "weightage" ? Number(value) : Number(value));
      if (field === "weightage" && v != null && (v < 0 || v > 100)) return;
      if ((field === "time" || field === "studyHours") && v != null && v < 0) return;
      onChange(node._id, { [field]: value === "" ? null : v });
    },
    [node._id, onChange]
  );

  const toggleOpen = () => {
    setOpen((o) => !o);
    onExpandCollapse?.(!open);
  };

  const indent = depth * 20 + 12;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div
        className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50/80 transition-colors min-h-[44px]"
        style={{ paddingLeft: `${indent}px` }}
      >
        <button
          type="button"
          onClick={toggleOpen}
          className="p-0.5 text-gray-500 hover:text-gray-700 shrink-0"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {hasChildren ? (
            open ? <FaChevronDown className="w-4 h-4" /> : <FaChevronRight className="w-4 h-4" />
          ) : (
            <span className="w-4 inline-block" />
          )}
        </button>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border shrink-0 ${LEVEL_COLORS[node.level] || ""}`}
        >
          {LEVEL_LABELS[node.level]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 break-words leading-snug" title={node.name}>
            {node.name}
          </p>
          {currentPath.length > 1 && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate" title={currentPath.join(" → ")}>
              {currentPath.join(" → ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-center w-14">
            {isSubject ? (
              <>
                <span className="text-[9px] text-gray-500 uppercase tracking-wide">Hrs</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={studyHours}
                  onChange={(e) => handleChange("studyHours", e.target.value)}
                  placeholder="—"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </>
            ) : (
              <span className="text-xs text-gray-300">—</span>
            )}
          </div>
          <div className="flex flex-col items-center w-14">
            <span className="text-[9px] text-gray-500 uppercase tracking-wide">Time</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={time}
              onChange={(e) => handleChange("time", e.target.value)}
              placeholder="—"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col items-center w-14">
            <span className="text-[9px] text-gray-500 uppercase tracking-wide">Wt%</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={weightage}
              onChange={(e) => handleChange("weightage", e.target.value)}
              placeholder="—"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      {hasChildren && open && (
        <div className="bg-gray-50/50">
          {node.children.map((child) => (
            <Row
              key={child._id}
              node={child}
              depth={depth + 1}
              path={currentPath}
              onChange={onChange}
              onExpandCollapse={onExpandCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TimeWeightageHierarchy({ examId }) {
  const [data, setData] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { success, error: showError } = useToast();

  const fetchHierarchy = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/exam-hierarchy?examId=${examId}`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setData(d);
        setHierarchy(JSON.parse(JSON.stringify(d.hierarchy || [])));
      } else {
        setError("Failed to load hierarchy");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load hierarchy");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const updateNode = useCallback((nodeId, updates) => {
    setHierarchy((prev) => updateNodeInTree(prev, nodeId, updates));
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (!examId || !hierarchy?.length) return;
    setSaving(true);
    try {
      const res = await api.put("/admin/exam-hierarchy", { examId, hierarchy });
      if (res.data?.success) {
        success("Time & weightage saved for all levels.");
        fetchHierarchy();
      } else {
        showError(res.data?.message || "Failed to save");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save time & weightage");
    } finally {
      setSaving(false);
    }
  }, [examId, hierarchy, success, showError, fetchHierarchy]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">Loading hierarchy...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-red-600">{error || "No data"}</p>
        <button type="button" onClick={fetchHierarchy} className="mt-2 text-sm text-blue-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const hasHierarchy = hierarchy && hierarchy.length > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Time & Weightage by Level</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {data.exam?.name} — Edit Time (hrs) and Weightage (%) for every level. Study Hours (Hrs) for subjects only. Click <strong>Save all</strong> when done.
          </p>
        </div>
        {hasHierarchy && (
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {saving ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaSave className="w-4 h-4" />}
            {saving ? "Saving..." : "Save all"}
          </button>
        )}
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <div className="flex items-center gap-3 py-2 px-3 bg-gray-100 border-b border-gray-200 text-[10px] font-semibold text-gray-700 uppercase tracking-wide sticky top-0 z-10">
          <span className="w-4" />
          <span className="w-16 shrink-0">Level</span>
          <span className="flex-1 min-w-0">Name</span>
          <span className="w-14 text-center shrink-0">Hrs</span>
          <span className="w-14 text-center shrink-0">Time</span>
          <span className="w-14 text-center shrink-0">Wt%</span>
        </div>
        {!hasHierarchy ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No subjects in exam info. Add subjects in the form above and save, then you can set time & weightage here.
          </div>
        ) : (
          hierarchy.map((node) => (
            <Row key={node._id} node={node} depth={0} path={[]} onChange={updateNode} />
          ))
        )}
      </div>
    </div>
  );
}
