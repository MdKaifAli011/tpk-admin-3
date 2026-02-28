"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FaStar,
  FaBookmark,
  FaChevronLeft,
  FaChevronRight,
  FaThLarge,
  FaList,
  FaBookOpen,
  FaClock,
  FaUser,
  FaArrowRight,
} from "react-icons/fa";
import api from "@/lib/api";
import { createSlug } from "@/utils/slug";

const PER_PAGE = 9;

export default function CourseListingClient({ examSlug, examName: examNameProp }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!examSlug?.trim()) {
        setCourses([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const courseRes = await api.get(`/course?exam=${encodeURIComponent(examSlug.trim())}`);
        if (cancelled) return;
        const raw = courseRes.data?.data;
        setCourses(Array.isArray(raw) ? raw : []);
      } catch (err) {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [examSlug]);

  const examName = examNameProp || examSlug || "Exam";
  const slugForLinks = examSlug || createSlug(examName);
  const paginated = courses.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(courses.length / PER_PAGE));
  const from = courses.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, courses.length);

  const formatPrice = (p) => {
    if (p == null || p === "") return "$ --";
    return `$ ${Number(p).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <section className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 py-8 sm:py-10 lg:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-6" />
            <div className="h-9 w-3/4 max-w-xl bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-96 max-w-full bg-slate-100 rounded animate-pulse mb-6" />
            <div className="flex flex-wrap gap-3">
              <div className="h-8 w-24 bg-slate-200 rounded-full animate-pulse" />
              <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                <div className="aspect-video w-full bg-slate-100 animate-pulse shrink-0" />
                <div className="p-5 sm:p-6 flex flex-col flex-1 space-y-3">
                  <div className="flex gap-1.5">
                    <div className="h-4 w-4 rounded bg-amber-200 animate-pulse" />
                    <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 w-full bg-slate-100 rounded animate-pulse flex-1" />
                  <div className="flex justify-between pt-3 mt-auto border-t border-slate-100">
                    <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 py-8 sm:py-10 lg:py-12 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-indigo-600 font-medium transition-colors">Home</Link>
            <span className="text-slate-300" aria-hidden>/</span>
            <span className="text-slate-700 font-medium truncate">{examName} Courses</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                {examName} Preparation Courses
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-xl leading-relaxed">
                Expert-led online courses to help you crack {examName}. From fundamentals to advanced practice.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-sm font-semibold">
                {courses.length} Course{courses.length !== 1 ? "s" : ""}
              </span>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    viewMode === "grid"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  aria-pressed={viewMode === "grid"}
                >
                  <FaThLarge className="w-4 h-4" /> Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  aria-pressed={viewMode === "list"}
                >
                  <FaList className="w-4 h-4" /> List
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{from}</span>–<span className="font-semibold text-slate-700">{to}</span> of <span className="font-semibold text-slate-700">{courses.length}</span> course{courses.length !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-indigo-600 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Get Trial Session
              </Link>
              <Link
                href="/store"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                View Store
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto py-8 lg:py-12">
        {courses.length === 0 ? (
          <div className="text-center py-16 sm:py-20 px-6 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5 text-4xl sm:text-5xl">
              📚
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No courses yet</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm sm:text-base leading-relaxed">
              No courses are available for {examName} right now. Check back later or explore the store for study material.
            </p>
            <Link
              href="/store"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Browse store <FaArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : viewMode === "list" ? (
          <ul className="space-y-5">
            {paginated.map((course, index) => (
              <li key={course._id}>
                <CourseCard course={course} examSlug={slugForLinks} formatPrice={formatPrice} layout="list" listIndex={index} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {paginated.map((course) => (
              <CourseCard key={course._id} course={course} examSlug={slugForLinks} formatPrice={formatPrice} layout="grid" />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-14 flex items-center justify-center gap-3" aria-label="Pagination">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Previous page"
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-50 border border-slate-100 min-w-[7rem] justify-center">
              <span className="text-sm text-slate-600">Page</span>
              <span className="font-bold text-slate-900">{page}</span>
              <span className="text-sm text-slate-500">of {totalPages}</span>
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Next page"
            >
              <FaChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}

function CourseCard({ course, examSlug, formatPrice, layout, listIndex = 0 }) {
  const href = `/${examSlug}/course/${course.slug || course._id}`;
  const rating = course.rating != null ? Number(course.rating) : 5;
  const isGrid = layout === "grid";
  const imageOnRight = layout === "list" && listIndex % 2 === 1;

  const handleBookmarkClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: bookmark action
  };

  const metaParts = [];
  if (course.lessonsRange) metaParts.push({ Icon: FaBookOpen, text: course.lessonsRange });
  if (course.durationLabel) metaParts.push({ Icon: FaClock, text: course.durationLabel });
  else if (course.hours) metaParts.push({ Icon: FaClock, text: course.hours });

  return (
    <Link
      href={href}
      className={`group block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        isGrid ? "flex flex-col h-full" : `flex flex-col sm:flex-row ${imageOnRight ? "sm:flex-row-reverse" : ""}`
      }`}
    >
      {/* Image Container with balanced padding */}
      <div className={`relative bg-white p-4 shrink-0 overflow-hidden ${isGrid ? "w-full" : "w-full sm:w-72"}`}>
        <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-50 shadow-inner">
          {course.image ? (
            <Image
              src={course.image}
              alt=""
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
              sizes={isGrid ? "(max-width: 640px) 100vw, 33vw" : "300px"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-200 text-4xl">📚</div>
          )}
        </div>
      </div>

      {/* Content Container - Increased Padding for "Premium" feel */}
      <div className={`flex flex-col flex-1 p-6 pt-2 ${isGrid ? "" : "sm:justify-center sm:py-6"}`}>
        
        {/* Row 1: Rating & Bookmark */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((i) => (
                <FaStar
                  key={i}
                  className={`w-3 h-3 ${i <= Math.floor(rating) ? "text-orange-400 fill-orange-400" : "text-slate-200 fill-slate-200"}`}
                />
              ))}
            </div>
            <span className="text-slate-400 text-[12px] font-semibold tracking-tight">
              ({course.reviewCount ?? 0} Reviews)
            </span>
          </div>
          <button
            type="button"
            onClick={handleBookmarkClick}
            className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all"
            aria-label="Save course"
          >
            <FaBookmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title: High Impact Typography */}
        <h2 className="text-[19px] font-black text-slate-800 mb-3 leading-[1.3] group-hover:text-indigo-600 transition-colors line-clamp-2 tracking-tight">
          {course.title}
        </h2>

        {/* Meta Row: Clean Separation */}
        {metaParts.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
            {metaParts.map((part, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                <part.Icon className="w-3.5 h-3.5 text-slate-400/80" /> {part.text}
              </span>
            ))}
          </div>
        )}

        {/* Description: Increased Line Height (leading-relaxed) */}
        <p className="text-[14px] text-slate-500 line-clamp-2 mb-6 leading-relaxed font-medium">
          {course.shortDescription || "This specialized course is exclusively designed for students preparing for their upcoming exams with expert mentorship."}
        </p>

        {/* Instructor Section */}
        {course.createdBy && (
          <div className="flex items-center gap-3 mb-6 mt-auto">
            <div className="relative w-8 h-8 rounded-full bg-slate-100 shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
              {course.instructorImage ? (
                <Image src={course.instructorImage} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-[11px] font-bold text-indigo-600 uppercase">
                  {(course.createdBy || "?").trim().charAt(0)}
                </div>
              )}
            </div>
            <p className="text-[13px] text-slate-500">
              By <span className="font-bold text-slate-900 ml-0.5">{course.createdBy}</span>
            </p>
          </div>
        )}

        {/* Footer: Price and Learn More link */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100/60">
          <div className="flex flex-col">
            <span className="text-[22px] font-black text-slate-900 tabular-nums tracking-tighter">
              ${course.price || "0"}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-slate-900 font-extrabold text-[13px] group-hover:text-indigo-600 transition-all uppercase tracking-wide">
            Learn More <FaArrowRight className="w-3 h-3 transform group-hover:translate-x-1.5 transition-transform duration-300" />
          </span>
        </div>
      </div>
    </Link>
  );
}
