import React from "react";
import { notFound } from "next/navigation";
import MainLayout from "../../../../../../layout/MainLayout";
import TabsClient from "../../../../../../components/TabsClient";
import NavigationClient from "../../../../../../components/NavigationClient";
import ChaptersSectionClient from "../../../../../../components/ChaptersSectionClient";
import UnitProgressClient from "../../../../../../components/UnitProgressClient";
import ProgressTracker from "../../../../../../components/ProgressTracker";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        .catch(() => ({ content: "" }))
    )
  );

  // Find current subtopic index for navigation
  const index = fetchedSubTopics.findIndex(
    (st) =>
      st._id === foundSubTopic._id ||
      createSlug(st.name) === subtopicSlug ||
      st.name?.toLowerCase() === subtopicSlug.toLowerCase()
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
    <MainLayout>
      <ProgressTracker
        unitId={unit._id}
        chapterId={chapter._id}
        itemType="subtopic"
        itemId={subTopic._id}
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
  <div className="flex items-start sm:items-center justify-between w-full gap-3 sm:gap-4">

    {/* LEFT — Subtopic Title + Breadcrumb */}
    <div className="flex flex-col min-w-0 leading-tight flex-1">

      {/* Subtopic Name */}
      <h1
        className="
          text-base sm:text-lg md:text-xl font-bold text-indigo-900
          truncate
          max-w-[180px] sm:max-w-[260px] md:max-w-[320px]
        "
        title={subTopic.name}
      >
        {subTopic.name}
      </h1>

      {/* Breadcrumb */}
      <p
        className="
          text-[10px] sm:text-xs text-gray-600 mt-0.5
          truncate
          max-w-[160px] sm:max-w-[260px] md:max-w-[360px]
        "
        title={`${fetchedExam.name} > ${subject.name} > ${unit.name} > ${chapter.name} > ${topic.name} > ${subTopic.name}`}
      >
        {fetchedExam.name} &gt; {subject.name} &gt; {unit.name} &gt; {chapter.name} &gt; {topic.name} &gt; {subTopic.name}
      </p>
    </div>

    {/* RIGHT — UNIT Progress */}
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
        />

        {/* Definitions Section */}
        {fetchedDefinitions && fetchedDefinitions.length > 0 && (
          <section className="bg-transparent">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                <div className="flex items-start gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                      Definitions
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500">
                      Explore definitions related to this subtopic.
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {fetchedDefinitions.map((definition, index) => {
                  const definitionSlug =
                    definition.slug || createSlug(definition.name);
                  return (
                    <a
                      key={definition._id}
                      href={`/${examSlug}/${subjectSlugValue}/${unitSlugValue}/${chapterSlugValue}/${topicSlugValue}/${subTopicSlugValue}/${definitionSlug}`}
                      className="block px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                            {definition.name}
                          </h3>
                          {definition.orderNumber && (
                            <p className="text-xs text-gray-500 mt-1">
                              Order: {definition.orderNumber}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className="text-xs text-gray-400">→</span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Navigation */}
        <NavigationClient
          backUrl={`/${examSlug}/${subjectSlugValue}/${unitSlugValue}/${chapterSlugValue}/${topicSlugValue}`}
          backLabel={`Back to ${topic.name}`}
          prevNav={prevNav}
          nextNav={nextNav}
        />
      </div>
    </MainLayout>
  );
};

export default SubTopicPage;
