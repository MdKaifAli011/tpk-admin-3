"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaChevronDown, FaChevronRight, FaSave, FaSpinner, FaPlus, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import api from "@/lib/api";
import { useToast } from "../ui/Toast";

const LEVEL_LABELS = {
  subject: "Subject",
  unit: "Unit",
  chapter: "Chapter",
  topic: "Topic",
};

const LEVEL_COLORS = {
  subject: "bg-blue-100 text-blue-800 border-blue-200",
  unit: "bg-amber-100 text-amber-800 border-amber-200",
  chapter: "bg-emerald-100 text-emerald-800 border-emerald-200",
  topic: "bg-purple-100 text-purple-800 border-purple-200",
};

/** Normalize subject for PUT exam-info (subjectId may be populated from GET) */
function normalizeSubjectForPayload(s) {
  return {
    subjectId: s.subjectId?._id ?? s.subjectId,
    subjectName: typeof s.subjectName === "string" ? s.subjectName : (s.subjectId?.name ?? ""),
    numberOfQuestions: s.numberOfQuestions,
    maximumMarks: s.maximumMarks,
    weightage: s.weightage ?? 0,
    studyHours: s.studyHours != null ? s.studyHours : undefined,
    time: s.time != null ? s.time : undefined,
  };
}

/** Count chapters where entered time !== sum of topic times */
function countChapterTimeMismatches(nodes) {
  let count = 0;
  if (!nodes?.length) return 0;
  for (const sub of nodes) {
    if (sub.level !== "subject" || !sub.children?.length) continue;
    for (const u of sub.children) {
      if (u.level !== "unit" || !u.children?.length) continue;
      for (const ch of u.children) {
        if (ch.level !== "chapter") continue;
        const topicSum = (ch.children || []).reduce((s, t) => s + (Number(t.time) || 0), 0);
        const entered = ch.time !== undefined && ch.time !== null && ch.time !== "" ? Number(ch.time) : null;
        if (entered != null && entered !== topicSum) count += 1;
      }
    }
  }
  return count;
}

/** Total exam time = sum of all subject times (each subject = sum of unit times; unit = sum of chapter times) */
function totalExamTimeFromHierarchy(nodes) {
  if (!nodes?.length) return 0;
  return nodes.reduce((total, sub) => {
    if (sub.level !== "subject") return total;
    const subjectTime = (sub.children || []).reduce(
      (s, u) =>
        s +
        (u.children?.length
          ? (u.children || []).reduce((acc, ch) => acc + (Number(ch.time) || 0), 0)
          : Number(u.time) || 0),
      0,
    );
    return total + subjectTime;
  }, 0);
}

/** Immutable update: set time/weightage/studyHours/numberOfQuestions/maximumMarks on node with _id in tree */
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
        numberOfQuestions: updates.numberOfQuestions !== undefined ? updates.numberOfQuestions : node.numberOfQuestions,
        maximumMarks: updates.maximumMarks !== undefined ? updates.maximumMarks : node.maximumMarks,
        children: node.children,
      };
    }
    if (node.children?.length) {
      return { ...node, children: updateNodeInTree(node.children, nodeId, updates) };
    }
    return node;
  });
}

function Row({ node, depth, path = [], onChange, onDeleteSubject }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const currentPath = [...path, node.name];

  const isSubject = node.level === "subject";
  const isUnit = node.level === "unit";
  const isChapter = node.level === "chapter";
  const time =
    isSubject && node.children?.length
      ? node.children.reduce(
          (sum, u) =>
            sum +
            (u.children?.length
              ? (u.children || []).reduce((s, ch) => s + (Number(ch.time) || 0), 0)
              : Number(u.time) || 0),
          0,
        )
      : isUnit && node.children?.length
        ? node.children.reduce((sum, ch) => sum + (Number(ch.time) || 0), 0)
        : (node.time !== undefined && node.time !== null ? String(node.time) : "");
  const isTimeAuto = isSubject || isUnit;

  const topicSum =
    isChapter && node.children?.length
      ? node.children.reduce((s, t) => s + (Number(t.time) || 0), 0)
      : null;
  const chapterEntered = isChapter && (node.time !== undefined && node.time !== null && node.time !== "")
    ? Number(node.time)
    : null;
  const chapterTimeMismatch =
    isChapter && topicSum != null && chapterEntered != null && chapterEntered !== topicSum;
  const weightage = node.weightage ?? "";
  const numberOfQuestions = node.numberOfQuestions ?? "";
  const maximumMarks = node.maximumMarks ?? "";

  const handleChange = useCallback(
    (field, value) => {
      if (field === "time") {
        const num = value === "" ? null : Number(value);
        if (num != null && num < 0) return;
        onChange(node._id, { [field]: value === "" ? null : value });
        return;
      }
      const v = value === "" ? null : Number(value);
      if (field === "weightage" && v != null && (v < 0 || v > 100)) return;
      if ((field === "numberOfQuestions" || field === "maximumMarks") && v != null && v < 0) return;
      onChange(node._id, { [field]: value === "" ? null : v });
    },
    [node._id, onChange]
  );

  const toggleOpen = () => setOpen((o) => !o);

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
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 break-words leading-snug" title={node.name}>
              {node.name}
            </p>
            {isSubject && onDeleteSubject && (
              <button
                type="button"
                onClick={() => onDeleteSubject(node._id, node.name)}
                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors shrink-0"
                title="Remove subject from exam info"
                aria-label={`Remove ${node.name} from exam`}
              >
                <FaTrash className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {currentPath.length > 1 && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate" title={currentPath.join(" → ")}>
              {currentPath.join(" → ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSubject ? (
            <>
              <div className="flex flex-col items-center w-16">
                <span className="text-[9px] text-gray-500 uppercase tracking-wide">Qty</span>
                <input
                  type="number"
                  min="0"
                  value={numberOfQuestions}
                  onChange={(e) => handleChange("numberOfQuestions", e.target.value)}
                  placeholder="—"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col items-center w-16">
                <span className="text-[9px] text-gray-500 uppercase tracking-wide">Max M</span>
                <input
                  type="number"
                  min="0"
                  value={maximumMarks}
                  onChange={(e) => handleChange("maximumMarks", e.target.value)}
                  placeholder="—"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <span className="w-16 text-xs text-gray-300 text-center">—</span>
              <span className="w-16 text-xs text-gray-300 text-center">—</span>
            </>
          )}
          <div className="flex flex-col items-center w-16">
            <span className="text-[9px] text-gray-500 uppercase tracking-wide">Time (min)</span>
            {isTimeAuto ? (
              <span
                className="w-full px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded min-h-[26px] flex items-center justify-center"
                title={isSubject ? "Sum of unit times (updates as you type)" : "Sum of chapter times (updates as you type)"}
              >
                {time === "" ? "—" : time}
              </span>
            ) : (
              <input
                type="number"
                min="0"
                step="1"
                value={time}
                onChange={(e) => handleChange("time", e.target.value)}
                placeholder="—"
                title="Time in minutes (manual) — unit/subject/total update as you type"
                className={`w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${chapterTimeMismatch ? "border-amber-500 bg-amber-50" : "border-gray-300"}`}
              />
            )}
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
      {chapterTimeMismatch && (
        <div
          className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-100 text-amber-800 text-xs"
          style={{ paddingLeft: `${indent + 24}px` }}
        >
          <FaExclamationTriangle className="w-4 h-4 shrink-0" />
          <span>
            Chapter time ({chapterEntered}) doesn’t match sum of topics ({topicSum}). Correct value: {topicSum} min.
          </span>
          <button
            type="button"
            onClick={() => onChange(node._id, { time: topicSum })}
            className="ml-2 px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded text-xs font-medium shrink-0"
          >
            Set to {topicSum}
          </button>
        </div>
      )}
      {hasChildren && open && (
        <div className="bg-gray-50/50">
          {node.children.map((child) => (
            <Row
              key={child._id}
              node={child}
              depth={depth + 1}
              path={currentPath}
              onChange={onChange}
              onDeleteSubject={onDeleteSubject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_SUBJECT = {
  numberOfQuestions: 50,
  maximumMarks: 100,
  weightage: 0,
  studyHours: null,
  time: null,
};

export default function TimeWeightageHierarchy({
  examId,
  examInfoId,
  formData = {},
  allSubjects = [],
  onExamInfoChange,
}) {
  const [data, setData] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
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
    const mismatchCount = countChapterTimeMismatches(hierarchy);
    setSaving(true);
    try {
      const res = await api.put("/admin/exam-hierarchy", { examId, hierarchy });
      if (res.data?.success) {
        success(
          mismatchCount > 0
            ? `Saved. Warning: ${mismatchCount} chapter(s) have time ≠ sum of topics. Fix highlighted rows or click "Set to X".`
            : "Time & weightage saved for all levels.",
        );
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

  const subjectIdsInExam = hierarchy?.map((n) => String(n._id)) || [];
  const availableToAdd = allSubjects.filter((s) => !subjectIdsInExam.includes(String(s._id)));

  const handleAddSubject = useCallback(
    async (subject) => {
      if (!subject || !examId) return;
      setAdding(true);
      try {
        const newEntry = {
          subjectId: subject._id,
          subjectName: subject.name,
          ...DEFAULT_SUBJECT,
        };
        if (!examInfoId) {
          const examDate = formData.examDate || new Date().toISOString().split("T")[0];
          const maximumMarks = formData.maximumMarks || 100;
          if (!examDate || !maximumMarks) {
            showError("Fill exam date and maximum marks above first.");
            return;
          }
          const res = await api.post("/exam-info", {
            examId,
            examDate,
            examCut: formData.examCut || {},
            maximumMarks: parseFloat(maximumMarks),
            subjects: [newEntry],
          });
          if (res.data?.success) {
            success("Exam info created with subject. Add more below.");
            onExamInfoChange?.();
            fetchHierarchy();
          } else {
            showError(res.data?.message || "Failed to add subject");
          }
        } else {
          const infoRes = await api.get(`/exam-info/${examInfoId}`);
          const examInfo = infoRes.data?.data;
          if (!examInfo) {
            showError("Exam info not found");
            return;
          }
          const subjects = [...(examInfo.subjects || []), newEntry].map(normalizeSubjectForPayload);
          await api.put(`/exam-info/${examInfoId}`, {
            examDate: examInfo.examDate,
            examCut: examInfo.examCut,
            maximumMarks: examInfo.maximumMarks,
            status: examInfo.status,
            subjects,
          });
          success("Subject added to exam info.");
          onExamInfoChange?.();
          fetchHierarchy();
        }
      } catch (err) {
        showError(err.response?.data?.message || "Failed to add subject");
      } finally {
        setAdding(false);
      }
    },
    [examId, examInfoId, formData, onExamInfoChange, fetchHierarchy, success, showError]
  );

  const handleDeleteSubject = useCallback(
    async (subjectId, subjectName) => {
      if (!examInfoId || !window.confirm(`Remove "${subjectName}" from exam info? This only removes it from this exam's config.`)) return;
      setAdding(true);
      try {
        const infoRes = await api.get(`/exam-info/${examInfoId}`);
        const examInfo = infoRes.data?.data;
        if (!examInfo?.subjects?.length) return;
        const subjects = examInfo.subjects
          .filter((s) => String(s.subjectId?._id ?? s.subjectId) !== String(subjectId))
          .map(normalizeSubjectForPayload);
        await api.put(`/exam-info/${examInfoId}`, {
          examDate: examInfo.examDate,
          examCut: examInfo.examCut,
          maximumMarks: examInfo.maximumMarks,
          status: examInfo.status,
          subjects,
        });
        success("Subject removed from exam info.");
        onExamInfoChange?.();
        fetchHierarchy();
      } catch (err) {
        showError(err.response?.data?.message || "Failed to remove subject");
      } finally {
        setAdding(false);
      }
    },
    [examInfoId, onExamInfoChange, fetchHierarchy, success, showError]
  );

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
            {data.exam?.name} — Subject → Unit → Chapter → Topic. Edit Time (min) and Weightage (%) for each level. Unit time = sum of chapters; Subject time = sum of units. Chapter & Topic are manual. Click <strong>Save all</strong> when done.
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
      {hasHierarchy && (
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Exam total time:</span>
          <span className="text-xl font-semibold text-slate-900" title="Sum of all subject times (unit + chapter + topic)">
            {totalExamTimeFromHierarchy(hierarchy)} min
          </span>
        </div>
      )}
      <div className="max-h-[70vh] overflow-auto">
        <div className="flex items-center gap-3 py-2 px-3 bg-gray-100 border-b border-gray-200 text-[10px] font-semibold text-gray-700 uppercase tracking-wide sticky top-0 z-10">
          <span className="w-4" />
          <span className="w-16 shrink-0">Level</span>
          <span className="flex-1 min-w-0">Name</span>
          <span className="w-16 text-center shrink-0">Qty</span>
          <span className="w-16 text-center shrink-0">Max M</span>
          <span className="w-16 text-center shrink-0" title="Minutes">Time (min)</span>
          <span className="w-14 text-center shrink-0">Wt%</span>
        </div>
        {!hasHierarchy ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500 mb-3">
              No subjects in exam info. Add a subject below to create exam info (fill exam date and max marks above first if needed).
            </p>
            {availableToAdd.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {availableToAdd.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => handleAddSubject(s)}
                    disabled={adding}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FaPlus className="w-3.5 h-3.5" />
                    Add {s.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No other subjects available for this exam.</p>
            )}
          </div>
        ) : (
          <>
            {availableToAdd.length > 0 && (
              <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-blue-800">Add subject:</span>
                {availableToAdd.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => handleAddSubject(s)}
                    disabled={adding}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                  >
                    <FaPlus className="w-3 h-3" />
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            {hierarchy.map((node) => (
              <Row
                key={node._id}
                node={node}
                depth={0}
                path={[]}
                onChange={updateNode}
                onDeleteSubject={handleDeleteSubject}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
