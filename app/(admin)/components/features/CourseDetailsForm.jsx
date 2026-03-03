"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaSave, FaArrowLeft, FaListUl } from "react-icons/fa";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";

const FIELDS = [
  { key: "madeFor", label: "Made For", placeholder: "e.g. Grade 12 Going / 12th Studying" },
  { key: "mode", label: "Mode", placeholder: "e.g. Live, 2-way Interactive" },
  { key: "target", label: "Target", placeholder: "e.g. JEE (Main + Advanced)" },
  { key: "subjectCovered", label: "Subject Covered", placeholder: "e.g. Math, Physics, Chemistry" },
  { key: "sessionLength", label: "Session Length", placeholder: "e.g. 90 Minutes" },
  { key: "tests", label: "Tests", placeholder: "e.g. Regular Weekly Test" },
  { key: "fullLength", label: "Full-Length", placeholder: "e.g. All India Test Series" },
  { key: "feeUsaEurope", label: "Fee (USA/Europe*)", placeholder: "e.g. INR 1,79,300" },
  { key: "feeIndiaMeSe", label: "Fee (India/ME/SE*)", placeholder: "e.g. INR 97,600" },
  { key: "timeZone", label: "Time Zone", placeholder: "e.g. Adjusted as per different Time Zones" },
];

const defaultForm = {
  madeFor: "",
  mode: "",
  target: "",
  subjectCovered: "",
  sessionLength: "",
  tests: "",
  fullLength: "",
  feeUsaEurope: "",
  feeIndiaMeSe: "",
  timeZone: "",
  batchClosingDays: "",
  callPhone: "",
  totalStudents: "",
  brochureButtonUrl: "",
};

export default function CourseDetailsForm({ courseId }) {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/course/${courseId}`);
        if (res.data?.success && res.data.data) {
          const c = res.data.data;
          setCourse(c);
          setForm({
            madeFor: c.madeFor ?? "",
            mode: c.mode ?? "",
            target: c.target ?? "",
            subjectCovered: c.subjectCovered ?? "",
            sessionLength: c.sessionLength ?? "",
            tests: c.tests ?? "",
            fullLength: c.fullLength ?? "",
            feeUsaEurope: c.feeUsaEurope ?? "",
            feeIndiaMeSe: c.feeIndiaMeSe ?? "",
            timeZone: c.timeZone ?? "",
            batchClosingDays: c.batchClosingDays != null ? String(c.batchClosingDays) : "",
            callPhone: c.callPhone ?? "",
            totalStudents: c.totalStudents != null ? String(c.totalStudents) : "",
            brochureButtonUrl: c.brochureButtonUrl ?? "",
          });
        } else {
          setError("Course not found");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load course");
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    load();
    return () => { mounted.current = false; };
  }, [courseId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        batchClosingDays: form.batchClosingDays !== "" ? Number(form.batchClosingDays) : null,
        totalStudents: form.totalStudents !== "" ? Math.max(0, parseInt(form.totalStudents, 10) || 0) : null,
      };
      const res = await api.patch(`/course/${courseId}`, payload);
      if (res.data?.success) {
        success("Course details saved");
        setCourse(res.data.data);
      } else {
        showError(res.data?.message || "Save failed");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndClose = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        batchClosingDays: form.batchClosingDays !== "" ? Number(form.batchClosingDays) : null,
        totalStudents: form.totalStudents !== "" ? Math.max(0, parseInt(form.totalStudents, 10) || 0) : null,
      };
      const res = await api.patch(`/course/${courseId}`, payload);
      if (res.data?.success) {
        success("Course details saved");
        router.push("/admin/course");
      } else {
        showError(res.data?.message || "Save failed");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="medium" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-red-700">{error || "Course not found"}</p>
        <Link
          href="/admin/course"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-800 hover:underline"
        >
          <FaArrowLeft /> Back to courses
        </Link>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FaListUl className="text-indigo-600" />
              Course card details
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {course.title}
              {course.examId?.name && (
                <span className="ml-2 text-indigo-600">({course.examId.name})</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/course/${courseId}`}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FaArrowLeft /> View course
            </Link>
            <Link
              href={`/admin/course/${courseId}/edit`}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit course
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              These fields appear in the sidebar card on the public course page. Leave blank to use defaults.
            </p>
          </div>
          <div className="p-4 space-y-4">
            {FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <input
                  type="text"
                  id={key}
                  name={key}
                  value={form[key]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            ))}
            <div>
              <label htmlFor="batchClosingDays" className="block text-sm font-medium text-gray-700 mb-1">
                Batch closing (days)
              </label>
              <input
                type="number"
                id="batchClosingDays"
                name="batchClosingDays"
                min={0}
                value={form.batchClosingDays}
                onChange={handleChange}
                placeholder="e.g. 3 (leave empty to hide badge)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="callPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Call Us (phone)
              </label>
              <input
                type="text"
                id="callPhone"
                name="callPhone"
                value={form.callPhone}
                onChange={handleChange}
                placeholder="e.g. +91 8800123492"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="totalStudents" className="block text-sm font-medium text-gray-700 mb-1">
                Total students (display)
              </label>
              <input
                type="number"
                id="totalStudents"
                name="totalStudents"
                min={0}
                value={form.totalStudents}
                onChange={handleChange}
                placeholder="e.g. 1250 (shown on course page)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">Number shown as &quot;X students&quot; on the public course page. Leave empty to show 0.</p>
            </div>
            <div>
              <label htmlFor="brochureButtonUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Download Course Brochure button URL
              </label>
              <input
                type="url"
                id="brochureButtonUrl"
                name="brochureButtonUrl"
                value={form.brochureButtonUrl}
                onChange={handleChange}
                placeholder="e.g. https://example.com/brochure.pdf or /contact"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">URL opened when user clicks &quot;Download Course Brochure&quot;. Leave empty to use /contact.</p>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/admin/course"
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl hover:shadow-md text-gray-800 text-sm font-semibold transition-all duration-200 inline-flex items-center gap-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 hover:shadow-lg text-white text-sm rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
            >
              {saving ? <LoadingSpinner size="small" /> : <FaSave className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 hover:shadow-lg text-white text-sm rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
            >
              {saving ? <LoadingSpinner size="small" /> : null}
              {saving ? "Saving..." : "Save & Close"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
