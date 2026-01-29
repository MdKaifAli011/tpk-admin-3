"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import LeadTable from "../table/LeadTable";
import {
  LoadingWrapper,
  SkeletonPageContent,
  LoadingSpinner,
} from "../ui/SkeletonLoader";
import { FaTimes, FaClipboardList, FaEye, FaLock, FaUnlock } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import Pagination from "@/components/shared/Pagination";
import { useRouter } from "next/navigation";
import { config } from "@/config/config";

const LEAD_ACCESS_STORAGE_KEY = "lead-management-access-verified";
const LEAD_ACCESS_PASSWORD =
  config.leadAccessPassword ||
  process.env.NEXT_PUBLIC_LEAD_ACCESS_PASSWORD ||
  "tpk-admin-pass";

const LeadManagement = () => {
  const router = useRouter();
  const { canDelete, role } = usePermissions();

  // Password gate: show modal until verified (persists in session)
  const [isVerified, setIsVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const passwordInputRef = useRef(null);

  const [isDataLoading, setIsDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const isFetchingRef = useRef(false);

  // Filter states
  const [filterCountry, setFilterCountry] = useState("");
  const [filterClassName, setFilterClassName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Check session storage for existing verification on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = sessionStorage.getItem(LEAD_ACCESS_STORAGE_KEY);
      if (stored === "true") {
        setIsVerified(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Focus password input when modal is shown
  useEffect(() => {
    if (!isVerified && passwordInputRef.current) {
      const t = setTimeout(() => passwordInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isVerified]);

  const handleVerifyPassword = (e) => {
    e?.preventDefault();
    setPasswordError("");
    const trimmed = passwordInput.trim();
    if (!trimmed) {
      setPasswordError("Please enter the access password.");
      passwordInputRef.current?.focus();
      return;
    }
    setIsVerifying(true);
    // Simulate a brief check for UX (optional)
    setTimeout(() => {
      if (trimmed === LEAD_ACCESS_PASSWORD) {
        try {
          sessionStorage.setItem(LEAD_ACCESS_STORAGE_KEY, "true");
        } catch (e) {
          // ignore
        }
        setIsVerified(true);
        setPasswordInput("");
        setPasswordError("");
      } else {
        setPasswordError("Incorrect password. Please try again.");
        setPasswordInput("");
        passwordInputRef.current?.focus();
      }
      setIsVerifying(false);
    }, 200);
  };

  const handleCancelAccess = () => {
    router.push("/admin");
  };

  // Fetch leads with filters and pagination
  const fetchLeads = async (page = 1, limit = 10) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsDataLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (filterCountry) {
        params.append("country", filterCountry);
      }
      if (filterClassName) {
        params.append("className", filterClassName);
      }
      if (filterStatus && filterStatus !== "all") {
        params.append("status", filterStatus);
      }
      if (filterSearch) {
        params.append("search", filterSearch);
      }
      if (filterDateFrom) {
        params.append("dateFrom", filterDateFrom);
      }
      if (filterDateTo) {
        params.append("dateTo", filterDateTo);
      }

      const response = await api.get(`/lead?${params.toString()}`);

      if (response.data?.success) {
        setLeads(response.data.data || []);
        // Update pagination from response
        if (response.data.pagination) {
          setPagination({
            page: response.data.pagination.page || page,
            limit: response.data.pagination.limit || limit,
            total: response.data.pagination.total || 0,
            totalPages: response.data.pagination.totalPages || 0,
          });
        }
      } else {
        setError(response.data?.message || "Failed to fetch leads");
        setLeads([]);
      }
    } catch (err) {
      console.error("❌ Error fetching leads:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch leads. Please check your connection.";
      setError(errorMessage);
      setLeads([]);
    } finally {
      setIsDataLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Load leads on component mount and when filters/pagination change
  useEffect(() => {
    fetchLeads(pagination.page, pagination.limit);
  }, [
    pagination.page,
    pagination.limit,
    filterCountry,
    filterClassName,
    filterStatus,
    filterSearch,
    filterDateFrom,
    filterDateTo,
  ]);

  // Get unique countries and class names for filter dropdowns
  const uniqueCountries = useMemo(() => {
    const countries = new Set();
    leads.forEach((lead) => {
      if (lead.country) countries.add(lead.country);
    });
    return Array.from(countries).sort();
  }, [leads]);

  const uniqueClassNames = useMemo(() => {
    const classNames = new Set();
    leads.forEach((lead) => {
      if (lead.className) classNames.add(lead.className);
    });
    return Array.from(classNames).sort();
  }, [leads]);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterCountry) count++;
    if (filterClassName) count++;
    if (filterStatus && filterStatus !== "all") count++;
    if (filterSearch) count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    return count;
  }, [
    filterCountry,
    filterClassName,
    filterStatus,
    filterSearch,
    filterDateFrom,
    filterDateTo,
  ]);

  // Clear all filters
  const clearFilters = () => {
    setFilterCountry("");
    setFilterClassName("");
    setFilterStatus("all");
    setFilterSearch("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle view lead
  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setShowViewModal(true);
  };

  // Handle delete lead
  const handleDeleteLead = async (leadToDelete) => {
    if (!canDelete) {
      showError(getPermissionMessage("delete", role));
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete the lead from ${leadToDelete.name}?`
      )
    ) {
      return;
    }

    try {
      setIsDataLoading(true);
      const response = await api.delete(`/lead/${leadToDelete._id}`);

      if (response.data?.success) {
        success("Lead deleted successfully!");
        // Refresh leads
        await fetchLeads(pagination.page, pagination.limit);
      } else {
        throw new Error(response.data?.message || "Failed to delete lead");
      }
    } catch (err) {
      console.error("❌ Error deleting lead:", err);
      showError(
        err?.response?.data?.message || err?.message || "Failed to delete lead"
      );
    } finally {
      setIsDataLoading(false);
    }
  };

  // Escape key to cancel when password modal is open
  useEffect(() => {
    if (!isVerified) {
      const onKey = (e) => {
        if (e.key === "Escape") handleCancelAccess();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [isVerified]);

  // Password gate modal: show until verified
  if (!isVerified) {
    return (
      <>
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-access-title"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-8 pb-4 text-center border-b border-gray-100">
              <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <FaLock className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 id="lead-access-title" className="text-xl font-semibold text-gray-900">
                Lead Management Access
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                This area is protected. Enter the access password to continue.
              </p>
            </div>

            {/* Body */}
            <form onSubmit={handleVerifyPassword} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="lead-access-password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Access Password
                </label>
                <input
                  ref={passwordInputRef}
                  id="lead-access-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={isVerifying}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <span className="inline-flex w-4 h-4 shrink-0 rounded-full bg-red-100 text-red-600 items-center justify-center text-xs font-bold">!</span>
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelAccess}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <FaUnlock className="w-4 h-4" />
                      Verify &amp; Open
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer hint */}
            <div className="px-6 pb-6 text-center">
              <p className="text-xs text-gray-400">
                Contact your administrator if you don’t have the password.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              Lead Management
            </h1>
            <p className="text-xs text-gray-600">
              Manage and organize your leads, track lead performance across your
              educational platform.
            </p>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Leads List
                {pagination.total > 0 && ` (${pagination.total})`}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                View and manage all submitted leads
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Filter Leads
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
                  value={filterSearch}
                  onChange={(e) => {
                    setFilterSearch(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
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
                  onChange={(e) => {
                    setFilterCountry(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
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
                  onChange={(e) => {
                    setFilterClassName(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
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
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="updated">Updated</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted</option>
                  <option value="archived">Archived</option>
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
                    setPagination((prev) => ({ ...prev, page: 1 }));
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
                    setPagination((prev) => ({ ...prev, page: 1 }));
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
                      onClick={() => {
                        setFilterCountry("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
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
                      onClick={() => {
                        setFilterClassName("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
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
                      onClick={() => {
                        setFilterStatus("all");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterSearch && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Search: {filterSearch}
                    <button
                      onClick={() => {
                        setFilterSearch("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
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
                        setPagination((prev) => ({ ...prev, page: 1 }));
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
                <p className="text-sm text-gray-500 mt-3">Loading leads...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-red-100 rounded-full mb-4">
                <FaClipboardList className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Leads
              </h3>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => fetchLeads(pagination.page, pagination.limit)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <FaClipboardList className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Leads Found
              </h3>
              <p className="text-sm text-gray-500 mb-4 max-w-sm">
                {activeFilterCount > 0
                  ? "No leads match your current filters."
                  : "Leads submitted from the frontend will appear here."}
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
              <LeadTable
                leads={leads}
                onView={handleViewLead}
                onDelete={handleDeleteLead}
              />
            </>
          )}
        </div>
      </div>

      {/* Pagination Footer - Separate Card */}
      {!isDataLoading && !error && leads.length > 0 && pagination.total > 0 && (
        <>
          <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{" "}
                      of {pagination.total} leads
                    </div>
                      <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">
                          Items per page:
                </span>
                        <select
                          value={pagination.limit}
                          onChange={(e) => {
                            setPagination((prev) => ({
                              ...prev,
                              limit: parseInt(e.target.value),
                              page: 1,
                            }));
                          }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 5%22><path fill=%22%23666%22 d=%22M2 0L0 2h4zm0 5L0 3h4z%22/></svg>')] bg-[length:12px] bg-[right:8px_center] bg-no-repeat pr-8"
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {pagination.totalPages > 1 && (
            <div className="mt-3 flex justify-center">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={(newPage) => {
                        setPagination((prev) => ({ ...prev, page: newPage }));
                      }}
                      showPrevNext={true}
                      maxVisible={5}
                    />
                </div>
              )}
            </>
          )}

      {/* View Lead Modal */}
   {showViewModal && selectedLead && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0">
        <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
        <button
          onClick={() => {
            setShowViewModal(false);
            setSelectedLead(null);
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

          {/* Field */}
          <div>
            <label className="text-sm font-medium text-gray-600">Name</label>
            <p className="mt-1 text-sm text-gray-900 font-semibold">
              {selectedLead.name}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="mt-1 text-sm text-gray-900 font-semibold break-all">
              {selectedLead.email}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Country</label>
            <p className="mt-1 text-sm text-gray-900 font-semibold">
              {selectedLead.country}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Class Name</label>
            <p className="mt-1 text-sm text-gray-900 font-semibold">
              {selectedLead.className}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Phone Number</label>
            <p className="mt-1 text-sm text-gray-900 font-semibold">
              {selectedLead.phoneNumber || (
                <span className="text-gray-400 italic">Not provided</span>
              )}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Status</label>
            <span
              className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${
                selectedLead.status === "new"
                  ? "bg-blue-100 text-blue-700"
                  : selectedLead.status === "updated"
                  ? "bg-purple-100 text-purple-700"
                  : selectedLead.status === "contacted"
                  ? "bg-yellow-100 text-yellow-700"
                  : selectedLead.status === "converted"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {selectedLead.status === "updated"
                ? `Updated, ${selectedLead.updateCount > 0 ? selectedLead.updateCount : 1} time${(selectedLead.updateCount > 0 ? selectedLead.updateCount : 1) === 1 ? '' : 's'}`
                : selectedLead.status || "new"}
            </span>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">
              {selectedLead.updatedAt && (selectedLead.status === "updated" || selectedLead.updateCount > 0)
                ? "Last Updated"
                : "Date Submitted"}
            </label>
            <p className="mt-1 text-sm text-gray-900 font-semibold">
              {selectedLead.updatedAt && (selectedLead.status === "updated" || selectedLead.updateCount > 0)
                ? new Date(selectedLead.updatedAt).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : new Date(selectedLead.createdAt).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </p>
            {selectedLead.updatedAt && (selectedLead.status === "updated" || selectedLead.updateCount > 0) && (
              <p className="mt-1 text-xs text-gray-500">
                Originally submitted: {new Date(selectedLead.createdAt).toLocaleString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {selectedLead.form_id && (
            <div>
              <label className="text-sm font-medium text-gray-600">
                Form ID
              </label>
              <p className="mt-1 text-sm text-gray-900 font-semibold">
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {selectedLead.form_id}
                </code>
              </p>
            </div>
          )}

          {selectedLead.source && (
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-600">
                Source URL
              </label>
              <p className="mt-1 text-sm text-gray-900 font-semibold break-all">
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {selectedLead.source}
                </code>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {selectedLead.status === "updated"
                  ? "Latest submission location"
                  : "Submission location"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t sticky bottom-0 flex justify-end">
        <button
          onClick={() => {
            setShowViewModal(false);
            setSelectedLead(null);
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

export default LeadManagement;
