"use client";

import React, { lazy, Suspense } from "react";

// Lazy load PracticeTestList to reduce initial bundle size
const PracticeTestList = lazy(() => import("./PracticeTestList"));

const PracticeTestTab = ({
  examId,
  subjectId,
  unitId,
  chapterId,
  topicId,
  subTopicId,
  practiceDisabled,
}) => {
  // If practice is disabled, show message instead of practice tests
  if (practiceDisabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Practice Tests Disabled
          </h3>
          <p className="text-sm text-gray-600">
            Practice tests are currently disabled for this subject. Please contact your administrator for more information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-blue-600 border-t-transparent mb-3"></div>
              <p className="text-xs text-gray-600">Loading practice tests...</p>
            </div>
          </div>
        }
      >
        <PracticeTestList
          examId={examId}
          subjectId={subjectId}
          unitId={unitId}
          chapterId={chapterId}
          topicId={topicId}
          subTopicId={subTopicId}
        />
      </Suspense>
    </div>
  );
};

export default PracticeTestTab;

