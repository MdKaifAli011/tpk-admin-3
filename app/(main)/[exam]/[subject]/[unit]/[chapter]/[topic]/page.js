import React from "react";
import { notFound } from "next/navigation";
import { FaFileAlt } from "react-icons/fa";
import TabsClient from "../../../../../components/TabsClient";
import NavigationClient from "../../../../../components/NavigationClient";
import ChaptersSectionClient from "../../../../../components/ChaptersSectionClient";
import UnitProgressClient from "../../../../../components/UnitProgressClient";
import ProgressTracker from "../../../../../components/ProgressTracker";
import ConditionalTestListTable from "../../../../../components/ConditionalTestListTable";
import VisitTracker from "../../../../../components/VisitTracker";
import { ERROR_MESSAGES } from "@/constants";
import {
  fetchExamById,
  fetchSubjectsByExam,
  fetchSubjectById,
  fetchUnitsBySubject,
  fetchUnitById,
  fetchChaptersByUnit,
  fetchChapterById,
  fetchTopicsByChapter,
  fetchTopicById,
  fetchSubTopicsByTopic,
  createSlug,
  findByIdOrSlug,
  fetchTopicDetailsById,
  fetchSubTopicDetailsById,
} from "../../../../../lib/api";
import {
  getNextTopic,
  getPreviousTopic,
} from "../../../../../lib/hierarchicalNavigation";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";
import { logger } from "@/utils/logger";
import OverviewCommentSection from "@/app/(main)/components/OverviewCommentSection";
import AssignedBlogsSection from "@/app/(main)/components/AssignedBlogsSection";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Generate metadata for topic pages with tab awareness
 * NOTE: Pages receive searchParams, layouts don't in Next.js App Router
 * This metadata will override layout metadata when searchParams are present
 */
export async function generateMetadata({ params, searchParams }) {
  const {
    exam: examSlug,
    subject: subjectSlug,
    unit: unitSlug,
    chapter: chapterSlug,
    topic: topicSlug,
  } = await params;

  // Pages receive searchParams (Promise in Next.js 15) – resolve before use
  const resolvedSearchParams = await extractSearchParams(searchParams);

  if (process.env.NODE_ENV === "development") {
    logger.debug("Topic Page - Resolved searchParams:", resolvedSearchParams);
  }

  try {
    const {
      fetchExamById,
      fetchSubjectById,
      fetchUnitById,
      fetchChapterById,
      fetchTopicById,
      fetchTopicDetailsById,
      fetchSubjectsByExam,
      fetchUnitsBySubject,
      fetchChaptersByUnit,
      fetchTopicsByChapter,
      findByIdOrSlug,
      createSlug,
    } = await import("../../../../../lib/api");

    const exam = await fetchExamById(examSlug).catch(() => null);
    if (!exam) return { title: `${topicSlug || "Topic"} | Testprepkart` };

    const subjects = await fetchSubjectsByExam(exam._id).catch(() => []);
    const subject = findByIdOrSlug(subjects, subjectSlug);
    if (!subject) return { title: `${topicSlug || "Topic"} | Testprepkart` };

    const units = await fetchUnitsBySubject(subject._id, exam._id).catch(
      () => [],
    );
    const unit = findByIdOrSlug(units, unitSlug);
    if (!unit) return { title: `${topicSlug || "Topic"} | Testprepkart` };

    const chapters = await fetchChaptersByUnit(unit._id).catch(() => []);
    const chapter = findByIdOrSlug(chapters, chapterSlug);
    if (!chapter) return { title: `${topicSlug || "Topic"} | Testprepkart` };

    const topics = await fetchTopicsByChapter(chapter._id).catch(() => []);
    const topic = findByIdOrSlug(topics, topicSlug);
    if (!topic) return { title: `${topicSlug || "Topic"} | Testprepkart` };

    const fullTopicData = await fetchTopicById(topic._id).catch(() => null);
    const finalTopic = fullTopicData || topic;
    const topicDetails = await fetchTopicDetailsById(finalTopic._id).catch(
      () => null,
    );
    const path = `/${createSlug(exam.name)}/${createSlug(subject.name)}/${createSlug(unit.name)}/${createSlug(chapter.name)}/${createSlug(finalTopic.name)}`;

    return await generateTabAwareMetadata(
      { name: finalTopic.name, type: "topic" },
      topicDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: exam.name,
          subject: subject.name,
          unit: unit.name,
          chapter: chapter.name,
          topic: finalTopic.name,
        },
      },
    );
  } catch (error) {
    logger.warn("Error generating topic page metadata:", error);
    return { title: `${topicSlug || "Topic"} | Testprepkart` };
  }
}

const TopicPage = async ({ params }) => {
  const {
    exam: examId,
    subject: subjectSlug,
    unit: unitSlug,
    chapter: chapterSlug,
    topic: topicSlug,
  } = await params;

  // Fetch exam
  const fetchedExam = await fetchExamById(examId);
  if (!fetchedExam) {
    notFound();
  }

  const examIdValue = fetchedExam._id || examId;

  // Fetch subjects for this exam
  const fetchedSubjects = await fetchSubjectsByExam(examIdValue);

  // Find subject by slug
  const foundSubject = findByIdOrSlug(fetchedSubjects, subjectSlug);
  if (!foundSubject) {
    notFound();
  }

  // Fetch full subject data
  const fullSubjectData = await fetchSubjectById(foundSubject._id);
  const subject = fullSubjectData || foundSubject;

  // Fetch units for this subject
  const fetchedUnits = await fetchUnitsBySubject(foundSubject._id, examIdValue);

  // Find unit by slug
  const foundUnit = findByIdOrSlug(fetchedUnits, unitSlug);
  if (!foundUnit) {
    notFound();
  }

  // Fetch full unit data
  const fullUnitData = await fetchUnitById(foundUnit._id);
  const unit = fullUnitData || foundUnit;

  // Fetch chapters for this unit
  const fetchedChapters = await fetchChaptersByUnit(foundUnit._id);

  // Find chapter by slug
  const foundChapter = findByIdOrSlug(fetchedChapters, chapterSlug);
  if (!foundChapter) {
    notFound();
  }

  // Fetch full chapter data
  const fullChapterData = await fetchChapterById(foundChapter._id);
  const chapter = fullChapterData || foundChapter;

  // Fetch topics for this chapter
  const fetchedTopics = await fetchTopicsByChapter(foundChapter._id);

  // Find topic by slug
  const foundTopic = findByIdOrSlug(fetchedTopics, topicSlug);
  if (!foundTopic) {
    notFound();
  }

  // Fetch full topic data, details, and subtopics in parallel
  const [fullTopicData, topicDetails, fetchedSubTopics] = await Promise.all([
    fetchTopicById(foundTopic._id),
    fetchTopicDetailsById(foundTopic._id).catch(() => ({
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    })),
    fetchSubTopicsByTopic(foundTopic._id),
  ]);

  const topic = fullTopicData || foundTopic;

  // Fetch subtopic details (content only) for all subtopics in parallel
  const subtopicDetailsArray = await Promise.all(
    fetchedSubTopics.map((subTopic) =>
      fetchSubTopicDetailsById(subTopic._id)
        .then((details) => ({ content: details?.content || "" }))
        .catch(() => ({ content: "" })),
    ),
  );

  // Find current topic index for navigation
  const index = fetchedTopics.findIndex(
    (t) =>
      t._id === foundTopic._id ||
      createSlug(t.name) === topicSlug ||
      t.name?.toLowerCase() === topicSlug.toLowerCase(),
  );

  const examSlug = createSlug(fetchedExam.name);
  const subjectSlugValue = subject.slug || createSlug(subject.name);
  const unitSlugValue = unit.slug || createSlug(unit.name);
  const chapterSlugValue = chapter.slug || createSlug(chapter.name);
  const topicSlugValue = topic.slug || createSlug(topic.name);

  // Calculate hierarchical navigation
  const [nextNav, prevNav] = await Promise.all([
    getNextTopic({
      examId: examIdValue,
      examSlug: examSlug,
      subjectId: foundSubject._id,
      subjectSlug: subjectSlugValue,
      unitId: foundUnit._id,
      unitSlug: unitSlugValue,
      chapterId: foundChapter._id,
      chapterSlug: chapterSlugValue,
      topicId: foundTopic._id,
      topicSlug: topicSlugValue,
      currentIndex: index,
      allItems: fetchedTopics,
    }),
    getPreviousTopic({
      examId: examIdValue,
      examSlug: examSlug,
      subjectId: foundSubject._id,
      subjectSlug: subjectSlugValue,
      unitId: foundUnit._id,
      unitSlug: unitSlugValue,
      chapterId: foundChapter._id,
      chapterSlug: chapterSlugValue,
      topicId: foundTopic._id,
      topicSlug: topicSlugValue,
      currentIndex: index,
      allItems: fetchedTopics,
    }),
  ]);

  return (
    <div className="space-y-4">
      <VisitTracker
        level="topic"
        itemId={topic._id}
        itemSlug={topicSlugValue}
        itemName={topic.name}
      />
      <ProgressTracker
        unitId={unit._id}
        chapterId={chapter._id}
        itemType="topic"
        itemId={topic._id}
      />
      <div className="space-y-4">
        {/* Premium Educational Header */}
        <section
          className="
    rounded-xl
    p-3 sm:p-4
    bg-gradient-to-br from-indigo-50 via-white to-purple-50
    border border-indigo-100/60
    shadow-[0_2px_12px_rgba(120,90,200,0.08)]
  "
        >
          <div className="flex items-start sm:items-center justify-between w-full gap-3 sm:gap-4 min-w-0">
            {/* LEFT — Topic Title + Breadcrumb */}
            <div className="flex flex-col min-w-0 flex-1 leading-tight">
              {/* Topic Name */}
              <h1
                className="
          text-base sm:text-lg md:text-xl font-bold text-indigo-900
          truncate
          w-full
        "
                title={topic.name}
              >
                {topic.name}
              </h1>

              {/* Breadcrumb */}
              <p
                className="
          text-[10px] sm:text-xs text-gray-600 mt-0.5
          truncate
          w-full
        "
                title={`${fetchedExam.name} > ${subject.name} > ${unit.name} > ${chapter.name} > ${topic.name}`}
              >
                {fetchedExam.name} &gt; {subject.name} &gt; {unit.name} &gt;{" "}
                {chapter.name} &gt; {topic.name}
              </p>
            </div>

            {/* RIGHT — Unit Progress */}
            <div className="shrink-0 ml-auto">
              <UnitProgressClient
                unitId={unit._id}
                unitName={unit.name}
                initialProgress={0}
              />
            </div>
          </div>
        </section>

        {/* Tabs */}
        <TabsClient
          content={topicDetails?.content}
          examId={fetchedExam._id}
          subjectId={subject._id}
          unitId={unit._id}
          chapterId={chapter._id}
          topicId={topic._id}
          entityName={topic.name}
          entityType="topic"
          subtopics={fetchedSubTopics.map((subTopic, index) => ({
            ...subTopic,
            content: subtopicDetailsArray[index]?.content || "",
          }))}
          examSlug={examSlug}
          subjectSlug={subjectSlugValue}
          unitSlug={unitSlugValue}
          practiceDisabled={subject.practiceDisabled || false}
          chapterSlug={chapterSlugValue}
          topicSlug={topicSlugValue}
        />
        {/* Navigation */}
        <NavigationClient
          backUrl={`/${examSlug}/${subjectSlugValue}/${unitSlugValue}/${chapterSlugValue}`}
          backLabel={`Back to ${chapter.name}`}
          prevNav={prevNav}
          nextNav={nextNav}
        />

        {/* Test List Table */}
        <ConditionalTestListTable
          examId={fetchedExam._id}
          subjectId={subject._id}
          unitId={unit._id}
          chapterId={chapter._id}
          topicId={topic._id}
          practiceDisabled={subject.practiceDisabled || false}
        />

        {/* Chapters Section */}
        <ChaptersSectionClient
          chapters={fetchedChapters}
          unitId={unit._id}
          examSlug={examSlug}
          subjectSlug={subjectSlugValue}
          unitSlug={unitSlugValue}
          examName={fetchedExam.name}
          subjectName={subject.name}
          unitName={unit.name}
          practiceDisabled={subject.practiceDisabled || false}
        />

        {/* Blog Section - assigned to this topic */}
        <AssignedBlogsSection
          examSlug={examSlug}
          examId={fetchedExam._id}
          assignmentLevel="topic"
          assignmentTopicId={topic._id}
        />

        {/* Overview Comment Section */}
        <OverviewCommentSection entityType="topic" entityId={topic._id} />
      </div>
    </div>
  );
};

export default TopicPage;
