"use client";

import React from "react";
import { useExamSubjectProgress } from "../hooks/useExamSubjectProgress";

const STATUS_LABELS = ["On Track", "Needs Push", "High Risk"];

function getStatus(progress) {
  if (progress >= 50) return "On Track";
  if (progress >= 25) return "Needs Push";
  return "High Risk";
}

const CARD_COLORS = [
  { bar: "bg-blue-600", text: "text-blue-600", border: "border-l-blue-600" },
  { bar: "bg-purple-600", text: "text-purple-600", border: "border-l-purple-600" },
  { bar: "bg-cyan-500", text: "text-cyan-600", border: "border-l-cyan-500" },
  { bar: "bg-emerald-600", text: "text-emerald-600", border: "border-l-emerald-600" },
];

function ProgressCard({ title, progress, status, subInfo, colorIndex }) {
  const colors = CARD_COLORS[colorIndex % CARD_COLORS.length];
  return (
    <div
      className={`relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden border-l-4 ${colors.border} p-3`}
    >
      <div className="absolute top-3 right-3">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-800">
          {status}
        </span>
      </div>
      <h3 className="text-sm font-bold text-slate-900 pr-16">{title}</h3>
      <div className="mt-1.5 flex items-start gap-2">
        <span className={`text-2xl font-extrabold ${colors.text}`}>
          {Math.round(progress)}%
        </span>
        <div className="flex-1 min-w-0 rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-1">
          <p className="text-xs text-slate-500 leading-snug">{subInfo}</p>
        </div>
      </div>
      <div className="mt-2.5 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

const HOW_TO_ITEMS = [
  "Keep this section stable and use your chapter sliders to drive everything below.",
  "Update Chapter Completion Weekly (Not Daily).",
  "Keep Biology Higher Than Physics Early (Fast ROI).",
  'Track "Revision Readiness" Separately Later (Not Just Syllabus %).',
];

export default function PreparationProgressDashboard({
  examId,
  subjectsWithUnits = [],
  examName = "Exam",
}) {
  const {
    overallPercent,
    theoryPercent,
    practicePercent,
    subjectProgressList,
    isLoading,
    error,
  } = useExamSubjectProgress(examId, subjectsWithUnits);

  const totalSubInfo = `Theory ${Math.round(theoryPercent)}% (70%) + Practice ${Math.round(practicePercent)}% (30%)`;

  const cards = [
    {
      title: "TOTAL",
      progress: overallPercent,
      status: getStatus(overallPercent),
      subInfo: totalSubInfo,
      colorIndex: 0,
    },
    ...subjectProgressList.map((s, i) => ({
      title: (s.subjectName || "").toUpperCase(),
      progress: s.progress,
      status: getStatus(s.progress),
      subInfo: `Weak Areas: ${s.weakArea || "—"}`,
      colorIndex: i + 1,
    })),
  ];

  const remainingPercent = Math.max(0, 100 - overallPercent);
  const totalSyllabusHours = 400;
  const hoursEstimate = Math.round((remainingPercent / 100) * totalSyllabusHours);
  const hrsPerDay = 3;
  const daysEstimate = hrsPerDay > 0 ? Math.max(0, Math.ceil(hoursEstimate / hrsPerDay)) : 0;

  const lowestSubject = subjectProgressList.length > 0
    ? subjectProgressList.reduce((min, s) => (s.progress < min.progress ? s : min), subjectProgressList[0])
    : null;
  const nextTarget = lowestSubject
    ? `${lowestSubject.subjectName} - Continue syllabus`
    : "Complete chapter sliders in the tracker below";
  const nextTargetHours = 2;

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
        <p className="text-slate-500 text-xs m-0">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 m-0">
            Preparation Progress (Overall + Subject-wise)
          </h2>
          <p className="mt-1 text-xs text-slate-600 max-w-2xl leading-snug m-0">
            This is your high level readiness meter. Update chapter sliders inside the tracker;
            these percentages and time estimates can be computed later from that data.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {STATUS_LABELS.map((label) => (
            <span
              key={label}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Overall + Subject progress cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          [...Array(1 + Math.min(subjectsWithUnits?.length || 3, 8))].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-8 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-2 bg-slate-200 rounded-full" />
            </div>
          ))
        ) : (
          cards.map((card, idx) => (
            <ProgressCard
              key={card.title + (card.title === "TOTAL" ? "" : idx)}
              title={card.title}
              progress={card.progress}
              status={card.status}
              subInfo={card.subInfo}
              colorIndex={card.colorIndex}
            />
          ))
        )}
      </div>

      {/* Two columns: Time required + How to use */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-emerald-50 border border-slate-200 p-4">
            <h3 className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Time Required to Complete (Estimate)
            </h3>
            <p className="text-xl font-extrabold text-slate-900 mb-1 m-0">
              {daysEstimate} Days ({hoursEstimate} Hours)
            </p>
            <p className="text-xs text-slate-700 leading-snug m-0">
              Based on remaining syllabus percentage and your average study hours per day.
              Adjust the study hours in the dashboard above to see updated estimates.
            </p>
          </div>

          <div className="rounded-lg bg-white border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-1 m-0">
              Next You Should Do This Today! - Target ({nextTargetHours} Hours)
            </h3>
            <p className="text-base font-extrabold text-slate-900 m-0">{nextTarget}</p>
          </div>
        </div>

        <div className="rounded-lg bg-white border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-2">
            How To Use This Meter
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-700 m-0 list-none pl-0">
            {HOW_TO_ITEMS.map((item, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-slate-400 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
