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
import CounselorModal from "@/app/(main)/components/CounselorModal";

const PER_PAGE = 10;

export default function CourseListingClient({ examSlug, examName: examNameProp, examId: examIdProp }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [trialSessionModalOpen, setTrialSessionModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const hasExamId = examIdProp && String(examIdProp).trim();
      const hasSlug = examSlug?.trim();
      if (!hasExamId && !hasSlug) {
        setCourses([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (hasExamId) params.set("examId", String(examIdProp).trim());
        else params.set("exam", examSlug.trim());
        params.set("page", String(page));
        params.set("limit", String(PER_PAGE));
        const courseRes = await api.get(`/course?${params.toString()}`);
        if (cancelled) return;
        const raw = courseRes.data?.data;
        const pagination = courseRes.data?.pagination;
        setCourses(Array.isArray(raw) ? raw : []);
        if (pagination) {
          setTotal(pagination.total ?? 0);
          setTotalPages(Math.max(1, pagination.totalPages ?? 1));
        } else {
          const len = Array.isArray(raw) ? raw.length : 0;
          setTotal(len);
          setTotalPages(len > 0 ? 1 : 1);
        }
      } catch (err) {
        if (!cancelled) {
          setCourses([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [examSlug, examIdProp, page]);

  // Reset to page 1 when exam changes
  useEffect(() => {
    setPage(1);
  }, [examSlug, examIdProp]);

  const examName = examNameProp || examSlug || "Exam";
  const slugForLinks = examSlug || createSlug(examName);
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = total === 0 ? 0 : Math.min(page * PER_PAGE, total);

  const formatPrice = (p) => {
    if (p == null || p === "") return "$--";
    return `$${Number(p).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <section className="relative bg-white overflow-hidden border-b border-slate-200/60">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="h-3 w-40 bg-slate-200 rounded animate-pulse mb-5" />
            <div className="h-7 w-3/4 max-w-xl bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-full max-w-lg bg-slate-100 rounded animate-pulse" />
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                <div className="aspect-[16/10] w-full bg-slate-100 animate-pulse shrink-0" />
                <div className="p-4 flex flex-col flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="h-3.5 w-3.5 rounded bg-amber-200 animate-pulse" />
                    <div className="h-3.5 w-20 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-full bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                  <div className="h-12 flex-1 bg-slate-50 rounded animate-pulse" />
                  <div className="flex justify-between pt-4 mt-auto border-t border-slate-100">
                    <div className="h-7 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
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
    <div className="min-h-screen bg-white text-slate-900 space-y-6 mt-6">
      {/* Hero */}
      <section className="relative  rounded-xl
    p-3 sm:p-4
    bg-gradient-to-br from-indigo-50 via-white to-purple-50
    border border-indigo-100/60
    shadow-[0_2px_12px_rgba(100,70,200,0.08)]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 mb-5" aria-label="Breadcrumb">
            <Link
              href="/"
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors rounded px-1.5 py-0.5 hover:bg-indigo-50"
            >
              Home
            </Link>
            <span className="text-slate-300 select-none" aria-hidden>/</span>
            <span className="text-xs font-semibold text-slate-800 bg-slate-50 rounded px-2 py-0.5 truncate max-w-[200px] sm:max-w-none">
              {examName} Courses
            </span>
          </nav>

          {/* Main header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-600/10 text-indigo-600 text-[11px] font-semibold uppercase tracking-wider">
                  {examName} Online Courses
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden />
                <span className="text-xs font-medium text-slate-500">
                  {total} List of Courses
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
                {examName} <span className="text-indigo-600">Preparation</span> Courses
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-snug max-w-xl">
                {examName} Online Courses designed for NRI students worldwide to match curriculum differences and build solid entrance exam preparation by filling the gaps. Register for a free {examName} Analysis Session today.
              </p>
            </div>

            {/* View toggle */}
            <div className="flex flex-col sm:items-end gap-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider sm:text-right">
                Display
              </span>
              <div className="inline-flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl border border-slate-200/50">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    viewMode === "grid"
                      ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FaThLarge className="w-3 h-3" /> Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    viewMode === "list"
                      ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FaList className="w-3 h-3" /> List
                </button>
              </div>
            </div>
          </div>

          {/* Utility bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200" aria-hidden />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-800">{from}–{to}</span> of <span className="font-semibold text-slate-800">{total}</span> courses
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTrialSessionModalOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                Get Trial Session
              </button>
              <Link
                href="/store"
                className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.98]"
              >
                View Store
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="">
        {!loading && courses.length === 0 ? (
          <div className="text-center py-12 px-5 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-2xl">
              📚
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1.5 tracking-tight">No courses yet</h2>
            <p className="text-slate-600 text-sm leading-snug max-w-md mx-auto mb-5">
              No courses are available for {examName} right now. Check back later or explore the store for study material.
            </p>
            <Link
              href="/store"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Browse store <FaArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : viewMode === "list" ? (
          <ul className="space-y-5">
            {courses.map((course, index) => (
              <li key={course._id}>
                <CourseCard course={course} examSlug={slugForLinks} formatPrice={formatPrice} layout="list" listIndex={index} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} examSlug={slugForLinks} formatPrice={formatPrice} layout="grid" />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Previous page"
            >
              <FaChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-100 min-w-24 justify-center text-xs text-slate-600">
              Page <span className="font-semibold text-slate-900">{page}</span> of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Next page"
            >
              <FaChevronRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        )}
      </section>

      {/* Get Trial Session modal */}
      <CounselorModal
        isOpen={trialSessionModalOpen}
        onClose={() => setTrialSessionModalOpen(false)}
        title="Get a Free Trial Session"
        badgeText="Trial Session"
        formName="Get Trial Session"
        formId="Get-Trial-Session"
        successMessage="Thank you! Your trial session request has been sent. Our team will contact you shortly."
        submitButtonText="Request Trial Session"
      />
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
      className={`group block bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all duration-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
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

        {/* Footer: Price + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-lg font-bold text-slate-900 tabular-nums tracking-tight">
            {formatPrice(course.price)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
            Learn more <FaArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
