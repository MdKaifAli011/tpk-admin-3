import React from "react";
import { notFound } from "next/navigation";
import { FaBook } from "react-icons/fa";
import TabsClient from "../../../../components/TabsClient";
import NavigationClient from "../../../../components/NavigationClient";
import ChaptersSectionClient from "../../../../components/ChaptersSectionClient";
import UnitProgressClient from "../../../../components/UnitProgressClient";
import ProgressTracker from "../../../../components/ProgressTracker";
import ChapterCompletionTracker from "../../../../components/ChapterCompletionTracker";
import {
  fetchExamById,
  fetchSubjectsByExam,
  fetchSubjectById,
  fetchUnitsBySubject,
  fetchUnitById,
  fetchChaptersByUnit,
  fetchChapterById,
  fetchTopicsByChapter,
  createSlug,
  findByIdOrSlug,
  fetchChapterDetailsById,
} from "../../../../lib/api";
import {
  getNextChapter,
  getPreviousChapter,
} from "../../../../lib/hierarchicalNavigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ChapterPage = async ({ params }) => {
  const {
    exam: examId,
    subject: subjectSlug,
    unit: unitSlug,
    chapter: chapterSlug,
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

  // Fetch full chapter data, details, and topics in parallel
  const [fullChapterData, chapterDetails, fetchedTopics] = await Promise.all([
    fetchChapterById(foundChapter._id),
    fetchChapterDetailsById(foundChapter._id).catch(() => ({
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    })),
    fetchTopicsByChapter(foundChapter._id),
  ]);

  const chapter = fullChapterData || foundChapter;

  // Find current chapter index for navigation
  const chapterIndex = fetchedChapters.findIndex(
    (c) =>
      c._id === foundChapter._id ||
      createSlug(c.name) === chapterSlug ||
      c.name?.toLowerCase() === chapterSlug.toLowerCase()
  );

  const examSlug = createSlug(fetchedExam.name);
  const subjectSlugValue = subject.slug || createSlug(subject.name);
  const unitSlugValue = unit.slug || createSlug(unit.name);
  const chapterSlugValue = chapter.slug || createSlug(chapter.name);

  // Calculate hierarchical navigation
  const [nextNav, prevNav] = await Promise.all([
    getNextChapter({
      examId: examIdValue,
      examSlug: examSlug,
      subjectId: foundSubject._id,
      subjectSlug: subjectSlugValue,
      unitId: foundUnit._id,
      unitSlug: unitSlugValue,
      chapterId: foundChapter._id,
      chapterSlug: chapterSlugValue,
      currentIndex: chapterIndex,
      allItems: fetchedChapters,
    }),
    getPreviousChapter({
      examId: examIdValue,
      examSlug: examSlug,
      subjectId: foundSubject._id,
      subjectSlug: subjectSlugValue,
      unitId: foundUnit._id,
      unitSlug: unitSlugValue,
      chapterId: foundChapter._id,
      chapterSlug: chapterSlugValue,
      currentIndex: chapterIndex,
      allItems: fetchedChapters,
    }),
  ]);

  return (
    <>
      <ProgressTracker
        unitId={unit._id}
        chapterId={chapter._id}
        itemType="chapter"
        itemId={chapter._id}
      />
      {/* Chapter Completion Tracker - Shows congratulations when chapter is completed */}
      <ChapterCompletionTracker
        chapterId={chapter._id}
        chapterName={chapter.name}
        unitId={unit._id}
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

    {/* LEFT — Unit Title + Breadcrumb */}
    <div className="flex flex-col min-w-0 leading-tight flex-1">

      {/* Unit Name */}
      <h1
        className="
          text-base sm:text-lg md:text-xl font-bold text-indigo-900
          truncate
          max-w-[180px] sm:max-w-[260px] md:max-w-[320px]
        "
        title={unit.name}
      >
        {unit.name}
      </h1>

      {/* Breadcrumb */}
      <p
        className="
          text-[10px] sm:text-xs text-gray-600 mt-0.5
          truncate
          max-w-[160px] sm:max-w-[260px] md:max-w-[350px]
        "
        title={`${fetchedExam.name} > {subject.name} > ${unit.name}`}
      >
        {fetchedExam.name} &gt; {subject.name} &gt; {unit.name}
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
          content={chapterDetails?.content}
          examId={fetchedExam._id}
          subjectId={subject._id}
          unitId={unit._id}
          chapterId={chapter._id}
          entityName={chapter.name}
          entityType="chapter"
          topics={fetchedTopics}
          examSlug={examSlug}
          subjectSlug={subjectSlugValue}
          unitSlug={unitSlugValue}
          chapterSlug={chapterSlugValue}
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
          backUrl={`/${examSlug}/${subjectSlugValue}/${unitSlugValue}`}
          backLabel={`Back to ${unit.name}`}
          prevNav={prevNav}
          nextNav={nextNav}
        />
      </div>
    </>
  );
};

export default ChapterPage;
