import React from "react";
import Link from "next/link";
import Image from "next/image";
import { FaTrophy, FaQuoteLeft, FaStar, FaCheckCircle } from "react-icons/fa";

const DEFAULT_HIGHLIGHTS = [
  "143 NRI students cleared the exam in their first attempt.",
  "Top achievers from Oman, UAE, Saudi Arabia, Singapore, Japan, and more.",
  "Multiple students scored above 99%ile.",
  "Testprepkart continues to empower NRI students with top-notch guidance.",
];

/** 16:10 — same target ratio as banner images on mobile; export e.g. 1600×1000 for no awkward crop with object-cover. */
const CARD_MEDIA_CLASS =
  "relative w-full aspect-[16/10] overflow-hidden shrink-0 bg-gradient-to-b from-indigo-50/95 to-purple-100/95 flex items-center justify-center";

const DUAL_BANNER_SIZES = "(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 720px";
const CARD_IMAGE_SIZES = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px";

export default function ResultPageClient({ examName, examSlug, initialData, initialYear, yearsList }) {
  const content = initialData || {};
  const displayYear = initialYear ?? new Date().getFullYear();
  const years = Array.isArray(yearsList) && yearsList.length ? yearsList : [displayYear];

  const bannerTitle = (content.bannerTitle || "").trim() || `${examName} Result ${displayYear}`;
  const bannerSubtitle = (content.bannerSubtitle || "").trim() || "Celebrate our toppers and connect with target achievers. Your success story could be next.";
  let bannerImageLeft = (content.bannerImageLeft || "").trim();
  let bannerImageRight = (content.bannerImageRight || "").trim();
  if (!bannerImageLeft && !bannerImageRight) {
    const legacy = (content.bannerImage || "").trim();
    if (legacy) bannerImageLeft = legacy;
  }
  const hasDualBanner = Boolean(bannerImageLeft || bannerImageRight);
  const toppers = content.toppers ?? [];
  const targetAchievers = content.targetAchievers ?? [];
  const highlights = (content.highlights && content.highlights.length) ? content.highlights : DEFAULT_HIGHLIGHTS;
  const studentTestimonials = content.studentTestimonials ?? [];
  const parentTestimonials = content.parentTestimonials ?? [];

  return (
    <div className="space-y-10">
      {/* Banner — text hero on gradient only (no photo background) */}
      <section
        className="w-full relative min-h-[200px] sm:min-h-[220px] md:min-h-[240px] flex items-center justify-center overflow-hidden rounded-xl border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)]"
        aria-label="Result banner"
      >
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #312e81 100%)",
          }}
        />
        <div className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,255,255,0.22),transparent)]" aria-hidden />
        <div className="absolute inset-0 rounded-xl bg-black/10" aria-hidden />
        <div className="relative z-10 w-full px-6 sm:px-8 py-7 sm:py-9 md:py-10 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-2.5 drop-shadow-md">
            {bannerTitle}
          </h2>
          <p className="text-white/90 text-sm sm:text-base md:text-lg max-w-2xl mx-auto drop-shadow-sm">
            {bannerSubtitle}
          </p>
        </div>
      </section>

      {/* Second banner — two images, responsive row */}
      {hasDualBanner ? (
        <section
          className="w-full"
          aria-label="Result imagery"
        >
          <div
            className={`grid gap-3 sm:gap-4 ${
              bannerImageLeft && bannerImageRight ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {bannerImageLeft ? (
              <div className="w-full overflow-hidden rounded-xl border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)] bg-indigo-50/50">
                <Image
                  src={bannerImageLeft}
                  alt=""
                  width={1600}
                  height={1000}
                  className="w-full h-auto max-w-full block align-middle"
                  sizes={DUAL_BANNER_SIZES}
                  unoptimized={bannerImageLeft.startsWith("http://")}
                />
              </div>
            ) : null}
            {bannerImageRight ? (
              <div className="w-full overflow-hidden rounded-xl border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)] bg-indigo-50/50">
                <Image
                  src={bannerImageRight}
                  alt=""
                  width={1600}
                  height={1000}
                  className="w-full h-auto max-w-full block align-middle"
                  sizes={DUAL_BANNER_SIZES}
                  unoptimized={bannerImageRight.startsWith("http://")}
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Hero + year tabs */}
      <section className="rounded-xl p-6 sm:p-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)]" aria-labelledby="result-hero-title">
        <h1 id="result-hero-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-900 mb-2">
          {examName.toUpperCase()} RESULT {displayYear}
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Testprepkart {examName} {displayYear} Result – Connect with target achievers.
        </p>
        <div className="flex flex-wrap gap-2 mt-6">
          {years.map((y) => (
            y === displayYear ? (
              <span
                key={y}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white shadow-md"
              >
                {examName} Result {y}
              </span>
            ) : (
              <Link
                key={y}
                href={`/${examSlug}/result/${y}`}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
              >
                {examName} Result {y}
              </Link>
            )
          ))}
        </div>
      </section>

      {/* Toppers */}
      <section aria-labelledby="toppers-title">
        <h2 id="toppers-title" className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FaTrophy className="text-amber-500" />
          {examName} Toppers {displayYear}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {toppers.length ? (
            toppers.map((topper, i) => (
              <article key={i} className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col w-full">
                <div className={CARD_MEDIA_CLASS}>
                  {topper.image && (topper.image.includes("youtube") || topper.image.includes("youtu.be")) ? (
                    <iframe
                      title=""
                      src={topper.image.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      className="absolute inset-0 h-full w-full"
                      allowFullScreen
                    />
                  ) : topper.image ? (
                    <Image
                      src={topper.image}
                      alt=""
                      fill
                      className="object-cover object-center"
                      sizes={CARD_IMAGE_SIZES}
                      unoptimized={String(topper.image).startsWith("http://")}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 px-2 text-center">
                      <span className="text-5xl sm:text-6xl font-bold text-indigo-300/90 tabular-nums leading-none">
                        {topper.percentile || "—"}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500/90">Score</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center p-4 sm:p-5 bg-white shrink-0">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                    {topper.name
                      ? `${topper.name} · Score: ${(topper.percentile || "").trim() || "—"}`
                      : "—"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-snug">
                    {[topper.location, topper.attempt].some(Boolean)
                      ? `Testprepkart ${examName} Topper${topper.location ? ` from ${topper.location}` : ""}${topper.attempt ? ` || ${topper.attempt}` : ""}`
                      : ""}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p className="text-gray-500 col-span-full">No toppers added for this year yet.</p>
          )}
        </div>
      </section>

      {/* Target Achievers */}
      <section aria-labelledby="achievers-title">
        <h2 id="achievers-title" className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FaTrophy className="text-amber-500" />
          Connect with {examName} Target Achievers
        </h2>
        <p className="text-gray-600 text-sm mb-6">Join our community and get inspired by students who achieved top percentiles.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {targetAchievers.length ? (
            targetAchievers.map((a, i) => (
              <article
                key={i}
                className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col w-full"
              >
                <div className={CARD_MEDIA_CLASS}>
                  {a.image && (a.image.includes("youtube") || a.image.includes("youtu.be")) ? (
                    <iframe
                      title=""
                      src={a.image.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      className="absolute inset-0 h-full w-full"
                      allowFullScreen
                    />
                  ) : a.image ? (
                    <Image
                      src={a.image}
                      alt=""
                      fill
                      className="object-cover object-center"
                      sizes={CARD_IMAGE_SIZES}
                      unoptimized={String(a.image).startsWith("http://")}
                    />
                  ) : (
                    <FaTrophy className="text-5xl sm:text-6xl text-indigo-300/80" />
                  )}
                </div>
                <div className="flex flex-col justify-center p-4 sm:p-5 bg-white shrink-0">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                    {a.title || "Success Story"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-snug line-clamp-3">
                    {a.description || "Achieving excellence with Testprepkart"}
                  </p>
                </div>
              </article>
            ))
          ) : (
            [1, 2, 3].map((i) => (
              <article
                key={i}
                className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col w-full"
              >
                <div className={CARD_MEDIA_CLASS}>
                  <FaTrophy className="text-5xl sm:text-6xl text-indigo-300/80" />
                </div>
                <div className="flex flex-col justify-center p-4 sm:p-5 bg-white shrink-0">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">Success Story {i}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-snug">Achieving excellence with Testprepkart</p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Highlights */}
      <section className="rounded-xl p-6 sm:p-8 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 border border-indigo-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{examName} {displayYear} – Highlights</h2>
        <ul className="space-y-2">
          {highlights.map((stat, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
              <FaCheckCircle className="text-green-500 shrink-0 mt-0.5" />
              <span>{stat}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What Our Students Say */}
      <section aria-labelledby="testimonials-title">
        <h2 id="testimonials-title" className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FaQuoteLeft className="text-indigo-500" />
          What Our Students Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {studentTestimonials.length ? (
            studentTestimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                <div className="flex gap-1 text-amber-500 mb-3" aria-hidden>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FaStar key={s} className="w-4 h-4" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500">{t.location ? `(${t.location})` : ""}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full">No student testimonials added yet.</p>
          )}
        </div>
      </section>

      {/* What Our Parents Say */}
      <section aria-labelledby="parents-title">
        <h2 id="parents-title" className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FaQuoteLeft className="text-indigo-500" />
          What Our Parents Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {parentTestimonials.length ? (
            parentTestimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                <div className="flex gap-1 text-amber-500 mb-3" aria-hidden>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FaStar key={s} className="w-4 h-4" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500">{t.location ? `(${t.location})` : ""}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full">No parent testimonials added yet.</p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-xl p-6 sm:p-8 text-center bg-gradient-to-br from-indigo-600 to-purple-600 text-white border border-indigo-500 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Here to help you with examinations</h2>
        <p className="text-indigo-100 text-sm mb-6 max-w-xl mx-auto">
          Connect with counselors, book a free trial, or explore our courses for {examName} and more.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors shadow-md">
            Contact Us
          </Link>
          <Link href={`/${examSlug}`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500/80 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors border border-white/30">
            {examName} Preparation
          </Link>
        </div>
      </section>
    </div>
  );
}
