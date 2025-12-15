import React from "react";
import SubTopicDetailPage from "../../../components/features/SubTopicDetailPage";

const SubTopicDetailRoute = async ({ params }) => {
  const { id } = await params;
  return <SubTopicDetailPage subTopicId={id} />;
};

export default SubTopicDetailRoute;

