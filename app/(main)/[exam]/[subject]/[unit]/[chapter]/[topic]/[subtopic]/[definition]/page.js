import React from "react";
import { notFound } from "next/navigation";
import { FaBookOpen } from "react-icons/fa";
import TabsClient from "../../../../../../../components/TabsClient";
import NavigationClient from "../../../../../../../components/NavigationClient";
import ChaptersSectionClient from "../../../../../../../components/ChaptersSectionClient";
import UnitProgressClient from "../../../../../../../components/UnitProgressClient";
import ProgressTracker from "../../../../../../../components/ProgressTracker";
import ConditionalTestListTable from "../../../../../../../components/ConditionalTestListTable";
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
  fetchDefinitionById,
  createSlug,
  findByIdOrSlug,
  fetchDefinitionDetailsById,
} from "../../../../../../../lib/api";
import {
  getNextDefinition,
  getPreviousDefinition,
} from "../../../../../../../lib/hierarchicalNavigation";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";
import { logger } from "@/utils/logger";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Generate metadata for definition pages with tab awareness
 * NOTE: Pages receive searchParams, layouts don't in Next.js App Router
 * This metadata will override layout metadata when searchParams are present
 */
export async function generateMetadata({ params, searchParams }) {
  const { exam: examSlug, subject: subjectSlug, unit: unitSlug, chapter: chapterSlug, topic: topicSlug, subtopic: subtopicSlug, definition: definitionSlug } = await params;
  
  // Pages receive searchParams correctly in Next.js App Router
  const resolvedSearchParams = await extractSearchParams(searchParams);
  
  if (process.env.NODE_ENV === "development") {
    logger.debug("Definition Page - searchParams:", searchParams);
    logger.debug("Definition Page - Resolved searchParams:", resolvedSearchParams);
  }

  try {
    const { fetchExamById, fetchSubjectById, fetchUnitById, fetchChapterById, fetchTopicById, fetchSubTopicById, fetchDefinitionById, fetchDefinitionDetailsById, fetchSubjectsByExam, fetchUnitsBySubject, fetchChaptersByUnit, fetchTopicsByChapter, fetchSubTopicsByTopic, fetchDefinitionsBySubTopic, findByIdOrSlug, createSlug } = await import("../../../../../../../lib/api");
    
    const exam = await fetchExamById(examSlug).catch(() => null);
    if (!exam) return { title: `${definitionSlug || "Definition"} | TestPrepKart` };

    const subjects = await fetchSubjectsByExam(exam._id).catch(() => []);
    const subject = findByIdOrSlug(subjects, subjectSlug);
    if (!subject) return { title: `${definitionSlug || "Definition"} | TestPrepKart` };

    const units = await fetchUnitsBySubject(subject._id, exam._id).catch(() => []);
    const unit = findByIdOrSlug(units, unitSlug);
    if (!unit) return { title: `${definitionSlug || "Definition"} | TestPrepKart` };

    const chapters = await fetchChaptersByUnit(unit._id).catch(() => []);
    const chapter = findByIdOrSlug(chapters, chapterSlug);
    if (!chapter) return { title: `${definitionSlug || "Definition"} | TestPrepKart` };

    const topics = await fetchTopicsByChapter(chapter._id).catch(() => []);
    const topic = findByIdOrSlug(topics, topicSlug);
    if (!topic) return { title: `${definitionSlug || "Definition"} | TestPrepKart` };

    const subtopics = await fetchSubTopicsByTopic(topic._id).catch(() => []);
    const subtopic = findByIdOrSlug(subtopics, subtopicSlug);
    if (!subtopic) return { title: `${definitionSlug || "Definition"} | TestPrepKart` };

    const definitions = await fetchDefinitionsBySubTopic(subtopic._id).catch(() => []);
    const definition = findByIdOrSlug(definitions, definitionSlug);
    if (!definition) return { title: `${definitionSlug || "Definition"} | TestPrepKart` };

    const fullDefinitionData = await fetchDefinitionById(definition._id).catch(() => null);
    const finalDefinition = fullDefinitionData || definition;
    const definitionDetails = await fetchDefinitionDetailsById(finalDefinition._id).catch(() => null);
    const path = `/${createSlug(exam.name)}/${createSlug(subject.name)}/${createSlug(unit.name)}/${createSlug(chapter.name)}/${createSlug(topic.name)}/${createSlug(subtopic.name)}/${createSlug(finalDefinition.name)}`;

    return await generateTabAwareMetadata(
      { name: finalDefinition.name, type: "definition" },
      definitionDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: exam.name,
          subject: subject.name,
          unit: unit.name,
          chapter: chapter.name,
          topic: topic.name,
          subtopic: subtopic.name,
        },
      }
    );
  } catch (error) {
    logger.warn("Error generating definition page metadata:", error);
    return { title: `${definitionSlug || "Definition"} | TestPrepKart` };
  }
}

const DefinitionPage = async ({ params }) => {
  const {
    exam: examId,
    subject: subjectSlug,
    unit: unitSlug,
    chapter: chapterSlug,
    topic: topicSlug,
    subtopic: subtopicSlug,
    definition: definitionSlug,
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
  const fetchedUnits = await fetchUnitsBySubject(
    foundSubject._id,
    examIdValue
  );

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

  // Fetch full subtopic data
  const fullSubTopicData = await fetchSubTopicById(foundSubTopic._id);
  const subTopic = fullSubTopicData || foundSubTopic;

  // Fetch definitions for this subtopic
  const fetchedDefinitions = await fetchDefinitionsBySubTopic(foundSubTopic._id).catch(() => []);

  // Find definition by slug
  const foundDefinition = findByIdOrSlug(fetchedDefinitions, definitionSlug);
  if (!foundDefinition) {
    notFound();
  }

  // Fetch full definition data and details in parallel
  const [fullDefinitionData, definitionDetails] = await Promise.all([
    fetchDefinitionById(foundDefinition._id),
    fetchDefinitionDetailsById(foundDefinition._id).catch(() => ({
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    })),
  ]);

  const definition = fullDefinitionData || foundDefinition;

  // Find current definition index for navigation
  const index = fetchedDefinitions.findIndex(
    (def) =>
      def._id === foundDefinition._id ||
      createSlug(def.name) === definitionSlug ||
      def.name?.toLowerCase() === definitionSlug.toLowerCase()
  );

  const examSlug = createSlug(fetchedExam.name);
  const subjectSlugValue = subject.slug || createSlug(subject.name);
  const unitSlugValue = unit.slug || createSlug(unit.name);
  const chapterSlugValue = chapter.slug || createSlug(chapter.name);
  const topicSlugValue = topic.slug || createSlug(topic.name);
  const subTopicSlugValue = subTopic.slug || createSlug(subTopic.name);

  // Calculate hierarchical navigation
  const [nextNav, prevNav] = await Promise.all([
    getNextDefinition({
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
      allItems: fetchedDefinitions,
    }),
    getPreviousDefinition({
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
      allItems: fetchedDefinitions,
    }),
  ]);

  return (
    <>
      <ProgressTracker
        unitId={unit._id}
        chapterId={chapter._id}
        itemType="definition"
        itemId={definition._id}
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
  <div className="flex items-start md:items-center justify-between w-full gap-3 sm:gap-4 min-w-0">

    {/* LEFT — Definition Title + Breadcrumb */}
    <div className="flex flex-col min-w-0 flex-1 leading-tight">

      {/* Definition Name */}
      <h1
        className="
          text-base sm:text-lg md:text-xl font-bold text-indigo-900
          truncate
          w-full
        "
        title={definition.name}
      >
        {definition.name}
      </h1>

      {/* Breadcrumb */}
      <p
        className="
          text-[10px] sm:text-xs text-gray-600 mt-0.5
          truncate
          w-full
        "
        title={`${fetchedExam.name} > ${subject.name} > ${unit.name} > ${chapter.name} > ${topic.name} > ${subTopic.name} > ${definition.name}`}
      >
        {fetchedExam.name} &gt; {subject.name} &gt; {unit.name} &gt; {chapter.name} &gt; {topic.name} &gt; {subTopic.name} &gt; {definition.name}
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
          content={definitionDetails?.content}
          examId={fetchedExam._id}
          subjectId={subject._id}
          unitId={unit._id}
          chapterId={chapter._id}
          topicId={topic._id}
          subTopicId={subTopic._id}
          entityName={definition.name}
          entityType="definition"
          definitions={fetchedDefinitions}
          currentDefinitionId={definition._id}
          examSlug={examSlug}
          subjectSlug={subjectSlugValue}
          unitSlug={unitSlugValue}
          chapterSlug={chapterSlugValue}
          topicSlug={topicSlugValue}
          subTopicSlug={subTopicSlugValue}
          practiceDisabled={subject.practiceDisabled || false}
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

        {/* Navigation */}
        <NavigationClient
          backUrl={`/${examSlug}/${subjectSlugValue}/${unitSlugValue}/${chapterSlugValue}/${topicSlugValue}/${subTopicSlugValue}`}
          backLabel={`Back to ${subTopic.name}`}
          prevNav={prevNav}
          nextNav={nextNav}
        />
      </div>
    </>
  );
};

export default DefinitionPage;

