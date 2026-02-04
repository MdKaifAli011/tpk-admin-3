"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FaFileExport,
  FaSpinner,
  FaLink,
  FaLayerGroup,
  FaInfoCircle,
} from "react-icons/fa";
import api from "@/lib/api";
import { useToast, ToastContainer } from "../ui/Toast";

const LEVEL_LABELS = {
  unit: "Unit",
  chapter: "Chapter",
  topic: "Topic",
  subtopic: "Sub Topic",
  definition: "Definition",
};

const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  const cleaned = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (cleaned.includes(",") || cleaned.includes('"') || cleaned.includes("\n") || cleaned.includes("\r")) {
    return `"${cleaned.replace(/"/g, '""')}"`;
  }
  return cleaned;
};

const UrlExportManagement = () => {
  const { success, error: showError, toasts, removeToast } = useToast();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [loadingExams, setLoadingExams] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastCounts, setLastCounts] = useState(null);

  const fetchExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const res = await api.get("/exam?status=all&limit=1000");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setExams(res.data.data);
        setExamId((prev) => (prev ? prev : res.data.data[0]?._id ?? ""));
      }
    } catch (err) {
      console.error("Failed to fetch exams", err);
      showError(err.response?.data?.message || "Failed to load exams");
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const buildCSV = (data) => {
    const headers = [
      "level",
      "exam_name",
      "subject_name",
      "unit_name",
      "chapter_name",
      "topic_name",
      "subtopic_name",
      "definition_name",
      "url",
    ];
    const rows = [];
    const push = (level, items) => {
      if (!items?.length) return;
      items.forEach((item) => {
        rows.push({
          level: LEVEL_LABELS[level] || level,
          exam_name: item.exam_name ?? "",
          subject_name: item.subject_name ?? "",
          unit_name: item.unit_name ?? "",
          chapter_name: item.chapter_name ?? "",
          topic_name: item.topic_name ?? "",
          subtopic_name: item.subtopic_name ?? "",
          definition_name: item.definition_name ?? "",
          url: item.url ?? "",
        });
      });
    };
    push("unit", data.units);
    push("chapter", data.chapters);
    push("topic", data.topics);
    push("subtopic", data.subtopics);
    push("definition", data.definitions);

    const headerRow = headers.join(",");
    const dataRows = rows.map((r) =>
      headers.map((h) => escapeCSV(r[h])).join(",")
    );
    return headerRow + "\n" + dataRows.join("\n");
  };

  const handleExport = async () => {
    if (!examId) {
      showError("Please select an exam.");
      return;
    }
    setExporting(true);
    try {
      const res = await api.post("/admin/url-export", { examId });
      if (!res.data?.success) {
        showError(res.data?.message || "Export failed");
        return;
      }
      const { data, counts } = res.data;
      setLastCounts(counts);

      const csv = buildCSV(data);
      if (!csv || csv === "level,exam_name,subject_name,unit_name,chapter_name,topic_name,subtopic_name,definition_name,url\n") {
        showError("No URLs found for this exam.");
        return;
      }

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const examSlug = exams.find((e) => e._id === examId)?.slug || examId;
      link.download = `url-export-${examSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      success("CSV exported successfully.");
    } catch (err) {
      showError(err.response?.data?.message || err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-full mx-auto p-4 space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header Section - matches SEO Import/Export */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              Self-Study URL Export
            </h1>
            <p className="text-xs text-gray-600">
              Export all content URLs (units, chapters, topics, sub topics, definitions) for an exam as a single CSV file.
            </p>
          </div>
        </div>
      </div>

      {/* Main Card - matches other admin feature cards */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <FaLink className="size-4" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Export by Exam
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Select Exam
            </label>
            <select
              id="exam-select"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              disabled={loadingExams}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              {loadingExams ? (
                <option value="">Loading exams…</option>
              ) : exams.length === 0 ? (
                <option value="">No exams found</option>
              ) : (
                <>
                  <option value="">Choose an exam</option>
                  {exams.map((exam) => (
                    <option key={exam._id} value={exam._id}>
                      {exam.name} ({exam.slug || exam._id})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Last export counts */}
          {lastCounts && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FaLayerGroup className="w-4 h-4 text-blue-600" />
                Last export counts
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{lastCounts.units}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Units</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{lastCounts.chapters}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Chapters</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{lastCounts.topics}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Topics</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{lastCounts.subtopics}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sub Topics</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{lastCounts.definitions}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Definitions</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !examId || loadingExams}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <FaFileExport className="w-4 h-4" />
                  Export to CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Help / Information Section - matches SEO page */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FaInfoCircle className="text-blue-600 size-5" />
          <h3 className="text-sm font-bold text-gray-900">
            About the CSV
          </h3>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          The file contains one row per URL with columns: <strong className="text-gray-700">level</strong>, <strong className="text-gray-700">exam_name</strong>, <strong className="text-gray-700">subject_name</strong>, <strong className="text-gray-700">unit_name</strong>, <strong className="text-gray-700">chapter_name</strong>, <strong className="text-gray-700">topic_name</strong>, <strong className="text-gray-700">subtopic_name</strong>, <strong className="text-gray-700">definition_name</strong>, <strong className="text-gray-700">url</strong>.
        </p>
        <p className="text-xs text-gray-500">
          Base URL is built from <code className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-700">NEXT_PUBLIC_APP_URL</code> and <code className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-700">NEXT_PUBLIC_BASE_PATH</code> when set in your environment.
        </p>
      </div>
    </div>
  );
};

export default UrlExportManagement;
