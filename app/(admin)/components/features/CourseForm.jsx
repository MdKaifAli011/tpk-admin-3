"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaSave, FaTimes, FaArrowLeft, FaFolderOpen, FaUserPlus } from "react-icons/fa";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import { ToastContainer, useToast } from "../ui/Toast";
import MediaPickerModal from "../ui/MediaPickerModal";
import api from "@/lib/api";
import { getFacultiesForExam } from "@/constants";

const defaultForm = {
  examId: "",
  title: "",
  shortDescription: "",
  hours: "",
  lessonsRange: "",
  durationLabel: "",
  createdBy: "",
  instructorImage: "",
  price: "",
  reviewCount: "0",
  rating: "5",
  image: "",
  videoUrl: "",
  videoThumbnail: "",
  brochureButtonUrl: "",
  status: "active",
};

export default function CourseForm({ courseId, isNew }) {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [mediaPickerFor, setMediaPickerFor] = useState(null); // 'instructorImage' | 'image' | 'videoThumbnail' | 'newFacultyImage' | null
  const [facultiesFromApi, setFacultiesFromApi] = useState([]);
  const [newFacultyName, setNewFacultyName] = useState("");
  const [newFacultyImage, setNewFacultyImage] = useState("");
  const [addingFaculty, setAddingFaculty] = useState(false);
  const [showAddFaculty, setShowAddFaculty] = useState(false);
  const { toasts, removeToast, success, error: showError } = useToast();
  const mounted = useRef(true);

  const fetchFaculties = useCallback(async (examId) => {
    if (!examId) {
      setFacultiesFromApi([]);
      return;
    }
    try {
      const res = await api.get(`/admin/faculty?examId=${encodeURIComponent(examId)}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setFacultiesFromApi(res.data.data);
      } else {
        setFacultiesFromApi([]);
      }
    } catch {
      setFacultiesFromApi([]);
    }
  }, []);

  useEffect(() => {
    if (form.examId) fetchFaculties(form.examId);
    else setFacultiesFromApi([]);
  }, [form.examId, fetchFaculties]);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const examsRes = await api.get("/exam?status=active&limit=100");
        if (examsRes.data?.success) setExams(Array.isArray(examsRes.data.data) ? examsRes.data.data : []);

        if (!isNew && courseId) {
          const courseRes = await api.get(`/course/${courseId}`);
          if (courseRes.data?.success && courseRes.data.data) {
            const c = courseRes.data.data;
            setForm({
              examId: c.examId?._id || c.examId || "",
              title: c.title || "",
              shortDescription: c.shortDescription || "",
              hours: c.hours ?? "",
              lessonsRange: c.lessonsRange ?? "",
              durationLabel: c.durationLabel ?? "",
              createdBy: c.createdBy ?? "",
              instructorImage: c.instructorImage || "",
              price: c.price != null ? String(c.price) : "",
              reviewCount: c.reviewCount != null ? String(c.reviewCount) : "0",
              rating: c.rating != null ? String(c.rating) : "5",
              image: c.image || "",
              videoUrl: c.videoUrl || "",
              videoThumbnail: c.videoThumbnail || "",
              brochureButtonUrl: c.brochureButtonUrl || "",
              status: c.status || "active",
            });
          } else {
            setError("Course not found");
          }
        } else {
          setForm({ ...defaultForm });
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load");
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    load();
    return () => { mounted.current = false; };
  }, [courseId, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const saveAndClose = e.nativeEvent?.submitter?.getAttribute?.("data-save-and-close") === "true";
    if (!form.examId?.trim()) {
      showError("Please select an exam first.");
      return;
    }
    if (!form.title?.trim()) {
      showError("Course title is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        examId: form.examId.trim(),
        title: form.title.trim(),
        shortDescription: form.shortDescription.trim(),
        hours: form.hours.trim(),
        lessonsRange: form.lessonsRange.trim(),
        durationLabel: form.durationLabel.trim(),
        createdBy: form.createdBy.trim(),
        instructorImage: form.instructorImage.trim(),
        price: form.price === "" ? null : Number(form.price),
        reviewCount: form.reviewCount === "" ? 0 : parseInt(form.reviewCount, 10),
        rating: form.rating === "" ? 5 : Number(form.rating),
        image: form.image.trim(),
        videoUrl: form.videoUrl.trim(),
        videoThumbnail: form.videoThumbnail.trim(),
        brochureButtonUrl: form.brochureButtonUrl.trim(),
        status: form.status,
      };
      if (isNew) {
        const res = await api.post("/course", payload);
        if (res.data?.success) {
          success("Course created.");
          router.push("/admin/course");
        } else {
          showError(res.data?.message || "Create failed");
        }
      } else {
        const res = await api.patch(`/course/${courseId}`, payload);
        if (res.data?.success) {
          success("Course updated.");
          if (saveAndClose) {
            router.push("/admin/course");
          }
        } else {
          showError(res.data?.message || "Update failed");
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || "Request failed");
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

  if (error && !isNew) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
        <Link href="/admin/course" className="ml-4 text-indigo-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  const examName = form.examId ? exams.find((e) => e._id === form.examId)?.name : null;

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Management header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin/course"
              className="flex-shrink-0 p-2 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-white/70 transition-all duration-200"
              aria-label="Back to courses"
            >
              <FaArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {isNew ? "Create course" : "Edit course"}
              </h1>
              {!isNew && (form.title || examName) && (
                <p className="text-sm text-gray-600 mt-0.5 truncate">
                  {form.title && (
                    <span className="font-medium text-gray-800">{form.title}</span>
                  )}
                  {form.title && examName && " • "}
                  {examName && (
                    <span className="text-indigo-600">Exam: {examName}</span>
                  )}
                </p>
              )}
              {isNew && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Select exam and fill in card details for the course listing.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/admin/course"
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl hover:shadow-md text-gray-800 text-sm font-semibold transition-all duration-200 inline-flex items-center gap-2"
            >
              <FaTimes className="w-3.5 h-3.5" /> Cancel
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-600 mb-6">
            First select the <strong>exam</strong> this course belongs to (e.g. JEE, NEET, SAT). Then fill in the card details shown on the course listing page.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam <span className="text-red-500">*</span></label>
                <select
                  name="examId"
                  value={form.examId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={saving}
                >
                  <option value="">-- Select exam --</option>
                  {exams.map((e) => (
                    <option key={e._id} value={e._id}>{e.name}</option>
                  ))}
                </select>
              </div>

              {/* Faculty: select from list (API + static) or add new */}
              {form.examId && (() => {
                const selectedExam = exams.find((e) => e._id === form.examId);
                const staticFaculties = selectedExam ? getFacultiesForExam(selectedExam.name) : [];
                const apiFaculties = (facultiesFromApi || []).map((f) => ({
                  name: f.name,
                  imageUrl: f.imageUrl || "",
                }));
                const seenNames = new Set();
                const merged = [];
                apiFaculties.forEach((f) => {
                  const n = (f.name || "").trim();
                  if (n && !seenNames.has(n.toLowerCase())) {
                    seenNames.add(n.toLowerCase());
                    merged.push({ ...f, source: "api" });
                  }
                });
                staticFaculties.forEach((f) => {
                  const n = (f.name || "").trim();
                  if (n && !seenNames.has(n.toLowerCase())) {
                    seenNames.add(n.toLowerCase());
                    merged.push({ name: n, imageUrl: f.imageUrl || "", source: "static" });
                  }
                });
                const selectedIndex = merged.findIndex(
                  (f) => (f.name || "").trim() === (form.createdBy || "").trim()
                );
                const selectValue = selectedIndex >= 0 ? String(selectedIndex) : "";
                return (
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select faculty (instructor)</label>
                      <select
                        value={selectValue}
                        onChange={(e) => {
                          const idx = e.target.value;
                          if (idx === "") return;
                          const f = merged[Number(idx)];
                          if (f) {
                            setForm((prev) => ({
                              ...prev,
                              createdBy: f.name,
                              instructorImage: f.imageUrl || prev.instructorImage,
                            }));
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        disabled={saving}
                      >
                        <option value="">-- Choose a faculty to fill name and image --</option>
                        {merged.map((f, i) => (
                          <option key={i} value={i}>{f.name}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Fills &quot;Created by&quot; and &quot;Instructor image URL&quot; below. You can also add a new faculty for this exam.</p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAddFaculty((v) => !v)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <FaUserPlus className="w-4 h-4" />
                        {showAddFaculty ? "Hide add faculty" : "Add new faculty for this exam"}
                      </button>
                      {showAddFaculty && (
                        <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                          <p className="text-sm font-medium text-gray-700">New faculty (saved for this exam and available in the list above)</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                              <input
                                type="text"
                                value={newFacultyName}
                                onChange={(e) => setNewFacultyName(e.target.value)}
                                placeholder="e.g. Dr. Jane Smith"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                disabled={saving || addingFaculty}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Image URL</label>
                              <div className="flex gap-2">
                                <input
                                  type="url"
                                  value={newFacultyImage}
                                  onChange={(e) => setNewFacultyImage(e.target.value)}
                                  placeholder="https://..."
                                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                  disabled={saving || addingFaculty}
                                />
                                <button
                                  type="button"
                                  onClick={() => setMediaPickerFor("newFacultyImage")}
                                  disabled={saving || addingFaculty}
                                  className="flex items-center gap-1 px-2 py-2 border border-indigo-300 rounded-lg text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 shrink-0"
                                  title="Select from Media"
                                >
                                  <FaFolderOpen className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const name = newFacultyName.trim();
                              if (!name) {
                                showError("Enter faculty name.");
                                return;
                              }
                              setAddingFaculty(true);
                              try {
                                const res = await api.post("/admin/faculty", {
                                  examId: form.examId,
                                  name,
                                  imageUrl: newFacultyImage.trim(),
                                });
                                if (res.data?.success && res.data.data) {
                                  const f = res.data.data;
                                  setForm((prev) => ({
                                    ...prev,
                                    createdBy: f.name,
                                    instructorImage: f.imageUrl || prev.instructorImage,
                                  }));
                                  setNewFacultyName("");
                                  setNewFacultyImage("");
                                  setShowAddFaculty(false);
                                  fetchFaculties(form.examId);
                                  success("Faculty added. You can select them from the list or edit below.");
                                } else {
                                  showError(res.data?.message || "Failed to add faculty");
                                }
                              } catch (err) {
                                showError(err.response?.data?.message || err.message || "Failed to add faculty");
                              } finally {
                                setAddingFaculty(false);
                              }
                            }}
                            disabled={saving || addingFaculty || !newFacultyName.trim()}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {addingFaculty ? <LoadingSpinner size="small" /> : <FaUserPlus className="w-4 h-4" />}
                            Add faculty
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Card title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. 1 Yr. JEE Preparation Online Course"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Short description</label>
                <textarea
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={handleChange}
                  placeholder="Brief summary for the card"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lessons range</label>
                <input
                  type="text"
                  name="lessonsRange"
                  value={form.lessonsRange}
                  onChange={handleChange}
                  placeholder="e.g. 70-75 Lessons"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration label</label>
                <input
                  type="text"
                  name="durationLabel"
                  value={form.durationLabel}
                  onChange={handleChange}
                  placeholder="e.g. 1 Year Course"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                <input
                  type="text"
                  name="hours"
                  value={form.hours}
                  onChange={handleChange}
                  placeholder="e.g. 480 Hours"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created by (instructor)</label>
                <input
                  type="text"
                  name="createdBy"
                  value={form.createdBy}
                  onChange={handleChange}
                  placeholder="e.g. Megha Rastogi"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
              </div>
            
            
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructor / faculty image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    name="instructorImage"
                    value={form.instructorImage}
                    onChange={handleChange}
                    placeholder="https://... (shown next to By [name] on course page)"
                    className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerFor("instructorImage")}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2.5 border border-indigo-300 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0"
                    title="Select from Media Management"
                  >
                    <FaFolderOpen className="w-4 h-4" /> Browse
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Small circular image shown beside the instructor name on the course detail page.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="e.g. 2136"
                  min={0}
                  step={1}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review count</label>
                <input
                  type="number"
                  name="reviewCount"
                  value={form.reviewCount}
                  onChange={handleChange}
                  min={0}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                <input
                  type="number"
                  name="rating"
                  value={form.rating}
                  onChange={handleChange}
                  min={0}
                  max={5}
                  step={0.1}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Course image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    name="image"
                    value={form.image}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerFor("image")}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2.5 border border-indigo-300 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0"
                    title="Select from Media Management"
                  >
                    <FaFolderOpen className="w-4 h-4" /> Browse
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (e.g. YouTube)</label>
                <input
                  type="url"
                  name="videoUrl"
                  value={form.videoUrl}
                  onChange={handleChange}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500">Shown in header; click opens a modal to play the video.</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Video thumbnail URL (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    name="videoThumbnail"
                    value={form.videoThumbnail}
                    onChange={handleChange}
                    placeholder="Leave empty to use YouTube default thumbnail"
                    className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerFor("videoThumbnail")}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2.5 border border-indigo-300 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0"
                    title="Select from Media Management"
                  >
                    <FaFolderOpen className="w-4 h-4" /> Browse
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Download Course Brochure button URL</label>
                <input
                  type="url"
                  name="brochureButtonUrl"
                  value={form.brochureButtonUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/brochure.pdf or /some-page"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500">Public course page button opens this URL. Leave empty to use /contact fallback.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <LoadingSpinner size="small" /> : <FaSave className="w-4 h-4" />}
                {isNew ? "Create course" : "Save changes"}
              </button>
              {!isNew && (
                <button
                  type="submit"
                  data-save-and-close="true"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-50"
                >
                  {saving ? <LoadingSpinner size="small" /> : <FaSave className="w-4 h-4" />}
                  Save and Close
                </button>
              )}
              <Link
                href="/admin/course"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                <FaTimes className="w-4 h-4" /> Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>

      <MediaPickerModal
        isOpen={!!mediaPickerFor}
        onClose={() => setMediaPickerFor(null)}
        onSelect={(url) => {
          if (mediaPickerFor === "newFacultyImage") {
            setNewFacultyImage(url || "");
          } else if (mediaPickerFor) {
            setForm((prev) => ({ ...prev, [mediaPickerFor]: url }));
          }
          setMediaPickerFor(null);
        }}
        title={
          mediaPickerFor === "instructorImage" || mediaPickerFor === "newFacultyImage"
            ? "Select instructor / faculty image"
            : mediaPickerFor === "image"
              ? "Select course image"
              : mediaPickerFor === "videoThumbnail"
                ? "Select video thumbnail"
                : "Select image from Media"
        }
      />
    </>
  );
}
