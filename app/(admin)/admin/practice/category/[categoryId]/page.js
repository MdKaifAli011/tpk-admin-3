import React from "react";
import PracticeSubCategoryManagement from "../../../../components/features/PracticeSubCategoryManagement";

const PracticeCategoryPage = async ({ params }) => {
  const { categoryId } = await params;
  return <PracticeSubCategoryManagement categoryId={categoryId} />;
};

export default PracticeCategoryPage;
