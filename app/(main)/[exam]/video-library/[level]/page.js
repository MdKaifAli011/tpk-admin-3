import React from "react";
import { fetchPrimeVideo } from "../../../lib/api";
import { createSlug } from "@/utils/slug";
import PrimeVideoClient from "../../../components/PrimeVideoClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_LEVELS = ["exam", "subject", "unit", "chapter", "topic", "subtopic", "definition"];

/**
 * Hierarchy path or level Video Library page: /{examSlug}/video-library/{pathSlug}
 * - pathSlug = "neet" → only exam-level videos
 * - pathSlug = "neet-subject-1" → only that subject's videos
 * - pathSlug = "neet-subject-1-unit-1" → only that unit's videos (through definition)
 * - pathSlug = "subject" (single level name) → all sections of that level (filterLevel)
 */
export default async function VideoLibraryPathPage({ params }) {
  const resolved = await params;
  const examSlugFromUrl = (resolved?.exam || "").toString().trim();
  const segment = (resolved?.level || "").toString().trim();

  const segmentLower = segment.toLowerCase();
  const isLevelOnly = VALID_LEVELS.includes(segmentLower);

  let exams = [];
  let currentSlug = examSlugFromUrl;

  try {
    const result = await fetchPrimeVideo(examSlugFromUrl);
    const data = result?.data;
    exams = data?.exams || [];

    const examBySlug =
      exams.find((e) => (e.slug || "").toLowerCase() === examSlugFromUrl) ??
      exams.find((e) => createSlug(e.name || "") === examSlugFromUrl);

    currentSlug =
      examBySlug?.slug ??
      (examBySlug ? createSlug(examBySlug.name) : null) ??
      examSlugFromUrl;
  } catch {
    currentSlug = examSlugFromUrl;
  }

  return (
    <div className="space-y-6">
      <PrimeVideoClient
        exams={exams}
        currentExamSlug={currentSlug || undefined}
        filterLevel={isLevelOnly ? segmentLower : undefined}
        filterPathSlug={isLevelOnly ? undefined : segment.toLowerCase()}
      />
    </div>
  );
}
