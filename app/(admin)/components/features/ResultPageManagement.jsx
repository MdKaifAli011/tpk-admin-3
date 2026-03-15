"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FaSave,
  FaTrophy,
  FaQuoteLeft,
  FaPlus,
  FaTrash,
  FaChevronDown,
  FaChevronRight,
  FaImage,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";

const emptyTopper = () => ({ name: "", percentile: "", location: "", attempt: "", image: "", year: null });
const emptyAchiever = () => ({ title: "", description: "", image: "" });
const emptyTestimonial = () => ({ name: "", location: "", text: "" });

export default function ResultPageManagement() {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState("banner");
  const { toasts, removeToast, success, error: showError } = useToast();

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/result-page");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setExams(res.data.data);
        if (!selectedExamId && res.data.data.length > 0) {
          setSelectedExamId(res.data.data[0]._id);
        }
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [selectedExamId]);

  const fetchContent = useCallback(async (examId) => {
    if (!examId) return;
    try {
      setLoadingContent(true);
      const res = await api.get(`/admin/result-page/${examId}`);
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to load result page");
    } finally {
      setLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) fetchContent(selectedExamId);
    else setData(null);
  }, [selectedExamId, fetchContent]);

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
    if (!selectedExamId || !data) return;
    setSaving(true);
    try {
      const res = await api.patch(`/admin/result-page/${selectedExamId}`, {
        bannerImage: data.bannerImage,
        bannerTitle: data.bannerTitle,
        bannerSubtitle: data.bannerSubtitle,
        sessions: data.sessions,
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h1 className="text-xl font-semibold text-gray-900">Result Page Content</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage banner, sessions, toppers, target achievers, highlights, and testimonials for the public result page.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Exam</span>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
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
                <a
                  href={`/${selectedExam.slug}/result`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  View result page →
                </a>
              )}
            </div>
          </div>

          {loadingContent ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : data ? (
            <div className="p-6 space-y-4">
              {/* Banner */}
              <Section title="Banner" icon={FaImage} expanded={expandedSection === "banner"} onToggle={() => toggleSection("banner")}>
                <div className="space-y-3">
                  <InputRow label="Banner image URL" value={data.bannerImage} onChange={(v) => update("bannerImage", v)} placeholder="https://..." />
                  <InputRow label="Banner title" value={data.bannerTitle} onChange={(v) => update("bannerTitle", v)} placeholder="e.g. JEE Result 2025" />
                  <InputRow label="Banner subtitle" value={data.bannerSubtitle} onChange={(v) => update("bannerSubtitle", v)} textarea placeholder="Short line under title" />
                </div>
              </Section>

              {/* Sessions */}
              <Section title="Result sessions (years)" icon={FaTrophy} expanded={expandedSection === "sessions"} onToggle={() => toggleSection("sessions")}>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Comma-separated years, e.g. 2025,2024,2023</p>
                  <input
                    type="text"
                    value={(data.sessions || []).join(", ")}
                    onChange={(e) => {
                      const val = e.target.value
                        .split(",")
                        .map((n) => parseInt(n.trim(), 10))
                        .filter((n) => !Number.isNaN(n));
                      update("sessions", val);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="2025, 2024, 2023"
                  />
                </div>
              </Section>

              {/* Toppers */}
              <Section title="Toppers" icon={FaTrophy} expanded={expandedSection === "toppers"} onToggle={() => toggleSection("toppers")}>
                <Repeater
                  items={data.toppers || []}
                  onAdd={() => addArrayItem("toppers", emptyTopper)}
                  onRemove={(i) => removeArrayItem("toppers", i)}
                  label="Topper"
                >
                  {(item, i) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                      <input placeholder="Name" value={item.name} onChange={(e) => updateArray("toppers", i, "name", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                      <input placeholder="Percentile" value={item.percentile} onChange={(e) => updateArray("toppers", i, "percentile", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                      <input placeholder="Location" value={item.location} onChange={(e) => updateArray("toppers", i, "location", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                      <input placeholder="Attempt" value={item.attempt} onChange={(e) => updateArray("toppers", i, "attempt", e.target.value)} className="rounded border px-2 py-1.5 text-sm sm:col-span-2" />
                      <input placeholder="Image URL" value={item.image} onChange={(e) => updateArray("toppers", i, "image", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                      <input type="number" placeholder="Year" value={item.year ?? ""} onChange={(e) => updateArray("toppers", i, "year", e.target.value ? parseInt(e.target.value, 10) : null)} className="rounded border px-2 py-1.5 text-sm" />
                    </div>
                  )}
                </Repeater>
              </Section>

              {/* Target Achievers */}
              <Section title="Target Achievers" icon={FaTrophy} expanded={expandedSection === "achievers"} onToggle={() => toggleSection("achievers")}>
                <Repeater
                  items={data.targetAchievers || []}
                  onAdd={() => addArrayItem("targetAchievers", emptyAchiever)}
                  onRemove={(i) => removeArrayItem("targetAchievers", i)}
                  label="Story"
                >
                  {(item, i) => (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input placeholder="Title" value={item.title} onChange={(e) => updateArray("targetAchievers", i, "title", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                      <input placeholder="Image URL" value={item.image} onChange={(e) => updateArray("targetAchievers", i, "image", e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
                      <textarea placeholder="Description" value={item.description} onChange={(e) => updateArray("targetAchievers", i, "description", e.target.value)} className="rounded border px-2 py-1.5 text-sm" rows={2} />
                    </div>
                  )}
                </Repeater>
              </Section>

              {/* Highlights */}
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

              {/* What Our Students Say */}
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

              {/* What Our Parents Say */}
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
            <div className="p-6 text-gray-500 text-sm">Select an exam to edit result page content.</div>
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
