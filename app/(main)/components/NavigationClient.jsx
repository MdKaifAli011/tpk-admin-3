"use client";

import React from "react";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const NavigationClient = ({ prevNav, nextNav }) => {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* PREVIOUS */}
        {prevNav ? (
          <Link
            href={prevNav.url}
            title={prevNav.label}
            aria-label={`Previous: ${prevNav.label}`}
            className="group flex flex-col justify-center rounded-lg min-h-[56px] transition-all duration-200 w-full px-3.5 py-2.5 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200"
          >
            <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wide mb-1">
              Previous
            </span>

            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <FaChevronLeft className="text-indigo-600 group-hover:text-indigo-700 text-xs shrink-0 transition-colors duration-200" aria-hidden />
              <span className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-indigo-600 truncate min-w-0 flex-1 transition-colors duration-200 leading-snug" title={prevNav.label}>
                {prevNav.label}
              </span>
            </div>
          </Link>
        ) : (
          <div className="hidden md:block" />
        )}

        {/* NEXT */}
        {nextNav ? (
          <Link
            href={nextNav.url}
            title={nextNav.label}
            aria-label={`Next: ${nextNav.label}`}
            className="group flex flex-col justify-center rounded-lg min-h-[56px] transition-all duration-200 w-full px-3.5 py-2.5 overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-[0_2px_12px_rgba(100,70,200,0.2)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.3)] text-right items-end"
          >
            <span className="text-[10px] text-blue-100 font-semibold uppercase tracking-wide mb-1">
              Next
            </span>

            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden justify-end">
              <span className="text-xs sm:text-sm font-semibold text-white truncate min-w-0 flex-1 text-right leading-snug" title={nextNav.label}>
                {nextNav.label}
              </span>
              <FaChevronRight className="text-white text-xs shrink-0 group-hover:translate-x-0.5 transition-all duration-200" aria-hidden />
            </div>
          </Link>
        ) : (
          <div className="hidden md:block" />
        )}

      </div>
    </section>
  );
};

export default NavigationClient;
