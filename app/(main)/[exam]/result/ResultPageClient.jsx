"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaTrophy, FaQuoteLeft, FaStar, FaCheckCircle } from "react-icons/fa";

const RESULT_YEARS = [2025, 2024, 2023, 2022, 2021];

function getDefaultToppers(examName, year) {
  return [
    { name: "Aryaman", percentile: "99.82", location: "Saudi Arabia", image: null },
    { name: "Tanvi", percentile: "98.26", location: "Oman", image: null },
    { name: "Vineet", percentile: "98.94", location: "Dubai, UAE", image: null },
  ].map((t) => ({
    ...t,
    attempt: `${examName} ${year} – 2nd Attempt`,
  }));
}

const DEFAULT_TESTIMONIALS = [
  {
    name: "Shana Khan",
    location: "Saudi Arabia",
    text: "I recommend Testprepkart for JEE online coaching. They boosted my confidence and supported my success.",
  },
  {
    name: "Roshani Nair",
    location: "Riyadh",
    text: "The faculty will always be unforgettable. Attending their classes was truly wonderful—an incredible learning experience at Testprepkart!",
  },
  {
    name: "Ameesha Shah",
    location: "Dubai",
    text: "My experience at this institute was fantastic. I strongly encourage NRI students to join Testprepkart to succeed in the JEE exam.",
  },
];

const DEFAULT_STATS = [
  "143 NRI students cleared the exam in their first attempt.",
  "Top achievers from Oman, UAE, Saudi Arabia, Singapore, Japan, and more.",
  "Multiple students scored above 99%ile.",
  "Testprepkart continues to empower NRI students with top-notch guidance.",
];

export default function ResultPageClient({ examName, examSlug, currentYear }) {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const displayYear = RESULT_YEARS.includes(selectedYear) ? selectedYear : currentYear;
  const toppers = getDefaultToppers(examName, displayYear);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section
        className="rounded-xl p-6 sm:p-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)]"
        aria-labelledby="result-hero-title"
      >
        <h1
          id="result-hero-title"
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-900 mb-2"
        >
          {examName.toUpperCase()} RESULT {displayYear}
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Testprepkart {examName} {displayYear} Result – Connect with target achievers.
        </p>

        {/* Year tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          {RESULT_YEARS.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedYear === year
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200"
              }`}
            >
              {examName} Result {year}
            </button>
          ))}
        </div>
      </section>

      {/* Featured toppers */}
      <section aria-labelledby="toppers-title">
        <h2
          id="toppers-title"
          className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"
        >
          <FaTrophy className="text-amber-500" />
          {examName} Toppers {displayYear}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {toppers.map((topper, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="h-36 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                {topper.image ? (
                  <img
                    src={topper.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-indigo-200">
                    {topper.percentile}%
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-gray-900">{topper.name} scored {topper.percentile} %ile</p>
                <p className="text-sm text-gray-600 mt-1">
                  Testprepkart {examName} Topper from {topper.location} || {topper.attempt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connect with target achievers */}
      <section className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-[0_2px_12px_rgba(120,90,200,0.06)]">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Connect with {examName} Target Achievers
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Join our community and get inspired by students who achieved top percentiles.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white border border-gray-100"
            >
              <div className="h-24 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
                <FaTrophy className="text-2xl text-indigo-300" />
              </div>
              <p className="text-sm font-medium text-gray-800">Topper story {i}</p>
              <p className="text-xs text-gray-500 mt-1">Achieving excellence with Testprepkart</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-xl p-6 sm:p-8 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 border border-indigo-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {examName} {displayYear} – Highlights
        </h2>
        <ul className="space-y-2">
          {DEFAULT_STATS.map((stat, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
              <FaCheckCircle className="text-green-500 shrink-0 mt-0.5" />
              <span>{stat}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Testimonials */}
      <section aria-labelledby="testimonials-title">
        <h2
          id="testimonials-title"
          className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"
        >
          <FaQuoteLeft className="text-indigo-500" />
          What Our Students Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEFAULT_TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-md"
            >
              <div className="flex gap-1 text-amber-500 mb-3" aria-hidden>
                {[1, 2, 3, 4, 5].map((s) => (
                  <FaStar key={s} className="w-4 h-4" />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              <p className="mt-4 text-sm font-semibold text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-500">({t.location})</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-xl p-6 sm:p-8 text-center bg-gradient-to-br from-indigo-600 to-purple-600 text-white border border-indigo-500 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">
          Here to help you with examinations
        </h2>
        <p className="text-indigo-100 text-sm mb-6 max-w-xl mx-auto">
          Connect with counselors, book a free trial, or explore our courses for {examName} and more.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors shadow-md"
          >
            Contact Us
          </Link>
          <Link
            href={`/${examSlug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500/80 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors border border-white/30"
          >
            {examName} Preparation
          </Link>
        </div>
      </section>
    </div>
  );
}
