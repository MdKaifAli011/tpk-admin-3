import React from "react";
import { notFound } from "next/navigation";
import TabsClient from "../../../../../../components/TabsClient";
import NavigationClient from "../../../../../../components/NavigationClient";
import ChaptersSectionClient from "../../../../../../components/ChaptersSectionClient";
import UnitProgressClient from "../../../../../../components/UnitProgressClient";
import ProgressTracker from "../../../../../../components/ProgressTracker";
import DefinitionPreviewClient from "../../../../../../components/DefinitionPreviewClient";
import ConditionalTestListTable from "../../../../../../components/ConditionalTestListTable";
import VisitTracker from "../../../../../../components/VisitTracker";
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
  fetchSubTopicById,
  fetchDefinitionsBySubTopic,
  createSlug,
  findByIdOrSlug,
  fetchSubTopicDetailsById,
  fetchDefinitionDetailsById,
} from "../../../../../../lib/api";
import {
  getNextSubtopic,
  getPreviousSubtopic,
} from "../../../../../../lib/hierarchicalNavigation";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";
import { logger } from "@/utils/logger";
import OverviewCommentSection from "@/app/(main)/components/OverviewCommentSection";
import AssignedBlogsSection from "@/app/(main)/components/AssignedBlogsSection";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Generate metadata for subtopic pages with tab awareness
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
    subtopic: subtopicSlug,
  } = await params;

  // Pages receive searchParams correctly in Next.js App Router
  const resolvedSearchParams = await extractSearchParams(searchParams);

  if (process.env.NODE_ENV === "development") {
    logger.debug("Subtopic Page - searchParams:", searchParams);
    logger.debug(
      "Subtopic Page - Resolved searchParams:",
      resolvedSearchParams,
    );
  }

  try {
    const {
      fetchExamById,
      fetchSubjectById,
      fetchUnitById,
      fetchChapterById,
      fetchTopicById,
      fetchSubTopicById,
      fetchSubTopicDetailsById,
      fetchSubjectsByExam,
      fetchUnitsBySubject,
      fetchChaptersByUnit,
      fetchTopicsByChapter,
      fetchSubTopicsByTopic,
      findByIdOrSlug,
      createSlug,
    } = await import("../../../../../../lib/api");

    const exam = await fetchExamById(examSlug).catch(() => null);
    if (!exam) return { title: `${subtopicSlug || "Subtopic"} | Testprepkart` };

    const subjects = await fetchSubjectsByExam(exam._id).catch(() => []);
    const subject = findByIdOrSlug(subjects, subjectSlug);
    if (!subject)
      return { title: `${subtopicSlug || "Subtopic"} | Testprepkart` };

    const units = await fetchUnitsBySubject(subject._id, exam._id).catch(
      () => [],
    );
    const unit = findByIdOrSlug(units, unitSlug);
    if (!unit) return { title: `${subtopicSlug || "Subtopic"} | Testprepkart` };

    const chapters = await fetchChaptersByUnit(unit._id).catch(() => []);
    const chapter = findByIdOrSlug(chapters, chapterSlug);
    if (!chapter)
      return { title: `${subtopicSlug || "Subtopic"} | Testprepkart` };

    const topics = await fetchTopicsByChapter(chapter._id).catch(() => []);
    const topic = findByIdOrSlug(topics, topicSlug);
    if (!topic)
      return { title: `${subtopicSlug || "Subtopic"} | Testprepkart` };

    const subtopics = await fetchSubTopicsByTopic(topic._id).catch(() => []);
    const subtopic = findByIdOrSlug(subtopics, subtopicSlug);
    if (!subtopic)
      return { title: `${subtopicSlug || "Subtopic"} | Testprepkart` };

    const fullSubTopicData = await fetchSubTopicById(subtopic._id).catch(
      () => null,
    );
    const finalSubtopic = fullSubTopicData || subtopic;
    const subtopicDetails = await fetchSubTopicDetailsById(
      finalSubtopic._id,
    ).catch(() => null);
    const path = `/${createSlug(exam.name)}/${createSlug(subject.name)}/${createSlug(unit.name)}/${createSlug(chapter.name)}/${createSlug(topic.name)}/${createSlug(finalSubtopic.name)}`;

    return await generateTabAwareMetadata(
      { name: finalSubtopic.name, type: "subtopic" },
      subtopicDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: exam.name,
          subject: subject.name,
          unit: unit.name,
          chapter: chapter.name,
          topic: topic.name,
          subtopic: finalSubtopic.name,
        },
      },
    );
  } catch (error) {
    logger.warn("Error generating subtopic page metadata:", error);
    return { title: `${subtopicSlug || "Subtopic"} | Testprepkart` };
  }
}

const SubTopicPage = async ({ params }) => {
  const {
    exam: examId,
    subject: subjectSlug,
    unit: unitSlug,
    chapter: chapterSlug,
    topic: topicSlug,
    subtopic: subtopicSlug,
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

  // Fetch full topic data
  const fullTopicData = await fetchTopicById(foundTopic._id);
  const topic = fullTopicData || foundTopic;

  // Fetch subtopics for this topic
  const fetchedSubTopics = await fetchSubTopicsByTopic(foundTopic._id);

  // Find subtopic by slug
  const foundSubTopic = findByIdOrSlug(fetchedSubTopics, subtopicSlug);
  if (!foundSubTopic) {
    notFound();
  }

  // Fetch full subtopic data, details, and definitions in parallel
  const [fullSubTopicData, subTopicDetails, fetchedDefinitions] =
    await Promise.all([
      fetchSubTopicById(foundSubTopic._id),
      fetchSubTopicDetailsById(foundSubTopic._id).catch(() => ({
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      })),
      fetchDefinitionsBySubTopic(foundSubTopic._id).catch(() => []),
    ]);

  const subTopic = fullSubTopicData || foundSubTopic;

  // Fetch definition details (content only) for all definitions in parallel
  const definitionDetailsArray = await Promise.all(
    fetchedDefinitions.map((definition) =>
      fetchDefinitionDetailsById(definition._id)
        .then((details) => ({ content: details?.content || "" }))
        .catch(() => ({ content: "" })),
    ),
  );

  // Find current subtopic index for navigation
  const index = fetchedSubTopics.findIndex(
    (st) =>
      st._id === foundSubTopic._id ||
      createSlug(st.name) === subtopicSlug ||
      st.name?.toLowerCase() === subtopicSlug.toLowerCase(),
  );

  const examSlug = createSlug(fetchedExam.name);
  const subjectSlugValue = subject.slug || createSlug(subject.name);
  const unitSlugValue = unit.slug || createSlug(unit.name);
  const chapterSlugValue = chapter.slug || createSlug(chapter.name);
  const topicSlugValue = topic.slug || createSlug(topic.name);
  const subTopicSlugValue = subTopic.slug || createSlug(subTopic.name);

  // Calculate hierarchical navigation
  const [nextNav, prevNav] = await Promise.all([
    getNextSubtopic({
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
      subTopicId: foundSubTopic._id,
      subTopicSlug: subTopicSlugValue,
      currentIndex: index,
      allItems: fetchedSubTopics,
    }),
    getPreviousSubtopic({
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
      subTopicId: foundSubTopic._id,
      subTopicSlug: subTopicSlugValue,
      currentIndex: index,
      allItems: fetchedSubTopics,
    }),
  ]);

  return (
    <div className="space-y-4">
      <VisitTracker
        level="subtopic"
        itemId={subTopic._id}
        itemSlug={subTopicSlugValue}
        itemName={subTopic.name}
      />
      <ProgressTracker
        unitId={unit._id}
        chapterId={chapter._id}
        itemType="subtopic"
        itemId={subTopic._id}
      />
      <div className="space-y-4">
        {/* Premium Educational Header */}
        <section
          className="hero-section rounded-xl p-3 sm:p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)]"
          aria-labelledby="subtopic-page-title"
        >
          <div className="flex items-start sm:items-center justify-between w-full gap-3 sm:gap-4 min-w-0">
            <div className="flex flex-col min-w-0 flex-1 leading-tight">
              <h1
                id="subtopic-page-title"
                className="text-base sm:text-lg md:text-xl font-bold text-indigo-900 truncate w-full"
                title={subTopic.name}
              >
                {subTopic.name}
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate w-full" title={`${fetchedExam.name} > ${subject.name} > ${unit.name} > ${chapter.name} > ${topic.name} > ${subTopic.name}`}>
                {fetchedExam.name} &gt; {subject.name} &gt; {unit.name} &gt; {chapter.name} &gt; {topic.name} &gt; {subTopic.name}
              </p>
            </div>
            <div className="hero-right-slot shrink-0 ml-auto flex flex-col justify-center">
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
          content={subTopicDetails?.content}
          examId={fetchedExam._id}
          subjectId={subject._id}
          unitId={unit._id}
          chapterId={chapter._id}
          topicId={topic._id}
          subTopicId={subTopic._id}
          entityName={subTopic.name}
          entityType="subtopic"
          definitions={fetchedDefinitions.map((definition, index) => ({
            ...definition,
            content: definitionDetailsArray[index]?.content || "",
          }))}
          examSlug={examSlug}
          subjectSlug={subjectSlugValue}
          unitSlug={unitSlugValue}
          chapterSlug={chapterSlugValue}
          topicSlug={topicSlugValue}
          subTopicSlug={subTopicSlugValue}
          practiceDisabled={subject.practiceDisabled || false}
        />

        {/* Navigation */}
        <NavigationClient
          backUrl={`/${examSlug}/${subjectSlugValue}/${unitSlugValue}/${chapterSlugValue}/${topicSlugValue}`}
          backLabel={`Back to ${topic.name}`}
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
          subTopicId={subTopic._id}
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

        {/* Blog Section - assigned to this subtopic */}
        <AssignedBlogsSection
          examSlug={examSlug}
          examId={fetchedExam._id}
          assignmentLevel="subtopic"
          assignmentSubTopicId={subTopic._id}
        />

        {/* Overview Comment Section */}
        <OverviewCommentSection entityType="subtopic" entityId={subTopic._id} />
      </div>
    </div>
  );
};

export default SubTopicPage;
