"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import StudentTable from "../table/StudentTable";
import {
  LoadingWrapper,
  SkeletonPageContent,
  LoadingSpinner,
} from "../ui/SkeletonLoader";
import { FaTimes, FaUserGraduate, FaEye } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import PaginationBar from "../ui/PaginationBar";

const StudentManagement = () => {
  const { canDelete, role } = usePermissions();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  const [filterState, setFilterState] = useFilterPersistence("student", {
    filterCountry: "",
    filterClassName: "",
    filterStatus: "all",
    searchQuery: "",
  });
  const { page, limit, filterCountry, filterClassName, filterStatus, searchQuery } = filterState;
  const [searchInput, setSearchInput] = useDebouncedSearchQuery(searchQuery, setFilterState);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchStudents = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (filterCountry) params.append("country", filterCountry);
      if (filterClassName) params.append("className", filterClassName);
      if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);
      if (searchQuery) params.append("search", searchQuery);
      if (filterDateFrom) params.append("dateFrom", filterDateFrom);
      if (filterDateTo) params.append("dateTo", filterDateTo);

      const response = await api.get(`/student?${params.toString()}`);

      if (response.data?.success) {
        setStudents(response.data.data || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setError(response.data?.message || "Failed to fetch students");
        setStudents([]);
      }
    } catch (err) {
      console.error("❌ Error fetching students:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch students. Please check your connection.";
      setError(errorMessage);
      setStudents([]);
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, limit, filterCountry, filterClassName, filterStatus, searchQuery, filterDateFrom, filterDateTo]);

  // Get unique countries and class names for filter dropdowns
  const uniqueCountries = useMemo(() => {
    const countries = new Set();
    students.forEach((student) => {
      if (student.country) countries.add(student.country);
    });
    return Array.from(countries).sort();
  }, [students]);

  const uniqueClassNames = useMemo(() => {
    const classNames = new Set();
    students.forEach((student) => {
      if (student.className) classNames.add(student.className);
    });
    return Array.from(classNames).sort();
  }, [students]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterCountry) count++;
    if (filterClassName) count++;
    if (filterStatus && filterStatus !== "all") count++;
    if (searchQuery) count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    return count;
  }, [filterCountry, filterClassName, filterStatus, searchQuery, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterState({ filterCountry: "", filterClassName: "", filterStatus: "all", searchQuery: "", page: 1 });
    setSearchInput("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  // Handle view student
  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  // Handle delete student
  const handleDeleteStudent = async (studentToDelete) => {
    if (!canDelete) {
      showError(getPermissionMessage("delete", role));
      return;
    }

    const fullName = `${studentToDelete.firstName || ""} ${studentToDelete.lastName || ""}`.trim() || studentToDelete.email;

    if (
      !window.confirm(
        `Are you sure you want to delete student ${fullName}? This will permanently delete all their progress data, test results, and account information. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setIsDataLoading(true);
      const response = await api.delete(`/student/${studentToDelete._id}`);

      if (response.data?.success) {
        success("Student and all related data deleted successfully!");
        await fetchStudents();
      } else {
        throw new Error(response.data?.message || "Failed to delete student");
      }
    } catch (err) {
      console.error("❌ Error deleting student:", err);
      showError(
        err?.response?.data?.message || err?.message || "Failed to delete student"
      );
    } finally {
      setIsDataLoading(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              Student Management
            </h1>
            <p className="text-xs text-gray-600">
              View and manage all registered students, their accounts, and related data.
            </p>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Students List
                {pagination.total > 0 && ` (${pagination.total})`}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                View and manage all registered students
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Filter Students
              {activeFilterCount > 0 && (
                <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded-full text-xs font-medium ml-1.5">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Search */}
              <div className="lg:col-span-3 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Search (Name, Email, or Phone)
                </label>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, email, or phone number..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>

              {/* Filter by Country */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Filter by Country
                </label>
                <input
                  type="text"
                  value={filterCountry}
                  onChange={(e) => setFilterState({ filterCountry: e.target.value, page: 1 })}
                  placeholder="Enter country..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>

              {/* Filter by Class Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Filter by Class Name
                </label>
                <input
                  type="text"
                  value={filterClassName}
                  onChange={(e) => setFilterState({ filterClassName: e.target.value, page: 1 })}
                  placeholder="Enter class name..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>

              {/* Filter by Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterState({ filterStatus: e.target.value, page: 1 })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Date From
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setFilterState({ page: 1 });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Date To
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setFilterState({ page: 1 });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Active Filters */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                <span className="text-xs font-medium text-gray-600">
                  Active Filters:
                </span>
                {filterCountry && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Country: {filterCountry}
                    <button
                      onClick={() => setFilterState({ filterCountry: "", page: 1 })}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterClassName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Class: {filterClassName}
                    <button
                      onClick={() => setFilterState({ filterClassName: "", page: 1 })}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterStatus && filterStatus !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Status: {filterStatus}
                    <button
                      onClick={() => setFilterState({ filterStatus: "all", page: 1 })}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Search: {searchQuery}
                    <button
                      onClick={() => {
                        setFilterState({ searchQuery: "", page: 1 });
                        setSearchInput("");
                      }}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(filterDateFrom || filterDateTo) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Date: {filterDateFrom || "..."} to {filterDateTo || "..."}
                    <button
                      onClick={() => {
                        setFilterDateFrom("");
                        setFilterDateTo("");
                        setFilterState({ page: 1 });
                      }}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="ml-auto px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-xs font-medium transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Table Content */}
        <div>
          {isDataLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingSpinner size="medium" />
                <p className="text-sm text-gray-500 mt-3">Loading students...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-red-100 rounded-full mb-4">
                <FaUserGraduate className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Students
              </h3>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => fetchStudents()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <FaUserGraduate className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Students Found
              </h3>
              <p className="text-sm text-gray-500 mb-4 max-w-sm">
                {activeFilterCount > 0
                  ? "No students match your current filters."
                  : "Registered students will appear here."}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <StudentTable
                students={students}
                onView={handleViewStudent}
                onDelete={handleDeleteStudent}
              />
            </>
          )}
        </div>
      </div>

      {!isDataLoading && !error && students.length > 0 && (
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

      {/* View Student Modal */}
      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0">
              <h2 className="text-xl font-semibold text-gray-900">Student Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedStudent(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Grid Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-600">First Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {selectedStudent.firstName}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Last Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {selectedStudent.lastName}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold break-all">
                    {selectedStudent.email}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Phone Number</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {selectedStudent.phoneNumber || (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Class Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {selectedStudent.className}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Country</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {selectedStudent.country || (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Prepared</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {selectedStudent.prepared || (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <span
                    className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${selectedStudent.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {selectedStudent.status || "active"}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Last Login</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {selectedStudent.lastLogin
                      ? new Date(selectedStudent.lastLogin).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "Never"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Date Registered
                  </label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {new Date(selectedStudent.createdAt).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t sticky bottom-0 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedStudent(null);
                }}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentManagement;

