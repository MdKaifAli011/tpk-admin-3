import React from "react";
import UnitDetailPage from "../../../components/features/UnitDetailPage";

const UnitDetailRoute = async ({ params }) => {
  const { id } = await params;
  return <UnitDetailPage unitId={id} />;
};

export default UnitDetailRoute;

