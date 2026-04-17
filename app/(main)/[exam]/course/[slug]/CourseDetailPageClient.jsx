"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import Image from "next/image";
import {
  FaStar,
  FaPlay,
  FaGlobe,
  FaCheckCircle,
  FaEye,
  FaDownload,
  FaClock,
  FaPhone,
  FaUser,
  FaEnvelope,
  FaCommentAlt,
  FaExclamationCircle,
  FaSpinner,
  FaArrowRight,
  FaGraduationCap,
  FaWhatsapp,
  FaCalendarAlt,
} from "react-icons/fa";
import api from "@/lib/api";
import RichContent from "@/app/(main)/components/RichContent";
import Card from "@/app/(main)/components/Card";
import CounselorModal from "@/app/(main)/components/CounselorModal";
import ExamAreaLoading from "@/app/(main)/components/ExamAreaLoading";
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
import { toTitleCase } from "@/utils/titleCase";
import { useExamPreparedDefault } from "@/app/(main)/components/context/ExamLeadContext";
import { useFormPlaceholderImage } from "@/app/(main)/components/hooks/useFormPlaceholderImage";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/** Sidebar detail rows: same fields as admin Course Details form (CourseDetailsForm.jsx). Data comes from course API. */
const SIDEBAR_DETAIL_FIELDS = [
  { label: "Course For", field: "madeFor" },
  { label: "Mode", field: "mode" },
  { label: "Target", field: "target" },
  { label: "Subject Covered", field: "subjectCovered" },
  { label: "Session Length", field: "sessionLength" },
  { label: "Tests", field: "tests" },
  { label: "Full-Length", field: "fullLength" },
  { label: "Fee (USA/Europe*)", field: "feeUsaEurope" },
  { label: "Fee (India/ME/SE*)", field: "feeIndiaMeSe" },
  { label: "Time Zone", field: "timeZone" },
];

function getYouTubeVideoId(url) {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  const m1 = u.match(/[?&]v=([^&\s#]+)/);
  if (m1) return m1[1];
  const m2 = u.match(/youtu\.be\/([^?\s#]+)/);
  if (m2) return m2[1];
  const m3 = u.match(/youtube\.com\/embed\/([^?\s#]+)/);
  if (m3) return m3[1];
  return null;
}

export default function CourseDetailPage() {
  const examPreparedDefault = useExamPreparedDefault();
  const pathname = usePathname();
  const { exam: examSlug, slug } = useParams();
  const {
    src: courseFormPlaceholderSrc,
    onError: onCourseFormPlaceholderError,
  } = useFormPlaceholderImage(pathname, basePath, {
    variant: "course",
    examSlug,
  });
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [counselorModalOpen, setCounselorModalOpen] = useState(false);
  const [brochureModalOpen, setBrochureModalOpen] = useState(false);
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
        prepared: String(
          examPreparedDefault || course?.examId?.name || examSlug || "",
        ).trim() || null,
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
      <div className="min-h-[400px]">
        <ExamAreaLoading message="Loading course..." />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white px-4 text-slate-900">
        <div className="text-center max-w-md py-12 px-5 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-2xl">
            📚
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1.5 tracking-tight">
            Course not found
          </h1>
          <p className="text-slate-600 text-sm leading-snug mb-5">
            This course may have been removed or the link is incorrect.
          </p>
          <Link
            href={`/${examSlug}/course`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Back to courses <FaArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  const examName = course.examId?.name || examSlug || "Exam";
  const examNameDisplay = toTitleCase(examName);
  const courseTitleDisplay = toTitleCase(course.title || "");
  const formatPrice = (p) =>
    p != null && p !== "" ? `$${Number(p).toLocaleString()}` : "—";
  const contentTrimmed =
    course.content != null ? String(course.content).trim() : "";

  const sidebarDetails = SIDEBAR_DETAIL_FIELDS.map(({ label, field }) => {
    let value =
      course[field] != null && String(course[field]).trim() !== ""
        ? String(course[field]).trim()
        : null;
    if (label === "Target" && !value) value = examName;
    return {
      label: toTitleCase(label),
      value: value != null ? toTitleCase(String(value)) : null,
    };
  }).filter((row) => row.value != null && row.value !== "");

  const callPhone =
    course.callPhone != null && String(course.callPhone).trim() !== ""
      ? String(course.callPhone).trim()
      : "";
  // WhatsApp: show button only when a number exists (course, then env, then site default)
  const whatsappNumber = (
    callPhone ||
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE ||
    "15107069331"
  )
    .trim()
    .replace(/\D/g, "");
  const showWhatsAppButton = whatsappNumber.length > 0;
  const whatsappUrl = showWhatsAppButton
    ? `https://api.whatsapp.com/send?phone=15107069331`
    : null;
  const batchClosingDays =
    course.batchClosingDays != null && Number(course.batchClosingDays) >= 0
      ? Number(course.batchClosingDays)
      : null;
  const rating = course.rating != null ? Number(course.rating) : 5;

  const videoUrl =
    course.videoUrl != null ? String(course.videoUrl).trim() : "";
  const videoId = getYouTubeVideoId(videoUrl);
  const videoThumbnailUrl =
    course.videoThumbnail != null && String(course.videoThumbnail).trim() !== ""
      ? String(course.videoThumbnail).trim()
      : videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : null;
  const videoEmbedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1`
    : null;
  const hasVideo = !!videoEmbedUrl;

  const brochureButtonUrl =
    course.brochureButtonUrl != null &&
    String(course.brochureButtonUrl).trim() !== ""
      ? String(course.brochureButtonUrl).trim()
      : "/contact";
  const brochureFormId =
    typeof slug === "string" && slug.trim() ? slug.trim() : "course-brochure";
  const coursePreparedValue =
    String(examPreparedDefault || course?.examId?.name || examSlug || "").trim() ||
    null;

  const getResolvedBrochureUrl = () => {
    const rawUrl = String(brochureButtonUrl || "").trim();
    if (!rawUrl) return `${basePath}/contact`;
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
    if (!rawUrl.startsWith("/")) return rawUrl;

    const normalizedBasePath =
      basePath && basePath !== "/"
        ? `/${String(basePath).replace(/^\/+|\/+$/g, "")}`
        : "";

    if (!normalizedBasePath) return rawUrl;
    if (
      rawUrl === normalizedBasePath ||
      rawUrl.startsWith(`${normalizedBasePath}/`)
    ) {
      return rawUrl;
    }
    return `${normalizedBasePath}${rawUrl}`;
  };

  const openBrochureUrl = () => {
    if (typeof window === "undefined") return;
    window.location.href = getResolvedBrochureUrl();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 space-y-6 mt-6">
      {/* Hero — gradient bg; left: info + price + CTAs; right: video card (white border) */}
      <section
        className="hero-section relative overflow-hidden border-b border-slate-200/60"
        aria-labelledby="course-detail-title"
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50
    border border-indigo-100/60
    shadow-[0_2px_12px_rgba(100,70,200,0.08)] rounded-xl"
        />
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-purple-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-1.5 mb-4"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Home
            </Link>
            <span className="text-slate-300 select-none" aria-hidden>
              /
            </span>
            <Link
              href={`/${examSlug}/course`}
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors truncate max-w-[200px] sm:max-w-none"
            >
              {examNameDisplay} Courses
            </Link>
            <span className="text-slate-300 select-none" aria-hidden>
              /
            </span>
            <span className="text-sm font-semibold text-slate-900 bg-slate-100 rounded-md px-2.5 py-1 truncate max-w-[220px] sm:max-w-md">
              {courseTitleDisplay}
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            {/* LEFT */}
            <div className="lg:col-span-8 min-w-0">
              {/* Title (Improved Scale) */}
              <h1
                id="course-detail-title"
                className="text-3xl sm:text-4xl lg:text-[38px] font-bold text-slate-900 tracking-tight leading-snug mb-3 break-words"
              >
                {courseTitleDisplay}
              </h1>

              {/* Description (Improved Readability) */}
              <p className="text-base sm:text-[17px] text-slate-700 leading-relaxed max-w-2xl mb-5">
                {course.shortDescription ||
                  "Get exam-ready with expert guidance and focused practice for success."}
              </p>

              {/* Meta Row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {course.instructorImage &&
                    String(course.instructorImage).trim() ? (
                      <Image
                        src={course.instructorImage}
                        alt=""
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                        {(course.createdBy || "E").charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 text-sm text-slate-600">
                    <span className="font-bold text-slate-900 truncate">
                      By {toTitleCase(course.createdBy || "Expert")}
                    </span>

                    <span className="text-slate-300 shrink-0" aria-hidden>
                      ·
                    </span>

                    <span className="flex items-center gap-1 shrink-0">
                      <div className="flex text-amber-500">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <FaStar
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i <= Math.floor(rating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-slate-200 text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span>{course.reviewCount ?? 0} rating</span>
                    </span>

                    <span className="text-slate-300 shrink-0" aria-hidden>
                      ·
                    </span>

                    <span className="shrink-0">
                      {course.totalStudents ??
                        course.studentCount ??
                        course.enrolledCount ??
                        course.students ??
                        0}{" "}
                      students
                    </span>
                  </div>
                </div>

                <span className="hidden sm:inline h-3 w-px bg-slate-200 shrink-0" />

                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 shrink-0">
                  <span className="flex items-center gap-1">
                    <FaGlobe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    English
                  </span>
                  <span className="flex items-center gap-1">
                    <FaCheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Certified
                  </span>
                </div>
              </div>

              {/* Price + CTA */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Price (Stronger Hierarchy) */}
                {/* <span className="text-3xl sm:text-4xl font-bold text-blue-700 tabular-nums tracking-tight">
                  {formatPrice(course.price)}
                </span> */}

                <button
                  type="button"
                  onClick={() => setBrochureModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <FaDownload className="w-4 h-4 shrink-0" />
                  Download Course Brochure
                </button>

                <button
                  type="button"
                  onClick={() => setCounselorModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                >
                  <FaCalendarAlt className="w-4 h-4 shrink-0" />
                  Schedule Free Trial Class
                </button>

                {batchClosingDays != null && (
                  <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 shrink-0">
                    <FaClock className="w-3 h-3" />
                    Batch closing in {batchClosingDays} day
                    {batchClosingDays !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT — video thumbnail or course image */}
            <div className="lg:col-span-4 w-full max-w-md lg:max-w-none">
              <div className="rounded-xl overflow-hidden shadow-lg ring-2 ring-white border-2 border-white bg-white">
                <div
                  className={`relative group overflow-hidden bg-slate-900 ${hasVideo ? "cursor-pointer" : ""}`}
                  role={hasVideo ? "button" : undefined}
                  tabIndex={hasVideo ? 0 : undefined}
                  onClick={hasVideo ? () => setVideoModalOpen(true) : undefined}
                  onKeyDown={
                    hasVideo
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setVideoModalOpen(true);
                          }
                        }
                      : undefined
                  }
                  aria-label={hasVideo ? "Play course video" : undefined}
                >
                  <div className="w-full aspect-video relative">
                    {videoThumbnailUrl ? (
                      <Image
                        src={videoThumbnailUrl}
                        alt="Course video thumbnail"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 1024px) 100vw, 380px"
                      />
                    ) : course.image ? (
                      <Image
                        src={course.image}
                        alt="Course preview"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 1024px) 100vw, 380px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-3xl">
                        📚
                      </div>
                    )}
                  </div>
                  {hasVideo && (
                    <>
                      <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center text-white transition-opacity group-hover:bg-black/60" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="relative w-20 h-20 flex items-center justify-center mb-3">
                          <span
                            className="absolute inset-0 rounded-full border-2 border-white/60 animate-play-ring animate-play-ring-1"
                            aria-hidden
                          />
                          <span
                            className="absolute inset-0 rounded-full border-2 border-white/60 animate-play-ring animate-play-ring-2"
                            aria-hidden
                          />
                          <span
                            className="absolute inset-0 rounded-full border-2 border-white/60 animate-play-ring animate-play-ring-3"
                            aria-hidden
                          />
                          <div className="relative w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-300 ring-4 ring-white/20">
                            <FaPlay className="w-6 h-6 ml-1 text-indigo-600 shrink-0" />
                          </div>
                        </div>
                        <span className="flex items-center gap-2 text-sm font-semibold text-white drop-shadow-md">
                          <FaEye className="w-4 h-4 shrink-0" />
                          Watch course video
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Video modal */}
            {videoModalOpen && videoEmbedUrl && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                role="dialog"
                aria-modal="true"
                aria-label="Course video"
              >
                <button
                  type="button"
                  onClick={() => setVideoModalOpen(false)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Close video"
                >
                  <span className="text-2xl leading-none">&times;</span>
                </button>
                <div className="relative w-full max-w-4xl aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={videoEmbedUrl}
                    title="Course video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
                <div
                  className="absolute inset-0 -z-10"
                  onClick={() => setVideoModalOpen(false)}
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Counselor modal — Connect With Counselor */}
            <CounselorModal
              isOpen={counselorModalOpen}
              onClose={() => setCounselorModalOpen(false)}
              preparedValue={coursePreparedValue}
            />
            <CounselorModal
              isOpen={brochureModalOpen}
              onClose={() => setBrochureModalOpen(false)}
              onSuccess={openBrochureUrl}
              preparedValue={coursePreparedValue}
              title="Download Course Brochure"
              badgeText="Complete form to download"
              formName="course-brochure-download"
              formId={brochureFormId}
              successMessage="Thank you! Redirecting you to the course brochure."
              submitButtonText="Submit & Download"
            />
          </div>
        </div>
      </section>

      {/* Main: content + right sidebar (summary card only) */}
      <div className="max-w-7xl mx-auto mt-10 w-full min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-w-0">
          {/* Left — Course content */}
          <div className="lg:col-span-8 min-w-0 order-1">
            <Card hover={false} className="p-4 sm:p-5 overflow-hidden">
              {contentTrimmed ? (
                <article className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 prose-h2:text-lg prose-h3:text-base prose-p:text-slate-600 prose-p:text-sm prose-p:leading-snug prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-table:text-xs rich-text-content">
                  <RichContent html={String(course.content ?? "")} />
                </article>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                  <p className="mx-auto mb-4 max-w-sm text-sm text-slate-600 leading-snug">
                    Course details will appear here once content is added.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Book a Free Demo Class <FaArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </Card>
          </div>

          {/* Right — Sidebar: summary card, Call Us, Enroll only */}
          <aside
            className="lg:col-span-4 order-2 min-w-0 w-full"
            role="complementary"
            aria-label="Course summary and enrollment"
          >
            <div
              className="sticky z-10 w-full"
              style={{ top: "calc(var(--navbar-height, 7.5rem) + 0.5rem)" }}
            >
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Course summary card — two columns label / value */}
                <div className="p-4 sm:p-5">
                  <div className="space-y-0">
                    {sidebarDetails.map((row, i) => (
                      <div
                        key={row.label}
                        className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-3 py-2.5 text-sm ${
                          i < sidebarDetails.length - 1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >
                        <span className="font-medium shrink-0 text-sm text-[#21A58E]">
                          {row.label}
                        </span>
                        <span className="sm:text-right break-words min-w-0 text-sm text-[#445050]">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 mb-2 text-sm font-medium text-[#21A58E]">
                    For details about the course
                  </p>
                  {showWhatsAppButton && whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors mb-3"
                    >
                      <FaWhatsapp className="w-4 h-4 shrink-0" />
                      WhatsApp Connect
                    </a>
                  ) : null}

                  <a
                    href="https://testprepkart-operations.com/enrollment-form.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Enroll For Course <FaArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Callback form section — fixed min height on lg so image + form column stay aligned; image uses object-cover in a stable frame */}
      <section id="course-contact" className="max-w-7xl mx-auto mt-10">
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch lg:min-h-[520px]">
            <div className="relative hidden h-full min-h-[520px] overflow-hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700" />
              <Image
                src={courseFormPlaceholderSrc}
                alt="Counselor illustration"
                fill
                className="object-cover object-center opacity-90"
                sizes="(max-width: 1024px) 0px, 50vw"
                onError={onCourseFormPlaceholderError}
                unoptimized={String(courseFormPlaceholderSrc).startsWith("http://")}
              />
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />
            </div>

            <div className="flex min-h-0 flex-1 flex-col lg:min-h-[520px]">
              <div className="flex flex-1 flex-col p-5 lg:p-6">
                <span className="inline-block rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white mb-2">
                  Connect With Expert Counselor
                </span>
                <h2 className="text-lg font-bold text-slate-900 mb-1 tracking-tight">
                  Talk to Our Expert Counselors
                </h2>
                <p className="text-sm text-slate-600 leading-snug mb-5">
                  Get a callback from our academic experts
                </p>

                <form onSubmit={handleCallbackSubmit} className="space-y-3">
                  {contactSubmitStatus && (
                    <div
                      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                        contactSubmitStatus === "success"
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-red-200 bg-red-50 text-red-800"
                      }`}
                    >
                      {contactSubmitStatus === "success" ? (
                        <FaCheckCircle className="mt-0.5 shrink-0 text-green-600 w-4 h-4" />
                      ) : (
                        <FaExclamationCircle className="mt-0.5 shrink-0 text-red-600 w-4 h-4" />
                      )}
                      <p className="text-sm font-medium">
                        {contactSubmitMessage}
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <FaUser className="text-slate-400 w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="name"
                        value={contactFormData.name}
                        onChange={handleContactChange}
                        className={`w-full rounded-lg border px-3 py-2.5 pl-9 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          contactErrors.name
                            ? "border-red-300 bg-red-50"
                            : "border-slate-200 bg-white text-slate-900"
                        }`}
                        placeholder="Your Full Name"
                        disabled={isSubmittingContact}
                      />
                    </div>
                    {contactErrors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {contactErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <FaEnvelope className="text-slate-400 w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={contactFormData.email}
                        onChange={handleContactChange}
                        className={`w-full rounded-lg border px-3 py-2.5 pl-9 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          contactErrors.email
                            ? "border-red-300 bg-red-50"
                            : "border-slate-200 bg-white text-slate-900"
                        }`}
                        placeholder="Email Address"
                        disabled={isSubmittingContact}
                      />
                    </div>
                    {contactErrors.email && (
                      <p className="mt-1 text-sm text-red-600 font-medium">
                        {contactErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
                        <FaGlobe className="text-slate-400 w-4 h-4" />
                      </div>
                      <select
                        name="country"
                        value={contactFormData.country}
                        onChange={handleContactChange}
                        className={`w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          contactErrors.country
                            ? "border-red-300 bg-red-50"
                            : "border-slate-200 text-slate-900"
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
                      <p className="mt-1 text-sm text-red-600 font-medium">
                        {contactErrors.country}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
                        <FaGraduationCap className="text-slate-400 w-4 h-4" />
                      </div>
                      <select
                        name="className"
                        value={contactFormData.className}
                        onChange={handleContactChange}
                        className={`w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          contactErrors.className
                            ? "border-red-300 bg-red-50"
                            : "border-slate-200 text-slate-900"
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
                      <p className="mt-1 text-sm text-red-600 font-medium">
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
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-sm"
                          readOnly
                          disabled={isSubmittingContact}
                        />
                      </div>
                      <div className="relative flex-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <FaPhone className="text-slate-400 w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={contactFormData.phoneNumber}
                          onChange={handleContactChange}
                          className={`w-full rounded-lg border px-3 py-2.5 pl-10 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            contactErrors.phoneNumber
                              ? "border-red-300 bg-red-50"
                              : "border-slate-200 bg-white text-slate-900"
                          }`}
                          placeholder="Contact No"
                          disabled={isSubmittingContact}
                        />
                      </div>
                    </div>
                    {contactErrors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-600 font-medium">
                        {contactErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-2.5 flex items-start">
                        <FaCommentAlt className="mt-0.5 text-slate-400 w-4 h-4" />
                      </div>
                      <textarea
                        name="message"
                        value={contactFormData.message}
                        onChange={handleContactChange}
                        rows={3}
                        maxLength={2000}
                        className={`w-full resize-none rounded-lg border px-3 py-2.5 pl-9 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          contactErrors.message
                            ? "border-red-300 bg-red-50"
                            : "border-slate-200 bg-white text-slate-900"
                        }`}
                        placeholder="How can we help you? (Optional)"
                        disabled={isSubmittingContact}
                      />
                    </div>
                    {contactErrors.message && (
                      <p className="mt-1 text-sm text-red-600 font-medium">
                        {contactErrors.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <div
                      className={`flex items-center gap-2 rounded-lg border p-2.5 transition-all ${
                        contactErrors.verification
                          ? "border-red-300 bg-red-50"
                          : isVerified
                            ? "border-green-500 bg-green-50"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="shrink-0">
                        {isVerified ? (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
                            <FaCheckCircle className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200">
                            <svg
                              className="h-4 w-4 text-slate-500"
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
                        <div className="flex-1 rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center">
                          <span className="font-mono text-sm font-bold tracking-wider text-slate-800">
                            {verificationQuestion}
                          </span>
                        </div>
                        <div className="w-24">
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
                            className={`w-full rounded border-2 px-2 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              contactErrors.verification
                                ? "border-red-300 bg-red-50"
                                : isVerified
                                  ? "border-green-500 bg-green-50"
                                  : "border-slate-200 bg-white"
                            }`}
                            autoComplete="off"
                            disabled={isSubmittingContact}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={generateVerification}
                          disabled={isSubmittingContact}
                          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          aria-label="Refresh verification"
                        >
                          <svg
                            className="h-4 w-4"
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
                      <p className="mt-1 text-sm text-red-600 font-medium">
                        {contactErrors.verification}
                      </p>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmittingContact}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-70"
                    >
                      {isSubmittingContact ? (
                        <>
                          <FaSpinner className="animate-spin w-4 h-4" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Connect With Expert Counselor</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-16 md:hidden" aria-hidden />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div>
            <p className="text-[11px] font-medium text-slate-500">Price</p>
            <p className="text-base font-bold tabular-nums tracking-tight text-slate-900">
              {formatPrice(course.price)}
            </p>
          </div>
          <Link
            href="/store"
            className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition-colors active:scale-[0.98]"
          >
            Enroll Now
          </Link>
        </div>
      </div>
    </div>
  );
}
