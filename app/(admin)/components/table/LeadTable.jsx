"use client";
import React, { useState, useMemo } from "react";
import { FaTrash, FaEye, FaLock, FaDownload } from "react-icons/fa";
import {
  usePermissions,
  getPermissionMessage,
} from "../../hooks/usePermissions";

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

const LeadTable = ({ leads, onView, onDelete }) => {
  const { canDelete, role } = usePermissions();
  const [selectedLeads, setSelectedLeads] = useState(new Set());

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

  // Helper function to export selected leads to CSV
  const exportToCSV = () => {
    if (selectedLeads.size === 0) {
      alert("Please select at least one lead to export.");
      return;
    }

    // Filter selected leads
    const selectedLeadData = leads.filter((lead) =>
      selectedLeads.has(lead._id || lead.id)
    );

    // CSV headers
    const headers = [
      "Date",
      "Country",
      "Name",
      "Email",
      "Class",
      "Prepare",
      "Form ID",
      "Phone",
      "Source",
      "Status",
      "Update Count",
    ];

    // Convert leads to CSV rows
    const csvRows = selectedLeadData.map((lead) => {
      // Use updatedAt if lead has been updated, otherwise use createdAt
      const displayDate = getDisplayDate(lead);
      const date = displayDate
        ? new Date(displayDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";

      // Ensure phone number is consistently formatted (same as table display)
      const phoneNumber = lead.phoneNumber ? String(lead.phoneNumber).trim() : "";

      // Helper function to format CSV field
      const formatCSVField = (field, isPhoneNumber = false) => {
        const stringField = String(field || "");
        // Escape commas, quotes, and newlines
        if (stringField.includes(",") || stringField.includes('"') || stringField.includes("\n")) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };

      // Format phone number specifically for Excel (force as text to prevent scientific notation)
      const formatPhoneNumberForCSV = (phone) => {
        if (!phone) return "";
        let phoneStr = String(phone).trim();
        
        // Excel converts large numbers to scientific notation even when quoted
        // Solution: Ensure phone number always starts with a character Excel recognizes as text
        // If it starts with +, that's good. But add a space prefix to be 100% sure Excel treats it as text
        // Format: " +201234567891" - the leading space forces Excel to treat as text
        // This ensures phone numbers display exactly as shown in the table (space will be minimal/ignored)
        
        // Ensure it starts with +, and if not, add space prefix to force text mode
        if (phoneStr.startsWith("+")) {
          // Already has +, but add invisible tab to absolutely prevent conversion
          // Tab is invisible in Excel but forces text interpretation
          return `"\t${phoneStr.replace(/"/g, '""')}"`;
        } else {
          // No + prefix, add space to force text mode
          return `" ${phoneStr.replace(/"/g, '""')}"`;
        }
      };

      return [
        formatCSVField(date),
        formatCSVField(lead.country || ""),
        formatCSVField(lead.name || ""),
        formatCSVField(lead.email || ""),
        formatCSVField(lead.className || ""),
        formatCSVField(lead.prepared || ""),
        formatCSVField(lead.form_id || lead.form_name || ""),
        formatPhoneNumberForCSV(phoneNumber), // Force phone number as text using Excel formula
        formatCSVField(lead.source || ""),
        formatCSVField(lead.status || "new"),
        formatCSVField(lead.updateCount || 0),
      ].join(",");
    });

    // Combine headers and rows
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    // Add UTF-8 BOM for Excel compatibility (ensures phone numbers and special characters display correctly)
    const BOM = "\uFEFF";
    const csvWithBOM = BOM + csvContent;

    // Create blob and download
    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `leads_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clear selection after export
    setSelectedLeads(new Set());
  };

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
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          No Leads Found
        </h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Leads submitted from the frontend will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Export Button */}
      {selectedLeads.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm text-blue-900 font-medium">
            {selectedLeads.size} lead{selectedLeads.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FaDownload className="w-4 h-4" />
            Export to CSV
          </button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Country
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prepare
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Form ID
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead, index) => {
              const leadId = lead._id || lead.id;
              const isSelected = selectedLeads.has(leadId);

              return (
                <tr
                  key={leadId || index}
                  className={`hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectLead(leadId)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <time
                      className="text-sm text-gray-500"
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
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {lead.country}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {lead.name}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <a
                      href={`mailto:${lead.email}`}
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
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
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
                  <td className="px-2 py-2 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onView && (
                        <button
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
                            onClick={() => onDelete(lead)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                            title="Delete Lead"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            disabled
                            title={getPermissionMessage("delete", role)}
                            className="p-1.5 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                          >
                            <FaLock className="w-3.5 h-3.5" />
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

          return (
            <div
              key={leadId || index}
              className={`bg-white border rounded-lg p-3 shadow-sm ${
                isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
            >
              {/* Header Section */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectLead(leadId)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5 truncate">
                      {lead.name}
                    </h3>
                    <a
                      href={`mailto:${lead.email}`}
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
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {lead.country}
                  </div>
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
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono block w-fit">
                      {lead.form_id || lead.form_name}
                    </code>
                  </div>
                )}
                {lead.phoneNumber && (
                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <a
                      href={`tel:${String(lead.phoneNumber).trim()}`}
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
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                {onView && (
                  <button
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
                      onClick={() => onDelete(lead)}
                      className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100 text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <FaTrash className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  ) : (
                    <button
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
};

export default LeadTable;
