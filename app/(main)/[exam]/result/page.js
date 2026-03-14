import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchExamById, createSlug, fetchExams } from "../../lib/api";
import { getNextExam, getPreviousExam } from "../../lib/hierarchicalNavigation";
import ResultPageClient from "./ResultPageClient";
import NavigationClient from "../../components/NavigationClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { exam: examSlug } = await params;
  const exam = await fetchExamById(examSlug).catch(() => null);
  if (!exam) return { title: "Results | Testprepkart" };
  const name = exam.name || examSlug;
  const currentYear = new Date().getFullYear();
  return {
    title: `${name} Result ${currentYear} | Testprepkart`,
    description: `See ${name} ${currentYear} results and toppers. Connect with target achievers and read success stories from Testprepkart students.`,
  };
}

export default async function ExamResultPage({ params }) {
  const { exam: examSlug } = await params;
  const exam = await fetchExamById(examSlug).catch(() => null);
  if (!exam) notFound();

  const examName = exam.name || examSlug;
  const examSlugForLinks = exam.slug || createSlug(examName);
  const currentYear = new Date().getFullYear();

  const allExams = await fetchExams({ limit: 100 });
  const examIndex = allExams.findIndex((e) => e._id === exam._id);
  const [nextNav, prevNav] = await Promise.all([
    getNextExam({
      examId: exam._id,
      examSlug: examSlugForLinks,
      currentIndex: examIndex,
      allItems: allExams,
    }),
    getPreviousExam({
      examId: exam._id,
      examSlug: examSlugForLinks,
      currentIndex: examIndex,
      allItems: allExams,
    }),
  ]);

  return (
    <div className="space-y-6 py-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-600">
          <li>
            <Link
              href="/"
              className="hover:text-indigo-600 transition-colors"
            >
              Home
            </Link>
          </li>
          <li aria-hidden className="text-gray-400">/</li>
          <li>
            <Link
              href={`/${examSlugForLinks}`}
              className="hover:text-indigo-600 transition-colors"
            >
              {examName}
            </Link>
          </li>
          <li aria-hidden className="text-gray-400">/</li>
          <li className="font-medium text-gray-900">
            Result {currentYear}
          </li>
        </ol>
      </nav>

      <ResultPageClient
        examName={examName}
        examSlug={examSlugForLinks}
        currentYear={currentYear}
      />

      <nav aria-label="Previous and next exam navigation">
        <div className="mb-3">
          <Link
            href={`/${examSlugForLinks}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to {examName}
          </Link>
        </div>
        <NavigationClient prevNav={prevNav} nextNav={nextNav} />
      </nav>
    </div>
  );
}
