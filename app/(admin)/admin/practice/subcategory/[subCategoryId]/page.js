import React from "react";
import PracticeQuestionManagement from "../../../../components/features/PracticeQuestionManagement";

const PracticeSubCategoryPage = async ({ params }) => {
  const { subCategoryId } = await params;
  return <PracticeQuestionManagement subCategoryId={subCategoryId} />;
};

export default PracticeSubCategoryPage;
