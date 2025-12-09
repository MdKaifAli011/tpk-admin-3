import React from "react";
import { notFound } from "next/navigation";
import MainLayout from "../layout/MainLayout";
import { FaGraduationCap } from "react-icons/fa";
import ListItem from "../components/ListItem";
import TabsClient from "../components/TabsClient";
import NavigationClient from "../components/NavigationClient";
import ExamProgressClient from "../components/ExamProgressClient";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <MainLayout>
      <div className="space-y-4">
      <section
  className="rounded-xl p-3 sm:p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)]"
>
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5">

    <div className="leading-tight">
      <h1 className="text-lg sm:text-xl font-bold text-indigo-900">
        {exam.name} Preparation
      </h1>

      <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
        Smart study tools for your {exam.name} exam.
      </p>
    </div>

    <ExamProgressClient examId={exam._id} />

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
    </MainLayout>
  );
};

export default ExamPage;
