"use client";

import React, { useState, lazy, Suspense, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FaChartLine } from "react-icons/fa";
import { ExamCardSkeleton } from "./SkeletonLoader";
import Card from "./Card";

// Lazy load tabs for code splitting - only load when needed
const OverviewTab = lazy(() => import("./OverviewTab"));
const DiscussionForumTab = lazy(() => import("./DiscussionForumTab"));
const PracticeTestTab = lazy(() => import("./PracticeTestTab"));
const PerformanceTab = lazy(() => import("./PerformanceTab"));

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
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Initialize activeTab from URL, default to existing logic (Overview)
  const currentTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => fromUrlParam(currentTabParam));

  // Sync state with URL changes (handling back/forward button)
  useEffect(() => {
    const tabFromUrl = fromUrlParam(searchParams.get("tab"));
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab); // Optimistic UI update

    // Create new params to preserve existing query params if any (though usually clean for tabs)
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", toUrlParam(tab));

    // Replace URL without page reload/scroll reset
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const renderTabContent = () => {
    const tabContent = (() => {
      switch (activeTab) {
        case "Overview":
          return (
            <OverviewTab
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
            />
          );

        case "Discussion Forum":
          return (
            <DiscussionForumTab
              entityType={entityType}
              entityName={entityName}
              examId={examId}
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
              examId={examId}
              subjectId={subjectId}
              unitId={unitId}
              chapterId={chapterId}
              topicId={topicId}
              subTopicId={subTopicId}
            />
          );

        case "Performance":
          return (
            <PerformanceTab
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
    })();

    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-blue-600 border-t-transparent mb-3"></div>
              <p className="text-xs text-gray-600">Loading...</p>
            </div>
          </div>
        }
      >
        {tabContent}
      </Suspense>
    );
  };

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
                className={`relative px-2.5 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-2.5 text-[10px] sm:text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-300 border-b-2 group overflow-hidden shrink-0 ${isActive
                    ? isPerformanceTab
                      ? "text-emerald-700 border-emerald-600 bg-gradient-to-b from-emerald-50 via-white to-white shadow-sm"
                      : "text-indigo-600 border-indigo-600 bg-white"
                    : isPerformanceTab
                      ? "text-emerald-600 hover:text-emerald-700 border-transparent bg-emerald-50/30 hover:bg-emerald-50/50"
                      : "text-gray-500 hover:text-gray-700 border-transparent"
                  }`}
              >
                {/* Background glow effect for Performance tab when active */}
                {isPerformanceTab && isActive && (
                  <span className="absolute inset-0 bg-emerald-100/30 rounded-t-lg z-0"></span>
                )}

                {/* Hover background effect for Performance tab when not active */}
                {isPerformanceTab && !isActive && (
                  <span className="absolute inset-0 bg-emerald-100/0 group-hover:bg-emerald-100/40 rounded-t-lg transition-all duration-300 z-0"></span>
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
                    {/* Premium underline animation for Performance tab when inactive */}
                    {isPerformanceTab && !isActive && (
                      <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-emerald-600 group-hover:w-full transition-all duration-300 rounded-full"></span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <div className="text-gray-700 text-sm sm:text-base">
        {renderTabContent()}
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
