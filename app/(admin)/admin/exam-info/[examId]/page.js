import React from "react";
import ExamInfoManagement from "../../../components/features/ExamInfoManagement";

const ExamInfoPage = async ({ params }) => {
  const { examId } = await params;
  return <ExamInfoManagement examId={examId} />;
};

export default ExamInfoPage;
