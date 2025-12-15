import React from "react";
import DefinitionDetailPage from "../../../components/features/DefinitionDetailPage";

const DefinitionDetailRoute = async ({ params }) => {
  const { id } = await params;
  return <DefinitionDetailPage definitionId={id} />;
};

export default DefinitionDetailRoute;

