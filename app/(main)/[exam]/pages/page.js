import React, { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaChevronLeft } from "react-icons/fa";
import connectDB from "@/lib/mongodb";
import Page from "@/models/Page";
import Exam from "@/models/Exam";
import { createSlug } from "../../lib/api";
import ExamPagesListClient, { ExamPagesSearchInput } from "./ExamPagesListClient";

export const dynamic = "force-dynamic";

const getExamAndPages = cache(async function getExamAndPages(examSlug) {
  if (!examSlug) return null;
  await connectDB();
  const exam = await Exam.findOne({ slug: examSlug }).select("_id name slug").lean();
  if (!exam) return null;
  const pages = await Page.find({
    exam: exam._id,
    deletedAt: null,
    status: "active",
  })
    .select("title slug metaTitle metaDescription updatedAt")
    .sort({ title: 1 })
    .lean();
  return {
    exam: { ...exam, _id: exam._id.toString() },
    pages: pages.map((p) => ({
      ...p,
      _id: p._id.toString(),
    })),
  };
});

export async function generateMetadata({ params }) {
  const { exam: examSlug } = await params;
  const data = await getExamAndPages(examSlug);
  if (!data) {
    return { title: "Pages" };
  }
  const examName = data.exam.name || "Exam";
  return {
    title: `${examName} — Pages`,
    description: `Browse custom pages for ${examName}.`,
    robots: "index, follow",
  };
}

export default async function ExamPagesIndexPage({ params }) {
  const { exam: examSlug } = await params;
  const data = await getExamAndPages(examSlug);

  if (!data) {
    notFound();
  }

  const { exam, pages } = data;
  const examNameUpper = exam.name ? exam.name.toUpperCase() : "EXAM";
  const examSlugForLinks = createSlug(exam.name);
  const homeHref = `/${examSlugForLinks}`;

  const items = pages.map((p) => ({
    id: p._id,
    title: p.title || "Untitled",
    slug: p.slug,
    excerpt:
      (p.metaDescription && p.metaDescription.trim()) ||
      (p.metaTitle && p.metaTitle.trim()) ||
      "",
    updatedLabel: new Date(p.updatedAt || Date.now()).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ExamPagesListClient pages={items} examSlug={examSlugForLinks}>
      <div className="space-y-4">
        <section
          className="hero-section rounded-xl p-3 sm:p-4 bg-linear-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)]"
          aria-labelledby="exam-pages-title"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-3 sm:gap-4">
            <div className="flex flex-col min-w-0 leading-tight flex-1">
              <Link
                href={homeHref}
                className="text-[10px] sm:text-xs font-medium text-indigo-600 hover:text-indigo-800 mb-1 inline-flex items-center gap-1 w-fit"
              >
                <FaChevronLeft className="text-[10px]" aria-hidden />
                Back to exam
              </Link>
              <h1
                id="exam-pages-title"
                className="text-lg sm:text-xl font-bold text-indigo-900 min-w-0 wrap-break-word"
                title={`${examNameUpper} Pages`}
              >
                {examNameUpper} Pages
              </h1>
              <p
                className="text-[10px] sm:text-xs text-gray-600 mt-0.5 min-w-0 max-w-full sm:line-clamp-2"
                title={`Custom pages and resources for ${exam.name} aspirants.`}
              >
                Custom pages and resources for {exam.name} aspirants.
              </p>
            </div>

            <div className="w-full md:w-auto md:shrink-0 md:ml-auto">
              <ExamPagesSearchInput />
            </div>
          </div>
        </section>
      </div>
    </ExamPagesListClient>
  );
}
