"use client";

import React from "react";
import Link from "next/link";
import { FaTrophy } from "react-icons/fa";

export default function ResultYearsList({ examName, examSlug, years }) {
  if (!years || years.length === 0) {
    return (
      <div className="rounded-xl p-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-indigo-900 mb-2">{examName} Results</h1>
        <p className="text-gray-600">No result years published yet. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6 sm:p-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)]">
      <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900 mb-2 flex items-center gap-2">
        <FaTrophy className="text-amber-500" />
        {examName} Results
      </h1>
      <p className="text-gray-600 text-sm sm:text-base mb-6">
        Select a year to view results, toppers, target achievers, and testimonials.
      </p>
      <div className="flex flex-wrap gap-3">
        {years.map((y) => (
          <Link
            key={y}
            href={`/${examSlug}/result/${y}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-800 font-medium hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors shadow-sm"
          >
            {examName} Result {y}
          </Link>
        ))}
      </div>
    </div>
  );
}
