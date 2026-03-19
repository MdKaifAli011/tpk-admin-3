import { notFound } from "next/navigation";
import NeetCounselingToolClient from "./NeetCounselingToolClient";

export const metadata = {
  title: "NEET Counseling Seat Allotment Tool | Round 1 Data",
  description:
    "Search NEET UG 2025 Round 1 seat allotment by AIR rank, college, quota, and category. Data imported from official MCC-style PDF.",
};

export default async function ExamToolPage({ params }) {
  const { exam: examSlug } = await params;
  if (!examSlug || String(examSlug).toLowerCase() !== "neet") {
    notFound();
  }

  return <NeetCounselingToolClient examSlug={String(examSlug).toLowerCase()} />;
}
