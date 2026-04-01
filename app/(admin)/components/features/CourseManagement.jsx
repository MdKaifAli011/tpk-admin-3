"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaImage,
  FaListUl,
  FaSearch,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import PaginationBar from "../ui/PaginationBar";

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

const MetaIcon = ({ filled }) =>
  filled ? (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
      <FaCheck className="w-2.5 h-2.5" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400">
      <FaTimes className="w-2.5 h-2.5" />
    </span>
  );

function formatContentDate(course) {
  if (course.content && course.content.trim()) {
    const d = new Date(course.updatedAt || course.createdAt);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return null;
}

function isMetaFilled(course) {
  return !!(course.metaTitle?.trim() || course.metaDescription?.trim() || course.keywords?.trim());
}

function ExamCourseTable({ examName, courses, onEdit, onDelete }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-t-lg">
        <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-indigo-600 text-white">
          {examName}
        </span>
        <span className="text-xs text-gray-500">{courses.length} course{courses.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="overflow-x-auto border border-t-0 border-gray-200 rounded-b-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Price</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Content</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Meta</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {courses.map((course) => (
              <tr key={course._id} className={`hover:bg-gray-50 ${course.status === "inactive" ? "opacity-60" : ""}`}>
                <td className="px-3 py-2 text-sm text-gray-500 font-mono">{course.orderNumber ?? "—"}</td>
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
                        className="text-sm font-medium text-gray-900 truncate max-w-[220px] block hover:text-indigo-600 transition-colors"
                      >
                        {course.title}
                      </Link>
                      <div className="text-[10px] text-gray-400 truncate max-w-[220px]">
                        {course.slug || "—"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-sm text-gray-700">
                  {course.price != null ? `$${Number(course.price).toLocaleString()}` : "—"}
                </td>
                <td className="px-3 py-2">
                  {formatContentDate(course) ? (
                    <span className="text-xs text-green-700 font-medium">{formatContentDate(course)}</span>
                  ) : (
                    <span className="text-xs text-orange-500 italic">Unavailable</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <MetaIcon filled={isMetaFilled(course)} />
                </td>
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
    </div>
  );
}

export default function CourseManagement() {
  const router = useRouter();
  const [filterState, setFilterState] = useFilterPersistence("course", {
    examFilter: "all",
    searchQuery: "",
  });
  const { page, limit, examFilter, searchQuery } = filterState;
  const [searchInput, setSearchInput] = useDebouncedSearchQuery(searchQuery, setFilterState);

  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const fetchRef = useRef(false);

  useEffect(() => {
    api
      .get("/exam?status=active&limit=100")
      .then((res) => {
        if (res.data?.success) setExams(Array.isArray(res.data.data) ? res.data.data : []);
      })
      .catch(() => {});
  }, []);

  const fetchCourses = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: "all",
      });
      if (examFilter && examFilter !== "all") params.set("examId", examFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await api.get(`/course?${params.toString()}`);
      if (res.data?.success) {
        setCourses(res.data.data || []);
        const pag = res.data?.pagination;
        if (pag) {
          setPagination({
            total: pag.total ?? 0,
            totalPages: pag.totalPages ?? 0,
            hasNextPage: !!pag.hasNextPage,
            hasPrevPage: !!pag.hasPrevPage,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load courses");
    } finally {
      setIsLoading(false);
      fetchRef.current = false;
    }
  }, [page, limit, examFilter, searchQuery]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDelete = async (course) => {
    if (!window.confirm(`Delete "${course.title}"?`)) return;
    try {
      const res = await api.delete(`/course/${course._id}`);
      if (res.data?.success) {
        await fetchCourses();
        success("Course deleted");
      } else {
        showError(res.data?.message || "Delete failed");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Delete failed");
    }
  };

  const examMap = useMemo(() => {
    const m = new Map();
    exams.forEach((e) => m.set(e._id, e.name));
    return m;
  }, [exams]);

  const groupedCourses = useMemo(() => {
    const groups = new Map();
    courses.forEach((c) => {
      const examId = c.examId?._id || c.examId || "unassigned";
      const examName = c.examId?.name || examMap.get(examId) || "Unassigned";
      if (!groups.has(examId)) groups.set(examId, { examName, items: [] });
      groups.get(examId).items.push(c);
    });
    groups.forEach((g) => g.items.sort((a, b) => (a.orderNumber ?? 999) - (b.orderNumber ?? 999)));
    return Array.from(groups.values());
  }, [courses, examMap]);

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Course Management</h1>
              <p className="text-xs text-gray-600">
                Manage exam-wise courses. Courses are grouped by exam and ordered by order number.
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
            <h2 className="text-lg font-semibold text-gray-900">
              Courses {pagination.total > 0 && <span className="text-sm font-normal text-gray-500">({pagination.total})</span>}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setFilterState({ searchQuery: "", page: 1 });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                )}
              </div>
              <select
                value={examFilter}
                onChange={(e) => setFilterState({ examFilter: e.target.value, page: 1 })}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All exams</option>
                {exams.map((e) => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <LoadingSpinner size="large" />
                <p className="mt-3 text-sm text-gray-500">Loading courses...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <FaExclamationTriangle className="mx-auto w-8 h-8 text-red-400 mb-2" />
                <p className="text-red-600 text-sm">{error}</p>
                <button onClick={fetchCourses} className="mt-2 text-sm text-blue-600 hover:underline">Retry</button>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-5xl mb-3">📚</div>
                <h3 className="text-sm font-bold text-gray-800 mb-1.5">No courses found</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  {searchQuery || examFilter !== "all"
                    ? "Try adjusting your search or filter."
                    : "Create your first course to get started."}
                </p>
                {!searchQuery && examFilter === "all" && (
                  <div className="mt-4">
                    <Link
                      href="/admin/course/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                      <FaPlus className="w-4 h-4" /> Add course
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                {groupedCourses.map((group) => (
                  <ExamCourseTable
                    key={group.examName}
                    examName={group.examName}
                    courses={group.items}
                    onEdit={(c) => router.push(`/admin/course/${c._id}/edit`)}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </div>
          {(pagination.totalPages > 0 || pagination.total > 0) && (
            <PaginationBar
              page={page}
              limit={limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              onPageChange={(p) => setFilterState({ page: p })}
              onLimitChange={(l) => setFilterState({ limit: l, page: 1 })}
            />
          )}
        </div>
      </div>
    </>
  );
}
