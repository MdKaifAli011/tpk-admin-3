import React from "react";
import SubjectDetailPage from "../../../components/features/SubjectDetailPage";

const SubjectDetailRoute = async ({ params }) => {
  const { id } = await params;
  return <SubjectDetailPage subjectId={id} />;
};

export default SubjectDetailRoute;

