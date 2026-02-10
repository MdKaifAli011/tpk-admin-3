import React from "react";
import PageDetailPage from "../../../components/features/PageDetailPage";

const PageEditRoute = async ({ params, searchParams }) => {
  const { slug } = await params;
  const resolved = await searchParams;
  const examSlug = resolved?.exam || null;
  return <PageDetailPage pageSlug={slug} examSlug={examSlug} />;
};

export default PageEditRoute;
