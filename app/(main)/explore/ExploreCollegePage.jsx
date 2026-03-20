"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FaPlay,
  FaImages,
  FaMapMarkerAlt,
  FaStar,
  FaCommentDots,
  FaBookmark,
  FaBalanceScale,
  FaDownload,
  FaChevronDown,
  FaChevronRight,
  FaNewspaper,
  FaThumbsUp,
  FaThumbsDown,
  FaPhone,
  FaEnvelope,
  FaExternalLinkAlt,
  FaBell,
  FaUniversity,
} from "react-icons/fa";

const TABS_STRIP = [
  "College Info", "Courses", "Fees", "Reviews", "Admissions", "Placements",
  "Cut-Offs", "Rankings", "Gallery", "Infrastructure", "Faculty", "Compare", "Q&A", "Scholarships", "NEET", "News",
];

const NAV_LINKS = [
  "News", "NEET", "Scholarships", "Q&A", "Compare", "Faculty", "Infrastructure",
  "Gallery", "Rankings", "Cut-Offs", "Placements", "Admissions", "Reviews", "Fees", "Courses", "College Info",
];

const HIGHLIGHTS = [
  { label: "Establishment year", value: "2012" },
  { label: "Ownership type", value: "Government" },
  { label: "Location", value: "Rishikesh, Uttarakhand" },
  { label: "No. of courses offered", value: "44 courses across 46 streams" },
  { label: "Entrance exam", value: "NEET UG, INICET" },
  { label: "Average emoluments", value: "INR 70,000 - INR 1.1 lakh" },
  { label: "NIRF Ranking (2025)", value: "13th under the 'Medical' category by the NIRF Ranking 2025" },
  { label: "Application mode", value: "Online" },
  { label: "Shiksha Reviews (Overall)", value: "4.7/ 5" },
  { label: "Total beds", value: "960" },
  { label: "Total faculty", value: "200+" },
  { label: "Official website", value: "www.aiimsrishikesh.edu.in" },
];

const HIGHLIGHTS_FAQS = [
  { q: "What is the cutoff for MBBS in AIIMS Rishikesh?", a: "AIIMS Rishikesh MBBS cutoff 2024 was concluded for different categories. For General AI the last round closing rank for MBBS was 594. For OBC AI it was 880, for SC AI and ST AI 6520 and 11941 respectively." },
  { q: "When do AIIMS Rishikesh admissions begin?", a: "AIIMS Rishikesh admissions begin with NEET registration. Candidates apply for NEET, appear for the exam, then participate in NEET Counselling for seat allotment. NEET registration usually starts in February every year." },
];

const PROGRAMMES = [
  { name: "B.Sc.", courses: 18, rating: 4.5, reviews: 7, duration: "3 - 4 years", exams: ["AIIMS paramedical", "UK 12th", "ISC", "CBSE 12th"], fees: "₹0 - 1.5 L", placement: "3.9" },
  { name: "M.Sc.", courses: 22, duration: "2 - 3 years", exams: ["AIIMS PG", "AIIMS Nursing"], fees: "₹650", median: "₹24.1 LPA" },
  { name: "BMLT", courses: 1, rating: 4.8, reviews: 2, duration: "3 years", exams: ["AIIMS paramedical"], fees: "₹98.1 K", placement: "4.0" },
  { name: "MBBS", courses: 1, rating: 4.6, reviews: 17, duration: "66 months", exams: ["NEET"], fees: "₹51.52 K", median: "₹12.2 LPA" },
  { name: "MD", courses: 22, duration: "3 years", exams: ["INI CET"], fees: "₹2.11 K", median: "₹24.1 LPA" },
  { name: "M.Ch.", courses: 24, duration: "3 - 6 years", exams: ["INI CET"] },
  { name: "MDS", courses: 10, duration: "3 years", exams: ["NEET MDS", "INI CET"], fees: "₹5.78 K" },
];

const POPULAR_COURSES = [
  { name: "B.Sc. in Medical Radiology and Imaging Technology", duration: "3 years", fees: "₹98.1 K", exam: "AIIMS paramedical" },
  { name: "B.Sc. (Hons.) in Nursing", duration: "4 years", fees: "₹0", exam: "AIIMS paramedical" },
  { name: "B.Sc. in Anaesthesia Technology", duration: "3 years", fees: "₹98.1 K", exam: "AIIMS paramedical" },
  { name: "B.Sc. in Nuclear Medicine Technology", duration: "3 years", fees: "₹98.1 K", exam: "AIIMS paramedical" },
];

const REVIEWS = [
  { name: "Rajneesh Kumar", course: "MBBS - Batch of 2028", rating: 4.4, verified: true, excerpt: "College situated in Dev Bhoomi, the land of mother Ganga...", date: "18 Jul 2025" },
  { name: "Saumy Siddharth", course: "MBBS - Batch of 2028", rating: 4.8, verified: true, excerpt: "All you need to know about AIIMS Rishikesh...", date: "22 Dec 2024" },
  { name: "Tamanna yaduvanshi", course: "B.Sc. (Hons.) in Nursing - Batch of 2026", rating: 4.4, verified: true, excerpt: "Inside of AIIMS rishikesh...", date: "10 Aug 2024" },
];

const NEWS_ITEMS = [
  { title: "Alternative Courses for MBBS - Know Eligibility, Fees and Package in Lakh", date: "Mar 13, 2026" },
  { title: "NEET MDS 2026: Registration (Begins), Exam Date, Eligibility, Pattern & Syllabus", date: "Mar 14, 2026" },
  { title: "CBSE Class 12 Date Sheet 2026 (Released): Download Subject-wise Final Exam Datesheet PDF", date: "Mar 15, 2026" },
];

const TOC_ITEMS = [
  "AIIMS Rishikesh Highlights 2026",
  "AIIMS Rishikesh Popular Programmes 2026",
  "AIIMS Rishikesh Admission Process and Important Dates 2026",
  "AIIMS Rishikesh Student Reviews",
  "AIIMS Rishikesh Cutoff 2025",
  "+ 12 more items",
];

const WHATS_NEW_BULLETS = [
  "The AIIMS BSc Paramedical 2026 exam date has been released for BSc and BMLT programmes. Exam will be held on Jul 4, 2026.",
  "NEET UG 2026 registration window is now closed. The exam is scheduled for May 3, 2026.",
  "AIIMS MSc Nursing 2026 entrance examination will be conducted on Jun 20, 2026, tentatively.",
  "AIIMS BSc (Hons) Nursing 2026 exam date has been announced. Entrance exam will be held on June 27, 2026.",
  "NEET MDS 2026 exam date has been set as May 2, 2026 (tentatively). Registrations expected to start soon.",
  "INI CET July 2026 session exam date announced for MD/MS/MDS/DM/MCh courses. Exam on May 16, 2026.",
];

export default function ExploreCollegePage() {
  const [activeTab, setActiveTab] = useState("College Info");
  const [whatsNewOpen, setWhatsNewOpen] = useState(true);
  const [tocOpen, setTocOpen] = useState(true);
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [faqOpen, setFaqOpen] = useState(null);
  const [newsTab, setNewsTab] = useState("Latest");
  const [courseFilter, setCourseFilter] = useState("B.Sc.");

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white antialiased">
      {/* Hero: full-width image with logo overlay and media badge */}
      <div className="relative w-full bg-gradient-to-br from-slate-300 via-slate-100 to-slate-200 aspect-[21/9] max-h-[300px] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Campus image</div>
        <button
          type="button"
          className="absolute bottom-3 right-3 px-3 py-2 rounded-lg bg-black/60 text-white text-xs flex items-center gap-1.5 hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent transition-colors duration-200"
          aria-label="View 2 videos and 9 photos"
        >
          <FaPlay className="shrink-0" /> 2 Videos, <FaImages className="shrink-0" /> 9 Photos
        </button>
        <div className="absolute left-4 sm:left-6 bottom-0 translate-y-1/2 z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white shadow-lg border border-gray-200 flex items-center justify-center overflow-hidden ring-2 ring-white/80">
          <span className="text-xs font-bold text-gray-700 text-center leading-tight px-1">AIIMS<br />Rishikesh</span>
        </div>
      </div>

      {/* College info + actions + tabs - max-w-7xl */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pt-6 lg:pt-8">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                AIIMS Rishikesh - All India Institute of Medical Sciences
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                <span className="flex items-center gap-1"><FaMapMarkerAlt className="text-gray-400" /> Rishikesh</span>
                <span className="flex items-center gap-1"><FaStar className="text-amber-500" /> 4.5/5 (27 Reviews)</span>
                <span className="flex items-center gap-1"><FaCommentDots className="text-gray-400" /> 40 Student Q&A</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Public/Government University · Estd. 2012</p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button type="button" className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors duration-200">
                <FaBookmark className="shrink-0" /> Save
              </button>
              <button type="button" className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors duration-200">
                <FaBalanceScale className="shrink-0" /> Compare
              </button>
              <button type="button" className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200">
                <FaDownload className="shrink-0" /> Brochure
              </button>
            </div>
          </div>

          {/* Tab strip - underline style + scroll arrow */}
          <div className="mt-5 flex items-center justify-between gap-4">
            <nav role="tablist" aria-label="College sections" className="flex items-center gap-0 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 flex-1 min-h-[48px]">
              {TABS_STRIP.map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  type="button"
                  aria-selected={activeTab === tab}
                  tabIndex={activeTab === tab ? 0 : -1}
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 py-3 px-3 min-h-[48px] text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${
                    activeTab === tab
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
              <span className="shrink-0 pl-2 text-gray-400 pointer-events-none" aria-hidden><FaChevronRight className="w-4 h-4" /></span>
            </nav>
            <span className="text-sm text-gray-500 shrink-0 hidden sm:block">Last updated on 2 Mar &apos;26</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - main content */}
          <div className="lg:col-span-2 space-y-6">
        {/* What's new - card with header pattern + icon */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow duration-200 hover:shadow-md">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 shrink-0"><FaBell className="w-5 h-5" /></span>
                <div>
                  <p className="text-sm text-gray-500">AIIMS Rishikesh</p>
                  <h2 className="text-lg font-bold text-gray-900">What&apos;s new?</h2>
                </div>
              </div>
              <button type="button" onClick={() => setWhatsNewOpen(!whatsNewOpen)} aria-expanded={whatsNewOpen} className="p-2 -m-2 text-gray-400 hover:text-gray-600 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors duration-200" aria-label={whatsNewOpen ? "Collapse" : "Expand"}>
                <FaChevronDown className={`w-4 h-4 transition-transform duration-200 ${whatsNewOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            {whatsNewOpen && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600">For B.Sc. course</span>
                  <button type="button" className="text-sm text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">Change</button>
                </div>
                <p className="text-sm text-gray-600 mt-3 mb-4 leading-relaxed">
                  The AIIMS BSc Paramedical 2026 exam date has been announced for the B.Sc. course. The exam will be conducted on Jul 4, 2026.
                </p>
                <button type="button" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 active:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200">
                  <FaBell className="shrink-0" /> Keep Me Notified
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Overview & TOC - card with header pattern */}
        <section id="overview" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow duration-200 hover:shadow-md scroll-mt-6">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-gray-500">AIIMS Rishikesh Overview</p>
                <h2 className="text-lg font-bold text-gray-900">Table of contents</h2>
              </div>
              <button type="button" onClick={() => setTocOpen(!tocOpen)} aria-expanded={tocOpen} className="p-2 -m-2 text-gray-400 hover:text-gray-600 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors duration-200" aria-label={tocOpen ? "Collapse" : "Expand"}>
                <FaChevronDown className={`w-4 h-4 transition-transform duration-200 ${tocOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            {tocOpen && (
              <ul className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                {TOC_ITEMS.map((item, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => scrollToSection(item.toLowerCase().replace(/\s/g, "-").replace(/[^a-z0-9-]/g, ""))} className="text-blue-600 hover:underline text-left py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Highlights 2026 */}
        <section id="aiims-rishikesh-highlights-2026" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow duration-200 hover:shadow-md scroll-mt-6">
          <div className="p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setHighlightsOpen(!highlightsOpen)}
            aria-expanded={highlightsOpen}
            className="w-full flex items-center justify-between py-2 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 -mx-1 px-1"
          >
            <h2 className="text-lg font-semibold text-gray-900">AIIMS Rishikesh Highlights 2026</h2>
            <FaChevronDown className={`shrink-0 text-gray-400 transition-transform duration-200 ${highlightsOpen ? "rotate-180" : ""}`} />
          </button>
          {highlightsOpen && (
            <>
              <p className="text-sm text-gray-600 mt-3 mb-3 leading-relaxed">
                AIIMS Rishikesh was established in 2012 as one of the seven AIIMS campuses by the Government of India under the Pradhan Mantri Swasthya Suraksha Yojana (PMSSY). It is an autonomous institute registered under the Indian Societies Registration Act. AIIMS Rishikesh has been ranked #13 under the &apos;Medical&apos; category as per NIRF 2025 rankings.
              </p>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                The institute offers 32 OPDs, 96 specialised clinics for Genetics, Breast Disorders, Palliative Care and many more. Admission to all UG, PG, super-speciality, and doctoral programmes is entrance-based. The hospital has 960 beds and modern equipment. Median package during UG 5-year placements 2023 stood at INR 12.4 LPA.
              </p>
              <p className="text-sm text-gray-600 mb-3">Tabulated below are the major highlights:</p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Particular</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">AIIMS Rishikesh Highlights 2025</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HIGHLIGHTS.map((row, i) => (
                      <tr key={i} className={`border-t border-gray-100 transition-colors duration-150 ${i % 2 === 0 ? "bg-white hover:bg-gray-50/50" : "bg-gray-50/80 hover:bg-gray-100/80"}`}>
                        <td className="px-4 py-3 text-gray-700">{row.label}</td>
                        <td className="px-4 py-3 text-gray-600">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-blue-600 mb-4">
                <button type="button" className="hover:underline">Check out more on AIIMS Rishikesh Highlights in the below videos:</button>
              </p>
              <button type="button" className="text-sm text-blue-600 hover:underline">Read more</button>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Commonly asked questions On Highlights</h3>
                {HIGHLIGHTS_FAQS.map((faq, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg mb-2 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      aria-expanded={faqOpen === i}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-inset transition-colors duration-200"
                    >
                      <span className="flex-1 min-w-0">Q: {faq.q}</span>
                      <FaChevronDown className={`shrink-0 text-gray-400 transition-transform duration-200 ${faqOpen === i ? "rotate-180" : ""}`} />
                    </button>
                    {faqOpen === i && (
                      <div className="px-4 pb-3 text-sm text-gray-600 border-t border-gray-100 pt-2 leading-relaxed">
                        A: {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          </div>
        </section>

        {/* Video stories */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AIIMS Rishikesh Video stories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["Compare", "Eligibility & Cut Offs", "Courses & Fees"].map((label) => (
              <button key={label} type="button" className="p-4 border border-gray-200 rounded-lg text-center hover:border-blue-200 hover:bg-blue-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 transition-all duration-200">
                <p className="text-sm font-medium text-gray-900">{label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Popular Programmes 2026 */}
        <section id="aiims-rishikesh-popular-programmes-2026" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">AIIMS Rishikesh Popular Programmes 2026</h2>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            The flagship programmes include MBBS (full-time, UG, 5.5 years). The institute also offers BSc, MSc, MD, MS, MDS and Certificate courses. Admission is based on NEET-UG and overall performance. Check the table below for more details.
          </p>
          <div className="space-y-4">
            {PROGRAMMES.slice(0, 4).map((prog, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{prog.name}</h3>
                    <p className="text-sm text-blue-600 hover:underline mt-0.5">{prog.courses} Courses</p>
                    {prog.rating && (
                      <p className="text-sm text-gray-600 mt-1">
                        <FaStar className="inline text-amber-500 mr-1" /> {prog.rating}({prog.reviews})
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{prog.duration}</p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">Compare</button>
                    <button type="button" className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">Brochure</button>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700 mt-2">Exams Accepted</p>
                <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
                  {(prog.exams || []).map((ex, j) => (
                    <li key={j}>· {ex}</li>
                  ))}
                </ul>
                <p className="text-xs font-medium text-gray-700 mt-2">Total Tuition Fees</p>
                <p className="text-sm text-gray-600">{prog.fees || "–"}</p>
                <button type="button" className="text-sm text-blue-600 hover:underline mt-1">Get Fee Details</button>
                {(prog.placement || prog.median) && (
                  <p className="text-xs text-gray-600 mt-2">
                    {prog.placement ? `Placement Rating ${prog.placement}` : ""}
                    {prog.placement && prog.median ? " · " : ""}
                    {prog.median ? `Median Salary ${prog.median}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded py-1">
            View All 12 Courses <FaChevronRight className="text-xs shrink-0" />
          </button>
        </section>

        {/* Admission Process and Important Dates 2026 */}
        <section id="aiims-rishikesh-admission-process-and-important-dates-2026" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">AIIMS Rishikesh Admission Process and Important Dates 2026</h2>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            AIIMS Rishikesh admission is based on entrance exams NEET and INI CET. Candidates should check eligibility before applying. After results, participate in NEET Counselling or INI CET counselling for seat allotment. Dates for each course are mentioned below.
          </p>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200">
              <h4 className="font-medium text-gray-900">B.Sc. Admissions 2026</h4>
              <p className="text-sm text-gray-500">18 Courses · 3 years-4 years</p>
              <p className="text-xs text-gray-600 mt-1">Eligibility: 10+2 with 45% aggregate</p>
              <p className="text-xs text-gray-600">Accepting Exams: AIIMS paramedical, CBSE 12th, ISC, UK 12th</p>
              <p className="text-xs font-medium text-gray-700 mt-2">Important dates</p>
              <button type="button" className="text-xs text-blue-600 hover:underline">Keep Me Notified</button>
              <div className="overflow-x-auto mt-2 border border-gray-100 rounded">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-medium">Dates</th><th className="px-3 py-2 text-left font-medium">Events</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-gray-100"><td className="px-3 py-2">Mar &apos;26-Apr &apos;26</td><td className="px-3 py-2">AIIMS BSc Paramedical Registration (Basic) Tentative</td></tr>
                    <tr className="border-t border-gray-100"><td className="px-3 py-2">May &apos;26</td><td className="px-3 py-2">AIIMS BSc Paramedical Admit Card Tentative</td></tr>
                    <tr className="border-t border-gray-100"><td className="px-3 py-2">30 May &apos;26</td><td className="px-3 py-2">AIIMS BSc Nursing (Post Basic) Exam</td></tr>
                  </tbody>
                </table>
              </div>
              <button type="button" className="text-xs text-blue-600 hover:underline mt-2">Download dates</button>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200">
              <h4 className="font-medium text-gray-900">MBBS Admissions 2026</h4>
              <p className="text-sm text-gray-500">1 Course · 66 months</p>
              <p className="text-xs text-gray-600 mt-1">Eligibility: 10+2 with 50% aggregate. Accepting Exams: NEET</p>
              <div className="overflow-x-auto mt-2 border border-gray-100 rounded">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-medium">Dates</th><th className="px-3 py-2 text-left font-medium">Events</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-gray-100"><td className="px-3 py-2">3 May &apos;26</td><td className="px-3 py-2">NEET 2026 Exam Date</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200">
              <h4 className="font-medium text-gray-900">MDS Admissions 2026</h4>
              <p className="text-sm text-gray-500">10 Courses · 3 years</p>
              <p className="text-xs text-gray-600 mt-1">Eligibility: Undergraduate Degree with 55% aggregate. Accepting Exams: NEET MDS, INI CET</p>
            </div>
          </div>
          <button type="button" className="mt-4 text-sm text-blue-600 hover:underline flex items-center gap-1">
            Admission Details for all courses <FaChevronRight className="text-xs" />
          </button>
        </section>

        {/* Popular Courses - filter chips + cards */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AIIMS Rishikesh Popular Courses</h2>
            <button type="button" className="text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded py-1">View all</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {["B.Sc.", "M.Sc.", "BMLT", "MBBS", "More"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setCourseFilter(chip)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${courseFilter === chip ? "bg-gray-200 text-gray-900" : "border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {POPULAR_COURSES.map((c, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                <p className="text-xs text-gray-500 mt-1">{c.duration}</p>
                <p className="text-xs font-medium text-gray-700 mt-2">Tuition Fees</p>
                <p className="text-sm text-gray-600">{c.fees}</p>
                <button type="button" className="text-xs text-blue-600 hover:underline">Get Fee Details</button>
                <p className="text-xs text-gray-600 mt-2">Exams Accepted: {c.exam}</p>
                <div className="flex gap-2 mt-2">
                  <button type="button" className="text-xs text-blue-600 hover:underline">Brochure</button>
                  <button type="button" className="text-xs text-blue-600 hover:underline">Compare</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 text-sm text-blue-600 hover:underline">View All B.Sc. Courses</button>
        </section>

        {/* Student Reviews */}
        <section id="reviews" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AIIMS Rishikesh Students Ratings &amp; Reviews</h2>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">4.5/5</span>
              <span className="text-sm text-gray-500">18 Verified Reviews</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Placements", value: "4.4" },
              { label: "Infrastructure", value: "4.6" },
              { label: "Faculty & Course", value: "4.6" },
              { label: "Value for Money", value: "4.6" },
            ].map((item) => (
              <div key={item.label} className="p-3 border border-gray-200 rounded-lg text-center bg-gray-50/50">
                <p className="text-xs font-medium text-gray-700">{item.label}</p>
                <p className="text-sm font-semibold text-blue-600 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {REVIEWS.map((r, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm flex items-center gap-2 flex-wrap">
                      {r.name}
                      {r.verified && <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Verified</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.course}</p>
                  </div>
                  <span className="text-sm text-amber-500 flex items-center gap-0.5 shrink-0"><FaStar /> {r.rating}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{r.excerpt}</p>
                <p className="text-xs text-gray-400 mt-2">Reviewed on {r.date}</p>
                <div className="flex gap-1 mt-3">
                  <button type="button" aria-label="Helpful" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"><FaThumbsUp className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label="Not helpful" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"><FaThumbsDown className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded py-1">
            View All 27 Reviews <FaChevronRight className="text-xs shrink-0" />
          </button>
        </section>

        {/* Cutoff 2025 */}
        <section id="aiims-rishikesh-cutoff-2025" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">AIIMS Rishikesh Cutoff 2025</h2>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            AIIMS Rishikesh NEET UG cutoff has been released for 2025. According to Round 1, the closing rank for MBBS admission stood at 685 for General AI quota.
          </p>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Course</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">2024</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">2025</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">2026</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors"><td className="px-4 py-3 text-gray-700">MD in Dermatology, Venereology and Leprosy</td><td className="text-gray-600">63</td><td className="text-gray-600">160</td><td>–</td></tr>
                <tr className="border-t border-gray-100 bg-gray-50/80 hover:bg-gray-100/80 transition-colors"><td className="px-4 py-3 text-gray-700">MS in General Surgery</td><td className="text-gray-600">214</td><td className="text-gray-600">175</td><td>–</td></tr>
                <tr className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors"><td className="px-4 py-3 text-gray-700">MS in Obstetrtics and Gynaecology</td><td className="text-gray-600">197</td><td>–</td><td className="text-gray-600">453</td></tr>
              </tbody>
            </table>
          </div>
          <button type="button" className="mt-4 text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded py-1">
            View all cut-off <FaChevronRight className="text-xs shrink-0" />
          </button>
        </section>

        {/* Rankings 2025 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">AIIMS Rishikesh Rankings 2025</h2>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            AIIMS Rishikesh secured 13th position under the &apos;Medical&apos; category in NIRF 2025.
          </p>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Ranking Body</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Ranking (2025)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors"><td className="px-4 py-3 text-gray-700">NIRF Ranking 2025 (Medical)</td><td className="text-gray-600">13</td></tr>
                <tr className="border-t border-gray-100 bg-gray-50/80 hover:bg-gray-100/80 transition-colors"><td className="px-4 py-3 text-gray-700">NIRF Ranking 2025 (Overall)</td><td className="text-gray-600">78</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Placements */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">AIIMS Rishikesh Placements 2025</h2>
          <p className="text-sm text-gray-600">AIIMS Rishikesh placements 2025 statistics have not been released yet.</p>
        </section>
          </div>

          {/* Right column - sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* Take a look at Campus */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow duration-200 hover:shadow-md">
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 shrink-0"><FaUniversity className="w-5 h-5" /></span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">AIIMS Rishikesh</p>
                    <h2 className="text-lg font-bold text-gray-900">Take a look at Campus</h2>
                  </div>
                </div>
                <div className="mt-4 aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">Header image</div>
                <div className="flex gap-1.5 justify-center mt-2" aria-hidden>
                  <span className="w-2 h-2 rounded-full bg-gray-400" /><span className="w-2 h-2 rounded-full bg-gray-200" /><span className="w-2 h-2 rounded-full bg-gray-200" />
                </div>
                <button type="button" className="mt-3 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded py-1">View All</button>
              </div>
            </section>

            {/* News & Updates */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow duration-200 hover:shadow-md">
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 shrink-0"><FaNewspaper className="w-5 h-5" /></span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">AIIMS Rishikesh</p>
                    <h2 className="text-lg font-bold text-gray-900">News &amp; Updates</h2>
                  </div>
                </div>
                <div className="flex gap-1 mt-4 p-1 bg-gray-100 rounded-lg" role="tablist">
                  <button
                    role="tab"
                    type="button"
                    aria-selected={newsTab === "Latest"}
                    onClick={() => setNewsTab("Latest")}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${newsTab === "Latest" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    Latest
                  </button>
                  <button
                    role="tab"
                    type="button"
                    aria-selected={newsTab === "Popular"}
                    onClick={() => setNewsTab("Popular")}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${newsTab === "Popular" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    Popular
                  </button>
                </div>
                <ul className="mt-4 space-y-3">
                  {NEWS_ITEMS.map((item, i) => (
                    <li key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                      <button type="button" className="text-sm text-blue-600 hover:underline mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">Read More</button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="mt-3 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded py-1">View all News &amp; Updates</button>
              </div>
            </section>
          </aside>
        </div>

        {/* Full-width sections below two-column */}
        <div className="mt-6 space-y-6">
        {/* Contact Information */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AIIMS Rishikesh Contact Information</h2>
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <p><span className="font-medium text-gray-700">Address</span><br />All India Institute of Medical Sciences, Rishikesh Virbhadra Road, Rishikesh (Uttarakhand)</p>
            <p className="flex items-center gap-2">
              <FaPhone className="text-gray-400 shrink-0" />
              <a href="tel:01352462940" className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">01352462940</a>
            </p>
            <p className="flex items-center gap-2">
              <FaEnvelope className="text-gray-400 shrink-0" />
              <a href="mailto:info@aiimsrishikesh.edu.in" className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">info@aiimsrishikesh.edu.in</a>
            </p>
          </div>
          <button type="button" className="mt-4 text-sm text-gray-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 rounded py-1">Show Phone &amp; Email</button>
          <a href="https://www.aiimsrishikesh.edu.in" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded py-1">
            Go to College Website <FaExternalLinkAlt className="text-xs shrink-0" />
          </a>
        </section>

        {/* Useful Links */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Useful Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Know more about AIIMS Rishikesh</h3>
              <ul className="space-y-2 text-sm text-blue-600">
                <li><button type="button" className="hover:underline text-left py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">News &amp; Articles</button></li>
                <li><button type="button" className="hover:underline text-left">NEET</button></li>
                <li><button type="button" className="hover:underline text-left">Scholarships</button></li>
                <li><button type="button" className="hover:underline text-left">Q&amp;A</button></li>
                <li><button type="button" className="hover:underline text-left">Compare</button></li>
                <li><button type="button" className="hover:underline text-left">Faculty</button></li>
                <li><button type="button" className="hover:underline text-left">Infrastructure</button></li>
                <li><button type="button" className="hover:underline text-left">Gallery</button></li>
                <li><button type="button" className="hover:underline text-left">Rankings</button></li>
                <li><button type="button" className="hover:underline text-left">Cut off &amp; Merit List</button></li>
                <li><button type="button" className="hover:underline text-left">Placement</button></li>
                <li><button type="button" className="hover:underline text-left">Admission</button></li>
                <li><button type="button" className="hover:underline text-left">Reviews</button></li>
                <li><button type="button" className="hover:underline text-left">Fees</button></li>
                <li><button type="button" className="hover:underline text-left">Courses</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Explore Streams at AIIMS Rishikesh</h3>
              <ul className="space-y-1 text-sm text-blue-600">
                <li><button type="button" className="hover:underline text-left">Science</button></li>
                <li><button type="button" className="hover:underline text-left">Medicine &amp; Health Sciences</button></li>
                <li><button type="button" className="hover:underline text-left">Nursing</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Explore Colleges in this Location</h3>
              <ul className="space-y-1 text-sm text-blue-600">
                <li><button type="button" className="hover:underline text-left">MBBS colleges in Rishikesh</button></li>
                <li><button type="button" className="hover:underline text-left">B.Sc. colleges in Rishikesh</button></li>
                <li><button type="button" className="hover:underline text-left">M.Sc. colleges in Rishikesh</button></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 py-6">
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <li><Link href={basePath || "/"} className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">Home</Link></li>
            <li aria-hidden className="text-gray-400">/</li>
            <li><button type="button" className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">Colleges in Rishikesh</button></li>
            <li aria-hidden className="text-gray-400">/</li>
            <li className="text-gray-700 font-medium">AIIMS Rishikesh</li>
          </ol>
        </nav>

        {/* Back to home */}
        <div className="text-center py-8">
          <Link
            href={basePath || "/"}
            className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] border border-gray-300 rounded-lg text-gray-700 font-medium bg-white hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors duration-200"
          >
            ← Back to Home
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
