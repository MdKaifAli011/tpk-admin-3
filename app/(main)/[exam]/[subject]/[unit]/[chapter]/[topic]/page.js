import React from "react";
import { notFound } from "next/navigation";
import MainLayout from "../../../../../layout/MainLayout";
import { FaFileAlt } from "react-icons/fa";
import TabsClient from "../../../../../components/TabsClient";
import NavigationClient from "../../../../../components/NavigationClient";
import ChaptersSectionClient from "../../../../../components/ChaptersSectionClient";
import UnitProgressClient from "../../../../../components/UnitProgressClient";
import ProgressTracker from "../../../../../components/ProgressTracker";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        .catch(() => ({ content: "" }))
    )
  );

  // Find current topic index for navigation
  const index = fetchedTopics.findIndex(
    (t) =>
      t._id === foundTopic._id ||
      createSlug(t.name) === topicSlug ||
      t.name?.toLowerCase() === topicSlug.toLowerCase()
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
    <MainLayout>
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
  <div className="flex items-start sm:items-center justify-between w-full gap-3 sm:gap-4">

    {/* LEFT — Topic Title + Breadcrumb */}
    <div className="flex flex-col min-w-0 leading-tight flex-1">

      {/* Topic Name */}
      <h1
        className="
          text-base sm:text-lg md:text-xl font-bold text-indigo-900
          truncate
          max-w-[180px] sm:max-w-[260px] md:max-w-[320px]
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
          max-w-[160px] sm:max-w-[260px] md:max-w-[350px]
        "
        title={`${fetchedExam.name} > ${subject.name} > ${unit.name} > ${chapter.name} > ${topic.name}`}
      >
        {fetchedExam.name} &gt; {subject.name} &gt; {unit.name} &gt; {chapter.name} &gt; {topic.name}
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
          chapterSlug={chapterSlugValue}
          topicSlug={topicSlugValue}
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

        {/* Navigation */}
        <NavigationClient
          backUrl={`/${examSlug}/${subjectSlugValue}/${unitSlugValue}/${chapterSlugValue}`}
          backLabel={`Back to ${chapter.name}`}
          prevNav={prevNav}
          nextNav={nextNav}
        />
      </div>
    </MainLayout>
  );
};

export default TopicPage;
