"use client";
import React, { useState, useMemo, useCallback, useImperativeHandle, forwardRef } from "react";
import { FaTrash, FaEye, FaLock, FaDownload, FaClipboardList } from "react-icons/fa";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";
import api from "@/lib/api";

// Helper function to construct full URL from path or return original URL
const getFullUrl = (source) => {
  if (!source) return null;

  // If it starts with "/", it's a path - construct full URL
  if (source.startsWith("/")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${source}`;
    }
    // Fallback for SSR - will be handled client-side
    return source;
  }

  // If it's already a full URL (starts with http:// or https://), return as is
  if (source.startsWith("http://") || source.startsWith("https://")) {
    return source;
  }

  // Otherwise, treat as path
  if (typeof window !== "undefined") {
    return `${window.location.origin}/${source}`;
  }
  return source;
};

// Highlight: United States, UAE, Oman, Qatar, Kuwait, Saudi Arabia (amber/gold row + badge)
const HIGHLIGHT_COUNTRIES = new Set([
  "United States",
  "UAE",
  "Oman",
  "Qatar",
  "Kuwait",
  "Saudi Arabia",
]);

const isHighlightCountry = (country) =>
  country && HIGHLIGHT_COUNTRIES.has(String(country).trim());

// Helper function to get display text for source
const getSourceDisplayText = (source) => {
  if (!source) return "N/A";

  // If it's a path with query parameters, show the full path with query
  if (source.startsWith("/")) {
    // Show full path including query parameters (e.g., /neet/biology?tab=practice&test=...)
    return source.length > 50
      ? source.substring(0, 50) + "..."
      : source;
  }

  // If it's a full URL, try to extract pathname with query
  try {
    const url = new URL(source);
    const pathWithQuery = url.pathname + url.search;
    return pathWithQuery.length > 50
      ? pathWithQuery.substring(0, 50) + "..."
      : pathWithQuery;
  } catch {
    // If URL parsing fails, show original (truncated if too long)
    return source.length > 50
      ? source.substring(0, 50) + "..."
      : source;
  }
};

const LeadTable = forwardRef(({ leads, onView, onDelete, selectedLeads: selectedLeadsProp, onSelectionChange, totalLeads: totalLeadsProp, onExportEmailSent, highlightedFormIds: highlightedFormIdsProp }, ref) => {
  const { canDelete, role } = usePermissions();
  const [internalSelected, setInternalSelected] = useState(new Set());
  const selectedLeads = selectedLeadsProp !== undefined ? selectedLeadsProp : internalSelected;
  const setSelectedLeads = onSelectionChange || setInternalSelected;
  const highlightedFormIds = highlightedFormIdsProp instanceof Set ? highlightedFormIdsProp : new Set(Array.isArray(highlightedFormIdsProp) ? highlightedFormIdsProp : []);

  const isHighlightFormId = (formId) => formId && highlightedFormIds.has(String(formId).trim());

  // Helper function to get the display date (updatedAt if updated, otherwise createdAt)
  const getDisplayDate = (lead) => {
    // If lead has been updated, show updatedAt, otherwise show createdAt
    if (lead.updatedAt && (lead.status === "updated" || lead.updateCount > 0)) {
      return lead.updatedAt;
    }
    return lead.createdAt;
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper function to format date for mobile (shorter)
  const formatDateShort = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Build CSV content for selected leads. Returns { csvWithBOM, exportCount, totalLeads } or null.
  const buildCSVPayload = useCallback((totalLeadsFromParent) => {
    if (selectedLeads.size === 0) return null;
    const selectedLeadData = leads.filter((lead) => selectedLeads.has(lead._id || lead.id));
    const exportCount = selectedLeadData.length;
    const totalLeads = totalLeadsFromParent != null ? Number(totalLeadsFromParent) : leads.length;

    const headers = ["Date", "Country", "Name", "Email", "Class", "Prepare", "Form ID", "Phone", "Source", "Status", "Update Count"];

    const formatCSVField = (field) => {
      const s = String(field || "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const formatPhoneNumberForCSV = (phone) => {
      if (!phone) return "";
      const phoneStr = String(phone).trim();
      return phoneStr.startsWith("+") ? `"\t${phoneStr.replace(/"/g, '""')}"` : `" ${phoneStr.replace(/"/g, '""')}"`;
    };

    const csvRows = selectedLeadData.map((lead) => {
      const displayDate = getDisplayDate(lead);
      const date = displayDate ? new Date(displayDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A";
      const phoneNumber = lead.phoneNumber ? String(lead.phoneNumber).trim() : "";
      return [
        formatCSVField(date),
        formatCSVField(lead.country || ""),
        formatCSVField(lead.name || ""),
        formatCSVField(lead.email || ""),
        formatCSVField(lead.className || ""),
        formatCSVField(lead.prepared || ""),
        formatCSVField(lead.form_id || lead.form_name || ""),
        formatPhoneNumberForCSV(phoneNumber),
        formatCSVField(lead.source || ""),
        formatCSVField(lead.status || "new"),
        formatCSVField(lead.updateCount || 0),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const csvWithBOM = "\uFEFF" + csvContent;
    return { csvWithBOM, exportCount, totalLeads };
  }, [leads, selectedLeads]);

  const triggerDownload = useCallback((csvWithBOM) => {
    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const sendExportEmail = useCallback((csvWithBOM, exportCount, totalLeads) => {
    if (!onExportEmailSent) return Promise.resolve(true);
    return api
      .post("/lead/send-export", { csvContent: csvWithBOM, exportCount, totalLeads })
      .then(() => {
        onExportEmailSent(true);
        return true;
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Failed to send email";
        onExportEmailSent(false, msg);
        return false;
      });
  }, [onExportEmailSent]);

  // Export only: download CSV, no email
  const exportOnly = useCallback(() => {
    const payload = buildCSVPayload(leads.length);
    if (!payload) {
      alert("Please select at least one lead to export.");
      return;
    }
    triggerDownload(payload.csvWithBOM);
    setSelectedLeads(new Set());
  }, [buildCSVPayload, triggerDownload, leads.length, setSelectedLeads]);

  // Send only: email CSV to configured address, no download
  const sendOnly = useCallback((totalLeadsFromParent) => {
    const payload = buildCSVPayload(totalLeadsFromParent);
    if (!payload) {
      alert("Please select at least one lead to send.");
      return;
    }
    sendExportEmail(payload.csvWithBOM, payload.exportCount, payload.totalLeads).then((ok) => {
      if (ok) setSelectedLeads(new Set());
    });
  }, [buildCSVPayload, sendExportEmail, setSelectedLeads]);

  // Export & Send: download CSV and send email
  const exportAndSend = useCallback((totalLeadsFromParent) => {
    const payload = buildCSVPayload(totalLeadsFromParent);
    if (!payload) {
      alert("Please select at least one lead to export and send.");
      return;
    }
    triggerDownload(payload.csvWithBOM);
    sendExportEmail(payload.csvWithBOM, payload.exportCount, payload.totalLeads).then((ok) => {
      if (ok) setSelectedLeads(new Set());
    });
  }, [buildCSVPayload, triggerDownload, sendExportEmail, setSelectedLeads]);

  useImperativeHandle(ref, () => ({ exportOnly, sendOnly, exportAndSend }), [exportOnly, sendOnly, exportAndSend]);

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(leads.map((lead) => lead._id || lead.id));
      setSelectedLeads(allIds);
    } else {
      setSelectedLeads(new Set());
    }
  };

  // Handle individual selection
  const handleSelectLead = (leadId) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  // Check if all leads are selected
  const allSelected = useMemo(() => {
    if (leads.length === 0) return false;
    return leads.every((lead) => selectedLeads.has(lead._id || lead.id));
  }, [leads, selectedLeads]);

  // Check if some leads are selected
  const someSelected = useMemo(() => {
    return selectedLeads.size > 0 && selectedLeads.size < leads.length;
  }, [selectedLeads, leads]);

  // Helper function to get status badge color with compact styling
  const getStatusBadge = (status, updateCount = 0) => {
    const statusConfig = {
      new: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        label: "New",
      },
      updated: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        label: updateCount > 0 ? `Updated ${updateCount}x` : "Updated",
      },
      contacted: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        label: "Contacted",
      },
      converted: {
        bg: "bg-green-50",
        text: "text-green-700",
        label: "Converted",
      },
      archived: {
        bg: "bg-gray-50",
        text: "text-gray-700",
        label: "Archived",
      },
    };
    const config = statusConfig[status] || statusConfig.new;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
        {config.label}
      </span>
    );
  };

  if (!leads || leads.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 py-16 px-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-200/80">
          <FaClipboardList className="h-7 w-7 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No leads yet
        </h3>
        <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
          Leads submitted from your forms will appear here. Share your forms to start collecting leads.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-b-lg">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto -mx-px">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Country</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Class</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Prepare</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Form ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {leads.map((lead, index) => {
              const leadId = lead._id || lead.id;
              const isSelected = selectedLeads.has(leadId);
              const isHighlightRow = isHighlightCountry(lead.country);

              return (
                <tr
                  key={leadId || index}
                  onClick={() => handleSelectLead(leadId)}
                  className={`transition-all duration-150 cursor-pointer select-none ${
                    isSelected
                      ? isHighlightRow
                        ? "bg-green-400 hover:bg-green-200"
                        : "bg-green-400 hover:bg-green-200"
                      : isHighlightRow
                        ? "bg-yellow-400/80 hover:bg-green-100"
                        : "bg-white hover:bg-gray-50/80"
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectLead(leadId)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <time
                      className="text-sm text-slate-600"
                      dateTime={getDisplayDate(lead)}
                      title={
                        lead.updatedAt && (lead.status === "updated" || lead.updateCount > 0)
                          ? `Last updated: ${formatDate(lead.updatedAt)}`
                          : `Created: ${formatDate(lead.createdAt)}`
                      }
                    >
                      {formatDate(getDisplayDate(lead))}
                    </time>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {lead.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isHighlightRow ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-400/90 text-yellow-900 border border-yellow-500/60 shadow-sm">
                        {lead.country}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600">
                        {lead.country}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <a
                      href={`mailto:${lead.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors truncate max-w-[200px]"
                      title={lead.email}
                    >
                      {lead.email}
                    </a>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                      {lead.className}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {lead.prepared ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                        {lead.prepared}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">N/A</span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {lead.form_id || lead.form_name ? (
                      <code
                        className={`text-xs px-2 py-1 rounded font-mono ${
                          isHighlightFormId(lead.form_id || lead.form_name)
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {lead.form_id || lead.form_name || "N/A"}
                      </code>
                    ) : (
                      <span className="text-sm text-gray-400 italic">N/A</span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {lead.phoneNumber ? (
                      <a
                        href={`tel:${String(lead.phoneNumber).trim()}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {String(lead.phoneNumber).trim()}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400 italic">N/A</span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {lead.source ? (
                      <a
                        href={getFullUrl(lead.source) || lead.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-blue-600 hover:text-blue-800 transition-colors truncate max-w-[250px]"
                        title={getFullUrl(lead.source) || lead.source}
                      >
                        <span className="truncate">
                          {getSourceDisplayText(lead.source)}
                        </span>
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400 italic">N/A</span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {getStatusBadge(
                      lead.status || "new",
                      lead.updateCount || 0
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {onView && (
                        <button
                          type="button"
                          onClick={() => onView(lead)}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                          title="View Lead Details"
                        >
                          <FaEye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete &&
                        (canDelete ? (
                          <button
                            type="button"
                            onClick={() => onDelete(lead)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100 border border-red-200/60"
                            title="Delete Lead"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title={getPermissionMessage("delete", role)}
                            className="p-2 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed"
                          >
                            <FaLock className="w-4 h-4" />
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet View */}
      <div className="md:hidden space-y-2">
        {leads.map((lead, index) => {
          const leadId = lead._id || lead.id;
          const isSelected = selectedLeads.has(leadId);
          const isHighlightRow = isHighlightCountry(lead.country);

          return (
            <div
              key={leadId || index}
              onClick={() => handleSelectLead(leadId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelectLead(leadId);
                }
              }}
              className={`rounded-lg p-3 shadow-sm border-l-4 cursor-pointer select-none ${
                isSelected
                  ? isHighlightRow
                    ? "border-l-yellow-500 border border-yellow-400 bg-yellow-400"
                    : "border-l-blue-500 border border-blue-200 bg-blue-50"
                  : isHighlightRow
                    ? "border-l-yellow-400 border border-yellow-200 bg-yellow-50"
                    : "border border-gray-200 bg-white"
              }`}
            >
              {/* Header Section */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectLead(leadId)}
                    className="w-4 h-4 text-yellow-600 bg-white border-gray-300 rounded focus:ring-yellow-500 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5 truncate">
                      {lead.name}
                    </h3>
                    <a
                      href={`mailto:${lead.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gray-500 hover:text-blue-600 transition-colors truncate block"
                    >
                      {lead.email}
                    </a>
                  </div>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(lead.status || "new", lead.updateCount || 0)}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <div className="text-xs text-gray-500">
                    {lead.updatedAt && (lead.status === "updated" || lead.updateCount > 0)
                      ? "Last Updated"
                      : "Date"}
                  </div>
                  <time
                    className="text-sm font-medium text-gray-900"
                    dateTime={getDisplayDate(lead)}
                    title={
                      lead.updatedAt && (lead.status === "updated" || lead.updateCount > 0)
                        ? `Last updated: ${formatDate(lead.updatedAt)}`
                        : `Created: ${formatDate(lead.createdAt)}`
                    }
                  >
                    {formatDateShort(getDisplayDate(lead))}
                  </time>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Country</div>
                  {isHighlightRow ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold bg-yellow-400 text-yellow-900 border border-yellow-500 shadow-sm truncate max-w-full">
                      {lead.country}
                    </span>
                  ) : (
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {lead.country}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Class</div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    {lead.className}
                  </span>
                </div>
                {lead.prepared && (
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Prepare</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                      {lead.prepared}
                    </span>
                  </div>
                )}
                {(lead.form_id || lead.form_name) && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-0.5">Form ID</div>
                    <code
                      className={`text-xs px-2 py-1 rounded font-mono block w-fit ${
                        isHighlightFormId(lead.form_id || lead.form_name)
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {lead.form_id || lead.form_name}
                    </code>
                  </div>
                )}
                {lead.phoneNumber && (
                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <a
                      href={`tel:${String(lead.phoneNumber).trim()}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {String(lead.phoneNumber).trim()}
                    </a>
                  </div>
                )}
                {lead.source && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-0.5">Source</div>
                    <a
                      href={getFullUrl(lead.source) || lead.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors truncate block"
                      title={getFullUrl(lead.source) || lead.source}
                    >
                      <span className="truncate">
                        {getSourceDisplayText(lead.source)}
                      </span>
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                {onView && (
                  <button
                    type="button"
                    onClick={() => onView(lead)}
                    className="flex-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100 text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <FaEye className="w-3.5 h-3.5" />
                    View
                  </button>
                )}
                {onDelete &&
                  (canDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(lead)}
                      className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100 text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <FaTrash className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={getPermissionMessage("delete", role)}
                      className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <FaLock className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

LeadTable.displayName = "LeadTable";

export default LeadTable;
