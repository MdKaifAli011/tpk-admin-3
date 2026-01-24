import React from "react";
import { notFound } from "next/navigation";
import { FaGraduationCap } from "react-icons/fa";
import ListItem from "../components/ListItem";
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
} from "../lib/api";
import { ERROR_MESSAGES, PLACEHOLDERS } from "@/constants";
import { getNextExam, getPreviousExam } from "../lib/hierarchicalNavigation";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";
import { logger } from "@/utils/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Generate metadata for exam pages with tab awareness
 * NOTE: Pages receive searchParams, layouts don't in Next.js App Router
 * This metadata will override layout metadata when searchParams are present
 */
export async function generateMetadata({ params, searchParams }) {
  const { exam: examSlug } = await params;
  
  // Pages receive searchParams correctly in Next.js App Router
  const resolvedSearchParams = await extractSearchParams(searchParams);
  
  if (process.env.NODE_ENV === "development") {
    logger.debug("Exam Page - searchParams:", searchParams);
    logger.debug("Exam Page - Resolved searchParams:", resolvedSearchParams);
  }

  try {
    const { fetchExamById, fetchExamDetailsById, createSlug } = await import("../lib/api");
    const exam = await fetchExamById(examSlug).catch(() => null);
    if (!exam) return { title: `${examSlug || "Exam"} | TestPrepKart` };

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
      }
    );
  } catch (error) {
    logger.warn("Error generating exam page metadata:", error);
    return { title: `${examSlug || "Exam"} | TestPrepKart` };
  }
}

const ExamPage = async ({ params }) => {
  const { exam: examId } = await params;

  // Fetch exam data
  const exam = await fetchExamById(examId);
  if (!exam) {
    notFound();
  }

  // Fetch exam details and subjects in parallel
  const [examDetails, subjects] = await Promise.all([
    fetchExamDetailsById(exam._id).catch(() => ({
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    })),
    fetchSubjectsByExam(exam._id || examId),
  ]);

  // Fetch units for each subject
  const subjectsWithUnits = await Promise.all(
    subjects.map(async (subject) => {
      const units = await fetchUnitsBySubject(subject._id, exam._id).catch(
        () => []
      );
      return {
        ...subject,
        units: units || [],
      };
    })
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
        itemId={exam._id} 
        itemSlug={examSlug} 
        itemName={exam.name} 
      />
      
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

    {/* LEFT — Exam Title + Description */}
    <div className="flex flex-col min-w-0 flex-1 leading-tight">

      <h1
        className="
          text-lg sm:text-xl font-bold text-indigo-900
          truncate
          w-full
        "
        title={`${exam.name} Preparation`}
      >
        {exam.name} Preparation
      </h1>

      <p
        className="
          text-[10px] sm:text-xs text-gray-600 mt-0.5
          truncate
          w-full
        "
        title={`Smart study tools for your ${exam.name} exam.`}
      >
        Smart study tools for your {exam.name} exam.
      </p>
    </div>

    {/* RIGHT — Exam Progress */}
    <div className="shrink-0 ml-auto">
      <ExamProgressClient examId={exam._id} />
    </div>

  </div>
</section>



        {/* Tabs */}
        <TabsClient
          content={examDetails?.content}
          examId={exam._id}
          entityName={exam.name}
          entityType="exam"
          examSlug={examSlug}
          subjectsWithUnits={subjectsWithUnits}
        />

        {/* Navigation */}
        <NavigationClient
          backUrl="/"
          backLabel="Back to Home"
          prevNav={prevNav}
          nextNav={nextNav}
        />
      </div>
  );
};

export default ExamPage;
