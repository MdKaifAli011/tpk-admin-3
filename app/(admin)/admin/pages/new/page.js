import React from "react";
import PageDetailPage from "../../../components/features/PageDetailPage";

const NewPageRoute = async ({ searchParams }) => {
  const resolved = await searchParams;
  const examSlug = resolved?.exam || null;
  return <PageDetailPage pageSlug={null} examSlug={examSlug} />;
};

export default NewPageRoute;
