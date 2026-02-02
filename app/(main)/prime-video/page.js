import React from "react";
import { fetchPrimeVideo } from "../lib/api";
import PrimeVideoClient from "./PrimeVideoClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PrimeVideoPage = async () => {
  const { data } = await fetchPrimeVideo();
  const exams = data?.exams || [];

  return (
    <div className="space-y-6">
      <PrimeVideoClient exams={exams} />
    </div>
  );
};

export default PrimeVideoPage;
