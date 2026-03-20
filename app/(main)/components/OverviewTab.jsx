"use client";

import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaBook, FaChartLine, FaTrophy, FaChevronDown } from "react-icons/fa";
import RichContent from "./RichContent";
import Card from "./Card";
import { createSlug } from "../lib/api";
import { hasMoreContent } from "../lib/utils/contentUtils";

const DefinitionPreviewClient = lazy(() => import("./DefinitionPreviewClient"));
import UnitsSectionClient from "./UnitsSectionClient";
import ChaptersSectionClient from "./ChaptersSectionClient";
import ClientOnly from "./ClientOnly";
import {
  getStoredHoursPerDay,
  setStoredHoursPerDay,
  getStoredAccuracy,
  setStoredAccuracy,
  getSuggestedHoursFromAccuracy,
  getAccuracyFromHours,
  broadcastExamPrepSync,
} from "../lib/examPrepStorage";
import { useClientToday, getPrepDaysRemaining } from "../hooks/useClientToday";
import api from "@/lib/api";

// Lazy load below-the-fold sections to reduce TBT and main bundle
const ExamPrepDashboard = lazy(() => import("./ExamPrepDashboard"));
const PreparationProgressDashboard = lazy(() => import("./PreparationProgressDashboard"));
const SyllabusTrackerSection = lazy(() => import("./SyllabusTrackerSection"));
const DeepUnitChapterTracker = lazy(() => import("./DeepUnitChapterTracker"));

// SubTopic Preview Component with Fixed 400px Height
const SubTopicPreview = ({
  subTopic,
  subTopicUrl,
  contentHtml,
  showReadMore,
  activeTab,
}) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const handleReadMore = (e) => {
    if (!subTopicUrl || isNavigating) return;

    e.preventDefault();
    setIsNavigating(true);

    // Add page transition animation
    const container = e.currentTarget.closest(".subtopic-container");
    if (container) {
      container.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
      container.style.transform = "scale(0.98)";
      container.style.opacity = "0.9";
    }

    // Navigate after brief animation using Next.js router (handles basepath automatically)
    setTimeout(() => {
      // Next.js router.push automatically handles basepath (/self-study)
      router.push(subTopicUrl);
    }, 200);
  };

  return (
    <div className="space-y-3">
      {subTopicUrl ? (
        <Link href={subTopicUrl} className="group/link" aria-label={`Subtopic: ${subTopic.name}`}>
          <h3 className="text-lg sm:text-xl font-bold text-indigo-700 group-hover/link:text-indigo-500 group-hover/link:underline transition-all duration-200 cursor-pointer mb-3 inline-block">
            {subTopic.name}
          </h3>
        </Link>
      ) : (
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
          {subTopic.name}
        </h3>
      )}
      {subTopic.content && (
        <div className="space-y-0">
          {/* Premium Content Container with Max 400px Height - full HTML, clipped by CSS (no string truncation so editor HTML stays valid) */}
          <div className="subtopic-container bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 rounded-xl border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200/80 relative">
            <div className="relative max-h-[300px] min-h-0 overflow-hidden">
              <div className="max-h-[300px] min-h-0 overflow-hidden p-5 sm:p-6 md:p-7">
                <div className="prose prose-sm sm:prose max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-indigo-700 prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700">
                  <RichContent
                    key={`subtopic-preview-${subTopic._id || "unknown"
                      }-${activeTab}`}
                    html={contentHtml}
                  />
                </div>
              </div>

              {/* Premium Gradient Fade Overlay at Bottom */}
              {showReadMore && (
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-indigo-50/50 via-white/98 to-transparent pointer-events-none z-10"></div>
              )}

              {/* Premium Read More Button - Overlapping at Bottom */}
              {showReadMore && subTopicUrl && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 px-5">
                  <Link
                    href={subTopicUrl}
                    onClick={handleReadMore}
                    className="group inline-flex items-center gap-2.5 px-5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-700 hover:via-indigo-700 hover:to-indigo-800 text-white text-sm font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_8px_20px_rgba(99,102,241,0.35)] transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_12px_rgba(99,102,241,0.25)] disabled:opacity-70 disabled:cursor-not-allowed min-h-[44px]"
                    aria-label={`Read more about ${subTopic.name}`}
                  >
                    <span className="tracking-wide">Read More</span>
                    <FaChevronDown className="w-3 h-3 transition-transform duration-300 group-hover:translate-y-1" aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OverviewTab = ({
  content,
  entityType,
  entityName,
  unitName,
  unitsCount,
  definitions = [],
  subtopics = [],
  chapters = [],
  topics = [],
  units = [],
  subjectsWithUnits = [],
  examSlug,
  subjectSlug,
  unitSlug,
  chapterSlug,
  topicSlug,
  subTopicSlug,
  activeTab,
  overviewEntityId,
  examId,
  initialExamInfo = null,
}) => {
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [accuracyPct, setAccuracyPct] = useState(100);
  const [examInfo, setExamInfo] = useState(initialExamInfo ?? null);
  const today = useClientToday();

  // Use prop when state is null so dashboards get exam info even before useEffect runs (e.g. lazy tab mount)
  const hasValidInitial = initialExamInfo != null && (initialExamInfo.examDate != null || initialExamInfo.maximumMarks != null);
  const effectiveExamInfo = examInfo ?? (hasValidInitial ? initialExamInfo : null);

  useEffect(() => {
    if (initialExamInfo != null && (initialExamInfo.examDate != null || initialExamInfo.maximumMarks != null)) {
      setExamInfo(initialExamInfo);
    }
  }, [initialExamInfo]);

  const syncFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      setHoursPerDay(getStoredHoursPerDay());
      setAccuracyPct(getStoredAccuracy());
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onVisible = () => syncFromStorage();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    if (entityType !== "exam" || !examId) return;
    let cancelled = false;
    const id = examId != null ? String(examId) : "";
    if (!id) return;
    const fetchIt = () =>
      api.get(`/exam-info?examId=${id}`).then((res) => {
        if (cancelled || !res.data?.data?.length) return;
        setExamInfo(res.data.data[0]);
      });
    fetchIt().catch(() => {
      if (cancelled) return;
      setTimeout(() => fetchIt().catch(() => {}), 800);
    });
    return () => { cancelled = true; };
  }, [entityType, examId]);

  const handleHoursPerDayChange = useCallback((n) => {
    const v = Math.min(24, Math.max(1, Number(n)));
    if (Number.isNaN(v)) return;
    const pct = getAccuracyFromHours(v);
    setStoredHoursPerDay(v);
    setStoredAccuracy(pct);
    flushSync(() => {
      setHoursPerDay(v);
      setAccuracyPct(pct);
    });
    broadcastExamPrepSync(v, pct);
  }, []);

  const handleAccuracyChange = useCallback((pct) => {
    const v = Math.min(100, Math.max(0, Number(pct)));
    if (Number.isNaN(v)) return;
    const suggestedHours = getSuggestedHoursFromAccuracy(v);
    setStoredAccuracy(v);
    setStoredHoursPerDay(suggestedHours);
    flushSync(() => {
      setAccuracyPct(v);
      setHoursPerDay(suggestedHours);
    });
    broadcastExamPrepSync(suggestedHours, v);
  }, []);

  const hoursCbRef = useRef(handleHoursPerDayChange);
  const accuracyCbRef = useRef(handleAccuracyChange);
  useEffect(() => {
    hoursCbRef.current = handleHoursPerDayChange;
    accuracyCbRef.current = handleAccuracyChange;
  }, [handleHoursPerDayChange, handleAccuracyChange]);

  const onHoursPerDayChangeStable = useCallback((n) => {
    hoursCbRef.current(n);
  }, []);
  const onAccuracyChangeStable = useCallback((pct) => {
    accuracyCbRef.current(pct);
  }, []);

  const prepDaysRemaining =
    effectiveExamInfo?.examDate != null && today
      ? getPrepDaysRemaining(effectiveExamInfo.examDate, today)
      : null;
  const hoursPerDayNum = Math.max(1, Number(hoursPerDay) || 3);
  const timeRequiredFallback =
    prepDaysRemaining != null && prepDaysRemaining > 0 && hoursPerDayNum > 0
      ? { prepDays: prepDaysRemaining, studyHoursLeft: prepDaysRemaining * hoursPerDayNum }
      : null;

  return (
    <div className="space-y-2 px-3 sm:px-4 py-3 sm:py-4">
      {/* Heading order: h2 for Overview so document has h1 -> h2 -> h3 */}
      <h2 className="sr-only">Overview content</h2>
      {/* LCP: Main prose content first so text/image paints immediately */}
      <div
        className="prose prose-sm sm:prose max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-normal prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-indigo-700 prose-pre:bg-gray-50"
        suppressHydrationWarning
      >
        {content ? (
          <RichContent html={content} />
        ) : (
          <Card variant="standard" className="p-4 sm:p-6 text-center">
            <p className="text-gray-600 font-medium mb-2">
              No content available for this {entityType}.
            </p>
            <p className="text-sm text-gray-500">
              Content can be added from the admin panel.
            </p>
          </Card>
        )}
      </div>

      {/* Exam dashboards: client-only, lazy-loaded to reduce TBT */}
      {entityType === "exam" && examId && (
        <ClientOnly fallback={<div className="mb-6 min-h-[200px] animate-pulse rounded-xl bg-gray-100/50" aria-hidden="true" />}>
          <Suspense fallback={<div className="mb-6 min-h-[200px] rounded-xl bg-gray-100/50" aria-hidden="true" />}>
            <div className="mb-6">
              <ExamPrepDashboard
                examId={examId}
                examName={entityName || "Exam"}
                hoursPerDay={hoursPerDay ?? 3}
                onHoursPerDayChange={onHoursPerDayChangeStable}
                examInfo={effectiveExamInfo}
                accuracyPct={accuracyPct ?? 100}
                onAccuracyChange={onAccuracyChangeStable}
              />
            </div>
            <div className="mb-8">
              <PreparationProgressDashboard
                examId={examId}
                subjectsWithUnits={subjectsWithUnits || []}
                examName={entityName || "Exam"}
                hoursPerDay={hoursPerDay ?? 3}
                examInfo={effectiveExamInfo}
                timeRequiredFallback={timeRequiredFallback}
              />
            </div>
          </Suspense>
        </ClientOnly>
      )}

      {/* Syllabus Tracker - lazy loaded */}
      {entityType === "exam" && examId && examSlug && subjectsWithUnits && subjectsWithUnits.length > 0 && (
        <div className="mb-8">
          <Suspense fallback={<div className="min-h-[120px] rounded-xl bg-gray-100/50" aria-hidden="true" />}>
            <SyllabusTrackerSection
              examId={examId}
              subjectsWithUnits={subjectsWithUnits}
              examSlug={examSlug}
              examName={entityName || "Exam"}
            />
          </Suspense>
        </div>
      )}

      {/* Subjects and Units Grid - only for exam type */}
      {entityType === "exam" &&
        subjectsWithUnits &&
        subjectsWithUnits.length > 0 && (
          <div className="mt-4 lcp-below-fold">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                Subjects & Units
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjectsWithUnits
                .filter((subject) => subject.units && subject.units.length > 0)
                .map((subject, subjectIndex) => {
                  const subjectSlugValue =
                    subject.slug || createSlug(subject.name);
                  const subjectUrl = examSlug
                    ? `/${examSlug}/${subjectSlugValue}`
                    : null;

                  return (
                    <Card
                      key={subject._id || subjectIndex}
                      variant="standard"
                      className="flex flex-col overflow-hidden"
                    >
                      {/* Subject Header */}
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2.5">
                        {subjectUrl ? (
                          <Link href={subjectUrl}>
                            <div className="flex items-center justify-between gap-2">
                              <h4
                                className="text-sm font-semibold text-white line-clamp-1 flex-1"
                                title={subject.name}
                              >
                                {subject.name}
                              </h4>
                              <span className="bg-white/25 text-white text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                {subject.units.length}
                              </span>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <h4
                              className="text-sm font-semibold text-white line-clamp-1 flex-1"
                              title={subject.name}
                            >
                              {subject.name}
                            </h4>
                            <span className="bg-white/25 text-white text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                              {subject.units.length}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Units List */}
                      <div className="flex-1 px-3 py-2 space-y-0.5">
                        {subject.units.map((unit, unitIndex) => {
                          const unitSlugValue =
                            unit.slug || createSlug(unit.name);
                          const unitUrl =
                            examSlug && subjectSlugValue
                              ? `/${examSlug}/${subjectSlugValue}/${unitSlugValue}`
                              : null;

                          return (
                            <div key={unit._id || unitIndex}>
                              {unitUrl ? (
                                <Link href={unitUrl}>
                                  <div className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-gray-50 transition-colors group/unit">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                                    <p
                                      className="text-sm font-medium text-gray-700 group-hover/unit:text-indigo-600 transition-colors line-clamp-1 flex-1"
                                      title={unit.name}
                                    >
                                      {unit.name}
                                    </p>
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-2 py-1.5 px-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"></div>
                                  <p
                                    className="text-sm font-medium text-gray-500 line-clamp-1"
                                    title={unit.name}
                                  >
                                    {unit.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>
        )}


      {/* Deep Unit & Chapter Syllabus Tracker - lazy loaded */}
      {entityType === "exam" &&
        examSlug &&
        subjectsWithUnits &&
        subjectsWithUnits.length > 0 && (
          <div className="mt-8 space-y-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                Syllabus Tracker
              </h3>
            </div>
            {subjectsWithUnits
              .filter((subject) => subject.units && subject.units.length > 0)
              .map((subject) => (
                <Suspense key={subject._id} fallback={<div className="min-h-[80px] rounded-lg bg-gray-100/50" />}>
                  <DeepUnitChapterTracker
                    units={subject.units}
                    examSlug={examSlug}
                    subjectSlug={subject.slug || createSlug(subject.name)}
                    examName={entityName || "Exam"}
                    subjectName={subject.name}
                  />
                </Suspense>
              ))}
          </div>
        )}

      {/* Units Grid - only for subject type */}
      {entityType === "subject" && units && units.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Units
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {units.map((unit, unitIndex) => {
              const unitSlugValue = unit.slug || createSlug(unit.name);
              const unitUrl =
                examSlug && subjectSlug
                  ? `/${examSlug}/${subjectSlug}/${unitSlugValue}`
                  : null;

              const UnitCard = (
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                        title={unit.name}
                      >
                        {unit.name}
                      </h4>
                    </div>
                    {unitUrl && (
                      <div className="shrink-0">
                        <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                          <svg
                            className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );

              return unitUrl ? (
                <Link
                  key={unit._id || unitIndex}
                  href={unitUrl}
                  className="block"
                >
                  {UnitCard}
                </Link>
              ) : (
                <div key={unit._id || unitIndex}>{UnitCard}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject Stats - only for subject type (fallback if no units) */}
      {entityType === "subject" &&
        unitsCount !== undefined &&
        (!units || units.length === 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
              <FaBook className="text-blue-600 text-lg mb-1.5" />
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Units
              </h4>
              <p className="text-xs text-gray-600 font-medium">
                {unitsCount} Units
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
              <FaChartLine className="text-purple-600 text-lg mb-1.5" />
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Subject Overview
              </h4>
              <p className="text-xs text-gray-600">Explore all units</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
              <FaTrophy className="text-green-600 text-lg mb-1.5" />
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Study Resources
              </h4>
              <p className="text-xs text-gray-600">Access study materials</p>
            </div>
          </div>
        )}

      {/* SubTopics List - for topic type */}
      {entityType === "topic" && subtopics && subtopics.length > 0 && (
        <>
          <div className="mt-4">
            <div className="space-y-6">
              {subtopics.map((subTopic, index) => {
                const subTopicSlugValue =
                  subTopic.slug || createSlug(subTopic.name);
                const subTopicUrl =
                  examSlug &&
                    subjectSlug &&
                    unitSlug &&
                    chapterSlug &&
                    topicSlug
                    ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlug}/${subTopicSlugValue}`
                    : null;

                // Use full HTML; preview is limited by CSS max-height (no string truncation - editor HTML stays valid)
                const showReadMore = subTopic.content
                  ? hasMoreContent(subTopic.content, 200)
                  : false;

                return (
                  <SubTopicPreview
                    key={subTopic._id || index}
                    subTopic={subTopic}
                    subTopicUrl={subTopicUrl}
                    contentHtml={subTopic.content || ""}
                    showReadMore={showReadMore}
                    activeTab={activeTab}
                  />
                );
              })}
            </div>
          </div>

          {/* SubTopics Grid - for topic type */}
          <div className="mt-4" role="region" aria-labelledby="subtopics-heading">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" aria-hidden />
              <h3 id="subtopics-heading" className="text-base sm:text-lg font-bold text-gray-900">
                Subtopics
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subtopics.map((subTopic, index) => {
                const subTopicSlugValue =
                  subTopic.slug || createSlug(subTopic.name);
                const subTopicUrl =
                  examSlug &&
                    subjectSlug &&
                    unitSlug &&
                    chapterSlug &&
                    topicSlug
                    ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlug}/${subTopicSlugValue}`
                    : null;

                const SubTopicCard = (
                  <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                          title={subTopic.name}
                        >
                          {subTopic.name}
                        </h4>
                      </div>
                      {subTopicUrl && (
                        <div className="shrink-0">
                          <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                            <svg
                              className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );

                return subTopicUrl ? (
                  <Link
                    key={subTopic._id || index}
                    href={subTopicUrl}
                    className="block"
                    aria-label={`Subtopic: ${subTopic.name}`}
                  >
                    {SubTopicCard}
                  </Link>
                ) : (
                  <div key={subTopic._id || index}>{SubTopicCard}</div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Chapters Grid - for unit type */}
      {entityType === "unit" && chapters && chapters.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Chapters
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {chapters.map((chapter, index) => {
              const chapterSlugValue = chapter.slug || createSlug(chapter.name);
              const chapterUrl =
                examSlug && subjectSlug && unitSlug
                  ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlugValue}`
                  : null;

              const ChapterCard = (
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                        title={chapter.name}
                      >
                        {chapter.name}
                      </h4>
                    </div>
                    {chapterUrl && (
                      <div className="shrink-0">
                        <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                          <svg
                            className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );

              return chapterUrl ? (
                <Link key={chapter._id || index} href={chapterUrl} aria-label={`Chapter: ${chapter.name}`}>
                  {ChapterCard}
                </Link>
              ) : (
                <div key={chapter._id || index}>{ChapterCard}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topics Grid - for chapter type */}
      {entityType === "chapter" && topics && topics.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Topics
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topics.map((topic, index) => {
              const topicSlugValue = topic.slug || createSlug(topic.name);
              const topicUrl =
                examSlug && subjectSlug && unitSlug && chapterSlug
                  ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlugValue}`
                  : null;

              const TopicCard = (
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                        title={topic.name}
                      >
                        {topic.name}
                      </h4>
                    </div>
                    {topicUrl && (
                      <div className="shrink-0">
                        <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                          <svg
                            className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );

              return topicUrl ? (
                <Link
                  key={topic._id || index}
                  href={topicUrl}
                  className="block"
                >
                  {TopicCard}
                </Link>
              ) : (
                <div key={topic._id || index}>{TopicCard}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Definitions List - for subtopic type */}
      {entityType === "subtopic" && definitions && definitions.length > 0 && (
        <>
          <div className="mt-4">
            <div className="space-y-6">
              {definitions.map((definition, index) => {
                const definitionSlug =
                  definition.slug || createSlug(definition.name);
                const definitionUrl =
                  examSlug &&
                    subjectSlug &&
                    unitSlug &&
                    chapterSlug &&
                    topicSlug &&
                    subTopicSlug
                    ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlug}/${subTopicSlug}/${definitionSlug}`
                    : null;

                return (
                  <Suspense
                    key={definition._id || index}
                    fallback={
                      <div className="space-y-3">
                        <div className="h-6 bg-gray-200 animate-pulse rounded w-1/3"></div>
                        <div className="h-[300px] bg-gray-100 animate-pulse rounded-xl"></div>
                      </div>
                    }
                  >
                    <DefinitionPreviewClient
                      definition={definition}
                      definitionUrl={definitionUrl}
                      definitionContent={definition.content || ""}
                    />
                  </Suspense>
                );
              })}
            </div>
          </div>

          {/* Definitions Grid - for subtopic type */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Definitions
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {definitions.map((definition, index) => {
                const definitionSlug =
                  definition.slug || createSlug(definition.name);
                const definitionUrl =
                  examSlug &&
                    subjectSlug &&
                    unitSlug &&
                    chapterSlug &&
                    topicSlug &&
                    subTopicSlug
                    ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlug}/${subTopicSlug}/${definitionSlug}`
                    : null;

                const DefinitionCard = (
                  <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                          title={definition.name}
                        >
                          {definition.name}
                        </h4>
                      </div>
                      {definitionUrl && (
                        <div className="shrink-0">
                          <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                            <svg
                              className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );

                return definitionUrl ? (
                  <Link
                    key={definition._id || index}
                    href={definitionUrl}
                    className="block"
                  >
                    {DefinitionCard}
                  </Link>
                ) : (
                  <div key={definition._id || index}>{DefinitionCard}</div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default OverviewTab;
