"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaGraduationCap,
  FaImage,
  FaListUl,
} from "react-icons/fa";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";

const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800",
    draft: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {(status || "active").charAt(0).toUpperCase() + (status || "active").slice(1)}
    </span>
  );
};

const CourseTable = ({ courses, onEdit, onDelete }) => {
  if (!courses || courses.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-5xl mb-3">📚</div>
        <h3 className="text-sm font-bold text-gray-800 mb-1.5">No courses found</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Create your first course by selecting an exam, then add title, description, price, and other card details.
        </p>
        <div className="mt-4">
          <Link
            href="/admin/course/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <FaPlus className="w-4 h-4" /> Add course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Exam</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Price</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Reviews</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Status</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {courses.map((course) => (
            <tr key={course._id} className={`hover:bg-gray-50 ${course.status === "inactive" ? "opacity-60" : ""}`}>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-14 shrink-0 rounded overflow-hidden border border-gray-100 bg-gray-50">
                    {course.image ? (
                      <img className="h-full w-full object-cover" src={course.image} alt="" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-300">
                        <FaImage className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/course/${course._id}`}
                      className="text-sm font-medium text-gray-900 truncate max-w-[200px] block hover:text-indigo-600 transition-colors"
                    >
                      {course.title}
                    </Link>
                    <div className="text-xs text-gray-400 truncate max-w-[200px]">{course.shortDescription || "—"}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2">
                {course.examId?.name ? (
                  <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                    {course.examId.name}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {course.price != null ? `₹${Number(course.price).toLocaleString()}` : "—"}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">{course.reviewCount ?? 0}</td>
              <td className="px-3 py-2">
                <StatusBadge status={course.status} />
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/course/${course._id}/details`}
                    className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    title="Card details"
                  >
                    <FaListUl className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onEdit(course)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                    title="Edit"
                  >
                    <FaEdit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(course)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    title="Delete"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function CourseManagement() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [examFilter, setExamFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const fetchRef = useRef(false);

  const fetchData = async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      setIsLoading(true);
      setError(null);
      const [coursesRes, examsRes] = await Promise.all([
        api.get("/course" + (examFilter ? `?examId=${examFilter}` : "")),
        api.get("/exam?status=active&limit=100"),
      ]);
      if (coursesRes.data?.success) setCourses(coursesRes.data.data || []);
      if (examsRes.data?.success) setExams(Array.isArray(examsRes.data.data) ? examsRes.data.data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load courses");
    } finally {
      setIsLoading(false);
      fetchRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
  }, [examFilter]);

  const handleDelete = async (course) => {
    if (!window.confirm(`Delete "${course.title}"?`)) return;
    try {
      const res = await api.delete(`/course/${course._id}`);
      if (res.data?.success) {
        setCourses((prev) => prev.filter((c) => c._id !== course._id));
        success("Course deleted");
      } else {
        showError(res.data?.message || "Delete failed");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Course Management</h1>
              <p className="text-xs text-gray-600">
                Manage exam-wise courses. Select an exam when creating a course; card title, description, hours, lessons, instructor, price, and reviews are all editable.
              </p>
            </div>
            <Link
              href="/admin/course/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              <FaPlus className="w-4 h-4" /> Add course
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Courses</h2>
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All exams</option>
              {exams.map((e) => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="medium" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">{error}</div>
            ) : (
              <CourseTable
                courses={courses}
                onEdit={(c) => router.push(`/admin/course/${c._id}/edit`)}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
