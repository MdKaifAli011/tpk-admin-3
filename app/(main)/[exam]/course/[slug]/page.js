"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  MdStar,
  MdPlayArrow,
  MdLanguage,
  MdVerified,
  MdVisibility,
  MdTimer,
  MdDownload,
} from "react-icons/md";
import api from "@/lib/api";
import RichContent from "@/app/(main)/components/RichContent";

const NAVBAR_OFFSET = 120; // px, match layout pt-[120px]

export default function CourseDetailPage() {
  const { exam: examSlug, slug } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardFixed, setCardFixed] = useState(true);
  const [cardRect, setCardRect] = useState({ left: 0, width: 320 });
  const [isLg, setIsLg] = useState(false);
  const sentinelRef = useRef(null);
  const asideRef = useRef(null);

  useEffect(() => {
    const check = () =>
      setIsLg(typeof window !== "undefined" && window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/course/${slug}`)
      .then((r) => {
        if (!cancelled && r.data?.success) setCourse(r.data.data);
      })
      .catch(() => {
        if (!cancelled) setCourse(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const updateCardRect = useCallback(() => {
    if (
      asideRef.current &&
      typeof window !== "undefined" &&
      window.innerWidth >= 1024
    ) {
      const rect = asideRef.current.getBoundingClientRect();
      setCardRect({ left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!course) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) setCardFixed(!e.isIntersecting);
      },
      { root: null, rootMargin: "0px", threshold: 0 },
    );
    if (sentinelRef.current) io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [course]);

  useEffect(() => {
    if (!course) return;
    updateCardRect();
    const scrollEl = document.querySelector("main");
    if (scrollEl)
      scrollEl.addEventListener("scroll", updateCardRect, { passive: true });
    window.addEventListener("scroll", updateCardRect, { passive: true });
    window.addEventListener("resize", updateCardRect);
    const timer = setInterval(updateCardRect, 500);
    return () => {
      if (scrollEl) scrollEl.removeEventListener("scroll", updateCardRect);
      window.removeEventListener("scroll", updateCardRect);
      window.removeEventListener("resize", updateCardRect);
      clearInterval(timer);
    };
  }, [course, updateCardRect]);

  // Update document title and meta tags from course SEO data (client-side sync with fetched course)
  useEffect(() => {
    if (!course) return;
    const title =
      (course.metaTitle && course.metaTitle.trim()) || course.title || "Course";
    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    const desc =
      (course.metaDescription && course.metaDescription.trim()) || "";
    metaDesc.setAttribute("content", desc);

    let metaKw = document.querySelector('meta[name="keywords"]');
    if (!metaKw) {
      metaKw = document.createElement("meta");
      metaKw.setAttribute("name", "keywords");
      document.head.appendChild(metaKw);
    }
    metaKw.setAttribute(
      "content",
      (course.keywords && course.keywords.trim()) || ""
    );
  }, [course]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Course not found
          </h1>
          <Link
            href={`/${examSlug}/course`}
            className="text-indigo-600 font-medium hover:underline"
          >
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  const examName = course.examId?.name || examSlug || "Exam";
  const formatPrice = (p) =>
    p != null && p !== "" ? `$ ${Number(p).toLocaleString()}` : "—";
  const contentTrimmed =
    course.content != null ? String(course.content).trim() : "";

  const sidebarDetails = [
    { label: "Made For", value: "Grade 12 Going / 12th Studying" },
    { label: "Mode", value: "Live, 2-way Interactive" },
    { label: "Target", value: `${examName} (Main + Advanced)` },
    { label: "Session Length", value: "120 Minutes" },
    { label: "Time Zone", value: "Adjusted for Different Time Zones" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 py-8 sm:py-10 lg:py-12 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm text-slate-500 mb-5"
          >
            <Link
              href="/"
              className="hover:text-indigo-600 font-medium transition-colors"
            >
              Home
            </Link>
            <span className="text-slate-300" aria-hidden>
              /
            </span>
            <Link
              href={`/${examSlug}/course`}
              className="hover:text-indigo-600 font-medium transition-colors"
            >
              {examName} Course
            </Link>
            <span className="text-slate-300" aria-hidden>
              /
            </span>
            <span className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-md">
              {course.title}
            </span>
          </nav>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            {course.title}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mb-6">
            {course.shortDescription ||
              "Get exam-ready with expert guidance and focused practice for success."}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden shrink-0 bg-slate-100">
              {course.image ? (
                <Image
                  src={course.image}
                  alt=""
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-lg font-bold">
                  {(course.createdBy || "E").charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                By {course.createdBy || "Expert"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex text-orange-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <MdStar
                      key={i}
                      className="text-sm"
                      style={{
                        opacity: i <= Math.floor(course.rating ?? 5) ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                  {course.reviewCount ?? 0} rating
                </span>
                <span className="text-xs text-slate-500">957 students</span>
              </div>
            </div>
            <div className="flex gap-4 text-sm font-medium text-slate-600">
              <span className="flex items-center gap-1">
                <MdLanguage className="text-lg text-slate-400" /> English
              </span>
              <span className="flex items-center gap-1">
                <MdVerified className="text-lg text-slate-400" /> Certified
                Course
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main: two columns on desktop – left scrolls, right sticky below navbar; at footer card scrolls normally */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-8 xl:gap-10 items-start lg:items-stretch">
          {/* LEFT COLUMN: admin content only */}
          <div className="min-w-0">
            {contentTrimmed ? (
              <section className="course-content">
                <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900 prose-a:text-indigo-600">
                  <RichContent html={String(course.content ?? "")} />
                </div>
              </section>
            ) : (
              <section className="text-slate-500 text-center py-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <p>
                  Course details will appear here once content is added in the
                  admin.
                </p>
              </section>
            )}
            {/* Sentinel: when this enters viewport we stop fixing the card so it scrolls with page before footer */}
            <div ref={sentinelRef} className="h-px w-full" aria-hidden />
          </div>

          {/* RIGHT COLUMN: pricing card – sticky on desktop (below navbar); when scroll reaches footer, card scrolls with page */}
          <aside
            ref={asideRef}
            className="flex flex-col w-full lg:min-w-0 lg:self-stretch"
            role="complementary"
            aria-label="Course pricing and enrollment"
          >
            {cardFixed && isLg && (
              <div className="w-full min-h-[420px] shrink-0" aria-hidden />
            )}
            <div
              className="w-full self-start shrink-0 rounded-xl shadow-lg border border-violet-200 bg-white"
              style={
                cardFixed && isLg && cardRect.width
                  ? {
                      position: "fixed",
                      top: `${NAVBAR_OFFSET}px`,
                      left: `${cardRect.left}px`,
                      width: `${cardRect.width}px`,
                      zIndex: 40,
                    }
                  : undefined
              }
            >
              <div className="rounded-xl overflow-hidden">
                {/* Video preview thumbnail with play overlay */}
                <div className="relative group cursor-pointer">
                  <div className="w-full h-36 relative bg-slate-100">
                    {course.image ? (
                      <Image
                        src={course.image}
                        alt="Course video preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 320px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-3xl">
                        📚
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                    <div className="w-11 h-11 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <MdPlayArrow className="text-2xl text-white" />
                    </div>
                    <span className="text-xs font-semibold flex items-center gap-1">
                      <MdVisibility className="text-xs" />
                      Watch course video
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  {/* Price + batch badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="text-xl font-bold text-slate-900">
                      {formatPrice(course.price)}
                    </div>
                    <div className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 border border-red-100 shrink-0">
                      <MdTimer className="text-[10px]" />
                      Batch closing in 3 days
                    </div>
                  </div>
                  {/* Download brochure + Connect counselor */}
                  <div className="space-y-2 mb-5">
                    <button
                      type="button"
                      className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-colors"
                    >
                      <MdDownload className="text-base" />
                      Download Course Brochure
                    </button>
                    <button
                      type="button"
                      className="w-full bg-white border-2 border-slate-200 py-2.5 rounded-lg font-bold text-sm text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      Connect With Counselor
                    </button>
                  </div>
                  {/* Course meta info rows */}
                  <div className="space-y-2 text-xs">
                    {sidebarDetails.map((row, i) => (
                      <div
                        key={row.label}
                        className={`flex justify-between py-1.5 ${
                          i < sidebarDetails.length - 1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >
                        <span className="text-slate-500 font-medium">
                          {row.label}
                        </span>
                        <span className="text-right font-semibold text-slate-900">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                {/* Enroll button – purple per reference */}
                  <Link
                    href="/store"
                    className="w-full mt-4 inline-flex items-center justify-center bg-violet-600 text-white py-3 rounded-xl font-bold text-base hover:bg-violet-700 hover:shadow-lg transition-all"
                  >
                    Enroll For Course
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Price + Enroll bottom bar – mobile/tablet only; hidden on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="shrink-0">
            <p className="text-xs text-slate-500 font-medium">Price</p>
            <p className="font-bold text-lg text-slate-900 tracking-tight">
              {formatPrice(course.price)}
            </p>
          </div>
          <Link
            href="/store"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-bold text-sm text-white bg-violet-600 hover:bg-violet-700 transition-colors shrink-0"
          >
            Enroll For Course
          </Link>
        </div>
      </div>
    </div>
  );
}
