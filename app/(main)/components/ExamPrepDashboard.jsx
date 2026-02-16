"use client";

import React, { useState } from "react";
import {
  FaCalendarAlt,
  FaHourglassHalf,
  FaClock,
  FaBullseye,
  FaChevronRight,
} from "react-icons/fa";

// Static data as in the NEET AI Preparation Dashboard image
const STATIC = {
  breadcrumb: "NEET Preparation Dashboard • Syllabus + Practice + Timeline",
  activeTab: "Syllabus Tracker",
  tabs: ["Syllabus Tracker", "Priority Plan", "Revision + PYQs"],
  title: "NEET AI Preparation Dashboard - Track, Predict & Prioritize What To Study Next",
  description:
    "Update chapter completion using sliders. The dashboard can later compute unit progress, estimate hours needed, and generate a priority-based study plan (High ROI chapters first).",
  cards: [
    {
      title: "NEET Exam Date",
      value: "05 May 2026",
      subText: "Update from admin or official schedule",
      icon: FaCalendarAlt,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      valueColor: "text-red-600",
    },
    {
      title: "Prep Days Remaining",
      value: "128 Days",
      subText: "Includes buffer for tests + revision",
      icon: FaHourglassHalf,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      valueColor: "text-gray-900",
    },
    {
      title: "Study Hours Left (Total)",
      value: "384 Hours",
      subText: "Assuming 3 hrs/day average - Change",
      subTextLink: "Change",
      icon: FaClock,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      valueColor: "text-gray-900",
    },
    {
      title: "Expected NEET Score",
      value: "545-585",
      subText: "Placeholder (later from mocks + accuracy)",
      icon: FaBullseye,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      valueColor: "text-gray-900",
    },
  ],
  infoCards: [
    {
      label: "Estimated Rank (Projection):",
      value: "18k-30k (placeholder)",
      dashed: true,
    },
    {
      label: "Your Weakest Area (Auto):",
      value: "Inorganic Recall / Statement Traps (placeholder)",
      dashed: true,
      showChevron: true,
    },
    {
      label: "Accuracy Target:",
      value: "80-85% in mixed sets (to reduce negative marking)",
      dashed: false,
    },
  ],
};

export default function ExamPrepDashboard({ examName = "NEET" }) {
  const [activeTab, setActiveTab] = useState(STATIC.activeTab);

  const breadcrumbText = STATIC.breadcrumb.replace("NEET", examName);

  return (
    <div className="">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Top row: breadcrumb + action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <p className="text-sm text-slate-500">
            {breadcrumbText.split("•").map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5 text-slate-400">•</span>}
                {part.trim()}
              </span>
            ))}
          </p>
          <div className="flex flex-wrap gap-2">
            {STATIC.tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-blue-500 text-white"
                    : "bg-blue-100/80 text-blue-800 hover:bg-blue-200/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Title + description */}
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          {STATIC.title.replace("NEET", examName)}
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          {STATIC.description}
        </p>
      </div>

      {/* Metric cards row */}
      <div className="py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATIC.cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative"
              >
                <div
                  className={`absolute top-4 right-4 w-9 h-9 rounded-full ${card.iconBg} flex items-center justify-center`}
                >
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 pr-12 mb-1">
                  {card.title}
                </h3>
                <p className={`text-lg font-bold ${card.valueColor} mb-1`}>
                  {card.value}
                </p>
                <p className="text-xs text-slate-500">
                  {card.subTextLink ? (
                    <>
                      {card.subText.replace(card.subTextLink, "").trim()}{" "}
                      <button
                        type="button"
                        className="text-blue-600 underline hover:text-blue-700"
                      >
                        {card.subTextLink}
                      </button>
                    </>
                  ) : (
                    card.subText
                  )}
                </p>
              </div>
            );
          })}
        </div>

        {/* Second row: 3 info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {STATIC.infoCards.map((info) => (
            <div
              key={info.label}
              className={`rounded-xl bg-white p-4 flex items-center justify-between gap-3 ${
                info.dashed
                  ? "border border-dashed border-slate-300"
                  : "border border-slate-200"
              }`}
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-slate-900 text-sm">
                  {info.label}{" "}
                </span>
                <span className="text-slate-500 text-sm">{info.value}</span>
              </div>
              {info.showChevron && (
                <FaChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
