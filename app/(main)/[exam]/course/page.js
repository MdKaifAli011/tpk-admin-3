import React from "react";
import { notFound } from "next/navigation";
import { fetchExamById, createSlug } from "../../lib/api";
import CourseListingClient from "./CourseListingClient";

export const revalidate = 60;

export default async function ExamCoursePage({ params }) {
  const { exam: examParam } = await params;
  const exam = await fetchExamById(examParam);
  if (!exam) {
    notFound();
  }
  const examSlug = createSlug(exam.name);
  const examName = exam.name || examParam;
  const examId = exam._id?.toString() || null;
  return (
    <CourseListingClient
      examSlug={examSlug}
      examName={examName}
      examId={examId}
    />
  );
}
