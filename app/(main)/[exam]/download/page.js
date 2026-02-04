import React from "react";
import { notFound } from "next/navigation";
import {
  fetchExamById,
  createSlug,
} from "../../lib/api";
import DownloadPageClient from "./DownloadPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DownloadPage = async ({ params }) => {
  const { exam: examIdOrSlug } = await params;

  const exam = await fetchExamById(examIdOrSlug);
  if (!exam) {
    notFound();
  }

  const examSlug = createSlug(exam.name);
  const examName = exam.name ? exam.name.toUpperCase() : "EXAM";

  return (
    <DownloadPageClient
      exam={exam}
      examSlug={examSlug}
      examName={examName}
    />
  );
};

export default DownloadPage;
