import SatReadinessAnalyzerClient from "./SatReadinessAnalyzerClient";

export const metadata = {
  title: "SAT Readiness Analyzer | Free 5‑min score estimate",
  description:
    "Rate Math and Reading & Writing topics, see your estimated SAT scores, gap vs target, and a personalised readiness report.",
};

export default async function SatReadinessAnalyzerPage({ params }) {
  const { exam: examSlug } = await params;
  return <SatReadinessAnalyzerClient examSlug={String(examSlug || "sat")} />;
}
