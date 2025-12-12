import React from "react";
import { notFound } from "next/navigation";
import MainLayout from "../../layout/MainLayout";
import { FaGraduationCap } from "react-icons/fa";
import TabsClient from "../../components/TabsClient";
import NavigationClient from "../../components/NavigationClient";
import UnitsSectionClient from "../../components/UnitsSectionClient";
import SubjectProgressClient from "../../components/SubjectProgressClient";
import SubjectCompletionTracker from "../../components/SubjectCompletionTracker";
import {
  fetchExamById,
  fetchSubjectsByExam,
  fetchSubjectById,
  fetchUnitsBySubject,
  createSlug,
  findByIdOrSlug,
  fetchSubjectDetailsById,
} from "../../lib/api";
import {
  getNextSubject,
  getPreviousSubject,
} from "../../lib/hierarchicalNavigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SubjectPage = async ({ params }) => {
  const { exam: examId, subject: subjectSlug } = await params;

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

  // Fetch full subject data and details in parallel
  const [fullSubjectData, subjectDetails, fetchedUnits] = await Promise.all([
    fetchSubjectById(foundSubject._id),
    fetchSubjectDetailsById(foundSubject._id).catch(() => ({
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    })),
    fetchUnitsBySubject(foundSubject._id, examIdValue),
  ]);

  const subject = fullSubjectData || foundSubject;

  // Find current subject index for navigation
  const subjectIndex = fetchedSubjects.findIndex(
    (s) =>
      s._id === foundSubject._id ||
      createSlug(s.name) === subjectSlug ||
      s.name?.toLowerCase() === subjectSlug.toLowerCase()
  );

  const examSlug = createSlug(fetchedExam.name);
  const subjectSlugValue = subject.slug || createSlug(subject.name);

  // Calculate hierarchical navigation
  const [nextNav, prevNav] = await Promise.all([
    getNextSubject({
      examId: examIdValue,
      examSlug: examSlug,
      subjectId: foundSubject._id,
      subjectSlug: subjectSlugValue,
      currentIndex: subjectIndex,
      allItems: fetchedSubjects,
    }),
    getPreviousSubject({
      examId: examIdValue,
      examSlug: examSlug,
      subjectId: foundSubject._id,
      subjectSlug: subjectSlugValue,
      currentIndex: subjectIndex,
      allItems: fetchedSubjects,
    }),
  ]);

  return (
    <MainLayout>
      <div className="space-y-4">
{/* Premium Educational Header */}
<section
  className="
    rounded-xl
    p-3 sm:p-4
    bg-gradient-to-br from-indigo-50 via-white to-purple-50
    border border-indigo-100/60
    shadow-[0_2px_12px_rgba(100,70,200,0.08)]
  "
>
  <div className="flex items-start sm:items-center justify-between w-full gap-3 sm:gap-4">

    {/* LEFT — Title + Breadcrumb */}
    <div className="flex flex-col min-w-0 flex-1">
      <h1
        className="
          text-base sm:text-lg md:text-xl font-bold text-indigo-900
          truncate
          max-w-[180px] sm:max-w-[260px] md:max-w-[320px]
        "
        title={subject.name}
      >
        {subject.name}
      </h1>

      <p
        className="
          text-[10px] sm:text-xs text-gray-600 mt-0.5
          truncate
          max-w-[160px] sm:max-w-[220px]
        "
        title={`${fetchedExam.name} > ${subject.name}`}
      >
        {fetchedExam.name} &gt; {subject.name}
      </p>
    </div>

    {/* RIGHT — Progress Block (SubjectProgressClient) */}
    <div className="shrink-0 ml-auto">
      <SubjectProgressClient
        subjectId={subject._id}
        subjectName={subject.name}
        unitIds={fetchedUnits.map((unit) => unit._id)}
        initialProgress={0}
      />
    </div>
  </div>
</section>


        {/* Tabs */}
        <TabsClient
          content={subjectDetails?.content}
          examId={fetchedExam._id}
          subjectId={subject._id}
          entityName={subject.name}
          entityType="subject"
          unitsCount={fetchedUnits.length}
          examSlug={examSlug}
          subjectSlug={subjectSlugValue}
          units={fetchedUnits}
        />

        {/* Units Section */}
        <UnitsSectionClient
          units={fetchedUnits}
          subjectId={subject._id}
          examSlug={examSlug}
          subjectSlug={subjectSlugValue}
          examName={fetchedExam.name}
          subjectName={subject.name}
        />

        {/* Navigation */}
        <NavigationClient
          backUrl={`/${examSlug}`}
          backLabel={`Back to ${fetchedExam.name}`}
          prevNav={prevNav}
          nextNav={nextNav}
        />

        {/* Subject Completion Tracker */}
        <SubjectCompletionTracker
          subjectId={subject._id}
          subjectName={subject.name}
          unitIds={fetchedUnits.map((unit) => unit._id)}
        />
      </div>
    </MainLayout>
  );
};

export default SubjectPage;
