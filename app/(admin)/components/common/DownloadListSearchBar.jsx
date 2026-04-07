"use client";

import React from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

/**
 * Search field + Search / Clear for admin download lists.
 * variant="toolbar" = no card; single row for page headers (before primary action).
 */
export default function DownloadListSearchBar({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = "Search…",
  loading = false,
  disabled = false,
  className = "",
  inputId = "download-list-search",
  activeQuery = "",
  /** "default" | "toolbar" — toolbar has no background box, compact controls */
  variant = "default",
  label = "",
  /** aria-label for the input when label is hidden (toolbar) */
  inputAriaLabel = "Search",
}) {
  const trimmed = String(value || "").trim();
  const applied = String(activeQuery || "").trim();
  const showClear = Boolean(onClear && (trimmed || applied));
  const isToolbar = variant === "toolbar";

  const inner = (
    <>
      {!isToolbar && label ? (
        <p className="text-sm font-medium text-gray-800">{label}</p>
      ) : null}
      <div
        className={
          isToolbar
            ? "flex flex-row items-stretch gap-2 w-full min-w-0"
            : "flex flex-col sm:flex-row gap-2 sm:items-center"
        }
      >
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          value={value}
          aria-label={isToolbar ? inputAriaLabel : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSearch();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={
            isToolbar
              ? "flex-1 min-w-0 min-h-[2.25rem] px-3 py-1.5 border border-gray-300/90 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0056FF]/30 focus:border-[#0056FF] disabled:opacity-60 disabled:cursor-not-allowed"
              : "flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
          }
        />
        <div
          className={
            isToolbar
              ? "flex items-stretch gap-1.5 shrink-0"
              : "flex flex-wrap gap-2 shrink-0"
          }
        >
          <button
            type="button"
            onClick={onSearch}
            disabled={disabled || loading}
            title="Search"
            className={
              isToolbar
                ? "inline-flex items-center justify-center gap-1.5 px-3 min-h-[2.25rem] text-xs font-semibold text-white bg-[#0056FF] hover:bg-[#0044CC] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                : "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0056FF] hover:bg-[#0044CC] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            }
          >
            <FaSearch className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span className={isToolbar ? "hidden sm:inline" : ""}>Search</span>
          </button>
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled || loading}
              title="Clear search"
              className={
                isToolbar
                  ? "inline-flex items-center justify-center gap-1 px-2.5 min-h-[2.25rem] text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  : "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
              }
            >
              <FaTimes className="w-3.5 h-3.5" aria-hidden />
              {!isToolbar && <span>Clear</span>}
            </button>
          )}
        </div>
      </div>
      {!isToolbar && applied ? (
        <p className="text-xs text-gray-500">
          Active filter:{" "}
          <span className="font-medium text-gray-800">&quot;{applied}&quot;</span>
        </p>
      ) : null}
    </>
  );

  if (isToolbar) {
    return (
      <div
        className={`flex flex-col gap-1.5 min-w-0 ${className}`}
        role="search"
        aria-label={inputAriaLabel}
      >
        {inner}
        {applied ? (
          <p className="text-[11px] text-gray-600 leading-tight pl-0.5">
            Filter: <span className="font-medium text-gray-800">&quot;{applied}&quot;</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      role="search"
      aria-label="Search list"
    >
      {inner}
    </div>
  );
}
