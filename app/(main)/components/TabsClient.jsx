"use client";

import React, { useState, lazy, Suspense, useEffect, useMemo, useCallback, startTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FaChartLine } from "react-icons/fa";
import { ExamCardSkeleton } from "./SkeletonLoader";
import Card from "./Card";

// Lazy load tabs for code splitting - only load when clicked (true lazy loading)
// Using dynamic imports with no preloading to ensure components load only when needed
const OverviewTab = lazy(() =>
  import("./OverviewTab").catch(() => ({ default: () => <div>Failed to load Overview</div> }))
);
const DiscussionForumTab = lazy(() =>
  import("./DiscussionForumTab").catch(() => ({ default: () => <div>Failed to load Discussion Forum</div> }))
);
const PracticeTestTab = lazy(() =>
  import("./PracticeTestTab").catch(() => ({ default: () => <div>Failed to load Practice Test</div> }))
);
const PerformanceTab = lazy(() =>
  import("./PerformanceTab").catch(() => ({ default: () => <div>Failed to load Performance</div> }))
);

const TABS = ["Overview", "Discussion Forum", "Practice Test", "Performance"];

// Helper to convert Tab Name to URL param
const toUrlParam = (tabName) => {
  switch (tabName) {
    case "Discussion Forum":
      return "discussion";
    case "Practice Test":
      return "practice";
    case "Performance":
      return "performance";
    case "Overview":
    default:
      return "overview";
  }
};

// Helper to convert URL param to Tab Name
const fromUrlParam = (param) => {
  if (!param) return "Overview";
  switch (param.toLowerCase()) {
    case "discussion":
      return "Discussion Forum";
    case "practice":
    case "practics": // Handle user mentioned typo if needed, just in case
      return "Practice Test";
    case "performance":
    case "performace": // Handle user mentioned typo if needed
      return "Performance";
    case "overview":
    default:
      return "Overview";
  }
};

const TabsClient = ({
  activeTab: initialTab = TABS[0],
  content,
  details,
  examId,
  initialExamInfo = null,
  subjectId,
  unitId,
  chapterId,
  topicId,
  subTopicId,
  entityName,
  entityType,
  unitsCount,
  definitions = [],
  currentDefinitionId,
  examSlug,
  subjectSlug,
  unitSlug,
  chapterSlug,
  topicSlug,
  subTopicSlug,
  subtopics = [],
  chapters = [],
  topics = [],
  unitName,
  subjectsWithUnits = [],
  units = [],
  practiceDisabled = false,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Initialize activeTab from URL, default to existing logic (Overview)
  const currentTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => fromUrlParam(currentTabParam));
  const [loadedTabs, setLoadedTabs] = useState(new Set([fromUrlParam(currentTabParam)])); // Track loaded tabs

  // Sync state with URL changes (handling back/forward button)
  useEffect(() => {
    const tabFromUrl = fromUrlParam(searchParams.get("tab"));
    if (tabFromUrl !== activeTab) {
      startTransition(() => {
        setActiveTab(tabFromUrl);
        setLoadedTabs(prev => new Set([...prev, tabFromUrl])); // Mark as loaded
      });
    }
  }, [searchParams, activeTab]);

  // Prefetch tab on hover for better UX (optional optimization)
  const handleTabHover = useCallback((tab) => {
    if (!loadedTabs.has(tab)) {
      // Prefetch the tab component on hover (doesn't render, just loads the chunk)
      switch (tab) {
        case "Overview":
          import("./OverviewTab");
          break;
        case "Discussion Forum":
          import("./DiscussionForumTab");
          break;
        case "Practice Test":
          import("./PracticeTestTab");
          break;
        case "Performance":
          import("./PerformanceTab");
          break;
      }
    }
  }, [loadedTabs]);

  const handleTabChange = useCallback((tab) => {
    if (tab === activeTab) return; // Prevent unnecessary re-renders

    // Use startTransition for smooth tab switching (non-blocking update)
    startTransition(() => {
      setActiveTab(tab);
      setLoadedTabs(prev => new Set([...prev, tab])); // Mark as loaded
    });

    // Create new params to preserve existing query params if any
    const params = new URLSearchParams(searchParams.toString());
    const newTabParam = toUrlParam(tab);
    params.set("tab", newTabParam);

    // Clear tab-specific parameters when switching tabs to avoid URL clutter
    // This ensures that 'test=slug', 'view=results', 'thread=slug' don't persist when moving to other tabs
    // Always clear these parameters when switching to any tab (including Performance)
    params.delete("test");
    params.delete("view");
    params.delete("thread");
    params.delete("replyPage");
    params.delete("replySearch");
    params.delete("sort");
    params.delete("action");

    // Replace URL without page reload/scroll reset
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, searchParams, pathname, router]);

  // Render only the active tab to prevent double loading animations
  // Use key prop based on activeTab to force complete remount when switching tabs
  // Memoize to prevent unnecessary re-renders
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case "Overview":
        return (
          <OverviewTab
            key={`overview-tab-${activeTab}`}
            content={content}
            entityType={entityType}
            entityName={entityName}
            unitName={unitName}
            unitsCount={unitsCount}
            definitions={definitions}
            subtopics={subtopics}
            chapters={chapters}
            topics={topics}
            units={units}
            subjectsWithUnits={subjectsWithUnits}
            examSlug={examSlug}
            subjectSlug={subjectSlug}
            unitSlug={unitSlug}
            chapterSlug={chapterSlug}
            topicSlug={topicSlug}
            subTopicSlug={subTopicSlug}
            activeTab={activeTab}
            examId={examId}
            initialExamInfo={initialExamInfo}
          />
        );

      case "Discussion Forum":
        return (
          <DiscussionForumTab
            key={`discussion-tab-${activeTab}`}
            entityType={entityType}
            entityName={entityName}
            examId={examId}
            examSlug={examSlug}
            subjectId={subjectId}
            unitId={unitId}
            chapterId={chapterId}
            topicId={topicId}
            subTopicId={subTopicId}
            definitions={definitions}
            currentDefinitionId={currentDefinitionId}
          />
        );

      case "Practice Test":
        return (
          <PracticeTestTab
            key={`practice-tab-${activeTab}`}
            examId={examId}
            subjectId={subjectId}
            unitId={unitId}
            chapterId={chapterId}
            topicId={topicId}
            subTopicId={subTopicId}
            practiceDisabled={practiceDisabled}
          />
        );

      case "Performance":
        return (
          <PerformanceTab
            key={`performance-tab-${activeTab}`}
            entityType={entityType}
            entityName={entityName}
            examId={examId}
            subjectId={subjectId}
            unitId={unitId}
            chapterId={chapterId}
            topicId={topicId}
            subTopicId={subTopicId}
          />
        );

      default:
        return null;
    }
  }, [
    activeTab,
    content,
    entityType,
    entityName,
    unitName,
    unitsCount,
    definitions,
    subtopics,
    chapters,
    topics,
    units,
    subjectsWithUnits,
    examSlug,
    subjectSlug,
    unitSlug,
    chapterSlug,
    topicSlug,
    subTopicSlug,
    examId,
    subjectId,
    unitId,
    chapterId,
    topicId,
    subTopicId,
    currentDefinitionId,
  ]);


  return (
    <Card variant="standard" hover={false} className="overflow-hidden">
      {/* Tab Navigation */}
      <nav className="flex overflow-x-auto sm:overflow-visible border-b border-gray-200  bg-gradient-to-br from-indigo-50 via-white to-purple-50 scrollbar-hide">
        <div className="flex min-w-max sm:min-w-0 w-full gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12 justify-around px-3 sm:px-4 md:px-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            const isPerformanceTab = tab === "Performance";

            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                onMouseEnter={() => handleTabHover(tab)}
                className={`relative px-2.5 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-2.5 text-[10px] sm:text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-300 border-b-2 group overflow-hidden shrink-0 rounded-t-lg cursor-pointer ${isActive
                  ? isPerformanceTab
                    ? "text-emerald-700 border-emerald-600 bg-gradient-to-b from-emerald-50 via-white to-white shadow-sm"
                    : "text-indigo-600 border-indigo-600 bg-white"
                  : isPerformanceTab
                    ? "text-emerald-600 hover:text-emerald-700 border-transparent bg-emerald-50/30 hover:bg-emerald-50/70"
                    : "text-gray-500 hover:text-indigo-600 border-transparent bg-transparent hover:bg-indigo-50/70"
                  }`}
              >
                {/* Background glow effect for Performance tab when active */}
                {isPerformanceTab && isActive && (
                  <span className="absolute inset-0 bg-emerald-100/30 rounded-t-lg z-0" aria-hidden />
                )}

                {/* Hover background effect for Performance tab when not active */}
                {isPerformanceTab && !isActive && (
                  <span className="absolute inset-0 bg-emerald-100/0 group-hover:bg-emerald-100/40 rounded-t-lg transition-all duration-300 z-0" aria-hidden />
                )}

                {/* Hover background effect for Overview / Discussion / Practice when not active */}
                {!isPerformanceTab && !isActive && (
                  <span className="absolute inset-0 bg-indigo-100/0 group-hover:bg-indigo-100/50 rounded-t-lg transition-all duration-300 z-0" aria-hidden />
                )}

                {/* Content wrapper with proper z-index */}
                <span className="flex items-center gap-1.5 sm:gap-2 relative z-10">
                  {isPerformanceTab && (
                    <FaChartLine
                      className={`text-xs sm:text-sm transition-all duration-300 ${isActive
                        ? "text-emerald-600 animate-pulse"
                        : "text-emerald-500 group-hover:scale-110 group-hover:rotate-[-5deg]"
                        }`}
                    />
                  )}
                  <span className="relative inline-block">
                    {tab}
                    {/* Underline animation on hover for Performance tab when inactive */}
                    {isPerformanceTab && !isActive && (
                      <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-emerald-600 group-hover:w-full transition-all duration-300 rounded-full" aria-hidden />
                    )}
                    {/* Underline animation on hover for other tabs when inactive */}
                    {!isPerformanceTab && !isActive && (
                      <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-indigo-600 group-hover:w-full transition-all duration-300 rounded-full" aria-hidden />
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Content with Lazy Loading */}
      {/* Render only active tab to prevent double loading animations */}
      {/* Key prop ensures complete remount when switching tabs, preventing double rendering */}
      {/* Only wrap in Suspense if tab hasn't been loaded before to prevent flickering */}
      <div
        className="text-gray-700 text-sm sm:text-base"
        key={`tab-wrapper-${activeTab}`}
      >
        {loadedTabs.has(activeTab) ? (
          // Tab already loaded - render directly without Suspense to prevent flickering
          tabContent
        ) : (
          // Tab not loaded yet - use Suspense for lazy loading
          <Suspense fallback={null}>
            {tabContent}
          </Suspense>
        )}
      </div>

      {/* Custom scrollbar styling for mobile */}
      <style jsx>{`
        nav::-webkit-scrollbar {
          height: 3px;
        }
        nav::-webkit-scrollbar-track {
          background: transparent;
        }
        nav::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        nav::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Card>
  );
};

export default TabsClient;