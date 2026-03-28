import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { fetchExamById, createSlug, fetchExams } from "../../lib/api";
import { getNextExam, getPreviousExam } from "../../lib/hierarchicalNavigation";
import ResultYearsList from "./ResultYearsList";
import NavigationClient from "../../components/NavigationClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { exam: examSlug } = await params;
  const exam = await fetchExamById(examSlug).catch(() => null);
  if (!exam) return { title: "Results | Testprepkart" };
  const name = exam.name || examSlug;
  return {
    title: `${name} Results | Testprepkart`,
    description: `See ${name} results by year. View toppers, target achievers, and success stories.`,
  };
}

async function fetchResultYears(examSlug) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${process.env.NEXT_PUBLIC_BASE_PATH || "/self-study"}`
    : "http://localhost:3000/self-study";
  const res = await fetch(`${baseUrl}/api/result-page/${examSlug}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.success ? json.data : null;
}

export default async function ResultIndexPage({ params }) {
  const { exam: examSlug } = await params;
  const exam = await fetchExamById(examSlug).catch(() => null);
  if (!exam) notFound();

  const examName = exam.name || examSlug;
  const examSlugForLinks = exam.slug || createSlug(examName);
  const resultData = await fetchResultYears(examSlugForLinks);
  const years = resultData?.years ?? [];
  if (years.length === 1) {
    redirect(`/${examSlugForLinks}/result/${years[0]}`);
  }

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
    <div className="space-y-6 py-4 exam-hub-min-h">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-600">
          <li>
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden className="text-gray-400">/</li>
          <li>
            <Link href={`/${examSlugForLinks}`} className="hover:text-indigo-600 transition-colors">
              {examName}
            </Link>
          </li>
          <li aria-hidden className="text-gray-400">/</li>
          <li className="font-medium text-gray-900">Result</li>
        </ol>
      </nav>

      <ResultYearsList
        examName={examName}
        examSlug={examSlugForLinks}
        years={years}
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
