"use client";

import React, { useState, useMemo, createContext, useContext } from "react";
import Link from "next/link";
import {
  FaFileAlt,
  FaSearch,
  FaCalendarAlt,
  FaChevronRight,
} from "react-icons/fa";
import Pagination from "@/components/shared/Pagination";
import { toTitleCase } from "@/utils/titleCase";

export const ExamPagesSearchContext = createContext(null);

const ExamPagesSearchInput = () => {
  const ctx = useContext(ExamPagesSearchContext);
  if (!ctx) return null;
  const { searchQuery, setSearchQuery } = ctx;
  return (
    <div className="relative w-full md:w-80 group">
      <div
        className="
          absolute -inset-px rounded-xl
          bg-linear-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          blur-md transition-opacity duration-300
        "
      />
      <div
        className="
          relative flex items-center
          bg-white/90 backdrop-blur-lg
          border border-gray-200
          rounded-xl shadow-sm
          transition-all duration-300
          group-hover:shadow-md
          group-focus-within:border-indigo-500
        "
      >
        <FaSearch
          className="
            ml-3 text-gray-400 text-xs
            transition-colors duration-300
            group-focus-within:text-indigo-600
          "
        />
        <input
          type="text"
          placeholder="Search page titles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="
            w-full h-10
            px-3 py-2
            text-xs text-gray-700
            bg-transparent
            placeholder:text-gray-400
            focus:outline-none
          "
        />
      </div>
    </div>
  );
};

function PageListRow({ page, examSlug }) {
  const displayTitle = page.title?.trim()
    ? toTitleCase(page.title)
    : "Untitled";
  const initial = (displayTitle || "?").charAt(0).toUpperCase();
  const href = `/${examSlug}/pages/${page.slug}`;

  return (
    <li>
      <Link
        href={href}
        className="
          group flex items-start gap-3 sm:gap-5
          px-4 py-4 sm:px-5 sm:py-4
          hover:bg-indigo-50/60
          transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/40
        "
      >
        <div
          className="
            shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl
            bg-linear-to-br from-indigo-100 to-purple-100
            flex items-center justify-center
            text-indigo-700 font-bold text-sm sm:text-base
            shadow-sm border border-indigo-100/80
            group-hover:scale-[1.02] transition-transform
          "
          aria-hidden
        >
          {initial}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors line-clamp-2">
              {displayTitle}
            </h2>
            <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-indigo-600/90 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100/80">
              Page
            </span>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed pr-2">
            {page.excerpt || "Open to read the full content."}
          </p>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 text-right">
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
            <FaCalendarAlt className="text-indigo-400 shrink-0 hidden sm:inline" />
            <span className="tabular-nums">{page.updatedLabel}</span>
          </span>
          <span
            className="
              inline-flex items-center justify-center
              w-8 h-8 rounded-lg
              bg-gray-50 text-gray-400 border border-gray-100
              group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600
              transition-colors
            "
            aria-hidden
          >
            <FaChevronRight className="text-[10px]" />
          </span>
        </div>
      </Link>
    </li>
  );
}

const ExamPagesListClient = ({ pages, examSlug, children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const q = searchQuery.toLowerCase().trim();
    return pages.filter((p) => {
      const title = (p.title || "").toLowerCase();
      const excerpt = (p.excerpt || "").toLowerCase();
      const slug = (p.slug || "").toLowerCase();
      return title.includes(q) || excerpt.includes(q) || slug.includes(q);
    });
  }, [pages, searchQuery]);

  const totalPages = Math.ceil(filteredPages.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filteredPages.slice(startIndex, startIndex + itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <ExamPagesSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div
        className="flex flex-col w-full min-w-0 exam-hub-min-h"
      >
        {children}

        <div className="flex-1 flex flex-col min-h-0 mt-4 sm:mt-5">
          {filteredPages.length === 0 ? (
            <div
              className="
                flex-1 flex flex-col items-center justify-center
                min-h-[min(420px,calc(100svh-var(--navbar-height,72px)-16rem))]
                rounded-xl border border-dashed border-gray-200 bg-gray-50/80
                px-6 py-12 text-center
              "
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border border-indigo-100/80">
                <FaFileAlt className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? "No results found" : "No pages yet"}
              </h3>
              <p className="text-sm text-gray-600 max-w-md leading-relaxed">
                {searchQuery
                  ? `No pages match "${searchQuery}". Try a different search.`
                  : "When administrators publish custom pages for this exam, they will appear here."}
              </p>
            </div>
          ) : (
            <>
              <div
                className="
                  flex-1 flex flex-col min-h-0
                  rounded-xl border border-gray-200/90 bg-white
                  shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                  overflow-hidden
                "
              >
                <ul className="divide-y divide-gray-100 list-none m-0 p-0">
                  {paginated.map((p) => (
                    <PageListRow key={p.id} page={p} examSlug={examSlug} />
                  ))}
                </ul>
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  showPrevNext={true}
                  maxVisible={5}
                />
              )}

              {searchQuery && (
                <p className="text-center text-sm text-gray-600 mt-3 sm:mt-4">
                  Found {filteredPages.length} result
                  {filteredPages.length !== 1 ? "s" : ""} for &quot;
                  {searchQuery}&quot;
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </ExamPagesSearchContext.Provider>
  );
};

export default ExamPagesListClient;
export { ExamPagesSearchInput };
