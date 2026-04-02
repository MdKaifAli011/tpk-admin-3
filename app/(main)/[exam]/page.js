import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import TabsClient from "../components/TabsClient";
import NavigationClient from "../components/NavigationClient";
import ExamProgressClient from "../components/ExamProgressClient";
import VisitTracker from "../components/VisitTracker";
import {
  fetchExamById,
  fetchSubjectsByExam,
  createSlug,
  fetchExams,
  fetchExamDetailsById,
  fetchUnitsBySubject,
  fetchChaptersByUnit,
} from "../lib/api";
import { getExamInfoByExamId } from "@/lib/getExamInfoServer";
import { getNextExam, getPreviousExam } from "../lib/hierarchicalNavigation";
import {
  generateTabAwareMetadata,
  extractSearchParams,
} from "@/utils/tabSeo";
import { generateMetadata as generateSEO } from "@/utils/seo";
import { logger } from "@/utils/logger";
import AssignedBlogsSection from "@/app/(main)/components/AssignedBlogsSection";
import nextDynamic from "next/dynamic";

const OverviewCommentSection = nextDynamic(
  () => import("@/app/(main)/components/OverviewCommentSection"),
  { ssr: true, loading: () => null }
);

export const revalidate = 60;

/**
 * Generate metadata for exam pages with tab awareness
 * NOTE: Pages receive searchParams, layouts don't in Next.js App Router
 * This metadata will override layout metadata when searchParams are present
 */
export async function generateMetadata({ params, searchParams }) {
  const { exam: examSlug } = await params;

  // Pages receive searchParams correctly in Next.js App Router (searchParams is a Promise in Next.js 15+)
  const resolvedSearchParams = await extractSearchParams(searchParams);

  if (process.env.NODE_ENV === "development") {
    logger.debug("Exam Page - Resolved searchParams:", resolvedSearchParams);
  }

  try {
    const { fetchExamById, fetchExamDetailsById, createSlug } =
      await import("../lib/api");
    // Server-side uses localhost in api.js; no need to pass request host (avoids "fetch failed").
    const exam = await fetchExamById(examSlug).catch(() => null);
    if (!exam)
      return generateSEO(
        {},
        { type: "exam", name: examSlug || "Exam", indexable: false },
      );

    const examDetails = await fetchExamDetailsById(exam._id).catch(() => null);
    const path = `/${createSlug(exam.name)}`;

    return await generateTabAwareMetadata(
      { name: exam.name, type: "exam" },
      examDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: exam.name,
        },
      },
    );
  } catch (error) {
    logger.warn("Error generating exam page metadata:", error);
    return generateSEO(
      {},
      { type: "exam", name: examSlug || "Exam", indexable: false },
    );
  }
}

const ExamPage = async ({ params }) => {
  const { exam: examId } = await params;

  // Fetch exam data (server uses localhost in api.js to avoid "fetch failed" to public host)
  const exam = await fetchExamById(examId);
  if (!exam) {
    notFound();
  }

  // Fetch exam details, exam info (date etc for dashboard), and subjects in parallel
  // Use direct DB fetch for exam info so dashboard always gets data (no API auth/URL dependency)
  const [examDetails, examInfoRaw, subjects] = await Promise.all([
    fetchExamDetailsById(exam._id).catch(() => ({
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    })),
    getExamInfoByExamId(exam._id),
    fetchSubjectsByExam(exam._id || examId),
  ]);

  // Never pass null so client dashboards always have exam date / prep days (default if no ExamInfo in DB)
  const examIdStr = exam._id?.toString?.() ?? String(exam._id ?? "");
  const defaultExamInfo = {
    examId: examIdStr,
    examDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    maximumMarks: 720,
    status: "active",
  };
  const examInfoRawResolved =
    examInfoRaw &&
    (examInfoRaw.examDate != null || examInfoRaw.maximumMarks != null)
      ? examInfoRaw
      : defaultExamInfo;
  // Serialize for Client Components (strip Mongoose/BSON types like ObjectId, Date with toJSON)
  const examInfo = JSON.parse(JSON.stringify(examInfoRawResolved));

  // Fetch units for each subject, then chapters for each unit (for unit-wise chapters overview on Overview tab)
  const subjectsWithUnits = await Promise.all(
    subjects.map(async (subject) => {
      const units = await fetchUnitsBySubject(subject._id, exam._id).catch(
        () => [],
      );
      const unitsWithChapters = await Promise.all(
        (units || []).map(async (unit) => {
          const chapters = await fetchChaptersByUnit(unit._id).catch(() => []);
          return { ...unit, chapters: chapters || [] };
        }),
      );
      return {
        ...subject,
        units: unitsWithChapters,
      };
    }),
  );

  // Calculate navigation
  const allExams = await fetchExams({ limit: 100 });
  const examIndex = allExams.findIndex((e) => e._id === exam._id);
  const examSlug = createSlug(exam.name);

  const [nextNav, prevNav] = await Promise.all([
    getNextExam({
      examId: exam._id,
      examSlug: examSlug,
      currentIndex: examIndex,
      allItems: allExams,
    }),
    getPreviousExam({
      examId: exam._id,
      examSlug: examSlug,
      currentIndex: examIndex,
      allItems: allExams,
    }),
  ]);

  return (
    <div className="space-y-4">
      <VisitTracker
        level="exam"
        itemId={examIdStr}
        itemSlug={examSlug}
        itemName={exam.name}
      />

      <section
        className="hero-section rounded-xl p-3 sm:p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)]"
        aria-labelledby="exam-page-title"
      >
        <div className="flex items-start md:items-center justify-between w-full gap-3 sm:gap-4 min-w-0">
          <div className="flex flex-col min-w-0 flex-1 leading-tight">
            <h1
              id="exam-page-title"
              className="text-lg sm:text-xl font-bold text-indigo-900 truncate w-full"
              title={`${exam.name} Preparation`}
            >
              {exam.name} Preparation
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate w-full" title={`Smart study tools for your ${exam.name} exam.`}>
              Smart study tools for your {exam.name} exam.
            </p>
          </div>
          <div className="hero-right-slot shrink-0 ml-auto flex flex-col justify-center min-h-[44px]">
            <ExamProgressClient examId={examIdStr} />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <TabsClient
        content={examDetails?.content}
        examId={examIdStr}
        initialExamInfo={examInfo}
        entityName={exam.name}
        entityType="exam"
        examSlug={examSlug}
        subjectsWithUnits={JSON.parse(JSON.stringify(subjectsWithUnits))}
      />

      {/* Navigation */}
      <nav aria-label="Previous and next exam navigation">
        <NavigationClient
          backUrl="/"
          backLabel="Back to Home"
          prevNav={prevNav}
          nextNav={nextNav}
        />
      </nav>

      {/* Blog Section - assigned to this exam */}
      <Suspense fallback={<div className="min-h-[120px]" aria-hidden />}>
        <AssignedBlogsSection
          examSlug={examSlug}
          examId={exam._id}
          assignmentLevel="exam"
        />
      </Suspense>

      {/* Overview Comment Section - lazy loaded for smaller initial bundle */}
      <OverviewCommentSection entityType="exam" entityId={examIdStr} />
    </div>
  );
};

export default ExamPage;
