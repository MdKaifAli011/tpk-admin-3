"use client";

import React, { useEffect, useRef } from "react";
import ChapterProgressItem from "./ChapterProgressItem";
import { useProgress } from "../hooks/useProgress";
import { createSlug as createSlugUtil } from "@/utils/slug";

const ChaptersListClient = ({
  chapters,
  unitId,
  examSlug,
  subjectSlug,
  unitSlug,
  examName,
  onUnitProgressChange,
  practiceDisabled = false,
}) => {
  const {
    chaptersProgress,
    unitProgress,
    updateChapterProgress,
    markAsDone,
    resetChapterProgress,
    getChapterProgress,
  } = useProgress(unitId, chapters);

  // Notify parent component when unit progress changes
  // Use ref to store callback to avoid dependency issues
  const onUnitProgressChangeRef = useRef(onUnitProgressChange);

  useEffect(() => {
    onUnitProgressChangeRef.current = onUnitProgressChange;
  }, [onUnitProgressChange]);

  useEffect(() => {
    if (onUnitProgressChangeRef.current) {
      try {
        onUnitProgressChangeRef.current(unitProgress);
      } catch (error) {
        console.error("Error in onUnitProgressChange callback:", error);
      }
    }
  }, [unitProgress]); // Removed onUnitProgressChange from dependencies

  if (chapters.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900 sm:text-base mb-1">
          No chapters available
        </p>
        <p className="text-xs text-gray-500 sm:text-sm">
          Chapters will appear here once they are added to this unit.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {chapters.map((chapter, index) => {
        const chapterSlug = chapter.slug || createSlugUtil(chapter.name);
        const chapterProgressData = getChapterProgress(chapter._id) || { progress: 0, isCompleted: false };
        const chapterUrl = `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}`;

        return (
          <ChapterProgressItem
            key={chapter._id}
            chapter={chapter}
            index={index}
            href={chapterUrl}
            unitId={unitId}
            examName={examName}
            progress={chapterProgressData.progress}
            isCompleted={chapterProgressData.isCompleted}
            onProgressChange={updateChapterProgress}
            onMarkAsDone={markAsDone}
            onReset={resetChapterProgress}
            practiceDisabled={practiceDisabled}
          />
        );
      })}
    </div>
  );
};

export default ChaptersListClient;
