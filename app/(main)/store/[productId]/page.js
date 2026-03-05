"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  FaStar,
  FaCartPlus,
  FaDownload,
  FaPhone,
  FaChevronDown,
  FaChevronUp,
  FaGlobe,
  FaCheckCircle,
  FaArrowRight,
} from "react-icons/fa";
import { useStore } from "../StoreContext";
import CartSlideOver from "../components/CartSlideOver";
import Link from "next/link";
import Card from "@/app/(main)/components/Card";
import ExamAreaLoading from "@/app/(main)/components/ExamAreaLoading";
import CounselorModal from "@/app/(main)/components/CounselorModal";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const DEFAULT_COURSE_DETAILS = [
  { label: "Made For", value: "Grade 12 Going / 12th Studying" },
  { label: "Mode", value: "Live, 2-way Interactive" },
  { label: "Target", value: "JEE (Main + Advanced)" },
  { label: "Subject Covered", value: "Math, Physics, Chemistry" },
  { label: "Session Length", value: "90 Minutes" },
  { label: "Time Zone", value: "Adjusted as per different Time Zones" },
];

const DEFAULT_FEATURES = [
  { icon: "video_library", title: "Live Classes", desc: "Interactive 2-way sessions where you can ask doubts in real-time." },
  { icon: "assignment", title: "Study Material", desc: "Comprehensive eBooks and practice modules designed by experts." },
  { icon: "analytics", title: "Performance Analysis", desc: "Detailed insights into your strengths and weaknesses." },
  { icon: "support_agent", title: "Doubt Clinic", desc: "24/7 dedicated support to clear any conceptual hurdles." },
];

const DEFAULT_FAQ = [
  { q: "How will I access the course after purchase?", a: "After enrollment, you will get login credentials and can access all materials from your student dashboard." },
  { q: "What is the duration of access?", a: "Most courses come with lifetime access unless otherwise specified. Check the product details for exact validity." },
  { q: "Can I get a refund?", a: "Please refer to our refund policy. For any queries, contact our support team." },
];

const SIDEBAR_CALL_PHONE = "+15107069331";

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { addToCart } = useStore();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [counselorModalOpen, setCounselorModalOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${basePath}/api/store/${encodeURIComponent(productId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        setProduct(data?.data ?? null);
      })
      .catch(() => { if (!cancelled) setProduct(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-[400px]">
        <ExamAreaLoading message="Loading product..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white px-4 text-slate-900">
        <div className="text-center max-w-md py-12 px-5 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-2xl">
            📚
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1.5 tracking-tight">
            Product not found
          </h1>
          <p className="text-slate-600 text-sm leading-snug mb-5">
            This product may have been removed or the link is incorrect.
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Back to store <FaArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  const productForCart = { ...product, id: product.slug || product._id };
  const formatPrice = (p) =>
    p != null && p !== "" ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(p)) : "—";

  const discount =
    product.originalPrice > 0
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const rating = product.rating != null ? Number(product.rating) : 5;
  const reviewCount = product.reviews != null ? Number(product.reviews) : 0;
  const descriptionTrimmed = product.description != null ? String(product.description).trim() : "";
  const sidebarDetails = (product.courseDetails && product.courseDetails.length > 0)
    ? product.courseDetails
    : DEFAULT_COURSE_DETAILS;
  const callPhone = SIDEBAR_CALL_PHONE;
  const featureCards = (product.featureCards && product.featureCards.length > 0) ? product.featureCards : DEFAULT_FEATURES;
  const faqList = (product.faq && product.faq.length > 0) ? product.faq : DEFAULT_FAQ;

  return (
    <>
      <CartSlideOver />
      <CounselorModal
        isOpen={counselorModalOpen}
        onClose={() => setCounselorModalOpen(false)}
      />

      <div className="min-h-screen bg-white text-slate-900 space-y-6 mt-6">
        {/* Hero — same as course detail: gradient, breadcrumb, left info + right image */}
        <section className="relative overflow-hidden border-b border-slate-200/60">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] rounded-xl" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-purple-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 mb-4" aria-label="Breadcrumb">
              <Link href="/" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                Home
              </Link>
              <span className="text-slate-300 select-none" aria-hidden>/</span>
              <Link href="/store" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors truncate max-w-[200px] sm:max-w-none">
                Store
              </Link>
              <span className="text-slate-300 select-none" aria-hidden>/</span>
              <span className="text-sm font-semibold text-slate-900 bg-slate-100 rounded-md px-2.5 py-1 truncate max-w-[220px] sm:max-w-md">
                {product.name}
              </span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
              {/* LEFT */}
              <div className="lg:col-span-8 min-w-0">
                <h1 className="text-3xl sm:text-4xl lg:text-[38px] font-bold text-slate-900 tracking-tight leading-snug mb-3 break-words">
                  {product.name}
                </h1>

                <p className="text-base sm:text-[17px] text-slate-700 leading-relaxed max-w-2xl mb-5">
                  {descriptionTrimmed || "Premium resource designed for exam success with expert guidance and focused practice."}
                </p>

                {/* Meta Row — same as course */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <FaStar
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i <= Math.floor(rating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{rating}</span> · {reviewCount} rating
                    </span>
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

                {/* Price + CTA — same as course */}
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-3xl sm:text-4xl font-bold text-blue-700 tabular-nums tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                  {discount > 0 && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 shrink-0">
                      {discount}% OFF
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => addToCart(productForCart)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <FaCartPlus className="w-4 h-4 shrink-0" />
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                  >
                    <FaDownload className="w-4 h-4 shrink-0" />
                    Download Brochure
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounselorModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                  >
                    <FaPhone className="w-4 h-4 shrink-0" />
                    Connect With Counselor
                  </button>
                </div>
              </div>

              {/* RIGHT — image card (same style as course video card) */}
              <div className="lg:col-span-4 w-full max-w-md lg:max-w-none">
                <div className="rounded-xl overflow-hidden shadow-lg ring-2 ring-white border-2 border-white bg-white">
                  <div className="relative overflow-hidden bg-slate-900">
                    <div className="w-full aspect-video relative">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-700"
                          sizes="(max-width: 1024px) 100vw, 380px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-3xl">
                          📚
                        </div>
                      )}
                    </div>
                    {product.badge && (
                      <span className="absolute top-4 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {String(product.badge)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main: content + right sidebar (same layout as course) */}
        <div className="max-w-7xl mx-auto mt-10 w-full min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-w-0">
            {/* Left — Content */}
            <div className="lg:col-span-8 min-w-0 order-1">
              <Card hover={false} className="p-4 sm:p-5 overflow-hidden">
                {descriptionTrimmed ? (
                  <article className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:text-sm prose-p:leading-snug rich-text-content">
                    <div className="whitespace-pre-wrap text-slate-600 text-sm leading-relaxed">
                      {product.description}
                    </div>
                  </article>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                    <p className="mx-auto mb-4 max-w-sm text-sm text-slate-600 leading-snug">
                      Product details will appear here once content is added.
                    </p>
                    <Link
                      href="/store"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Browse store <FaArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </Card>

              {/* Features grid — same style as course */}
              {featureCards.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    Features
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {featureCards.map((f, i) => (
                      <div key={i} className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-indigo-600 text-3xl mb-4 inline-block">📚</span>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                        <p className="text-sm text-slate-600">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQ — same style as course */}
              {faqList.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    {product.name} (FAQ)
                  </h2>
                  <div className="space-y-4">
                    {faqList.map((item, i) => (
                      <div
                        key={i}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                          {item.q}
                          {expandedFaq === i ? <FaChevronUp className="w-4 h-4 shrink-0" /> : <FaChevronDown className="w-4 h-4 shrink-0" />}
                        </button>
                        {expandedFaq === i && (
                          <div className="px-5 pb-4 pt-0">
                            <p className="text-slate-600 text-sm">{item.a}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — Sticky sidebar (same as course: label #21A58E, value #445050) */}
            <aside className="lg:col-span-4 order-2 min-w-0 w-full" role="complementary" aria-label="Product summary">
              <div className="sticky z-10 w-full" style={{ top: "calc(var(--navbar-height, 7.5rem) + 0.5rem)" }}>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5">
                    <div className="space-y-0">
                      {sidebarDetails.map((row, i) => (
                        <div
                          key={i}
                          className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-3 py-2.5 text-sm ${
                            i < sidebarDetails.length - 1 ? "border-b border-slate-100" : ""
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
                      For details about this product
                    </p>
                    <a
                      href={`tel:${callPhone.replace(/\s/g, "")}`}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors mb-3"
                    >
                      <FaPhone className="w-4 h-4 shrink-0" />
                      Call Us: {callPhone}
                    </a>

                    <button
                      type="button"
                      onClick={() => addToCart(productForCart)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      <FaCartPlus className="w-4 h-4 shrink-0" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="h-16 md:hidden" aria-hidden />

        {/* Mobile sticky CTA — same as course */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Price</p>
              <p className="text-base font-bold tabular-nums tracking-tight text-slate-900">
                {formatPrice(product.price)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => addToCart(productForCart)}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition-colors active:scale-[0.98]"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
