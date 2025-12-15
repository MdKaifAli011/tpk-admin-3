import React from "react";
import TopicDetailPage from "../../../components/features/TopicDetailPage";

const TopicDetailRoute = async ({ params }) => {
  const { id } = await params;
  return <TopicDetailPage topicId={id} />;
};

export default TopicDetailRoute;

