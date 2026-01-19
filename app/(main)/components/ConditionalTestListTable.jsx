"use client";

import { useSearchParams } from "next/navigation";
import TestListTable from "./TestListTable";

/**
 * Conditionally renders TestListTable based on current tab.
 * Shows TestListTable on Overview, Discussion Forum, and Performance tabs.
 * Hides TestListTable on Practice Test tab.
 */
const ConditionalTestListTable = ({
  examId,
  subjectId,
  unitId,
  chapterId,
  topicId,
  subTopicId,
  practiceDisabled = false, // Add practiceDisabled prop with default false
}) => {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  // Hide TestListTable when on Practice tab OR if practice is disabled
  if (currentTab === "practice" || practiceDisabled) {
    return null;
  }

  return (
    <TestListTable
      examId={examId}
      subjectId={subjectId}
      unitId={unitId}
      chapterId={chapterId}
      topicId={topicId}
      subTopicId={subTopicId}
      practiceDisabled={practiceDisabled} // Pass practiceDisabled to TestListTable
    />
  );
};

export default ConditionalTestListTable;
