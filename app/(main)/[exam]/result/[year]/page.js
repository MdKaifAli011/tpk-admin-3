import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchExamById, createSlug, fetchExams } from "../../../lib/api";
import { getNextExam, getPreviousExam } from "../../../lib/hierarchicalNavigation";
import ResultPageClient from "../ResultPageClient";
import NavigationClient from "../../../components/NavigationClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { exam: examSlug, year } = await params;
  const exam = await fetchExamById(examSlug).catch(() => null);
  if (!exam) return { title: "Results | Testprepkart" };
  const name = exam.name || examSlug;
  return {
    title: `${name} Result ${year} | Testprepkart`,
    description: `See ${name} ${year} results and toppers. Connect with target achievers and read success stories from Testprepkart students.`,
  };
}

async function fetchResultPageData(examSlug, year) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${process.env.NEXT_PUBLIC_BASE_PATH || "/self-study"}`
    : "http://localhost:3000/self-study";
  const res = await fetch(`${baseUrl}/api/result-page/${examSlug}/${year}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.success ? json.data : null;
}

export default async function ResultYearPage({ params }) {
  const { exam: examSlug, year: yearParam } = await params;
  const year = parseInt(yearParam, 10);
  if (Number.isNaN(year)) notFound();

  const exam = await fetchExamById(examSlug).catch(() => null);
  if (!exam) notFound();

  const examName = exam.name || examSlug;
  const examSlugForLinks = exam.slug || createSlug(examName);
  const data = await fetchResultPageData(examSlugForLinks, year);
  if (!data) notFound();

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

  const yearsList = data.years && data.years.length ? data.years : [year];

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
          <li>
            <Link href={`/${examSlugForLinks}/result`} className="hover:text-indigo-600 transition-colors">
              Result
            </Link>
          </li>
          <li aria-hidden className="text-gray-400">/</li>
          <li className="font-medium text-gray-900">Result {year}</li>
        </ol>
      </nav>

      <ResultPageClient
        examName={examName}
        examSlug={examSlugForLinks}
        initialData={data}
        initialYear={year}
        yearsList={yearsList}
      />

      <nav aria-label="Previous and next exam navigation">
        <div className="mb-3">
          <Link
            href={`/${examSlugForLinks}/result`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to {examName} Result
          </Link>
        </div>
        <NavigationClient prevNav={prevNav} nextNav={nextNav} />
      </nav>
    </div>
  );
}
