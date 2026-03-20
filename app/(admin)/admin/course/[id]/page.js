import React from "react";
import CourseDetailPage from "../../../components/features/CourseDetailPage";

export default async function CourseIdPage({ params }) {
  const { id } = await params;
  return <CourseDetailPage courseId={id} />;
}
