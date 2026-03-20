import React from "react";
import CourseDetailsForm from "../../../../components/features/CourseDetailsForm";

export default async function CourseDetailsPage({ params }) {
  const { id } = await params;
  return <CourseDetailsForm courseId={id} />;
}
