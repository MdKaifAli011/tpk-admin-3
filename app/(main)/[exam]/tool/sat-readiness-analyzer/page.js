import { headers } from "next/headers";
import { isLocalhostHostHeader } from "@/lib/recaptcha";
import SatReadinessAnalyzerClient from "./SatReadinessAnalyzerClient";

export const metadata = {
  title: "SAT Readiness Analyzer | Free 5‑min score estimate",
  description:
    "Rate Math and Reading & Writing topics, see your estimated SAT scores, gap vs target, and a personalised readiness report.",
};

function shouldBypassRecaptchaForPage(headerList) {
  if (process.env.NODE_ENV === "development") return true;
  const forwarded = headerList.get("x-forwarded-host");
  const host = forwarded || headerList.get("host") || "";
  return isLocalhostHostHeader(host);
}

export default async function SatReadinessAnalyzerPage({ params }) {
  const { exam: examSlug } = await params;
  const hdrs = await headers();
  const bypassRecaptcha = shouldBypassRecaptchaForPage(hdrs);
  const recaptchaSiteKey =
    process.env.RECAPTCHA_SITE_KEY ||
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
    "";
  return (
    <SatReadinessAnalyzerClient
      examSlug={String(examSlug || "sat")}
      recaptchaSiteKey={recaptchaSiteKey}
      bypassRecaptcha={bypassRecaptcha}
    />
  );
}
