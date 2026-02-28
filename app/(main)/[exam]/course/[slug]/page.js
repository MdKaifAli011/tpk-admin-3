"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  MdStar,
  MdPlayArrow,
  MdLanguage,
  MdVerified,
  MdVisibility,
  MdDownload,
  MdVideoLibrary,
  MdAssignment,
  MdAnalytics,
  MdSupportAgent,
  MdAccessTime,
  MdCall,
} from "react-icons/md";
import {
  FaUser,
  FaEnvelope,
  FaGlobe,
  FaGraduationCap,
  FaPhone,
  FaCommentAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
} from "react-icons/fa";
import api from "@/lib/api";
import RichContent from "@/app/(main)/components/RichContent";
import {
  countriesWithCodesSorted,
  countryCodeMap,
  classOptions,
} from "@/app/(main)/components/constants/formConstants";
import { useVerification } from "@/app/(main)/components/hooks/useVerification";
import {
  validateForm as validateFormUtil,
  validateName,
  validateEmail,
  validatePhoneNumber,
  validateCountry,
  validateClassName,
} from "@/app/(main)/components/utils/formValidation";

const DEFAULT_FEATURES = [
  {
    icon: MdVideoLibrary,
    title: "Live Classes",
    description:
      "Interactive 2-way sessions where you can ask doubts in real-time.",
  },
  {
    icon: MdAssignment,
    title: "Study Material",
    description:
      "Comprehensive eBooks and practice modules designed by experts.",
  },
  {
    icon: MdAnalytics,
    title: "Performance Analysis",
    description:
      "Detailed AI-driven insights into your strengths and weaknesses.",
  },
  {
    icon: MdSupportAgent,
    title: "Doubt Clinic",
    description: "24/7 dedicated support to clear any conceptual hurdles.",
  },
];

const DEFAULT_FAQS = [
  {
    question:
      "How will an NRI / foreign student attend from their home online classes?",
    answer:
      "NRI students can log in to the online classroom through his/her student account provided after enrollment.",
  },
  {
    question:
      "What are the duration and timing of the online classes for NRI Students?",
    answer:
      "The online classes will be 120 minutes (2 hours) per day and 3-4 days a week for Grade 11th and 12th grade students.",
  },
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/** Sidebar course details — same labels/values as reference design; Target uses exam name */
const SIDEBAR_COURSE_DETAILS = [
  { label: "Made For", value: "Grade 12 Going / 12th Studying" },
  { label: "Mode", value: "Live, 2-way Interactive" },
  { label: "Target", value: "JEE (Main + Advanced)" },
  { label: "Subject Covered", value: "Math, Physics, Chemistry" },
  { label: "Session Length", value: "90 Minutes" },
  { label: "Tests", value: "Regular Weekly Test" },
  { label: "Full-Length", value: "All India Test Series" },
  { label: "Fee (USA/Europe*)", value: "INR 1,79,300" },
  { label: "Fee (India/ME/SE*)", value: "INR 97,600" },
  { label: "Time Zone", value: "Adjusted as per different Time Zones" },
];
const SIDEBAR_CALL_PHONE = "+918800123492";

export default function CourseDetailPage() {
  const { exam: examSlug, slug } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    country: "",
    className: "",
    countryCode: "+91",
    phoneNumber: "",
    message: "",
  });
  const [contactErrors, setContactErrors] = useState({});
  const [contactSubmitStatus, setContactSubmitStatus] = useState(null);
  const [contactSubmitMessage, setContactSubmitMessage] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const {
    verificationQuestion,
    userVerificationAnswer,
    isVerified,
    generateVerification,
    handleVerificationChange,
    validateVerification,
    resetVerification,
  } = useVerification();

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

  useEffect(() => {
    if (course) generateVerification();
  }, [course, generateVerification]);

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
      (course.keywords && course.keywords.trim()) || "",
    );
  }, [course]);

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "country" && value) {
        newData.countryCode = countryCodeMap[value] || "+1";
      }
      setTimeout(() => {
        if (name === "name" && newData.name.trim()) {
          setContactErrors((err) => ({
            ...err,
            name: validateName(newData.name),
          }));
        } else if (name === "email" && newData.email.trim()) {
          setContactErrors((err) => ({
            ...err,
            email: validateEmail(newData.email),
          }));
        } else if (name === "country" && newData.country) {
          setContactErrors((err) => ({
            ...err,
            country: validateCountry(newData.country),
          }));
        } else if (name === "className" && newData.className) {
          setContactErrors((err) => ({
            ...err,
            className: validateClassName(newData.className),
          }));
        } else if (name === "phoneNumber" && newData.phoneNumber.trim()) {
          setContactErrors((err) => ({
            ...err,
            phoneNumber: validatePhoneNumber(
              newData.phoneNumber,
              newData.countryCode,
              newData.country,
            ),
          }));
        } else if (contactErrors[name]) {
          setContactErrors((err) => ({ ...err, [name]: "" }));
        }
      }, 0);
      return newData;
    });
    if (contactSubmitStatus) {
      setContactSubmitStatus(null);
      setContactSubmitMessage("");
    }
  };

  const validateContactForm = () => {
    const forValidation = {
      name: contactFormData.name,
      email: contactFormData.email,
      country: contactFormData.country,
      className: contactFormData.className,
      countryCode: contactFormData.countryCode,
      phoneNumber: contactFormData.phoneNumber,
    };
    const newErrors = validateFormUtil(forValidation, validateVerification);
    if (
      contactFormData.message &&
      contactFormData.message.trim().length > 2000
    ) {
      newErrors.message = "Message cannot exceed 2000 characters";
    }
    setContactErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    if (!validateContactForm()) return;
    setIsSubmittingContact(true);
    setContactSubmitStatus(null);
    setContactSubmitMessage("");
    try {
      const sourcePath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "";
      const response = await api.post("/lead", {
        name: contactFormData.name.trim(),
        email: contactFormData.email.trim(),
        country: contactFormData.country.trim(),
        className: contactFormData.className.trim(),
        phoneNumber:
          contactFormData.countryCode + contactFormData.phoneNumber.trim(),
        message: (contactFormData.message || "").trim(),
        form_name: "course-contact",
        form_id: "course-contact",
        source: sourcePath,
        prepared: "",
      });
      if (response.data?.success) {
        setContactSubmitStatus("success");
        setContactSubmitMessage(
          "Thank you! Your request has been sent. A counselor will contact you shortly.",
        );
        setContactFormData({
          name: "",
          email: "",
          country: "",
          className: "",
          countryCode: "+91",
          phoneNumber: "",
          message: "",
        });
        setContactErrors({});
        resetVerification();
        generateVerification();
      } else {
        throw new Error(response.data?.message || "Failed to submit request.");
      }
    } catch (error) {
      setContactSubmitStatus("error");
      setContactSubmitMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to submit your request. Please try again.",
      );
    } finally {
      setIsSubmittingContact(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <section className="hero-gradient py-6 sm:py-8 lg:py-10 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-3 w-40 bg-slate-200 rounded animate-pulse mb-3" />
            <div className="h-8 w-3/4 max-w-xl bg-slate-200 rounded animate-pulse mb-3" />
            <div className="h-4 w-full max-w-2xl bg-slate-100 rounded animate-pulse" />
          </div>
        </section>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            <div className="lg:col-span-8 space-y-3">
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
              <div className="h-28 bg-slate-50 rounded-xl border border-slate-200 animate-pulse" />
            </div>
            <div className="lg:col-span-4">
              <div className="sticky top-24 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <div className="aspect-video max-h-36 bg-slate-100 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white px-4 text-slate-900">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-2xl">
            📚
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Course not found
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            This course may have been removed or the link is incorrect.
          </p>
          <Link
            href={`/${examSlug}/course`}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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

  const labelToKey = {
    "Made For": "madeFor",
    Mode: "mode",
    Target: "target",
    "Subject Covered": "subjectCovered",
    "Session Length": "sessionLength",
    Tests: "tests",
    "Full-Length": "fullLength",
    "Fee (USA/Europe*)": "feeUsaEurope",
    "Fee (India/ME/SE*)": "feeIndiaMeSe",
    "Time Zone": "timeZone",
  };
  const sidebarDetails = SIDEBAR_COURSE_DETAILS.map((row) => {
    const key = labelToKey[row.label];
    const fromCourse =
      key && course[key] != null && String(course[key]).trim() !== "";
    const value = fromCourse
      ? String(course[key]).trim()
      : row.label === "Target"
        ? examName
        : row.value;
    return { label: row.label, value };
  });

  const callPhone =
    course.callPhone != null && String(course.callPhone).trim() !== ""
      ? String(course.callPhone).trim()
      : SIDEBAR_CALL_PHONE;
  const batchClosingDays =
    course.batchClosingDays != null && Number(course.batchClosingDays) >= 0
      ? Number(course.batchClosingDays)
      : null;

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-clip">
      {/* Full-width hero: gradient spans full content width (no viewport overflow) */}
      <section
        className="
          w-full rounded-xl
          bg-gradient-to-r from-indigo-50/95 via-blue-50/60 to-purple-100/70
          py-8 sm:py-10 md:py-12 lg:py-14
        "
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            {/* Hero content — left 8 cols; right 4 cols empty on desktop */}
            <div className="lg:col-span-8 min-w-0">
              <nav
                aria-label="Breadcrumb"
                className="mb-2 sm:mb-3 flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
              >
                <Link
                  href="/"
                  className="hover:text-blue-600 hover:underline transition-colors"
                >
                  Home
                </Link>
                <span className="text-slate-300" aria-hidden>
                  &gt;
                </span>
                <Link
                  href={`/${examSlug}/course`}
                  className="hover:text-blue-600 hover:underline transition-colors truncate max-w-[180px] sm:max-w-none"
                >
                  {examName} Course
                </Link>
              </nav>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-slate-900 mb-3 sm:mb-4 break-words">
                {course.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-4 sm:mb-5 line-clamp-3 sm:line-clamp-none">
                {course.shortDescription ||
                  "Get exam-ready with expert guidance and focused practice for success."}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-200/50">
                    {course.image ? (
                      <Image
                        src={course.image}
                        alt=""
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">
                        {(course.createdBy || "E").charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-medium text-slate-800 truncate">
                      By {course.createdBy || "Expert"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div
                        className="flex text-amber-500 shrink-0"
                        aria-label={`${course.rating ?? 5} out of 5 stars`}
                      >
                        {[1, 2, 3, 4, 5].map((i) => (
                          <MdStar
                            key={i}
                            className={`size-4 sm:size-5 ${i <= Math.floor(course.rating ?? 5) ? "opacity-100" : "opacity-30"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm text-slate-600 truncate">
                        {course.reviewCount ?? 0} rating
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className="hidden sm:inline h-4 w-px bg-slate-200 shrink-0"
                  aria-hidden
                />
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 shrink-0">
                  <span className="flex items-center gap-1">
                    <MdLanguage className="size-4 sm:size-5 text-slate-400 shrink-0" />{" "}
                    English
                  </span>
                  <span className="flex items-center gap-1">
                    <MdVerified className="size-4 sm:size-5 text-slate-400 shrink-0" />{" "}
                    Certified Course
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block lg:col-span-4" aria-hidden />
          </div>
        </div>
      </section>

      {/* Main: content area + right card (card overlaps hero on desktop only) — margin after header */}
      <div className="max-w-7xl mx-auto pe-5 mt-8 sm:mt-10 lg:mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
          {/* LEFT — Content area with border */}
          <div className="lg:col-span-8 min-w-0 order-1 lg:order-1">
            <div
              className="
                rounded-xl border-2 border-slate-200
                border-l-4 border-l-indigo-300
                bg-white shadow-sm
                px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8
                overflow-hidden
              "
            >
              {contentTrimmed ? (
                <article className="prose prose-slate max-w-none prose-headings:text-blue-600 prose-p:text-slate-600 prose-a:text-blue-600 rich-text-content">
                  <RichContent html={String(course.content ?? "")} />
                </article>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                  <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500">
                    Course details will appear here once content is added.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Book a Free Demo Class
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Card overlaps hero on desktop only; sticky; full-width on mobile; on mobile shows after content */}
          <aside
            className="lg:col-span-4 order-2 lg:order-2 lg:-mt-72 min-w-0 w-full"
            role="complementary"
            aria-label="Course pricing and enrollment"
          >
            <div className="sticky top-20 sm:top-24 z-10">
              <div className="bg-white rounded-xl border-3 border-blue-600/70 shadow-lg shadow-indigo-900/5 overflow-hidden max-w-full">
                {/* Video thumbnail + play — consistent 16:9 aspect ratio */}
                <div className="relative group cursor-pointer bg-slate-100 overflow-hidden">
                  <div className="w-full aspect-video relative">
                    {course.image ? (
                      <Image
                        src={course.image}
                        alt="Course preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 380px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-2xl">
                        📚
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white transition-opacity group-hover:bg-black/50">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/90 flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-105 transition-transform shrink-0">
                      <div className="w-0 h-0 border-y-[8px] sm:border-y-[10px] border-y-transparent border-l-[12px] sm:border-l-[16px] border-l-blue-600 ml-0.5 sm:ml-1" />
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <MdVisibility className="size-4 shrink-0" />
                      Watch course video
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  {/* Price + batch closing badge */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-xl font-bold text-slate-900 tabular-nums">
                      {formatPrice(course.price)}
                    </span>
                    {batchClosingDays != null && (
                      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 shrink-0">
                        <MdAccessTime className="size-4" />
                        Batch closing in {batchClosingDays} day
                        {batchClosingDays !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Primary + secondary CTAs */}
                  <div className="space-y-2.5 mb-4">
                    <Link
                      href="/contact"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      <MdDownload className="text-lg shrink-0" />
                      Download Course Brochure
                    </Link>
                    <Link
                      href="/contact"
                      className="flex w-full items-center justify-center rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Connect With Counselor
                    </Link>
                  </div>

                  {/* Course details list — key-value rows; stack on small screens */}
                  <div className="border-t border-slate-200 pt-4">
                    {sidebarDetails.map((row, i) => (
                      <div
                        key={row.label}
                        className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-3 py-2 sm:py-2.5 text-sm ${
                          i < sidebarDetails.length - 1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >
                        <span className="text-slate-500 font-medium shrink-0">
                          {row.label}
                        </span>
                        <span className="text-slate-800 sm:text-right break-words min-w-0">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Call Us — for details about the course */}
                  <div className="mt-4 rounded-xl bg-indigo-50/80 px-4 py-3 text-center">
                    <p className="mb-2 text-xs text-slate-500">
                      For details about the course
                    </p>
                    <a
                      href={`tel:${callPhone.replace(/\s/g, "")}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      <MdCall className="size-4 shrink-0" />
                      Call Us: {callPhone}
                    </a>
                  </div>

                  {/* Enroll CTA */}
                  <Link
                    href="/store"
                    className="mt-4 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
                  >
                    Enroll For Course
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Callback form section — keep existing */}
      <section
        id="course-contact"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16"
      >
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Image panel — same as CounselorModal (gradient + placeholder + overlay) */}
            <div className="relative hidden overflow-hidden lg:block lg:min-h-0">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${basePath}/images/form-placeholder.png`}
                alt="Counselor illustration"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>

            {/* Form panel */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 lg:p-5">
                <div className="mb-1.5 inline-block rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">
                  Connect With Expert Counselor
                </div>
                <h2 className="mb-0.5 text-lg font-bold text-slate-900 sm:text-xl">
                  Talk to Our Expert Counselors
                </h2>
                <p className="mb-4 text-sm text-slate-600">
                  Get a callback from our academic experts
                </p>

                <form onSubmit={handleCallbackSubmit} className="space-y-2">
                  {contactSubmitStatus && (
                    <div
                      className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                        contactSubmitStatus === "success"
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-red-200 bg-red-50 text-red-800"
                      }`}
                    >
                      {contactSubmitStatus === "success" ? (
                        <FaCheckCircle className="mt-0.5 shrink-0 text-sm text-green-600" />
                      ) : (
                        <FaExclamationCircle className="mt-0.5 shrink-0 text-sm text-red-600" />
                      )}
                      <p className="text-sm font-medium">
                        {contactSubmitMessage}
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                        <FaUser className="text-xs text-slate-400" />
                      </div>
                      <input
                        type="text"
                        name="name"
                        value={contactFormData.name}
                        onChange={handleContactChange}
                        className={`w-full rounded-lg border px-3 py-1.5 pl-8 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          contactErrors.name
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300 bg-white text-slate-900"
                        }`}
                        placeholder="Your Full Name"
                        disabled={isSubmittingContact}
                      />
                    </div>
                    {contactErrors.name && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {contactErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                        <FaEnvelope className="text-xs text-slate-400" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={contactFormData.email}
                        onChange={handleContactChange}
                        className={`w-full rounded-lg border px-3 py-1.5 pl-8 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          contactErrors.email
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300 bg-white text-slate-900"
                        }`}
                        placeholder="Email Address"
                        disabled={isSubmittingContact}
                      />
                    </div>
                    {contactErrors.email && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {contactErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-2.5">
                        <FaGlobe className="text-xs text-slate-400" />
                      </div>
                      <select
                        name="country"
                        value={contactFormData.country}
                        onChange={handleContactChange}
                        className={`w-full appearance-none rounded-lg border bg-white px-3 py-1.5 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          contactErrors.country
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300 text-slate-900"
                        }`}
                        disabled={isSubmittingContact}
                      >
                        <option value="">-- Select Country --</option>
                        {countriesWithCodesSorted.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {contactErrors.country && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {contactErrors.country}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-2.5">
                        <FaGraduationCap className="text-xs text-slate-400" />
                      </div>
                      <select
                        name="className"
                        value={contactFormData.className}
                        onChange={handleContactChange}
                        className={`w-full appearance-none rounded-lg border bg-white px-3 py-1.5 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          contactErrors.className
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300 text-slate-900"
                        }`}
                        disabled={isSubmittingContact}
                      >
                        <option value="">Select Class</option>
                        {classOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    {contactErrors.className && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {contactErrors.className}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex gap-2">
                      <div className="w-20 shrink-0">
                        <input
                          type="text"
                          value={contactFormData.countryCode}
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-center text-sm"
                          readOnly
                          disabled={isSubmittingContact}
                        />
                      </div>
                      <div className="relative flex-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                          <FaPhone className="text-xs text-slate-400" />
                        </div>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={contactFormData.phoneNumber}
                          onChange={handleContactChange}
                          className={`w-full rounded-lg border px-3 py-1.5 pl-8 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            contactErrors.phoneNumber
                              ? "border-red-300 bg-red-50"
                              : "border-slate-300 bg-white text-slate-900"
                          }`}
                          placeholder="Contact No"
                          disabled={isSubmittingContact}
                        />
                      </div>
                    </div>
                    {contactErrors.phoneNumber && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {contactErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-2 flex items-start">
                        <FaCommentAlt className="mt-0.5 text-xs text-slate-400" />
                      </div>
                      <textarea
                        name="message"
                        value={contactFormData.message}
                        onChange={handleContactChange}
                        rows={2}
                        maxLength={2000}
                        className={`w-full resize-none rounded-lg border px-3 py-1.5 pl-8 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          contactErrors.message
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300 bg-white text-slate-900"
                        }`}
                        placeholder="How can we help you? (Optional)"
                        disabled={isSubmittingContact}
                      />
                    </div>
                    {contactErrors.message && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {contactErrors.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <div
                      className={`flex items-center gap-2 rounded-lg border-2 p-1.5 transition-all ${
                        contactErrors.verification
                          ? "border-red-300 bg-red-50"
                          : isVerified
                            ? "border-green-500 bg-green-50"
                            : "border-slate-300 bg-white"
                      }`}
                    >
                      <div className="shrink-0">
                        {isVerified ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-green-500">
                            <svg
                              className="h-4 w-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-200">
                            <svg
                              className="h-3.5 w-3.5 text-slate-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 items-center gap-2">
                        <div className="flex-1 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-center">
                          <span className="font-mono text-base font-bold tracking-wider text-slate-800">
                            {verificationQuestion}
                          </span>
                        </div>
                        <div className="w-20">
                          <input
                            type="text"
                            value={userVerificationAnswer}
                            onChange={(e) =>
                              handleVerificationChange(
                                e.target.value,
                                setContactErrors,
                              )
                            }
                            placeholder="Ans"
                            className={`w-full rounded-lg border-2 px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              contactErrors.verification
                                ? "border-red-300 bg-red-50"
                                : isVerified
                                  ? "border-green-500 bg-green-50"
                                  : "border-slate-300 bg-white"
                            }`}
                            autoComplete="off"
                            disabled={isSubmittingContact}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={generateVerification}
                          disabled={isSubmittingContact}
                          className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {contactErrors.verification && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {contactErrors.verification}
                      </p>
                    )}
                  </div>

                  <div className="pt-0.5">
                    <button
                      type="submit"
                      disabled={isSubmittingContact}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
                    >
                      {isSubmittingContact ? (
                        <>
                          <FaSpinner className="animate-spin text-sm" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Request Connection</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* In-page footer — same container + button styles */}
      <footer className="mt-8 border-t border-slate-200 bg-slate-50/50 lg:mt-10">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Ready to start? Enroll in this course or browse more {examName}{" "}
              resources.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/${examSlug}/course`}
                className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                All {examName} Courses
              </Link>
              <Link
                href="/store"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                View Store
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Spacer so last content is not hidden behind fixed mobile bar */}
      <div className="h-20 md:hidden" aria-hidden />

      {/* Mobile: fixed price + enroll bar — safe area padding for notched devices */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">Price</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">
              {formatPrice(course.price)}
            </p>
          </div>
          <Link
            href="/store"
            className="flex-1 rounded-lg bg-blue-600 py-3 text-center text-base font-bold text-white hover:bg-blue-700 transition-colors"
          >
            Enroll Now
          </Link>
        </div>
      </div>
    </div>
  );
}
