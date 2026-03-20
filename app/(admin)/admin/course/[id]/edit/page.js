import React from "react";
import CourseForm from "../../../../components/features/CourseForm";

export default async function EditCoursePage({ params }) {
  const { id } = await params;
  return <CourseForm courseId={id} isNew={false} />;
}
