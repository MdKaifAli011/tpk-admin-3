import React from "react";
import PageDetailPage from "../../../components/features/PageDetailPage";

const PageEditRoute = async ({ params }) => {
  const { slug } = await params;
  return <PageDetailPage pageSlug={slug} />;
};

export default PageEditRoute;
