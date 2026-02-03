import React from "react";
import { fetchPrimeVideo } from "../../lib/api";
import { createSlug } from "@/utils/slug";
import PrimeVideoClient from "../../components/PrimeVideoClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Video Library page at /{examSlug}/video-library only (no /video-library path).
 * With basePath /self-study: /self-study/{examSlug}/video-library.
 * No redirects: always render for the URL slug; empty state if no match.
 */
export default async function ExamVideoLibraryPage({ params }) {
  const resolvedParams = await params;
  const examSlugFromUrl = (resolvedParams?.exam || "").toString().trim();
  const slug = examSlugFromUrl.toLowerCase();

  let exams = [];
  let currentSlug = slug;

  try {
    const result = await fetchPrimeVideo();
    const data = result?.data;
    exams = data?.exams || [];

    const examBySlug =
      exams.find((e) => (e.slug || "").toLowerCase() === slug) ??
      exams.find((e) => createSlug(e.name || "") === slug);

    currentSlug =
      examBySlug?.slug ??
      (examBySlug ? createSlug(examBySlug.name) : null) ??
      slug;
  } catch {
    currentSlug = slug;
  }

  return (
    <div className="space-y-6">
      <PrimeVideoClient exams={exams} currentExamSlug={currentSlug || undefined} />
    </div>
  );
}
