"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { FaChevronDown, FaChevronRight, FaEye } from "react-icons/fa";
import { useProgress } from "../hooks/useProgress";
import ChapterProgressItem from "./ChapterProgressItem";
import { createSlug } from "../lib/api";

const ROW_COLORS = [
  "bg-blue-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-indigo-500",
  "bg-pink-500",
];

function getStatusBadge(progress, isCompleted) {
  if (isCompleted)
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-tighter shadow-sm">
        Done
      </span>
    );
  if (progress >= 50)
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-tighter ring-1 ring-blue-200 shadow-sm">
        Reviewing
      </span>
    );
  if (progress > 0)
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 uppercase tracking-tighter border border-amber-100 shadow-sm">
        In Progress
      </span>
    );
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-tighter shadow-sm">
      Not Started
    </span>
  );
}

function UnitRowExpandable({
  unit,
  index,
  examSlug,
  subjectSlug,
  examName,
  subjectName,
  isExpanded,
  onToggle,
  onUnitProgress,
  practiceDisabled = false,
}) {
  const {
    unitProgress,
    getChapterProgress,
    updateChapterProgress,
    markAsDone,
    resetChapterProgress,
  } = useProgress(unit._id, unit.chapters || []);

  const unitSlugValue = unit.slug || createSlug(unit.name);
  const unitUrl = examSlug && subjectSlug ? `/${examSlug}/${subjectSlug}/${unitSlugValue}` : null;
  const progressPercent = Math.min(100, Math.max(0, Math.round(unitProgress)));
  const isCompleted = progressPercent >= 100;
  const barColor = progressPercent >= 100 ? "bg-emerald-500" : ROW_COLORS[index % ROW_COLORS.length];

  useEffect(() => {
    if (onUnitProgress) onUnitProgress(unit._id, progressPercent);
  }, [unit._id, progressPercent, onUnitProgress]);

  const weightage = unit.weightage ?? "—";
  const engagement = unit.engagement ?? "—";

  return (
    <div
      className={
        isExpanded
          ? "bg-blue-50/80 ring-1 ring-inset ring-blue-200/80"
          : "group cursor-pointer hover:bg-slate-50/80 transition-colors"
      }
    >
      <div
        className="grid grid-cols-12 gap-4 px-4 sm:px-6 py-5 items-center border-b border-slate-200/80"
        onClick={() => !isExpanded && onToggle(unit._id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(unit._id);
          }
        }}
      >
        <div className="col-span-6 md:col-span-8 flex items-start space-x-4">
          <div className={`w-1 self-stretch ${ROW_COLORS[index % ROW_COLORS.length]} rounded-full shrink-0`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {unitUrl ? (
                <Link href={unitUrl} onClick={(e) => e.stopPropagation()} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                  {unit.name}
                </Link>
              ) : (
                <span className="font-semibold text-slate-900">{unit.name}</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(unit._id);
                }}
                className="text-slate-400 hover:text-blue-600 p-0.5"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <FaChevronDown className="text-lg text-blue-600" />
                ) : (
                  <FaChevronRight className="text-lg" />
                )}
              </button>
            </div>
            <div className="flex items-center space-x-4 mt-1 text-xs">
              <span className="text-emerald-600 font-medium">
                Weightage: {weightage}
              </span>
              {engagement !== "—" && (
                <span className="flex items-center text-slate-400">
                  <FaEye className="text-[14px] mr-1" />
                  {engagement}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="col-span-3 md:col-span-2 flex justify-center">
          {getStatusBadge(progressPercent, isCompleted)}
        </div>
        <div className="col-span-3 md:col-span-2 flex items-center justify-end space-x-3">
          <div className="hidden sm:block w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span
            className={`text-sm font-bold min-w-10 text-right ${isCompleted ? "text-emerald-700" : "text-slate-700"
              }`}
          >
            {progressPercent}%
          </span>
        </div>
      </div>

      {isExpanded && unit.chapters && unit.chapters.length > 0 && (
        <div className="px-4 sm:px-6 py-6 bg-slate-50/90 border-t border-blue-200/80">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Chapters in this unit
          </div>
          <div className="divide-y divide-slate-200">
            {unit.chapters.map((chapter, chIndex) => {
              const chapterSlug = chapter.slug || createSlug(chapter.name);
              const chapterUrl = `/${examSlug}/${subjectSlug}/${unitSlugValue}/${chapterSlug}`;
              const chProgress = getChapterProgress(chapter._id) || {
                progress: 0,
                isCompleted: false,
              };
              return (
                <ChapterProgressItem
                  key={chapter._id}
                  chapter={chapter}
                  index={chIndex}
                  href={chapterUrl}
                  unitId={unit._id}
                  examName={examName}
                  progress={chProgress.progress}
                  isCompleted={chProgress.isCompleted}
                  onProgressChange={updateChapterProgress}
                  onMarkAsDone={markAsDone}
                  onReset={resetChapterProgress}
                  practiceDisabled={practiceDisabled}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeepUnitChapterTracker({
  units = [],
  examSlug,
  subjectSlug,
  examName,
  subjectName,
  practiceDisabled = false,
}) {
  const [expandedUnitId, setExpandedUnitId] = useState(null);
  const [unitProgressMap, setUnitProgressMap] = useState({});

  const handleToggle = useCallback((unitId) => {
    setExpandedUnitId((prev) => (prev === unitId ? null : unitId));
  }, []);

  const handleUnitProgress = useCallback((unitId, percent) => {
    setUnitProgressMap((prev) => ({ ...prev, [unitId]: percent }));
  }, []);

  const totalUnits = units.length;
  const sumProgress = Object.values(unitProgressMap).reduce((a, b) => a + b, 0);
  const overallPercent =
    totalUnits > 0 ? Math.round((sumProgress / (totalUnits * 100)) * 100) : 0;
  const remainingPercent = Math.max(0, 100 - overallPercent);

  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-500 text-sm">No units available for this subject.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
          <span className="font-medium">{examName}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-semibold">{subjectName} Units</span>
        </nav>
    
        <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
          Review each unit, its weightage, and completion progress. Progress is calculated from
          individual chapters within each unit. Expand a unit to manage detailed chapter status.
        </p>
      </header>

      <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <div className="col-span-6 md:col-span-8">Unit</div>
          <div className="col-span-3 md:col-span-2 text-center">Status</div>
          <div className="col-span-3 md:col-span-2 text-right">Progress</div>
        </div>

        <div className="divide-y divide-slate-200">
          {units.map((unit, index) => (
            <UnitRowExpandable
              key={unit._id}
              unit={unit}
              index={index}
              examSlug={examSlug}
              subjectSlug={subjectSlug}
              examName={examName}
              subjectName={subjectName}
              isExpanded={expandedUnitId === unit._id}
              onToggle={handleToggle}
              onUnitProgress={handleUnitProgress}
              practiceDisabled={practiceDisabled}
            />
          ))}
        </div>

        <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 italic">
            Note: Progress is automatically updated based on individual chapter completion levels.
          </p>
        </div>
      </div>

     
    </div>
  );
}
