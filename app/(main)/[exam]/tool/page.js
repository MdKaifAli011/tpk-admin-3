import { notFound } from "next/navigation";
import NeetCounselingToolClient from "./NeetCounselingToolClient";
import SatToolsIndexClient from "./SatToolsIndexClient";

export async function generateMetadata({ params }) {
  const { exam: examSlug } = await params;
  const e = String(examSlug || "").toLowerCase();
  if (e === "neet") {
    return {
      title: "NEET Counseling Seat Allotment Tool | Round 1 Data",
      description:
        "Search NEET UG 2025 Round 1 seat allotment by AIR rank, college, quota, and category. Data imported from official MCC-style PDF.",
    };
  }
  if (e === "sat") {
    return {
      title: "SAT Tools | Testprep Kart",
      description:
        "Free SAT prep tools: readiness analyzer, score estimates, and personalised reports.",
    };
  }
  return { title: "Tools" };
}

export default async function ExamToolPage({ params }) {
  const { exam: examSlug } = await params;
  const e = String(examSlug || "").toLowerCase();
  if (e === "neet") {
    return <NeetCounselingToolClient examSlug={e} />;
  }
  if (e === "sat") {
    return <SatToolsIndexClient examSlug={e} />;
  }
  notFound();
}
