"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaSave,
  FaTrophy,
  FaQuoteLeft,
  FaPlus,
  FaTrash,
  FaChevronDown,
  FaChevronRight,
  FaImage,
  FaCalendarPlus,
  FaList,
  FaEdit,
  FaExternalLinkAlt,
} from "react-icons/fa";
import Link from "next/link";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";

const emptyTopper = () => ({ name: "", percentile: "", location: "", attempt: "", image: "" });
const emptyAchiever = () => ({ title: "", description: "", image: "" });
const emptyTestimonial = () => ({ name: "", location: "", text: "" });
const currentYear = new Date().getFullYear();

const StatusBadge = ({ status, onClick }) => {
  const s = status === "inactive" ? "inactive" : "active";
  const styles =
    s === "active"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${styles}`}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </button>
  );
};

export default function ResultPageManagement() {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [newYearInput, setNewYearInput] = useState(currentYear);
  const [addingYear, setAddingYear] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState("banner");
  const [actionLoading, setActionLoading] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/result-page");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setExams(res.data.data);
        setSelectedExamId((prev) => prev || res.data.data[0]?._id || "");
      }
    } catch (err) {
      showErrorRef.current(err?.response?.data?.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchYears = useCallback(async (examId) => {
    if (!examId) {
      setYears([]);
      return;
    }
    try {
      setLoadingYears(true);
      const res = await api.get(`/admin/result-page/${examId}/years`);
      if (res.data?.success && res.data.data?.years) {
        setYears(res.data.data.years);
      } else {
        setYears([]);
      }
    } catch (err) {
      showErrorRef.current(err?.response?.data?.message || "Failed to load years");
      setYears([]);
    } finally {
      setLoadingYears(false);
    }
  }, []);

  const fetchContent = useCallback(async (examId, year) => {
    if (!examId || year == null) return;
    try {
      setLoadingContent(true);
      const res = await api.get(`/admin/result-page/${examId}?year=${year}`);
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
      } else {
        setData(null);
      }
    } catch (err) {
      showErrorRef.current(err?.response?.data?.message || "Failed to load result page");
      setData(null);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    if (selectedExamId) fetchYears(selectedExamId);
    else setYears([]);
  }, [selectedExamId, fetchYears]);

  useEffect(() => {
    if (selectedExamId && selectedYear != null) {
      fetchContent(selectedExamId, selectedYear);
    } else {
      setData(null);
    }
  }, [selectedExamId, selectedYear, fetchContent]);

  const handleAddYear = async (e) => {
    e.preventDefault();
    if (!selectedExamId) return;
    const year = parseInt(String(newYearInput), 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) {
      showError("Enter a valid year (2000-2100)");
      return;
    }
    setAddingYear(true);
    try {
      const res = await api.post(`/admin/result-page/${selectedExamId}/years`, { year });
      if (res.data?.success) {
        success(`Year ${year} added.`);
        await fetchYears(selectedExamId);
        setSelectedYear(year);
        setNewYearInput(currentYear);
      } else {
        showError(res.data?.message || "Failed to add year");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to add year");
    } finally {
      setAddingYear(false);
    }
  };

  const update = (path, value) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] };
        cur = cur[k];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const updateArray = (key, index, field, value) => {
    setData((prev) => {
      if (!prev || !Array.isArray(prev[key])) return prev;
      const arr = [...prev[key]];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [key]: arr };
    });
  };

  const addArrayItem = (key, emptyItem) => {
    setData((prev) => (prev ? { ...prev, [key]: [...(prev[key] || []), emptyItem()] } : prev));
  };

  const removeArrayItem = (key, index) => {
    setData((prev) => {
      if (!prev || !Array.isArray(prev[key])) return prev;
      const arr = prev[key].filter((_, i) => i !== index);
      return { ...prev, [key]: arr };
    });
  };

  const handleSave = async () => {
    if (!selectedExamId || selectedYear == null || !data) return;
    setSaving(true);
    try {
      const res = await api.patch(`/admin/result-page/${selectedExamId}?year=${selectedYear}`, {
        bannerImageLeft: data.bannerImageLeft,
        bannerImageRight: data.bannerImageRight,
        bannerTitle: data.bannerTitle,
        bannerSubtitle: data.bannerSubtitle,
        toppers: data.toppers,
        targetAchievers: data.targetAchievers,
        highlights: data.highlights,
        studentTestimonials: data.studentTestimonials,
        parentTestimonials: data.parentTestimonials,
      });
      if (res.data?.success) {
        success("Result page saved.");
        setData(res.data.data);
      } else {
        showError(res.data?.message || "Save failed");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (id) => {
    setExpandedSection((s) => (s === id ? "" : id));
  };

  const handleToggleStatus = useCallback(
    async (item) => {
      if (!selectedExamId || !item) return;
      const newStatus = item.status === "inactive" ? "active" : "inactive";
      const action = newStatus === "inactive" ? "deactivate" : "activate";
      if (!window.confirm(`Are you sure you want to ${action} result year ${item.year}?`)) return;
      setActionLoading(`status-${item.year}`);
      try {
        const res = await api.patch(`/admin/result-page/${selectedExamId}/years`, {
          year: item.year,
          status: newStatus,
        });
        if (res.data?.success) {
          await fetchYears(selectedExamId);
          success(`Year ${item.year} ${action}d successfully.`);
        } else {
          showErrorRef.current(res.data?.message || `Failed to ${action}`);
        }
      } catch (err) {
        showErrorRef.current(err?.response?.data?.message || `Failed to ${action}`);
      } finally {
        setActionLoading(null);
      }
    },
    [selectedExamId, fetchYears]
  );

  const handleDeleteYear = useCallback(
    async (year) => {
      if (!selectedExamId || year == null) return;
      if (!window.confirm(`Are you sure you want to delete result year ${year}? This cannot be undone.`)) return;
      setActionLoading(`delete-${year}`);
      try {
        const res = await api.delete(`/admin/result-page/${selectedExamId}/years?year=${year}`, {
          data: { year },
        });
        if (res.data?.success) {
          if (selectedYear === year) {
            setSelectedYear(null);
            setData(null);
          }
          await fetchYears(selectedExamId);
          success(`Year ${year} deleted.`);
        } else {
          showErrorRef.current(res.data?.message || "Failed to delete");
        }
      } catch (err) {
        showErrorRef.current(err?.response?.data?.message || "Failed to delete");
      } finally {
        setActionLoading(null);
      }
    },
    [selectedExamId, selectedYear, fetchYears]
  );

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h1 className="text-xl font-semibold text-gray-900">Result Page Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Select an exam, create or choose a year, then edit Banner, Toppers, Target Achievers, Highlights, and Testimonials for that year.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Exam</span>
                <select
                  value={selectedExamId}
                  onChange={(e) => {
                    setSelectedExamId(e.target.value);
                    setSelectedYear(null);
                    setData(null);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select exam</option>
                  {exams.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name} {e.hasResultPage ? "✓" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {selectedExam && (
                <Link
                  href={`/${selectedExam.slug}/result`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <FaExternalLinkAlt className="text-xs" />
                  See all result years
                </Link>
              )}
            </div>
          </div>

          {!selectedExamId ? (
            <div className="p-6 text-gray-500 text-sm">Select an exam to manage result years and content.</div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Add year + Years table */}
              <section className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-medium text-gray-900">
                    <FaCalendarPlus className="text-indigo-600" />
                    Result years
                  </h2>
                  <form onSubmit={handleAddYear} className="flex items-center gap-2">
                    <input
                      type="number"
                      min={2000}
                      max={2100}
                      value={newYearInput}
                      onChange={(e) => setNewYearInput(e.target.value)}
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      aria-label="Year to add"
                    />
                    <button
                      type="submit"
                      disabled={addingYear}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {addingYear ? <LoadingSpinner size="small" color="white" /> : <FaPlus />}
                      Add year
                    </button>
                  </form>
                </div>
                {loadingYears ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="small" />
                  </div>
                ) : years.length === 0 ? (
                  <p className="p-6 text-sm text-gray-500">No years yet. Add a year above to create the first result page for this exam.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                            #
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Year
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                            Status
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {years.map((item, index) => {
                          const y = item.year;
                          const isActive = item.status !== "inactive";
                          const rowBusy = actionLoading != null;
                          return (
                            <tr
                              key={y}
                              className={`hover:bg-gray-50 transition-colors ${selectedYear === y ? "bg-indigo-50/70" : ""} ${!isActive ? "opacity-70" : ""}`}
                            >
                              <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500">
                                {index + 1}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span className={`text-sm font-medium ${selectedYear === y ? "text-indigo-700" : "text-gray-900"}`}>
                                  {y}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <StatusBadge
                                  status={item.status}
                                  onClick={() => !rowBusy && handleToggleStatus(item)}
                                />
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    disabled={rowBusy}
                                    onClick={() => setSelectedYear(y)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                                      selectedYear === y
                                        ? "bg-indigo-600 text-white"
                                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                    }`}
                                    title="Edit content for this year"
                                  >
                                    <FaEdit className="text-xs" />
                                    Edit
                                  </button>
                                  {selectedExam?.slug && (
                                    <Link
                                      href={`/${selectedExam.slug}/result/${y}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                      title="View result page"
                                    >
                                      <FaExternalLinkAlt className="text-xs" />
                                      View
                                    </Link>
                                  )}
                                  <button
                                    type="button"
                                    disabled={rowBusy}
                                    onClick={() => !rowBusy && handleDeleteYear(y)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    title="Delete this year"
                                  >
                                    <FaTrash className="text-xs" />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Content form for selected year */}
              {selectedYear != null && (
                <>
                  <h2 className="flex items-center gap-2 font-medium text-gray-900">
                    <FaList className="text-indigo-600" />
                    Edit content for year {selectedYear}
                  </h2>
                  {loadingContent ? (
                    <div className="flex justify-center py-12">
                      <LoadingSpinner size="large" />
                    </div>
                  ) : data ? (
                    <div className="space-y-4">
                      <Section title="Banner" icon={FaImage} expanded={expandedSection === "banner"} onToggle={() => toggleSection("banner")}>
                        <div className="space-y-3">
                          <p className="text-xs text-gray-600">
                            Top banner uses title and subtitle on a gradient (no background image).
                          </p>
                          <InputRow label="Banner title" value={data.bannerTitle} onChange={(v) => update("bannerTitle", v)} placeholder={`e.g. ${selectedExam?.name} Result ${selectedYear}`} />
                          <InputRow label="Banner subtitle" value={data.bannerSubtitle} onChange={(v) => update("bannerSubtitle", v)} textarea placeholder="Short line under title" />
                          <p className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                            Image row (optional): two images side by side on desktop; stacked on small screens.
                          </p>
                          <InputRow
                            label="Banner row — left image URL"
                            value={data.bannerImageLeft ?? ""}
                            onChange={(v) => update("bannerImageLeft", v)}
                            placeholder="https://..."
                          />
                          <InputRow
                            label="Banner row — right image URL"
                            value={data.bannerImageRight ?? ""}
                            onChange={(v) => update("bannerImageRight", v)}
                            placeholder="https://..."
                          />
                        </div>
                      </Section>

                      <Section title="Toppers" icon={FaTrophy} expanded={expandedSection === "toppers"} onToggle={() => toggleSection("toppers")}>
                        <p className="text-xs text-gray-500 mb-2">Image URL or YouTube video URL</p>
                        <Repeater
                          items={data.toppers || []}
                          onAdd={() => addArrayItem("toppers", emptyTopper)}
                          onRemove={(i) => removeArrayItem("toppers", i)}
                          label="Topper"
                        >
                          {(item, i) => (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                              <input placeholder="Name" value={item.name} onChange={(e) => updateArray("toppers", i, "name", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <input placeholder="Score" value={item.percentile} onChange={(e) => updateArray("toppers", i, "percentile", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <input placeholder="Location" value={item.location} onChange={(e) => updateArray("toppers", i, "location", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <input placeholder="Attempt" value={item.attempt} onChange={(e) => updateArray("toppers", i, "attempt", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <input placeholder="Image URL or YouTube" value={item.image} onChange={(e) => updateArray("toppers", i, "image", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                            </div>
                          )}
                        </Repeater>
                      </Section>

                      <Section title="Target Achievers" icon={FaTrophy} expanded={expandedSection === "achievers"} onToggle={() => toggleSection("achievers")}>
                        <p className="text-xs text-gray-500 mb-2">Image URL or YouTube video URL</p>
                        <Repeater
                          items={data.targetAchievers || []}
                          onAdd={() => addArrayItem("targetAchievers", emptyAchiever)}
                          onRemove={(i) => removeArrayItem("targetAchievers", i)}
                          label="Story"
                        >
                          {(item, i) => (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input placeholder="Title" value={item.title} onChange={(e) => updateArray("targetAchievers", i, "title", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <input placeholder="Image URL or YouTube" value={item.image} onChange={(e) => updateArray("targetAchievers", i, "image", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <textarea placeholder="Description" value={item.description} onChange={(e) => updateArray("targetAchievers", i, "description", e.target.value)} className="rounded border px-2 py-1.5 text-sm sm:col-span-3" rows={2} />
                            </div>
                          )}
                        </Repeater>
                      </Section>

                      <Section title="Highlights" icon={FaTrophy} expanded={expandedSection === "highlights"} onToggle={() => toggleSection("highlights")}>
                        <Repeater
                          items={data.highlights || []}
                          onAdd={() => setData((p) => ({ ...p, highlights: [...(p.highlights || []), ""] }))}
                          onRemove={(i) => removeArrayItem("highlights", i)}
                          label="Highlight"
                        >
                          {(item, i) => (
                            <input
                              placeholder="Highlight text"
                              value={typeof item === "string" ? item : ""}
                              onChange={(e) => {
                                setData((p) => {
                                  const h = [...(p.highlights || [])];
                                  h[i] = e.target.value;
                                  return { ...p, highlights: h };
                                });
                              }}
                              className="w-full rounded border px-2 py-1.5 text-sm"
                            />
                          )}
                        </Repeater>
                      </Section>

                      <Section title="What Our Students Say" icon={FaQuoteLeft} expanded={expandedSection === "students"} onToggle={() => toggleSection("students")}>
                        <Repeater
                          items={data.studentTestimonials || []}
                          onAdd={() => addArrayItem("studentTestimonials", emptyTestimonial)}
                          onRemove={(i) => removeArrayItem("studentTestimonials", i)}
                          label="Testimonial"
                        >
                          {(item, i) => (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input placeholder="Name" value={item.name} onChange={(e) => updateArray("studentTestimonials", i, "name", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <input placeholder="Location" value={item.location} onChange={(e) => updateArray("studentTestimonials", i, "location", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <textarea placeholder="Quote" value={item.text} onChange={(e) => updateArray("studentTestimonials", i, "text", e.target.value)} className="rounded border px-2 py-1.5 text-sm sm:col-span-2" rows={3} />
                            </div>
                          )}
                        </Repeater>
                      </Section>

                      <Section title="What Our Parents Say" icon={FaQuoteLeft} expanded={expandedSection === "parents"} onToggle={() => toggleSection("parents")}>
                        <Repeater
                          items={data.parentTestimonials || []}
                          onAdd={() => addArrayItem("parentTestimonials", emptyTestimonial)}
                          onRemove={(i) => removeArrayItem("parentTestimonials", i)}
                          label="Testimonial"
                        >
                          {(item, i) => (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input placeholder="Name" value={item.name} onChange={(e) => updateArray("parentTestimonials", i, "name", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <input placeholder="Location" value={item.location} onChange={(e) => updateArray("parentTestimonials", i, "location", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                              <textarea placeholder="Quote" value={item.text} onChange={(e) => updateArray("parentTestimonials", i, "text", e.target.value)} className="rounded border px-2 py-1.5 text-sm sm:col-span-2" rows={3} />
                            </div>
                          )}
                        </Repeater>
                      </Section>

                      <div className="pt-4 border-t">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {saving ? <LoadingSpinner size="small" color="white" /> : <FaSave />}
                          {saving ? "Saving…" : "Save Result Page"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-gray-500 text-sm">Failed to load content for this year.</div>
                  )}
                </>
              )}

              {selectedExamId && selectedYear == null && years.length > 0 && (
                <p className="text-sm text-gray-500">Click Edit in the table above to edit content for a year.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, icon: Icon, expanded, onToggle, children }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Icon className="text-indigo-600" />
          {title}
        </span>
        {expanded ? <FaChevronDown className="text-gray-500" /> : <FaChevronRight className="text-gray-500" />}
      </button>
      {expanded && <div className="p-4 bg-white border-t border-gray-200">{children}</div>}
    </div>
  );
}

function InputRow({ label, value, onChange, placeholder, textarea }) {
  const C = textarea ? "textarea" : "input";
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <C
        type={textarea ? undefined : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        rows={textarea ? 2 : undefined}
      />
    </div>
  );
}

function Repeater({ items, onAdd, onRemove, label, children }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="space-y-3">
      {list.map((item, i) => (
        <div key={i} className="flex gap-2 items-start border border-gray-100 rounded-lg p-3 bg-gray-50/50">
          <div className="flex-1 min-w-0">{children(item, i)}</div>
          <button type="button" onClick={() => onRemove(i)} className="p-2 text-red-600 hover:bg-red-50 rounded" aria-label="Remove">
            <FaTrash className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd} className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
        <FaPlus className="w-4 h-4" />
        Add {label}
      </button>
    </div>
  );
}
