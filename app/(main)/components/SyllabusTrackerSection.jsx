"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FaCheck, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { useProgress } from "../hooks/useProgress";
import { useExamSubjectProgress } from "../hooks/useExamSubjectProgress";
import { createSlug } from "../lib/api";
import CongratulationsModal from "./CongratulationsModal";
import LoginPromptModal from "./LoginPromptModal";
import { markChapterCongratulationsShown } from "@/lib/congratulations";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
const PENDING_SAVE_KEY = "syllabus_pending_save";

function pathWithoutBasePath(fullPath, base = basePath) {
  if (!fullPath || typeof fullPath !== "string") return fullPath;
  const pathOnly = fullPath.split("?")[0];
  const search = fullPath.includes("?") ? fullPath.slice(fullPath.indexOf("?")) : "";
  const withoutBase = pathOnly.startsWith(base) ? pathOnly.slice(base.length) || "/" : pathOnly;
  return withoutBase + search;
}

// Chapter progress: 0% | 30% (practice only) | 70% (theory only) | 100% (both)
const PROGRESS_THEORY_ONLY = 70;
const PROGRESS_PRACTICE_ONLY = 30;
const PROGRESS_BOTH = 100;

// Slider zones: 0–60 orange, 60–80 blue, 80–100 green
const ZONE_ORANGE = "#f97316";
const ZONE_BLUE = "#2563eb";
const ZONE_GREEN = "#10b981";
const TRACK_UNFILLED = "#e2e8f0";

// One color for the whole filled range based on zone: 0–60 orange, 60–80 blue, 80+ green
function getSliderTrackGradient(progressPercent) {
  const p = Math.min(100, Math.max(0, progressPercent));
  const fillColor = getZoneColor(progressPercent);
  return `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${p}%, ${TRACK_UNFILLED} ${p}%, ${TRACK_UNFILLED} 100%)`;
}

function getZoneColor(progressPercent) {
  const p = Math.min(100, Math.max(0, progressPercent));
  if (p < 60) return ZONE_ORANGE;
  if (p < 80) return ZONE_BLUE;
  return ZONE_GREEN;
}

function SaveBeforeLeaveModal({ isOpen, onClose, onSave, onDontSave }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6"
      >
        <h2 className="text-lg font-bold text-slate-900 m-0">Save syllabus tracker?</h2>
        <p className="mt-2 text-sm text-slate-600 m-0">
          You have unsaved syllabus tracker progress. Do you want to save it? You can log in or sign up next—after a successful login you will be brought back here and your progress will be saved.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { onSave(); onClose(); }}
            className="w-full py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Yes, save progress
          </button>
          <button
            type="button"
            onClick={() => { onDontSave(); onClose(); }}
            className="w-full py-2.5 rounded-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Don&apos;t save
          </button>
          <button type="button" onClick={onClose} className="w-full py-2 text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const CHAPTER_DESCRIPTIONS = [
  "Focus on NCERT definitions, nomenclature rules, hierarchy order, and \"statement trap\" questions.",
  "High-return: characteristics + examples for each kingdom; common confusion between groups.",
  "Tables + examples. NEET loves \"match the feature → group\" and exception traps.",
  "Key cycles and comparisons. Diagram-based questions are frequent.",
  "Focus on examples and exceptions across plant groups.",
];

function ChapterRow({
  chapter,
  index,
  href,
  unitId,
  examName,
  progress: initialProgress = 0,
  isCompleted: initialIsCompleted = false,
  onProgressChange,
  onRecordPendingProgress,
  practiceDisabled = false,
}) {
  const [localProgress, setLocalProgress] = useState(initialProgress);
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const congratulationsShownRef = React.useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const prevProgressRef = React.useRef(initialProgress);

  React.useEffect(() => {
    setLocalProgress(initialProgress);
    setIsCompleted(initialIsCompleted);
    prevProgressRef.current = initialProgress;
  }, [initialProgress, initialIsCompleted]);

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
    setIsAuthenticated(!!token);
  }, []);

  const progressPercent = Math.min(100, Math.max(0, localProgress));
  const theoryChecked = progressPercent >= PROGRESS_THEORY_ONLY;
  const practiceChecked = progressPercent === PROGRESS_PRACTICE_ONLY || progressPercent >= PROGRESS_BOTH;

  const handleStageChange = useCallback(
    async (stage, checked) => {
      if (practiceDisabled) return;
      let targetProgress;
      if (stage === "theory") {
        if (checked) targetProgress = practiceChecked ? PROGRESS_BOTH : PROGRESS_THEORY_ONLY;
        else targetProgress = progressPercent >= PROGRESS_BOTH ? PROGRESS_PRACTICE_ONLY : 0;
      } else {
        if (checked) targetProgress = progressPercent >= PROGRESS_THEORY_ONLY ? PROGRESS_BOTH : PROGRESS_PRACTICE_ONLY;
        else targetProgress = progressPercent >= PROGRESS_BOTH ? PROGRESS_THEORY_ONLY : 0;
      }
      if (!isAuthenticated && onRecordPendingProgress) {
        onRecordPendingProgress(unitId, chapter._id, targetProgress, targetProgress === PROGRESS_BOTH);
      }
      setLocalProgress(targetProgress);
      setIsCompleted(targetProgress === PROGRESS_BOTH);
      prevProgressRef.current = targetProgress;
      if (targetProgress === PROGRESS_BOTH && !congratulationsShownRef.current && unitId) {
        try {
          const success = await markChapterCongratulationsShown(chapter._id, unitId);
          if (success) {
            congratulationsShownRef.current = true;
            setShowCongratulations(true);
          }
        } catch (e) {
          console.error(e);
        }
      }
      onProgressChange?.(chapter._id, targetProgress, targetProgress === PROGRESS_BOTH);
    },
    [chapter._id, unitId, onProgressChange, onRecordPendingProgress, isAuthenticated, practiceDisabled, progressPercent, practiceChecked]
  );

  const handleSliderChange = useCallback(
    (e) => {
      if (practiceDisabled) return;
      const v = parseInt(e.target.value, 10);
      if (!isAuthenticated && onRecordPendingProgress) {
        onRecordPendingProgress(unitId, chapter._id, v, v === 100);
      }
      const wasUnder100 = prevProgressRef.current < 100;
      setLocalProgress(v);
      setIsCompleted(v === 100);
      prevProgressRef.current = v;
      if (v === 100 && wasUnder100 && !congratulationsShownRef.current && unitId) {
        setShowCongratulations(true);
        markChapterCongratulationsShown(chapter._id, unitId).then((ok) => {
          if (ok) congratulationsShownRef.current = true;
        }).catch(console.error);
      }
      onProgressChange?.(chapter._id, v, v === 100);
    },
    [chapter._id, unitId, onProgressChange, onRecordPendingProgress, isAuthenticated, practiceDisabled]
  );

  const description = chapter.description || CHAPTER_DESCRIPTIONS[index % CHAPTER_DESCRIPTIONS.length];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 px-4 rounded-lg bg-white border border-slate-200 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {href ? (
            <Link href={href} className="font-semibold text-slate-900 hover:text-blue-600 text-sm sm:text-base">
              Chapter: {chapter.name}
            </Link>
          ) : (
            <span className="font-semibold text-slate-900 text-sm sm:text-base">Chapter: {chapter.name}</span>
          )}
          {progressPercent >= PROGRESS_BOTH && <FaCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
        </div>
        {/* <p className="text-xs text-slate-600 mt-1">{description}</p> */}
        <div className="flex flex-wrap gap-3 mt-2">
          {[
            { stage: "theory", label: "Theory", checked: theoryChecked },
            { stage: "practice", label: "Practice", checked: practiceChecked },
          ].map(({ stage, label, checked }) => (
            <label key={stage} className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => handleStageChange(stage, e.target.checked)}
                disabled={practiceDisabled}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div
        className="flex items-center gap-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={localProgress}
          onChange={handleSliderChange}
          disabled={practiceDisabled}
          className="w-28 sm:w-36 h-2 rounded-full appearance-none cursor-pointer slider-syllabus"
          style={{
            background: getSliderTrackGradient(progressPercent),
            ["--slider-zone-color"]: getZoneColor(progressPercent),
          }}
        />
        <span
          className="text-sm font-bold min-w-10 tabular-nums"
          style={{ color: getZoneColor(progressPercent) }}
        >
          {Math.round(progressPercent)}%
        </span>
      </div>
      <CongratulationsModal isOpen={showCongratulations} onClose={() => setShowCongratulations(false)} chapterName={chapter.name} type="chapter" />
    </div>
  );
}

function UnitAccordionItem({
  unit,
  isExpanded,
  onToggle,
  examSlug,
  subjectSlug,
  examName,
  practiceDisabled,
  onRecordPendingProgress,
}) {
  const {
    unitProgress,
    getChapterProgress,
    updateChapterProgress,
  } = useProgress(unit._id, unit.chapters || []);

  const unitProgressPercent = Math.min(100, Math.max(0, Math.round(unitProgress)));
  const unitSlug = unit.slug || createSlug(unit.name);
  const unitUrl = examSlug && subjectSlug ? `/${examSlug}/${subjectSlug}/${unitSlug}` : null;
  const suggestedOrder = (unit.chapters || []).slice(0, 3).map((c) => c.name).join(" → ") || "—";

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        className="w-full text-left p-4 sm:p-5 rounded-none bg-white hover:bg-slate-50/80 transition-colors border-t border-slate-200 first:border-t-0 cursor-pointer"
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-slate-500 shrink-0">{isExpanded ? <FaChevronDown className="w-4 h-4" /> : <FaChevronRight className="w-4 h-4" />}</span>
          {unitUrl ? (
            <Link
              href={unitUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-base font-bold text-slate-900 hover:text-blue-600 m-0 shrink-0"
            >
              Unit: {unit.name}
            </Link>
          ) : (
            <h3 className="text-base font-bold text-slate-900 m-0 shrink-0">Unit: {unit.name}</h3>
          )}
         
          <span className="flex-1 min-w-0 " aria-hidden="true" />
          <span
            className="text-lg font-bold tabular-nums shrink-0  me-16"
            style={{ color: getZoneColor(unitProgressPercent) }}
          >
            {unitProgressPercent}%
          </span>
        </div>
        <p className="text-xs text-slate-600 mb-3 pl-6">
          Computed progress: {unitProgressPercent}% • Suggested order: {suggestedOrder}
        </p>
        <div className="flex flex-wrap gap-2 mb-3 pl-6">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase">Priority: High</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white uppercase">Weightage: {unit.weightage || "Medium"}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">Traps: Examples</span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-500 bg-emerald-500"
            style={{
              width: `${unitProgressPercent}%`,
              minWidth: unitProgressPercent > 0 ? "2%" : 0,
            }}
          />
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 pt-1 bg-slate-50/50 border-t border-slate-200 space-y-2">
          {(unit.chapters || []).map((chapter, chIndex) => {
            const chapterSlug = chapter.slug || createSlug(chapter.name);
            const chapterUrl = examSlug && subjectSlug && unitSlug
              ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}`
              : null;
            const chProgress = getChapterProgress(chapter._id) || { progress: 0, isCompleted: false };
            return (
              <ChapterRow
                key={chapter._id}
                chapter={chapter}
                index={chIndex}
                href={chapterUrl}
                unitId={unit._id}
                examName={examName}
                progress={chProgress.progress}
                isCompleted={chProgress.isCompleted}
                onProgressChange={updateChapterProgress}
                onRecordPendingProgress={onRecordPendingProgress}
                practiceDisabled={practiceDisabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SyllabusTrackerSection({
  examId,
  subjectsWithUnits = [],
  examSlug,
  examName = "Exam",
  practiceDisabled = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);
  const [expandedUnitId, setExpandedUnitId] = useState(null);
  const [hasUnsavedProgress, setHasUnsavedProgress] = useState(false);
  const [showSaveBeforeLeave, setShowSaveBeforeLeave] = useState(false);
  const [showLoginModalForSave, setShowLoginModalForSave] = useState(false);
  const pendingProgressRef = useRef({});
  const pendingNavigateRef = useRef(null);

  const subjects = subjectsWithUnits.filter(
    (s) => s.units && s.units.length > 0 && s.practiceDisabled !== true
  );
  const { overallPercent } = useExamSubjectProgress(examId, subjectsWithUnits);

  const safeIndex = subjects.length > 0 ? Math.min(selectedSubjectIndex, subjects.length - 1) : 0;
  const subject = subjects[safeIndex] || null;

  const recordPendingProgress = useCallback((unitId, chapterId, progress, isCompleted) => {
    const uid = String(unitId);
    const cid = String(chapterId);
    pendingProgressRef.current = {
      ...pendingProgressRef.current,
      [uid]: {
        ...(pendingProgressRef.current[uid] || {}),
        [cid]: { progress, isCompleted },
      },
    };
    setHasUnsavedProgress(true);
  }, []);

  const clearPendingAndNavigate = useCallback(() => {
    pendingProgressRef.current = {};
    setHasUnsavedProgress(false);
    let href = pendingNavigateRef.current;
    pendingNavigateRef.current = null;
    if (href && typeof href === "string") {
      href = pathWithoutBasePath(href);
      router.push(href);
    }
  }, [router]);

  const handleSaveAndShowLoginModal = useCallback(() => {
    const pending = pendingProgressRef.current;
    if (Object.keys(pending).length > 0 && typeof window !== "undefined") {
      const redirectPath = pathWithoutBasePath(window.location.pathname + window.location.search);
      window.sessionStorage.setItem("redirectAfterLogin", redirectPath);
      window.localStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(pending));
    }
    pendingProgressRef.current = {};
    setHasUnsavedProgress(false);
    setShowSaveBeforeLeave(false);
    setShowLoginModalForSave(true);
  }, [setHasUnsavedProgress, setShowSaveBeforeLeave, setShowLoginModalForSave]);

  React.useEffect(() => {
    if (subjects.length > 0 && selectedSubjectIndex >= subjects.length) {
      setSelectedSubjectIndex(subjects.length - 1);
      setExpandedUnitId(null);
    }
  }, [subjects.length, selectedSubjectIndex]);
  const units = subject?.units || [];

  const SHOW_SAVE_MODAL_FLAG = "syllabus_show_save_modal_on_stay";

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("student_token") : null;
      if (hasUnsavedProgress && !token) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(SHOW_SAVE_MODAL_FLAG, "1");
        }
        e.preventDefault();
        e.returnValue = "Changes you made may not be saved.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedProgress]);

  useEffect(() => {
    const handleFocus = () => {
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem(SHOW_SAVE_MODAL_FLAG) === "1") {
        window.sessionStorage.removeItem(SHOW_SAVE_MODAL_FLAG);
        setShowSaveBeforeLeave(true);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("student_token") : null;
      if (!hasUnsavedProgress || token) return;
      const a = e.target.closest("a");
      if (!a || !a.href) return;
      try {
        const url = new URL(a.href);
        if (url.origin !== window.location.origin || url.pathname === pathname) return;
        if (url.pathname.startsWith("/login") || url.pathname.startsWith("/register")) return;
      } catch {
        return;
      }
      e.preventDefault();
      const rawHref = a.getAttribute("href") || a.href || "";
      const toStore = rawHref.startsWith("http") ? pathWithoutBasePath(new URL(rawHref).pathname + new URL(rawHref).search) : pathWithoutBasePath(rawHref);
      pendingNavigateRef.current = toStore;
      setShowSaveBeforeLeave(true);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [hasUnsavedProgress, pathname]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("student_token") : null;
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PENDING_SAVE_KEY) : null;
    if (!token || !raw) return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(PENDING_SAVE_KEY);
      return;
    }
    const flush = async () => {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      for (const unitId of Object.keys(data)) {
        const progress = data[unitId];
        if (!progress || typeof progress !== "object") continue;
        const chapterIds = Object.keys(progress);
        const total = chapterIds.reduce((s, cid) => s + (progress[cid]?.progress ?? 0), 0);
        const unitProgress = Math.round(total / Math.max(1, chapterIds.length));
        await fetch(`${basePath}/api/student/progress`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ unitId, progress, unitProgress }),
        });
      }
      window.localStorage.removeItem(PENDING_SAVE_KEY);
      window.dispatchEvent(new CustomEvent("chapterProgressUpdate"));
    };
    flush();
  }, []);

  const handleSubjectSelect = useCallback((i) => {
    setSelectedSubjectIndex(i);
    setExpandedUnitId(null);
  }, []);

  const handleUnitToggle = useCallback((unitId) => {
    setExpandedUnitId((prev) => (prev === unitId ? null : unitId));
  }, []);

  const subjectSlug = subject?.slug || (subject ? createSlug(subject.name) : "");

  if (subjects.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <style jsx global>{`
        .slider-syllabus::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid var(--slider-zone-color, #10b981);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .slider-syllabus::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid var(--slider-zone-color, #10b981);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
      `}</style>
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 m-0">
              Syllabus Tracker (Subject → Unit → Chapter)
            </h2>
            <p className="text-xs text-slate-600 mt-1 m-0 max-w-2xl">
              Chapter progress = Theory 70% + Practice 30%. Use sliders and Theory/Practice checkboxes; progress rolls up to unit → subject → total.
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold shrink-0 ${
              Math.round(overallPercent) === 0 ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            Completion: {Math.round(overallPercent)}%
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {subjects.map((s, i) => (
            <button
              key={s._id}
              type="button"
              onClick={() => handleSubjectSelect(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${i === safeIndex ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
      {units.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">No units in this subject.</div>
      ) : (
        <div className="divide-y divide-slate-200">
          {units.map((unit) => (
            <UnitAccordionItem
              key={unit._id}
              unit={unit}
              isExpanded={expandedUnitId === unit._id}
              onToggle={() => handleUnitToggle(unit._id)}
              examSlug={examSlug}
              subjectSlug={subjectSlug}
              examName={examName}
              practiceDisabled={practiceDisabled}
              onRecordPendingProgress={recordPendingProgress}
            />
          ))}
        </div>
      )}
      <SaveBeforeLeaveModal
        isOpen={showSaveBeforeLeave}
        onClose={() => { setShowSaveBeforeLeave(false); pendingNavigateRef.current = null; }}
        onSave={handleSaveAndShowLoginModal}
        onDontSave={clearPendingAndNavigate}
      />
      <LoginPromptModal
        isOpen={showLoginModalForSave}
        onClose={() => setShowLoginModalForSave(false)}
        examName={examName}
      />
    </div>
  );
}
