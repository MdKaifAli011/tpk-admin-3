"use client";

import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { ADMIN_PAGINATION } from "@/constants";

/**
 * Reusable pagination bar for admin list pages.
 * Shows: "Showing X–Y of Z", Per page select (50/100/500/1000), Prev/Next, "Page N of M".
 */
export default function PaginationBar({
  page,
  limit,
  total,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onLimitChange,
}) {
  if ((totalPages ?? 0) <= 0 && (total ?? 0) <= 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total ?? 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Showing {from}–{to} of {total ?? 0}
        </span>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Per page
          <select
            value={limit}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {ADMIN_PAGINATION.PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange?.(page - 1)}
          disabled={!hasPrevPage}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <FaChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 whitespace-nowrap">
          Page {page} of {totalPages || 1}
        </span>
        <button
          type="button"
          onClick={() => onPageChange?.(page + 1)}
          disabled={!hasNextPage}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <FaChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
