"use client";

import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const DEFAULT_SIZES = [10, 50, 100];

/**
 * Per-page size + prev/next for admin download folder / subfolder / file lists.
 */
export default function DownloadListPagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_SIZES,
  loading = false,
  itemLabel = "items",
  className = "",
  prevLabel = "Previous",
  nextLabel = "Next",
  /** Optional: short note above controls (e.g. how paging works) */
  hint = null,
}) {
  const total = Number(totalItems) || 0;
  const size = Number(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const canPrev = safePage > 1 && !loading;
  const canNext = safePage < totalPages && !loading;
  const from = total === 0 ? 0 : (safePage - 1) * size + 1;
  const to = Math.min(safePage * size, total);

  return (
    <div
      className={`flex flex-col gap-2 pt-4 mt-4 border-t border-gray-200 ${className}`}
    >
      {hint ? (
        <p className="text-xs text-gray-500 order-first sm:order-none">{hint}</p>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <label className="whitespace-nowrap font-medium text-gray-600">Per page</label>
        <select
          value={size}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={loading}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="text-gray-500 text-xs sm:text-sm">
          {total > 0 ? (
            <>
              Showing {from}–{to} of {total} {itemLabel}
            </>
          ) : (
            <>No {itemLabel}</>
          )}
        </span>
      </div>
      <div className="flex items-center justify-center sm:justify-end gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canPrev}
          title="Load the previous page of results"
          aria-label="Previous page"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FaChevronLeft className="w-3 h-3" aria-hidden />
          {prevLabel}
        </button>
        <span className="text-sm text-gray-600 tabular-nums px-1 min-w-[7rem] text-center">
          Page {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canNext}
          title="Load the next page of results"
          aria-label="Next page"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {nextLabel}
          <FaChevronRight className="w-3 h-3" aria-hidden />
        </button>
      </div>
      </div>
    </div>
  );
}
