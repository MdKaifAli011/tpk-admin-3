"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Script from "next/script";
import { ToolBreadcrumb } from "../ToolPageChrome";
import api from "@/lib/api";
import {
  countriesWithCodesSorted,
  countryCodeMap,
} from "@/app/(main)/components/constants/formConstants";
import { validatePhoneNumber } from "@/app/(main)/components/utils/formValidation";
import { SAT_ENG_TOPICS, SAT_MATH_TOPICS } from "./satReadinessData";
import { SAT_LEAD_FORM_ID, SAT_LEAD_PREPARED } from "./satReadinessLead";
import { downloadSatReadinessPdf } from "./satReadinessPdf";
import * as sat from "./satToolTailwind";

const CHART_M_LABELS = [
  "Linear Eq.",
  "Systems",
  "Quadratics",
  "Polynomials",
  "Ratios",
  "Statistics",
  "Probability",
  "Geometry",
  "Trig",
  "Word Probs",
];
const CHART_E_LABELS = [
  "Main Idea",
  "Inferences",
  "Vocabulary",
  "Text Struct.",
  "Synthesis",
  "Transitions",
  "Grammar",
  "Punctuation",
  "Evidence",
  "Cross-Text",
];

const CUR_SCORE_OPTS = [
  { v: "0", l: "Haven't taken SAT yet" },
  { v: "750", l: "Below 800" },
  { v: "850", l: "800–900" },
  { v: "950", l: "900–1000" },
  { v: "1050", l: "1000–1100" },
  { v: "1150", l: "1100–1200" },
  { v: "1250", l: "1200–1300" },
  { v: "1350", l: "1300–1400" },
  { v: "1450", l: "1400–1500" },
  { v: "1550", l: "1500–1600" },
];

const TGT_SCORE_OPTS = [
  { v: "1000", l: "1000+" },
  { v: "1100", l: "1100+" },
  { v: "1200", l: "1200+" },
  { v: "1300", l: "1300+" },
  { v: "1350", l: "1350+" },
  { v: "1400", l: "1400+" },
  { v: "1450", l: "1450+" },
  { v: "1500", l: "1500+" },
  { v: "1550", l: "1550+" },
  { v: "1600", l: "1600 — Perfect" },
];

const TEST_DATE_OPTS = [
  { v: "1", l: "Within 1 month" },
  { v: "2", l: "1–2 months" },
  { v: "3", l: "2–3 months" },
  { v: "4", l: "3–4 months" },
  { v: "6", l: "4–6 months" },
  { v: "9", l: "6+ months away" },
  { v: "0", l: "Not scheduled yet" },
];

const STUDY_HRS_OPTS = [
  { v: "2", l: "1–2 hours" },
  { v: "4", l: "3–4 hours" },
  { v: "7", l: "5–8 hours" },
  { v: "12", l: "9–14 hours" },
  { v: "18", l: "15+ hours" },
];

const INTEREST_OPTS = [
  "Yes — I'd love to learn about coaching",
  "Maybe — let me see my results first",
  "No — just exploring the tool",
];

const RECAPTCHA_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

/** Readiness bar colors (rose / amber / emerald) — matches tool UI + PDF semantics */
const READINESS = {
  low: "#f43f5e",
  mid: "#f59e0b",
  high: "#10b981",
};

const CHART_MATH_RGBA = "rgba(79,70,229,0.72)";
const CHART_ENG_RGBA = "rgba(217,119,6,0.72)";

function satCalc(topics, confMap) {
  let sum = 0;
  let filled = 0;
  const details = topics.map((t) => {
    const raw = confMap[t.id];
    const c = raw ? +raw : 0;
    if (c) {
      sum += c;
      filled++;
    }
    return { ...t, conf: c || 3 };
  });
  const avg = filled ? sum / filled : 3;
  const score = Math.round((200 + ((avg - 1) / 4) * 600) / 10) * 10;
  return { score, details };
}

function TimelineWDetail({ satReport }) {
  const { gap, hrs, mos } = satReport;
  if (gap <= 0) {
    return (
      <p id="wDetail" className={sat.stWtxtP}>
        {satReport.wDetailText}
      </p>
    );
  }
  const hn = Math.round(gap / 2.5);
  const wn = Math.ceil(hn / hrs);
  const av = mos > 0 ? mos * 4 : null;
  return (
    <p id="wDetail" className={sat.stWtxtP}>
      Studying <strong>{hrs} hrs/week</strong>, approx.{" "}
      <strong>{hn} total hours</strong> needed.{" "}
      {av != null &&
        (wn <= av ? (
          <strong className="font-bold text-emerald-600">On track ✓</strong>
        ) : (
          <strong className="font-bold text-rose-600">Increase hours</strong>
        ))}
    </p>
  );
}

function TopicRow({ topic, value, onChange }) {
  return (
    <div className={sat.stTopicRow(value)} id={`row-${topic.id}`}>
      <div className={sat.stTnum}>{String(topic._i + 1).padStart(2, "0")}</div>
      <div className={sat.stTinfo}>
        <div className={sat.stTname}>{topic.name}</div>
        <div className={sat.stThint}>{topic.hint}</div>
      </div>
      <select
        className={sat.stTsel}
        value={value}
        onChange={(e) => onChange(topic.id, e.target.value)}
        aria-label={`Confidence for ${topic.name}`}
      >
        <option value="">Rate confidence</option>
        <option value="1">1 - Not confident</option>
        <option value="2">2 - Slightly</option>
        <option value="3">3 - Moderate</option>
        <option value="4">4 - Quite confident</option>
        <option value="5">5 - Very confident</option>
      </select>
    </div>
  );
}

export default function SatReadinessAnalyzerClient({ examSlug }) {
  const exam = String(examSlug || "sat").toLowerCase();
  const examLabel = exam.toUpperCase();

  const [chartReady, setChartReady] = useState(false);

  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState("");
  const [studyHrs, setStudyHrs] = useState("");
  const [curScore, setCurScore] = useState("0");
  const [tgtScore, setTgtScore] = useState("");
  const [testDate, setTestDate] = useState("");
  const [mathConf, setMathConf] = useState({});
  const [engConf, setEngConf] = useState({});

  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [interest, setInterest] = useState("");

  const [teaser, setTeaser] = useState({ m: 800, e: 800, t: 1600 });
  const [satReport, setSatReport] = useState(null);
  const [captchaError, setCaptchaError] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pdfNote, setPdfNote] = useState(false);
  const [barsAnimate, setBarsAnimate] = useState(false);

  const chartRef = useRef(null);
  const chartInstRef = useRef(null);

  const mathTopics = useMemo(
    () => SAT_MATH_TOPICS.map((t, i) => ({ ...t, _i: i })),
    []
  );
  const engTopics = useMemo(
    () => SAT_ENG_TOPICS.map((t, i) => ({ ...t, _i: i })),
    []
  );

  const setMathVal = useCallback((id, v) => {
    setMathConf((prev) => ({ ...prev, [id]: v }));
  }, []);
  const setEngVal = useCallback((id, v) => {
    setEngConf((prev) => ({ ...prev, [id]: v }));
  }, []);

  const goStep = useCallback(
    (n) => {
      if (n === 2 && (!grade || !tgtScore)) {
        alert("Please select your grade and target SAT score.");
        return;
      }
      if (n === 4) {
        const m = satCalc(SAT_MATH_TOPICS, mathConf);
        const e = satCalc(SAT_ENG_TOPICS, engConf);
        setTeaser({ m: m.score, e: e.score, t: m.score + e.score });
      }
      setStep(n);
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        /* ignore */
      }
    },
    [grade, tgtScore, mathConf, engConf]
  );

  useEffect(() => {
    if (step !== 5) {
      setBarsAnimate(false);
      return;
    }
    const t = setTimeout(() => setBarsAnimate(true), 200);
    return () => clearTimeout(t);
  }, [step, satReport]);

  useEffect(() => {
    if (step !== 4) return;
    const w = typeof window !== "undefined" ? window : null;
    if (!w?.grecaptcha?.render) return;

    const mount = () => {
      const el = document.getElementById("sat-recaptcha-mount");
      if (!el) return;
      el.innerHTML = "";
      try {
        w.grecaptcha.render(el, { sitekey: RECAPTCHA_KEY });
      } catch {
        /* widget may already exist */
      }
    };

    if (w.grecaptcha.ready) {
      w.grecaptcha.ready(mount);
    } else {
      mount();
    }
  }, [step]);

  useEffect(() => {
    if (step !== 5 || !chartReady || !satReport || !chartRef.current) return;
    const Chart = typeof window !== "undefined" ? window.Chart : null;
    if (!Chart) return;
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    if (chartInstRef.current) {
      chartInstRef.current.destroy();
      chartInstRef.current = null;
    }
    const md = satReport.mathDetails;
    const ed = satReport.engDetails;
    chartInstRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [...CHART_M_LABELS, ...CHART_E_LABELS],
        datasets: [
          {
            label: "Math",
            data: [
              ...md.map((t) => Math.round(((t.conf - 1) / 4) * 100)),
              ...Array(10).fill(null),
            ],
            backgroundColor: CHART_MATH_RGBA,
            borderRadius: 4,
            borderWidth: 0,
          },
          {
            label: "Reading & Writing",
            data: [
              ...Array(10).fill(null),
              ...ed.map((t) => Math.round(((t.conf - 1) / 4) * 100)),
            ],
            backgroundColor: CHART_ENG_RGBA,
            borderRadius: 4,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: "#334155",
              font: {
                family:
                  'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
                size: 11,
                weight: "600",
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ${c.parsed.y}%`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8", font: { size: 9.5 }, maxRotation: 45 },
            grid: { color: "rgba(0,0,0,.04)" },
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: "#9CA3AF",
              callback: (v) => `${v}%`,
            },
            grid: { color: "rgba(0,0,0,.04)" },
          },
        },
      },
    });
    return () => {
      if (chartInstRef.current) {
        chartInstRef.current.destroy();
        chartInstRef.current = null;
      }
    };
  }, [step, chartReady, satReport]);

  const handleUnlock = async () => {
    setLeadError("");
    const fn = fname.trim();
    const em = email.trim();
    if (!fn || !em) {
      alert("Please enter your first name and email.");
      return;
    }
    if (!country.trim()) {
      setLeadError("Please select your country.");
      return;
    }
    if (!grade.trim()) {
      setLeadError("Please go back and select your current grade.");
      return;
    }
    const phoneErr = validatePhoneNumber(phoneLocal, countryCode, country);
    if (phoneErr) {
      setLeadError(phoneErr);
      return;
    }

    const captchaResp =
      typeof window !== "undefined" && typeof window.grecaptcha !== "undefined"
        ? window.grecaptcha.getResponse()
        : "";
    if (!captchaResp) {
      setCaptchaError(true);
      return;
    }
    setCaptchaError(false);

    const m = satCalc(SAT_MATH_TOPICS, mathConf);
    const e = satCalc(SAT_ENG_TOPICS, engConf);
    const tot = m.score + e.score;
    const tgt = parseInt(tgtScore, 10) || 1400;
    const hrs = parseFloat(studyHrs) || 4;
    const mos = parseInt(testDate, 10) || 0;
    const gap = tgt - tot;

    let wHead = "";
    let wDetailText = "";
    if (gap > 0) {
      const hn = Math.round(gap / 2.5);
      const wn = Math.ceil(hn / hrs);
      const av = mos > 0 ? mos * 4 : null;
      wHead = `Approx. ${wn} week${wn !== 1 ? "s" : ""} to reach your target`;
      wDetailText = `Studying ${hrs} hrs/week, approx. ${hn} hours needed. ${
        av
          ? wn <= av
            ? `Test in ~${mos} month(s) - on track!`
            : `Test in ~${mos} month(s) - increase study hours.`
          : ""
      }`;
    } else {
      wHead = "You're already at or above your target!";
      wDetailText =
        "Excellent work. Maintain your prep and aim even higher.";
    }

    const name = `${fn} ${lname.trim()}`.trim() || fn;
    const sourcePath =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "";

    setSubmitting(true);
    try {
      const res = await api.post("/lead", {
        name,
        email: em,
        country: country.trim(),
        className: grade.trim(),
        phoneNumber: countryCode + phoneLocal.trim(),
        form_id: SAT_LEAD_FORM_ID,
        form_name: "SAT Readiness Analyzer",
        source: sourcePath,
        prepared: SAT_LEAD_PREPARED,
      });

      if (!res.data?.success) {
        setLeadError(
          res.data?.message || "Could not save your details. Please try again."
        );
        return;
      }
    } catch (err) {
      setLeadError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not save your details. Please try again."
      );
      return;
    } finally {
      setSubmitting(false);
    }

    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    setSatReport({
      fname: fn,
      email: em,
      mathScore: m.score,
      engScore: e.score,
      total: tot,
      target: tgt,
      gap,
      hrs,
      mos,
      mathDetails: m.details,
      engDetails: e.details,
      date: dateStr,
      wHead,
      wDetailText,
    });

    setStep(5);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* ignore */
    }
    try {
      if (typeof window !== "undefined" && window.grecaptcha) {
        window.grecaptcha.reset();
      }
    } catch {
      /* ignore */
    }
  };

  const handleDownloadPdf = () => {
    if (window._jspdfReady === false || (!window.jspdf && window._jspdfReady !== true)) {
      setPdfNote(true);
      return;
    }
    setPdfNote(false);
    const btn = document.getElementById("dlBtn");
    if (btn) {
      btn.textContent = "Generating...";
      btn.disabled = true;
    }
    setTimeout(() => {
      try {
        downloadSatReadinessPdf(satReport);
      } catch (err) {
        console.error(err);
        alert("PDF generation failed.");
      }
      if (btn) {
        btn.textContent = "⬇ Download PDF Report";
        btn.disabled = false;
      }
    }, 100);
  };

  const resetAll = useCallback(() => {
    setGrade("");
    setStudyHrs("");
    setCurScore("0");
    setTgtScore("");
    setTestDate("");
    setMathConf({});
    setEngConf({});
    setFname("");
    setLname("");
    setEmail("");
    setCountry("");
    setCountryCode("+91");
    setPhoneLocal("");
    setInterest("");
    setSatReport(null);
    setLeadError("");
    setCaptchaError(false);
    setPdfNote(false);
    if (chartInstRef.current) {
      chartInstRef.current.destroy();
      chartInstRef.current = null;
    }
    try {
      if (typeof window !== "undefined" && window.grecaptcha) {
        window.grecaptcha.reset();
      }
    } catch {
      /* ignore */
    }
    setStep(1);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* ignore */
    }
  }, []);

  const priorityItems = useMemo(() => {
    if (!satReport) return [];
    const md = satReport.mathDetails;
    const ed = satReport.engDetails;
    return [
      ...md
        .filter((t) => t.conf <= 2)
        .map((t) => ({ ...t, sec: "Math", lv: "crit" })),
      ...ed
        .filter((t) => t.conf <= 2)
        .map((t) => ({ ...t, sec: "English", lv: "crit" })),
      ...md
        .filter((t) => t.conf === 3)
        .map((t) => ({ ...t, sec: "Math", lv: "med" })),
      ...ed
        .filter((t) => t.conf === 3)
        .map((t) => ({ ...t, sec: "English", lv: "med" })),
    ].slice(0, 10);
  }, [satReport]);

  const strongItems = useMemo(() => {
    if (!satReport) return [];
    return [
      ...satReport.mathDetails
        .filter((t) => t.conf >= 4)
        .map((t) => ({ ...t, sec: "Math" })),
      ...satReport.engDetails
        .filter((t) => t.conf >= 4)
        .map((t) => ({ ...t, sec: "English" })),
    ];
  }, [satReport]);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
        strategy="afterInteractive"
        onLoad={() => setChartReady(true)}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          window._jspdfReady = true;
        }}
        onError={() => {
          window._jspdfReady = false;
        }}
      />
      <Script
        src="https://www.google.com/recaptcha/api.js"
        strategy="afterInteractive"
      />

      <div className="exam-hub-min-h w-full min-w-0 bg-white text-slate-900 space-y-4 mt-4 pb-6 md:space-y-5 md:mt-5 md:pb-8">
        <section
          className="hero-section relative w-full overflow-hidden rounded-xl border border-indigo-100/70 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/80 p-3 shadow-[0_2px_16px_rgba(79,70,229,0.07)] sm:p-4"
          aria-labelledby="sat-readiness-analyzer-title"
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
                { label: "Tools", href: `/${exam}/tool` },
                { label: "SAT Readiness Analyzer" },
              ]}
            />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-3xl">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-600/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
                    {examLabel} · Tool
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline" aria-hidden />
                  <span className="text-xs font-medium tabular-nums leading-none text-slate-500">
                    Free · ~5 min
                  </span>
                </div>

                <h1
                  id="sat-readiness-analyzer-title"
                  className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl sm:leading-tight lg:text-[2rem] lg:leading-[1.15]"
                >
                  SAT{" "}
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text font-semibold text-transparent">
                    Readiness Analyzer
                  </span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] sm:leading-relaxed">
                  Rate topic confidence, preview estimated scores, then unlock your full gap
                  analysis and downloadable PDF — same layout as the rest of the {examLabel}{" "}
                  tools hub.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full min-w-0 px-0">
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className={sat.stRoot}>
              <div className={sat.stWrap}>
            <div className={sat.stTopbar}>
              <div className={sat.stTbBrand}>
                <div className={sat.stTbIco}>📝</div>
                <span className={sat.stTbName}>SAT Readiness Analyzer</span>
              </div>
              <div className={sat.stTopbarActions}>
                <button
                  type="button"
                  className={`${sat.stBtn} ${sat.stBtnGhost} text-[11.5px] px-[13px] py-1.5 ${step > 1 ? "inline-flex" : "hidden"}`}
                  id="sat-reset-btn"
                  onClick={resetAll}
                >
                  ↩ Start Over
                </button>
                <span className={sat.stTbTag}>Free · 5 min</span>
              </div>
            </div>

            <div className={sat.stProgWrap}>
              <div className={sat.stProgTrack}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <React.Fragment key={n}>
                    <div
                      className={[
                        sat.stProgDot,
                        n < step
                          ? sat.stProgDotDone
                          : n === step
                            ? sat.stProgDotActive
                            : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {n < step ? "✓" : n}
                    </div>
                    {n < 5 && (
                      <div
                        className={[
                          sat.stProgConn,
                          n < step ? sat.stProgConnDone : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className={sat.stProgLabels}>
                {[
                  "Profile",
                  "Math",
                  "English",
                  "Your Info",
                  "Results",
                ].map((lbl, i) => {
                  const n = i + 1;
                  return (
                    <span
                      key={lbl}
                      className={[
                        sat.stProgLbl,
                        n < step
                          ? sat.stProgLblDone
                          : n === step
                            ? sat.stProgLblActive
                            : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {lbl}
                    </span>
                  );
                })}
              </div>
            </div>

            {step === 1 && (
              <div className={sat.stCard} id="step1">
                <div className={sat.stCh}>
                  <div className={`${sat.stChIco} ${sat.stChIcoB}`}>👤</div>
                  <div>
                    <div className={sat.stChTtl}>
                      Student <span className={sat.stChTtlHi}>Profile</span>
                    </div>
                    <div className={sat.stChSub}>
                      Tell us where you stand — this calibrates your entire report.
                    </div>
                  </div>
                </div>
                <div className={sat.stG2}>
                  <div className={sat.stFg}>
                    <label className={sat.stLabel} htmlFor="sat_grade">Current Grade</label>
                    <select
                      className={sat.stSelect}
                      id="sat_grade"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                    >
                      <option value="">Select grade</option>
                      <option>9th Grade</option>
                      <option>10th Grade</option>
                      <option>11th Grade</option>
                      <option>12th Grade</option>
                    </select>
                  </div>
                  <div className={sat.stFg}>
                    <label className={sat.stLabel} htmlFor="sat_studyHrs">Study Hours / Week</label>
                    <select
                      className={sat.stSelect}
                      id="sat_studyHrs"
                      value={studyHrs}
                      onChange={(e) => setStudyHrs(e.target.value)}
                    >
                      <option value="">Select hours</option>
                      {STUDY_HRS_OPTS.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={sat.stFg}>
                    <label className={sat.stLabel} htmlFor="sat_curScore">Current SAT Score</label>
                    <select
                      className={sat.stSelect}
                      id="sat_curScore"
                      value={curScore}
                      onChange={(e) => setCurScore(e.target.value)}
                    >
                      {CUR_SCORE_OPTS.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={sat.stFg}>
                    <label className={sat.stLabel} htmlFor="sat_tgtScore">Target SAT Score</label>
                    <select
                      className={sat.stSelect}
                      id="sat_tgtScore"
                      value={tgtScore}
                      onChange={(e) => setTgtScore(e.target.value)}
                    >
                      <option value="">Select target</option>
                      {TGT_SCORE_OPTS.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`${sat.stFg} ${sat.stFull}`}>
                    <label className={sat.stLabel} htmlFor="sat_testDate">Test Date / Timeline</label>
                    <select
                      className={sat.stSelect}
                      id="sat_testDate"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                    >
                      <option value="">Select timeline</option>
                      {TEST_DATE_OPTS.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={sat.stBtnRow}>
                  <button
                    type="button"
                    className={`${sat.stBtn} ${sat.stBtnBlue}`}
                    onClick={() => goStep(2)}
                  >
                    Continue to Math →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={sat.stCard} id="step2">
                <div className={sat.stCh}>
                  <div className={`${sat.stChIco} ${sat.stChIcoB}`}>🔢</div>
                  <div>
                    <div className={sat.stChTtl}>
                      SAT <span className={sat.stChTtlHi}>Math</span> Self-Assessment
                    </div>
                    <div className={sat.stChSub}>
                      Rate your confidence per topic — this drives your gap analysis.
                    </div>
                  </div>
                </div>
                <div className={sat.stCg}>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-rose-500`} />
                    1 – Not confident
                  </div>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-amber-500`} />
                    2 – Slightly
                  </div>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-amber-500`} />
                    3 – Moderate
                  </div>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-emerald-500`} />
                    4 – Quite confident
                  </div>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-emerald-500`} />
                    5 – Very confident
                  </div>
                </div>
                <div className={sat.stTlist} id="sat_mathList">
                  {mathTopics.map((t) => (
                    <TopicRow
                      key={t.id}
                      topic={t}
                      value={mathConf[t.id] || ""}
                      onChange={setMathVal}
                    />
                  ))}
                </div>
                <div className={sat.stBtnRow}>
                  <button
                    type="button"
                    className={`${sat.stBtn} ${sat.stBtnGhost}`}
                    onClick={() => goStep(1)}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className={`${sat.stBtn} ${sat.stBtnBlue}`}
                    onClick={() => goStep(3)}
                  >
                    Continue to English →
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={sat.stCard} id="step3">
                <div className={sat.stCh}>
                  <div className={`${sat.stChIco} ${sat.stChIcoG}`}>📖</div>
                  <div>
                    <div className={sat.stChTtl}>
                      SAT <span className={sat.stChTtlHg}>Reading &amp; Writing</span>
                    </div>
                    <div className={sat.stChSub}>
                      Rate your confidence for each Reading &amp; Writing topic.
                    </div>
                  </div>
                </div>
                <div className={sat.stCg}>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-rose-500`} />
                    1 – Not confident
                  </div>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-amber-500`} />
                    2 – Slightly
                  </div>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-amber-500`} />
                    3 – Moderate
                  </div>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-emerald-500`} />
                    4 – Quite confident
                  </div>
                  <div className={sat.stCgTag}>
                    <div className={`${sat.stCgDot} bg-emerald-500`} />
                    5 – Very confident
                  </div>
                </div>
                <div className={sat.stTlist} id="sat_engList">
                  {engTopics.map((t) => (
                    <TopicRow
                      key={t.id}
                      topic={t}
                      value={engConf[t.id] || ""}
                      onChange={setEngVal}
                    />
                  ))}
                </div>
                <div className={sat.stBtnRow}>
                  <button
                    type="button"
                    className={`${sat.stBtn} ${sat.stBtnGhost}`}
                    onClick={() => goStep(2)}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className={`${sat.stBtn} ${sat.stBtnGold}`}
                    onClick={() => goStep(4)}
                  >
                    Almost Done →
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className={sat.stCardLead} id="step4">
                <div className={sat.stTeaser}>
                  <div className={sat.stTeaserTop}>
                    <div className="text-[22px] leading-none">🎯</div>
                    <div>
                      <h3 className={sat.stTeaserH3}>Your SAT Report is Ready!</h3>
                      <p className={sat.stTeaserP}>
                        Enter your details below to unlock your full personalised score
                        report
                      </p>
                    </div>
                  </div>
                  <div className={sat.stPscores}>
                    <div className={sat.stPscore}>
                      <span className={sat.stPv} id="pvMath">
                        {teaser.m}
                      </span>
                      <span className={sat.stPl}>Math</span>
                    </div>
                    <div className={sat.stPscore}>
                      <span className={sat.stPv} id="pvEng">
                        {teaser.e}
                      </span>
                      <span className={sat.stPl}>English</span>
                    </div>
                    <div className={sat.stPscore}>
                      <span className={sat.stPv} id="pvTotal">
                        {teaser.t}
                      </span>
                      <span className={sat.stPl}>Total</span>
                    </div>
                  </div>
                </div>
                <div className={sat.stG2}>
                  <div className={sat.stFg}>
                    <label className={sat.stLabel} htmlFor="sat_fname">First Name *</label>
                    <input
                      className={sat.stInput}
                      id="sat_fname"
                      type="text"
                      value={fname}
                      onChange={(e) => setFname(e.target.value)}
                      placeholder="Your first name"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className={sat.stFg}>
                    <label className={sat.stLabel} htmlFor="sat_lname">Last Name</label>
                    <input
                      className={sat.stInput}
                      id="sat_lname"
                      type="text"
                      value={lname}
                      onChange={(e) => setLname(e.target.value)}
                      placeholder="Your last name"
                      autoComplete="family-name"
                    />
                  </div>
                  <div className={sat.stFg}>
                    <label className={sat.stLabel} htmlFor="sat_email">Email Address *</label>
                    <input
                      className={sat.stInput}
                      id="sat_email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoComplete="email"
                    />
                  </div>
                  <div className={sat.stFg}>
                    <label className={sat.stLabel} htmlFor="sat_country">Country *</label>
                    <select
                      className={sat.stSelect}
                      id="sat_country"
                      value={country}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCountry(v);
                        setCountryCode(countryCodeMap[v] || "+1");
                      }}
                    >
                      <option value="">Select country</option>
                      {countriesWithCodesSorted.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`${sat.stFg} ${sat.stFull}`}>
                    <label className={sat.stLabel} htmlFor="sat_phone">Phone Number *</label>
                    <div className={sat.stPhoneRow}>
                      <input
                        id="sat_phone_cc"
                        type="text"
                        className={sat.stPhoneCc}
                        readOnly
                        value={countryCode}
                        aria-label="Country calling code"
                      />
                      <input
                        className={`${sat.stInput} ${sat.stPhoneInput}`}
                        id="sat_phone"
                        type="tel"
                        value={phoneLocal}
                        onChange={(e) => setPhoneLocal(e.target.value)}
                        placeholder="Phone number"
                        autoComplete="tel-national"
                      />
                    </div>
                  </div>
                  <div className={`${sat.stFg} ${sat.stFull}`}>
                    <label className={sat.stLabel} htmlFor="sat_interest">Interested in SAT Coaching?</label>
                    <select
                      className={sat.stSelect}
                      id="sat_interest"
                      value={interest}
                      onChange={(e) => setInterest(e.target.value)}
                    >
                      <option value="">Select an option</option>
                      {INTEREST_OPTS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={sat.stCaptchaWrap}>
                  <div id="sat-recaptcha-mount" className="g-recaptcha" />
                  <div
                    className={`${sat.stCaptchaErr} ${captchaError ? sat.stCaptchaErrShow : ""}`}
                    id="captcha-error"
                  >
                    ⚠ Please confirm you are not a robot to continue.
                  </div>
                </div>

                {leadError ? <div className={sat.stLeadErr}>{leadError}</div> : null}

                <div className={sat.stBtnRow}>
                  <button
                    type="button"
                    className={`${sat.stBtn} ${sat.stBtnGhost}`}
                    onClick={() => goStep(3)}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className={`${sat.stBtn} ${sat.stBtnGold}`}
                    onClick={handleUnlock}
                    disabled={submitting}
                  >
                    {submitting ? "Saving…" : "🔓 Unlock My Full Report"}
                  </button>
                </div>
              </div>
            )}

            {step === 5 && satReport && (
              <div id="step5">
                <div className={sat.stRh}>
                  <div className={sat.stRhMain}>
                    <div className={sat.stRhTitleRow}>
                      <h2 className={sat.stRhH2} id="rName">
                        Hi {satReport.fname}! Here&apos;s Your SAT Report
                      </h2>
                      <span className={sat.stRdyTag}>✓ Report Ready</span>
                    </div>
                    <p className={sat.stRhP} id="rDate">
                      Generated: {satReport.date}
                    </p>
                  </div>
                </div>
                <div className={sat.stSstrip}>
                  <div className={sat.stSc}>
                    <span className={sat.stSlbl}>Math Score</span>
                    <span className={`${sat.stSval} ${sat.stSvalM}`} id="sMath">
                      {satReport.mathScore}
                    </span>
                    <span className={sat.stSsub}>out of 800</span>
                  </div>
                  <div className={sat.stSc}>
                    <span className={sat.stSlbl}>Reading &amp; Writing</span>
                    <span className={`${sat.stSval} ${sat.stSvalE}`} id="sEng">
                      {satReport.engScore}
                    </span>
                    <span className={sat.stSsub}>out of 800</span>
                  </div>
                  <div className={`${sat.stSc} ${sat.stScTot}`}>
                    <span className={sat.stSlbl}>Estimated Total</span>
                    <span className={`${sat.stSval} ${sat.stSvalTot}`} id="sTotal">
                      {satReport.total}
                    </span>
                    <span className={sat.stSsub}>out of 1600</span>
                  </div>
                </div>
                <div className={sat.stIc}>
                  <div className={sat.stIcTtl}>
                    <em className={sat.stIcTtlEm}>📊</em> Gap Analysis
                  </div>
                  <div className={sat.stGapPanel}>
                    <div className={sat.stGapRow}>
                      <div className={sat.stGapBw}>
                        <div className={sat.stGapLr}>
                          <span>Your Estimate</span>
                          <span>Your Target</span>
                        </div>
                        <div className={sat.stGapTrack}>
                          <div
                            className={sat.stGapFill}
                            id="gFill"
                            style={{
                              width: barsAnimate
                                ? `${Math.min(
                                    100,
                                    Math.round((satReport.total / 1600) * 100)
                                  )}%`
                                : "0%",
                              background:
                                satReport.gap > 80
                                  ? READINESS.low
                                  : satReport.gap > 0
                                    ? READINESS.mid
                                    : READINESS.high,
                            }}
                          />
                        </div>
                        <div className={sat.stGapVr}>
                          <span id="gCurV">{satReport.total}</span>
                          <span id="gTgtV">{satReport.target}</span>
                        </div>
                      </div>
                      <div className={sat.stGapN}>
                        <span
                          className={`${sat.stGapPts} ${
                            satReport.gap <= 0 ? sat.stGpUnder : sat.stGpOver
                          }`}
                          id="gPts"
                        >
                          {satReport.gap <= 0
                            ? `+${Math.abs(satReport.gap)}`
                            : satReport.gap}
                        </span>
                        <span className={sat.stGapSub} id="gLbl">
                          {satReport.gap <= 0
                            ? "pts above target!"
                            : "points to target"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={sat.stWrow}>
                    <div className={sat.stWico}>📅</div>
                    <div className={sat.stWtxt}>
                      <h4 className={sat.stWtxtH4} id="wHead">{satReport.wHead}</h4>
                      <TimelineWDetail satReport={satReport} />
                    </div>
                  </div>
                </div>
                <div className={sat.stIc}>
                  <div className={sat.stIcTtl}>
                    <em className={sat.stIcTtlEm}>📈</em> Topic-wise Readiness
                  </div>
                  <canvas
                    id="sat_chart"
                    ref={chartRef}
                    className="max-h-[260px] w-full"
                  />
                </div>
                <div className={sat.stIc}>
                  <div className={sat.stIcTtl}>
                    <em className={sat.stIcTtlEm}>🔍</em> Section Breakdown
                  </div>
                  <div className={sat.stBkGrid}>
                    <div>
                      <div className={sat.stBkTtl}>🔢 Math</div>
                      <div id="sat_mathBk">
                        {satReport.mathDetails.map((t) => {
                          const p = Math.round(((t.conf - 1) / 4) * 100);
                          const col =
                            t.conf <= 2
                              ? READINESS.low
                              : t.conf === 3
                                ? READINESS.mid
                                : READINESS.high;
                          return (
                            <div key={t.id} className={sat.stTbrowBk}>
                              <div className={sat.stTbn}>{t.name}</div>
                              <div className={sat.stTbtrack}>
                                <div
                                  className={sat.stTbfill}
                                  style={{
                                    width: barsAnimate ? `${p}%` : "0%",
                                    background: col,
                                  }}
                                />
                              </div>
                              <div className={sat.stTbpct}>{p}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className={sat.stBkTtl}>📖 Reading &amp; Writing</div>
                      <div id="sat_engBk">
                        {satReport.engDetails.map((t) => {
                          const p = Math.round(((t.conf - 1) / 4) * 100);
                          const col =
                            t.conf <= 2
                              ? READINESS.low
                              : t.conf === 3
                                ? READINESS.mid
                                : READINESS.high;
                          return (
                            <div key={t.id} className={sat.stTbrowBk}>
                              <div className={sat.stTbn}>{t.name}</div>
                              <div className={sat.stTbtrack}>
                                <div
                                  className={sat.stTbfill}
                                  style={{
                                    width: barsAnimate ? `${p}%` : "0%",
                                    background: col,
                                  }}
                                />
                              </div>
                              <div className={sat.stTbpct}>{p}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={sat.stIc}>
                  <div className={sat.stIcTtl}>
                    <em className={sat.stIcTtlEm}>🎯</em> Priority Topics to Focus On
                  </div>
                  <div className={sat.stPlist} id="sat_priList">
                    {!priorityItems.length ? (
                      <p className="text-sm font-medium leading-relaxed text-emerald-600">
                        No critical gaps found!
                      </p>
                    ) : (
                      priorityItems.map((t) => {
                        const piCls =
                          t.lv === "crit" ? sat.stPiPcrit : sat.stPiPmed;
                        const bcls = t.lv === "crit" ? sat.stBc : sat.stBm;
                        const blbl = t.lv === "crit" ? "Needs Work" : "Improve";
                        return (
                          <div
                            key={`${t.id}-${t.sec}-${t.lv}`}
                            className={`${sat.stPi} ${piCls}`}
                          >
                            <span className={`${sat.stPbadge} ${bcls}`}>{blbl}</span>
                            <span className={sat.stPn}>{t.name}</span>
                            <span className={sat.stPs}>
                              {t.sec === "Math" ? "Math" : "English"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className={sat.stIc}>
                  <div className={sat.stIcTtl}>
                    <em className={sat.stIcTtlEm}>💪</em> Your Strong Areas
                  </div>
                  <div className={sat.stPlist} id="sat_strList">
                    {!strongItems.length ? (
                      <p className="text-sm leading-relaxed text-slate-500">
                        Rate topics 4-5 to see strong areas.
                      </p>
                    ) : (
                      strongItems.map((t) => (
                        <div
                          key={`${t.id}-${t.sec}`}
                          className={`${sat.stPi} ${sat.stPiPstr}`}
                        >
                          <span className={`${sat.stPbadge} ${sat.stBs}`}>Strong</span>
                          <span className={sat.stPn}>{t.name}</span>
                          <span className={sat.stPs}>{t.sec}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className={sat.stIc}>
                  <div className={sat.stDlrow}>
                    <p className={sat.stDlrowP}>
                      Save your personalised SAT report as a PDF
                    </p>
                    <div className={sat.stDlRowActions}>
                      <button
                        type="button"
                        className={`${sat.stBtn} ${sat.stBtnBlue}`}
                        id="dlBtn"
                        onClick={handleDownloadPdf}
                      >
                        ⬇ Download PDF Report
                      </button>
                      <a
                        className={`${sat.stBtn} ${sat.stBtnGold}`}
                        href="https://testprepkart.com/self-study/sat/pages/schedule-sat-demo-session"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📅 Schedule SAT Trial Session
                      </a>
                    </div>
                  </div>
                  <div
                    className={`${sat.stPdfNote} ${pdfNote ? sat.stPdfNoteShow : ""}`}
                    id="pdf-note"
                  >
                    <span className={sat.stPnIco}>⚠️</span>
                    <div>
                      <div className={sat.stPnTtl}>PDF download is blocked in this preview</div>
                      <div className={sat.stPnTxt}>
                        This is a <strong>sandbox restriction</strong> of the preview
                        environment. Once you <strong>deploy this on your website</strong>,
                        the button will work perfectly and generate a real PDF for your
                        students.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
