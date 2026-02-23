"use client";

import React, { useState, useEffect } from "react";
import {
  FaCalendarAlt,
  FaHourglassHalf,
  FaClock,
  FaBullseye,
  FaChevronRight,
} from "react-icons/fa";
import api from "@/lib/api";
import { useClientToday, getPrepDaysRemaining } from "../hooks/useClientToday";

function formatExamDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDate();
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day.toString().padStart(2, "0")} ${month} ${year}`;
}

const HOURS_PER_DAY_STORAGE_KEY = "examPrep_hoursPerDay";
const ACCURACY_STORAGE_KEY = "examPrep_accuracyPct";

/** Expected marks range from total marks and accuracy % (0–100). Fully dynamic. */
function getExpectedMarksFromAccuracy(totalMarks, accuracyPct) {
  if (!totalMarks || totalMarks <= 0) return null;
  const pct = Math.min(100, Math.max(0, Number(accuracyPct) || 0)) / 100;
  const t = totalMarks;
  const spread = 0.05;
  const minPct = Math.max(0, pct - spread);
  const maxPct = Math.min(1, pct + spread);
  const minScore = Math.round(t * minPct);
  const maxScore = Math.round(t * maxPct);
  return { minScore, maxScore, range: `${minScore} – ${maxScore}` };
}

function getStoredHoursPerDay() {
  if (typeof window === "undefined") return 3;
  try {
    const v = parseInt(localStorage.getItem(HOURS_PER_DAY_STORAGE_KEY), 10);
    return Number.isNaN(v) || v < 1 || v > 24 ? 3 : v;
  } catch {
    return 3;
  }
}

function setStoredHoursPerDay(n) {
  try {
    localStorage.setItem(HOURS_PER_DAY_STORAGE_KEY, String(n));
  } catch {}
}

function getStoredAccuracy() {
  if (typeof window === "undefined") return 100;
  try {
    const v = parseInt(localStorage.getItem(ACCURACY_STORAGE_KEY), 10);
    return Number.isNaN(v) || v < 0 || v > 100 ? 100 : v;
  } catch {
    return 100;
  }
}

function setStoredAccuracy(n) {
  try {
    localStorage.setItem(ACCURACY_STORAGE_KEY, String(n));
  } catch {}
}

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
      value: "545-585 marks",
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

export default function ExamPrepDashboard({
  examId,
  examName = "NEET",
  hoursPerDay: hoursPerDayProp,
  onHoursPerDayChange,
  examInfo: examInfoProp,
  accuracyPct: accuracyPctProp,
  onAccuracyChange,
}) {
  const [activeTab, setActiveTab] = useState(STATIC.activeTab);
  const [examInfoInternal, setExamInfoInternal] = useState(null);
  const [hoursPerDayInternal, setHoursPerDayInternal] = useState(() =>
    typeof window !== "undefined" ? getStoredHoursPerDay() : 3,
  );
  const [accuracyPctInternal, setAccuracyPctInternal] = useState(() =>
    typeof window !== "undefined" ? getStoredAccuracy() : 100,
  );
  const [eventOverride, setEventOverride] = useState(null);
  const isControlledHours = onHoursPerDayChange != null;
  const isControlledAccuracy = onAccuracyChange != null;
  const hoursPerDay = eventOverride?.hoursPerDay ?? (isControlledHours ? (hoursPerDayProp ?? 3) : hoursPerDayInternal);
  const accuracyPct = eventOverride?.accuracyPct ?? (isControlledAccuracy ? (accuracyPctProp ?? 100) : accuracyPctInternal);

  useEffect(() => {
    const onSync = (e) => {
      if (e.detail?.hoursPerDay != null || e.detail?.accuracyPct != null)
        setEventOverride({
          hoursPerDay: e.detail.hoursPerDay,
          accuracyPct: e.detail.accuracyPct,
        });
    };
    window.addEventListener("examPrep_sync", onSync);
    return () => window.removeEventListener("examPrep_sync", onSync);
  }, []);

  useEffect(() => {
    if (hoursPerDayProp != null || accuracyPctProp != null)
      setEventOverride(null);
  }, [hoursPerDayProp, accuracyPctProp]);
  const setHoursPerDay = isControlledHours
    ? (n) => {
        const val = Number(n);
        if (!Number.isNaN(val)) {
          onHoursPerDayChange(val);
          setStoredHoursPerDay(val);
        }
      }
    : (n) => {
        const val = Number(n);
        if (!Number.isNaN(val)) {
          setHoursPerDayInternal(val);
          setStoredHoursPerDay(val);
        }
      };
  const setAccuracyPct = isControlledAccuracy
    ? (pct) => {
        const val = Number(pct);
        if (!Number.isNaN(val)) {
          onAccuracyChange(val);
          setStoredAccuracy(val);
        }
      }
    : (pct) => {
        const val = Number(pct);
        if (!Number.isNaN(val)) {
          setAccuracyPctInternal(val);
          setStoredAccuracy(val);
        }
      };

  const examInfo = examInfoProp !== undefined ? examInfoProp : examInfoInternal;
  const today = useClientToday();

  useEffect(() => {
    if (examInfoProp !== undefined || !examId) return;
    let cancelled = false;
    api
      .get(`/exam-info?examId=${examId}`)
      .then((res) => {
        if (cancelled || !res.data?.data?.length) return;
        setExamInfoInternal(res.data.data[0]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [examId, examInfoProp]);

  const breadcrumbText = STATIC.breadcrumb.replace("NEET", examName);

  const examDateDisplay = examInfo?.examDate
    ? formatExamDate(examInfo.examDate)
    : STATIC.cards[0].value;

  const prepDays =
    examInfo?.examDate != null && today
      ? getPrepDaysRemaining(examInfo.examDate, today)
      : null;
  const prepDaysDisplay =
    prepDays != null
      ? prepDays > 0
        ? `${prepDays} Day${prepDays === 1 ? "" : "s"}`
        : prepDays === 0
          ? "Today"
          : "Exam date passed"
      : STATIC.cards[1].value;

  const todayStr = today ? formatExamDate(today) : null;
  const prepDaysSubText =
    examInfo?.examDate && todayStr && examDateDisplay
      ? `From ${todayStr} to ${examDateDisplay}`
      : STATIC.cards[1].subText;

  const studyHoursTotal =
    prepDays != null && prepDays > 0 && hoursPerDay > 0
      ? prepDays * hoursPerDay
      : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (prepDays != null && studyHoursTotal != null)
      window.dispatchEvent(
        new CustomEvent("examPrep_timeRequired", {
          detail: { prepDays, studyHoursLeft: studyHoursTotal },
        })
      );
  }, [prepDays, studyHoursTotal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onRequest = () => {
      if (prepDays != null && studyHoursTotal != null)
        window.dispatchEvent(
          new CustomEvent("examPrep_timeRequired", {
            detail: { prepDays, studyHoursLeft: studyHoursTotal },
          })
        );
    };
    window.addEventListener("examPrep_requestTimeRequired", onRequest);
    return () => window.removeEventListener("examPrep_requestTimeRequired", onRequest);
  }, [prepDays, studyHoursTotal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      if (prepDays != null && studyHoursTotal != null)
        window.dispatchEvent(
          new CustomEvent("examPrep_timeRequired", {
            detail: { prepDays, studyHoursLeft: studyHoursTotal },
          })
        );
    }, 300);
    return () => clearTimeout(t);
  }, [prepDays, studyHoursTotal]);

  const studyHoursDisplay =
    studyHoursTotal != null
      ? `${studyHoursTotal.toLocaleString()} Hours`
      : prepDays === 0
        ? "0 Hours"
        : STATIC.cards[2].value;
  const studyHoursFormula =
    prepDays != null && prepDays > 0 && hoursPerDay > 0
      ? `${prepDays} days × ${hoursPerDay} hrs/day`
      : null;
  const studyHoursSubText = studyHoursFormula
    ? studyHoursFormula
    : STATIC.cards[2].subText;

  const maxMarks = examInfo?.maximumMarks != null ? Number(examInfo.maximumMarks) : null;
  const expectedFromAccuracy =
    maxMarks > 0 ? getExpectedMarksFromAccuracy(maxMarks, accuracyPct) : null;
  const expectedScoreRange =
    expectedFromAccuracy
      ? `${expectedFromAccuracy.range} marks`
      : maxMarks != null && maxMarks > 0
        ? `Up to ${Math.round(maxMarks)} marks`
        : STATIC.cards[3].value;

  const handleAccuracyChange = (e) => {
    const pct = Math.min(100, Math.max(0, Number(e.target.value) || 0));
    setAccuracyPct(pct);
    if (!isControlledAccuracy && !isControlledHours) {
      const suggestedHours = Math.round(2 + (pct / 100) * 8);
      const hours = Math.min(24, Math.max(1, suggestedHours));
      setHoursPerDay(hours);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("examPrep_hoursPerDayChanged", { detail: { hoursPerDay: hours } }));
      }
    }
  };

  const handleHoursPerDayChange = (e) => {
    const raw = parseInt(e.target.value, 10);
    const n = Number.isNaN(raw) ? 3 : Math.min(24, Math.max(1, raw));
    setHoursPerDay(n);
    if (!isControlledHours && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("examPrep_hoursPerDayChanged", { detail: { hoursPerDay: n } }));
    }
  };

  const handleHoursPerDayBlur = (e) => {
    const raw = parseInt(e.target.value, 10);
    const n = Number.isNaN(raw) ? 3 : Math.min(24, Math.max(1, raw));
    setHoursPerDay(n);
    if (!isControlledHours && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("examPrep_hoursPerDayChanged", { detail: { hoursPerDay: n } }));
    }
  };

  const cardsWithData = STATIC.cards.map((card) => {
    const title = card.title.replace(/NEET/g, examName);
    if (card.title === "NEET Exam Date") return { ...card, title, value: examDateDisplay };
    if (card.title === "Prep Days Remaining")
      return { ...card, title, value: prepDaysDisplay, subText: prepDaysSubText };
    if (card.title === "Study Hours Left (Total)")
      return {
        ...card,
        title,
        value: studyHoursDisplay,
        studyHoursFormula: studyHoursFormula ?? null,
        hoursPerDay,
        onHoursPerDayChange: handleHoursPerDayChange,
        onHoursPerDayBlur: handleHoursPerDayBlur,
      };
    if (card.title === "Expected NEET Score")
      return {
        ...card,
        title,
        value: expectedScoreRange,
        accuracyPct,
        onAccuracyChange: handleAccuracyChange,
      };
    return { ...card, title };
  });

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
          {cardsWithData.map((card) => {
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
                {card.onHoursPerDayChange ? (
                  <div className="text-xs text-slate-500 space-y-1">
                    {card.studyHoursFormula && <p>{card.studyHoursFormula}</p>}
                    <p className="flex flex-wrap items-center gap-1">
                      <span>Assuming</span>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={Number(card.hoursPerDay) || 3}
                        onChange={card.onHoursPerDayChange}
                        onBlur={card.onHoursPerDayBlur}
                        className="w-14 px-1.5 py-0.5 border border-slate-300 rounded text-slate-700 text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span>hrs/day — Change</span>
                    </p>
                  </div>
                ) : card.onAccuracyChange ? (
                  <div className="text-xs text-slate-500 space-y-2 mt-1">
                    <p className="text-slate-600">Accuracy: {card.accuracyPct}%</p>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Number(card.accuracyPct) ?? 100}
                      onChange={card.onAccuracyChange}
                      className="w-full h-2 rounded-full appearance-none bg-slate-200 accent-blue-600 cursor-pointer"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{card.subText}</p>
                )}
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
