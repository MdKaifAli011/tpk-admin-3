"use client";

import Link from "next/link";
import { FaArrowRight, FaRegClock } from "react-icons/fa";
import { ToolBreadcrumb } from "./ToolPageChrome";

export default function SatToolsIndexClient({ examSlug }) {
  const exam = String(examSlug || "sat").toLowerCase();
  const examLabel = exam.toUpperCase();

  return (
    <div className="exam-hub-min-h w-full min-w-0 bg-white text-slate-900 space-y-6 mt-6 pb-10">
      <section
        className="hero-section relative w-full overflow-hidden rounded-xl border border-indigo-100/70 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/80 p-3 shadow-[0_2px_16px_rgba(79,70,229,0.07)] sm:p-5"
        aria-labelledby="sat-tools-title"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-indigo-200/25 blur-3xl"
          aria-hidden
        />

        <div className="relative w-full py-1 sm:py-2">
          <ToolBreadcrumb
            segments={[
              { label: "Home", href: "/" },
              { label: examLabel, href: `/${exam}` },
              { label: "Tools" },
            ]}
          />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-indigo-600/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                  {examLabel} hub
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline" aria-hidden />
                <span className="text-xs font-medium text-slate-500">
                  Free tools · No sign-in
                </span>
              </div>

              <h1
                id="sat-tools-title"
                className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl"
              >
                {examLabel}{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  prep tools
                </span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Short interactive flows to estimate readiness and plan prep — same layout and
                navigation as the rest of your {examLabel} pages.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full min-w-0">
        <ul className="grid w-full grid-cols-1 gap-4">
          <li className="min-w-0">
            <Link
              href={`/${exam}/tool/sat-readiness-analyzer`}
              className="group flex w-full flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:border-indigo-200/90 hover:shadow-[0_8px_30px_-12px_rgba(79,70,229,0.25)] sm:flex-row sm:items-stretch sm:justify-between sm:p-6"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-800 sm:text-xl">
                  SAT Readiness Analyzer
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:max-w-2xl">
                  Profile, Math &amp; Reading &amp; Writing self-check, estimated scores, gap vs target,
                  topic breakdown, and downloadable PDF report.
                </p>
              </div>
              <div className="mt-4 flex shrink-0 flex-col items-start gap-3 sm:mt-0 sm:ml-6 sm:items-end sm:justify-between sm:pl-6 sm:border-l sm:border-slate-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100/80">
                  <FaRegClock className="h-3 w-3 opacity-80" aria-hidden />
                  ~5 min
                </span>
                <span className="inline-flex items-center text-sm font-semibold text-indigo-600">
                  Open tool
                  <FaArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
