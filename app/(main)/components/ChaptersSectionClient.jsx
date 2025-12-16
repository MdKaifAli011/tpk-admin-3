"use client";

import React from "react";
import ChaptersListClient from "./ChaptersListClient";

const ChaptersSectionClient = ({
  chapters,
  unitId,
  examSlug,
  subjectSlug,
  unitSlug,
  examName,
  subjectName,
  unitName,
  onUnitProgressChange,
}) => {
  return (
    <section className="bg-transparent">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100  bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          <div className="flex items-start gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {examName} &gt; {subjectName} &gt; {unitName} Chapters
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Review your status and progress for each chapter in this unit.
                Use the slider to set progress or click "Mark as Done" to
                complete.
              </p>
            </div>
          </div>
          <div className="mt-3 hidden sm:grid sm:grid-cols-[minmax(0,1fr)_140px_180px] gap-6 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span className="text-left">Chapter</span>
            <span className="text-center">Status</span>
            <span className="text-center">Progress</span>
          </div>
        </div>

        <ChaptersListClient
          chapters={chapters}
          unitId={unitId}
          examSlug={examSlug}
          subjectSlug={subjectSlug}
          unitSlug={unitSlug}
          examName={examName}
          onUnitProgressChange={onUnitProgressChange}
        />
      </div>
    </section>
  );
};

export default ChaptersSectionClient;
