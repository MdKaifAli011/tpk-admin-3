"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import LeadTable from "../table/LeadTable";
import {
  LoadingWrapper,
  SkeletonPageContent,
  LoadingSpinner,
} from "../ui/SkeletonLoader";
import { FaTimes, FaClipboardList, FaEye, FaLock, FaUnlock, FaDownload, FaFilter, FaSearch, FaEnvelope } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import { useRouter } from "next/navigation";
import { config } from "@/config/config";

const LEAD_ACCESS_STORAGE_KEY = "lead-management-access-verified";
const LEAD_ACCESS_PASSWORD =
  config.leadAccessPassword ||
  process.env.NEXT_PUBLIC_LEAD_ACCESS_PASSWORD ||
  "tpk-admin-pass";

// Highlight: United States, UAE, Oman, Qatar, Kuwait, Saudi Arabia (same as LeadTable)
const HIGHLIGHT_COUNTRIES_SET = new Set([
  "United States",
  "UAE",
  "Oman",
  "Qatar",
  "Kuwait",
  "Saudi Arabia",
]);
const isHighlightCountry = (country) =>
  country && HIGHLIGHT_COUNTRIES_SET.has(String(country).trim());

const PER_PAGE_OPTIONS = [10, 20, 50, 100, 1000];
const DEFAULT_LIMIT = 50;

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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const leadTableRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const paginationRef = useRef(null);
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

  // Pagination state (infinite scroll: page 1 loads first, scroll loads more pages)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
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

  // Fetch leads: replace (page 1) or append (next page on scroll)
  const fetchLeads = async (page = 1, limit = DEFAULT_LIMIT, append = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsDataLoading(true);
      }
      setError(null);

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (filterCountry) params.append("country", filterCountry);
      if (filterClassName) params.append("className", filterClassName);
      if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);
      if (filterSearch) params.append("search", filterSearch);
      if (filterDateFrom) params.append("dateFrom", filterDateFrom);
      if (filterDateTo) params.append("dateTo", filterDateTo);

      const response = await api.get(`/lead?${params.toString()}`);

      if (response.data?.success) {
        const data = response.data.data || [];
        const pag = response.data.pagination || {};
        if (append) {
          setLeads((prev) => [...prev, ...data]);
        } else {
          setLeads(data);
        }
        setPagination((prev) => ({
          ...prev,
          page: pag.page ?? page,
          limit: pag.limit ?? limit,
          total: pag.total ?? 0,
          totalPages: pag.totalPages ?? 0,
        }));
      } else {
        setError(response.data?.message || "Failed to fetch leads");
        if (!append) setLeads([]);
      }
    } catch (err) {
      console.error("❌ Error fetching leads:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch leads. Please check your connection.";
      setError(errorMessage);
      if (!append) setLeads([]);
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsDataLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  paginationRef.current = pagination;

  // Initial load and when filters or per-page limit change: fetch page 1 (replace)
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLeads(1, pagination.limit, false);
  }, [
    filterCountry,
    filterClassName,
    filterStatus,
    filterSearch,
    filterDateFrom,
    filterDateTo,
    pagination.limit,
  ]);

  // Infinite scroll: when sentinel is visible, load next page (append)
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;
    const pag = paginationRef.current;
    const hasMore = pag.totalPages > 0 && pag.page < pag.totalPages;
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        const { page, limit, totalPages } = paginationRef.current;
        if (page >= totalPages || isFetchingRef.current) return;
        fetchLeads(page + 1, limit, true);
      },
      { root: null, rootMargin: "400px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [leads.length, pagination.page, pagination.totalPages]);

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
        setPagination((prev) => ({ ...prev, page: 1 }));
        await fetchLeads(1, pagination.limit, false);
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
      <div className="bg-gradient-to-r from-slate-50 via-blue-50/80 to-indigo-50 rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <FaClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Lead Management
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Manage and organize leads, track performance across your educational platform.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table Card */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Leads List
                  {pagination.total > 0 && (
                    <span className="font-normal text-slate-500 ml-1">({pagination.total})</span>
                  )}
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  View and manage all submitted leads
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {selectedLeads.size > 0 && (
                  <>
                    <span className="text-sm font-semibold text-blue-600">
                      {selectedLeads.size} lead{selectedLeads.size !== 1 ? "s" : ""} selected
                    </span>
                    <div className="inline-flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => leadTableRef.current?.sendOnly(pagination.total)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                        title="Send CSV to configured email only"
                      >
                        <FaEnvelope className="w-4 h-4" />
                        Send
                      </button>
                      <button
                        type="button"
                        onClick={() => leadTableRef.current?.exportOnly()}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                        title="Download CSV file only"
                      >
                        <FaDownload className="w-4 h-4" />
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => leadTableRef.current?.exportAndSend(pagination.total)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                        title="Download CSV and send to email"
                      >
                        <FaDownload className="w-4 h-4" />
                        <FaEnvelope className="w-3.5 h-3.5" />
                        Export &amp; Send
                      </button>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showFilters
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  <FaFilter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className={`min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-xs font-semibold ${
                      showFilters ? "bg-white text-blue-600" : "bg-blue-100 text-blue-700"
                    }`}>
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
            {/* Top bar: count + per page (like YouTube/Instagram) */}
            {!isDataLoading && !error && leads.length > 0 && pagination.total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                <p className="text-sm text-slate-600">
                  {pagination.page >= pagination.totalPages ? (
                    <>Showing all <span className="font-medium text-slate-800">{pagination.total}</span> leads</>
                  ) : (
                    <>
                      <span className="font-medium text-slate-800">{leads.length}</span>
                      {" of "}
                      <span className="font-medium text-slate-800">{pagination.total}</span>
                      {" — scroll down for more"}
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <label htmlFor="lead-per-page" className="text-sm text-slate-600 whitespace-nowrap">Per page</label>
                  <select
                    id="lead-per-page"
                    value={pagination.limit}
                    onChange={(e) => {
                      setPagination((prev) => ({
                        ...prev,
                        limit: parseInt(e.target.value, 10),
                        page: 1,
                      }));
                    }}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white cursor-pointer"
                  >
                    {PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="px-4 sm:px-6 py-4 bg-slate-50/60 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <FaFilter className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Filter leads</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Search */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Search (Name, Email, or Phone)
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => {
                      setFilterSearch(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    placeholder="Search by name, email, or phone..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                <input
                  type="text"
                  value={filterCountry}
                  onChange={(e) => {
                    setFilterCountry(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  placeholder="Enter country..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Class Name</label>
                <input
                  type="text"
                  value={filterClassName}
                  onChange={(e) => {
                    setFilterClassName(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  placeholder="Enter class name..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="updated">Updated</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date To</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all"
                />
              </div>
            </div>

            {/* Active filters + Clear all */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
              {activeFilterCount > 0 ? (
                <>
                  <span className="text-xs font-medium text-slate-500">Active:</span>
                  {filterCountry && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200/60">
                      Country: {filterCountry}
                      <button type="button" onClick={() => { setFilterCountry(""); setPagination((p) => ({ ...p, page: 1 })); }} className="hover:bg-blue-200/60 rounded p-0.5 transition-colors" aria-label="Remove country filter"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterClassName && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200/60">
                      Class: {filterClassName}
                      <button type="button" onClick={() => { setFilterClassName(""); setPagination((p) => ({ ...p, page: 1 })); }} className="hover:bg-blue-200/60 rounded p-0.5 transition-colors" aria-label="Remove class filter"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterStatus && filterStatus !== "all" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200/60">
                      Status: {filterStatus}
                      <button type="button" onClick={() => { setFilterStatus("all"); setPagination((p) => ({ ...p, page: 1 })); }} className="hover:bg-blue-200/60 rounded p-0.5 transition-colors" aria-label="Remove status filter"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filterSearch && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200/60">
                      Search: {filterSearch}
                      <button type="button" onClick={() => { setFilterSearch(""); setPagination((p) => ({ ...p, page: 1 })); }} className="hover:bg-blue-200/60 rounded p-0.5 transition-colors" aria-label="Clear search"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  {(filterDateFrom || filterDateTo) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200/60">
                      Date: {filterDateFrom || "…"} – {filterDateTo || "…"}
                      <button type="button" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setPagination((p) => ({ ...p, page: 1 })); }} className="hover:bg-blue-200/60 rounded p-0.5 transition-colors" aria-label="Clear date filter"><FaTimes className="w-3 h-3" /></button>
                    </span>
                  )}
                  <button type="button" onClick={clearFilters} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors">
                    <FaTimes className="w-3 h-3" /> Clear all
                  </button>
                </>
              ) : (
                <p className="text-xs text-slate-500">No filters applied. Use the fields above to narrow results.</p>
              )}
            </div>
          </div>
        )}

        {/* Table Content */}
        <div>
          {isDataLoading ? (
            <div className="rounded-b-xl border-t border-slate-100 bg-slate-50/30 py-16 px-6">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                  <LoadingSpinner size="large" />
                </div>
                <p className="text-sm font-medium text-slate-700">Loading leads...</p>
                <p className="text-xs text-slate-500 mt-1">Fetching your data</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-b-xl border-t border-slate-100 bg-red-50/50 py-16 px-6">
              <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                  <FaClipboardList className="h-7 w-7 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Error loading leads</h3>
                <p className="text-sm text-slate-600 mb-5">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchLeads(1, pagination.limit, false)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-b-xl border-t border-slate-100 bg-slate-50/30 py-16 px-6">
              <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-200/80">
                  <FaClipboardList className="h-7 w-7 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No leads found</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {activeFilterCount > 0
                    ? "No leads match your current filters. Try adjusting or clearing filters."
                    : "Leads submitted from your forms will appear here. Share your forms to start collecting leads."}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <LeadTable
                ref={leadTableRef}
                leads={leads}
                onView={handleViewLead}
                onDelete={handleDeleteLead}
                selectedLeads={selectedLeads}
                onSelectionChange={setSelectedLeads}
                totalLeads={pagination.total}
                onExportEmailSent={(ok, msg) => {
                  if (ok) success("Export email sent to configured address.");
                  else showError(msg || "Failed to send export email.");
                }}
              />
              {/* Scroll sentinel: load more when near bottom (YouTube/Instagram style) */}
              {pagination.totalPages > 0 && pagination.page < pagination.totalPages && (
                <div
                  ref={loadMoreSentinelRef}
                  className="min-h-px flex items-center justify-center py-6"
                  aria-hidden="true"
                >
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <LoadingSpinner size="small" />
                      <span className="text-xs">Loading more…</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>


      {/* View Lead Modal */}
      {showViewModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 sticky top-0">
              <h2 className="text-lg font-semibold text-slate-900">Lead details</h2>
              <button
                type="button"
                onClick={() => { setShowViewModal(false); setSelectedLead(null); }}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/80 transition-colors"
                aria-label="Close"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Name</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedLead.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Email</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{selectedLead.email}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Country</label>
                  {isHighlightCountry(selectedLead.country) ? (
                    <span className="mt-1 inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-400/90 text-yellow-900 border border-yellow-500/60 shadow-sm">
                      {selectedLead.country}
                    </span>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-slate-900">{selectedLead.country}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Class Name</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedLead.className}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedLead.phoneNumber || <span className="text-slate-400 italic font-normal">Not provided</span>}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Status</label>
                  <span
                    className={`mt-1 inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                      selectedLead.status === "new"
                        ? "bg-blue-50 text-blue-700"
                        : selectedLead.status === "updated"
                          ? "bg-purple-50 text-purple-700"
                          : selectedLead.status === "contacted"
                            ? "bg-amber-50 text-amber-700"
                            : selectedLead.status === "converted"
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {selectedLead.status === "updated"
                      ? `Updated ${selectedLead.updateCount > 0 ? selectedLead.updateCount : 1}×`
                      : selectedLead.status || "new"}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {selectedLead.updatedAt && (selectedLead.status === "updated" || selectedLead.updateCount > 0) ? "Last updated" : "Date submitted"}
                  </label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedLead.updatedAt && (selectedLead.status === "updated" || selectedLead.updateCount > 0)
                      ? new Date(selectedLead.updatedAt).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : new Date(selectedLead.createdAt).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {selectedLead.updatedAt && (selectedLead.status === "updated" || selectedLead.updateCount > 0) && (
                    <p className="mt-1 text-xs text-slate-500">
                      Originally: {new Date(selectedLead.createdAt).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
                {selectedLead.form_id && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Form ID</label>
                    <p className="mt-1"><code className="text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded font-mono">{selectedLead.form_id}</code></p>
                  </div>
                )}
                {selectedLead.source && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Source URL</label>
                    <p className="mt-1 text-sm font-semibold text-slate-900 break-all">
                      <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{selectedLead.source}</code>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedLead.status === "updated" ? "Latest submission location" : "Submission location"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowViewModal(false); setSelectedLead(null); }}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
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
