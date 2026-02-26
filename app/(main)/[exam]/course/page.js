import React from "react";
import { notFound } from "next/navigation";
import { fetchExamById, createSlug } from "../../lib/api";
import CourseListingClient from "./CourseListingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExamCoursePage({ params }) {
  const { exam: examParam } = await params;
  const exam = await fetchExamById(examParam);
  if (!exam) {
    notFound();
  }
  const examSlug = createSlug(exam.name);
  const examName = exam.name || examParam;
  return <CourseListingClient examSlug={examSlug} examName={examName} />;
}
