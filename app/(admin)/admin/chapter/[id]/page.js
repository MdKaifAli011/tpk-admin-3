import React from "react";
import ChapterDetailPage from "../../../components/features/ChapterDetailPage";

const ChapterDetailRoute = async ({ params }) => {
  // ChapterDetailPage uses useParams() hook internally, so params is not needed here
  // But we still need to await params to make this route compatible
  await params;
  return <ChapterDetailPage />;
};

export default ChapterDetailRoute;

