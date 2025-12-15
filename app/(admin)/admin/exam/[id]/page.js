import React from "react";
import ExamDetailPage from "../../../components/features/ExamDetailPage";

const ExamDetailRoute = async ({ params }) => {
  const { id } = await params;
  return <ExamDetailPage examId={id} />;
};

export default ExamDetailRoute;
