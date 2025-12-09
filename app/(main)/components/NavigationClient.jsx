"use client";

import React from "react";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const base =
  "group flex flex-col justify-center rounded-lg min-h-[58px] transition-all duration-200 w-full p-2.5 sm:p-3 overflow-hidden";

const NavigationClient = ({ prevNav, nextNav }) => {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

        {/* PREVIOUS */}
        {prevNav ? (
          <Link
            href={prevNav.url}
            title={prevNav.label}
            className={`${base}
              bg-indigo-50 border border-indigo-200 
              hover:bg-indigo-100 hover:border-indigo-300
              shadow-sm hover:shadow`}
          >
            <span className="text-[9px] sm:text-xs text-indigo-500 font-semibold uppercase">
              Previous
            </span>

            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <FaChevronLeft className="text-indigo-600 group-hover:text-indigo-700 text-xs sm:text-sm shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-indigo-700 truncate min-w-0 flex-1" title={prevNav.label}>
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
            className={`${base}
              bg-gradient-to-r from-blue-600 to-indigo-600
              hover:from-blue-700 hover:to-indigo-700
              text-white shadow-md hover:shadow-lg items-end`}
          >
            <span className="text-[9px] sm:text-xs text-blue-100 font-semibold uppercase">
              Next
            </span>

            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <span className="text-xs sm:text-sm font-semibold truncate min-w-0 flex-1" title={nextNav.label}>
                {nextNav.label}
              </span>
              <FaChevronRight className="text-white text-xs sm:text-sm shrink-0" />
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
