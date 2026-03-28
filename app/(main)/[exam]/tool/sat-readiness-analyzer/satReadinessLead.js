/**
 * Build `prepared` notes for Lead API from SAT analyzer answers + scores.
 */
export function buildSatLeadPrepared({
  grade,
  studyHrs,
  curScoreLabel,
  tgtScore,
  testDateMos,
  interest,
  mathScore,
  engScore,
  total,
}) {
  const lines = [
    "SAT Readiness Analyzer",
    `Grade: ${grade || "—"}`,
    `Study hours/week: ${studyHrs || "—"}`,
    `Current SAT (band): ${curScoreLabel || "—"}`,
    `Target score: ${tgtScore || "—"}`,
    `Test timeline (months): ${testDateMos ?? "—"}`,
    `Coaching interest: ${interest || "—"}`,
    `Estimated scores — Math: ${mathScore}, R&W: ${engScore}, Total: ${total}`,
  ];
  return lines.join("\n");
}
