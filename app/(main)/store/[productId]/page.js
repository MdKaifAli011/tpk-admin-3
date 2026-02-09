"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { STORE_PRODUCTS } from "../storeData";
import {
  FaStar,
  FaCartPlus,
  FaCheck,
  FaBolt,
  FaInfinity,
  FaMobile,
  FaDesktop,
  FaCertificate,
  FaChevronDown,
  FaChevronUp,
  FaUsers,
  FaGlobe,
  FaLock,
  FaUndo,
  FaCreditCard,
  FaMoneyBillAlt,
  FaUniversity,
} from "react-icons/fa";
import { useStore } from "../StoreContext";
import CartSlideOver from "../components/CartSlideOver";
import Link from "next/link";

const MOCK_CURRICULUM = [
  { id: 1, title: "Module 1: Mathematical Tools & Kinematics", topics: [{ name: "Vectors & Basic Calculus", duration: "15:20" }, { name: "Motion in a Straight Line", duration: "22:10" }] },
  { id: 2, title: "Module 2: Laws of Motion", topics: [{ name: "Newton's Laws", duration: "18:00" }, { name: "Friction", duration: "14:30" }] },
  { id: 3, title: "Module 3: Work, Energy & Power", topics: [{ name: "Work and Kinetic Energy", duration: "20:15" }, { name: "Potential Energy", duration: "16:45" }] },
];

const MOCK_INSTRUCTOR = {
  name: "Dr. Aryan Sharma",
  title: "Senior Physics Educator",
  affiliation: "Ex-IIT Delhi",
  bio: "15+ years of experience teaching NEET/JEE aspirants. Specializes in simplifying complex concepts with real-world applications.",
  avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150",
  experience: "15+ Yrs Experience",
  rating: "4.9",
};

const MOCK_REVIEWS = [
  { id: 1, initials: "AS", name: "Animesh Singh", time: "2 months ago", text: "Excellent course! Cleared my basics and boosted my confidence for NEET. Highly recommend.", rating: 5 },
  { id: 2, initials: "PK", name: "Priya K.", time: "1 month ago", text: "Well structured and easy to follow. The practice MCQs are very close to the actual exam pattern.", rating: 5 },
];

const RATING_DISTRIBUTION = { 5: 85, 4: 10, 3: 5 };

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { addToCart } = useStore();
  const [expandedModule, setExpandedModule] = useState(1);

  const product = useMemo(() => STORE_PRODUCTS.find((p) => p.id === productId), [productId]);

  const frequentlyBought = useMemo(() => {
    return STORE_PRODUCTS.filter((p) => p.id !== productId).slice(0, 3);
  }, [productId]);

  const bundleTotal = useMemo(() => {
    return frequentlyBought.reduce((sum, p) => sum + p.price, 0) + (product ? product.price : 0);
  }, [frequentlyBought, product]);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-slate-400">?</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Product not found</h1>
          <p className="text-slate-600 mb-8">This resource may have been moved or removed.</p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all"
          >
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const discount =
    product.originalPrice > 0
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const categoryLabel = product.category === "course" ? "Courses" : product.category === "ebook" ? "eBooks & Notes" : "Practice Papers";

  return (
    <>
      <CartSlideOver />

      <div className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-10" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-indigo-600 transition-colors font-medium">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/store" className="hover:text-indigo-600 transition-colors font-medium">{categoryLabel}</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-md">{product.name}</span>
          </nav>

          {/* Hero */}
          <header className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-4">
              {product.category === "course" ? "Online Course" : product.category === "ebook" ? "eBook & Notes" : "Practice Papers"}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[2.75rem] font-bold text-slate-900 leading-tight tracking-tight mb-4">
              {product.name}
              {product.category === "course" ? (
                <span className="text-slate-600 font-semibold">: From Basics to Advanced</span>
              ) : null}
            </h1>
            <p className="text-slate-600 text-base sm:text-lg max-w-3xl leading-relaxed mb-8">
              {product.description}
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FaStar key={i} className={`w-4 h-4 ${i <= Math.floor(product.rating) ? "fill-current" : "text-slate-300 fill-slate-300"}`} />
                  ))}
                </div>
                <span className="font-bold text-slate-900">{product.rating}</span>
                <span className="text-slate-500">({product.reviews.toLocaleString()} reviews)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FaUsers className="w-4 h-4 text-slate-500" />
                </span>
                <span className="font-medium">12,500+ students</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FaGlobe className="w-4 h-4 text-slate-500" />
                </span>
                <span className="font-medium">English, Hindi</span>
              </div>
            </div>
          </header>

          {/* Two Column Layout - Both scroll together */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-8 min-w-0">
              {/* Video Preview */}
              <div className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-xl shadow-slate-200/50">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 ring-4 ring-white/30"
                    aria-label="Play preview"
                  >
                    <span className="w-0 h-0 border-l-[22px] border-l-slate-900 border-y-[13px] border-y-transparent ml-1" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className="px-4 py-2 rounded-xl bg-white/95 text-slate-900 text-sm font-semibold shadow-lg backdrop-blur-sm">
                    Preview this course
                  </span>
                </div>
              </div>

              {/* About Section */}
              <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                <div className="border-l-4 border-indigo-600 bg-slate-50/30 pl-6 sm:pl-8 pr-6 sm:pr-8 py-6 sm:py-8">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Overview</p>
                  <h2 className="text-xl font-bold text-slate-900 mb-4">About this course</h2>
                  <p className="text-slate-600 text-base leading-relaxed mb-6">
                    A complete {product.category} designed to simplify the toughest concepts for aspirants. Get structured content, practice questions, and expert support to achieve your target score.
                  </p>
                  <ul className="space-y-3">
                    {(product.features || []).slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <FaCheck className="w-3 h-3 text-emerald-600" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Curriculum Accordion */}
              {product.category === "course" && (
                <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                  <div className="border-l-4 border-indigo-600 bg-slate-50/30 pl-6 sm:pl-8 pr-6 sm:pr-8 py-6 sm:py-8">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Syllabus</p>
                    <h2 className="text-xl font-bold text-slate-900 mb-5">Course curriculum</h2>
                    <div className="space-y-2">
                      {MOCK_CURRICULUM.map((mod) => (
                        <div key={mod.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-slate-300 transition-colors">
                          <button
                            type="button"
                            onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50/80 transition-colors"
                          >
                            {mod.title}
                            {expandedModule === mod.id ? <FaChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <FaChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                          </button>
                          {expandedModule === mod.id && (
                            <div className="px-5 pb-4 pt-0 space-y-1 border-t border-slate-100">
                              {mod.topics.map((t, i) => (
                                <div key={i} className="flex items-center justify-between py-2.5 pl-2 text-sm text-slate-600">
                                  <span>{t.name}</span>
                                  <span className="text-slate-400 font-medium tabular-nums">{t.duration}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Instructor Section */}
              <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                <div className="border-l-4 border-indigo-600 bg-slate-50/30 pl-6 sm:pl-8 pr-6 sm:pr-8 py-6 sm:py-8">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Expert</p>
                  <h2 className="text-xl font-bold text-slate-900 mb-5">Instructor</h2>
                  <div className="flex flex-col sm:flex-row gap-5 p-5 rounded-xl bg-white border border-slate-100">
                    <img
                      src={MOCK_INSTRUCTOR.avatar}
                      alt={MOCK_INSTRUCTOR.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg">{MOCK_INSTRUCTOR.name}</h3>
                      <p className="text-sm text-slate-600 mt-0.5">{MOCK_INSTRUCTOR.title} · {MOCK_INSTRUCTOR.affiliation}</p>
                      <p className="text-sm text-slate-600 mt-3 leading-relaxed">{MOCK_INSTRUCTOR.bio}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">{MOCK_INSTRUCTOR.experience}</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">
                          <FaStar className="w-3.5 h-3.5 fill-current" /> {MOCK_INSTRUCTOR.rating} Rating
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Student Reviews Section */}
              <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Testimonials</p>
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Student reviews</h2>
                  <div className="flex flex-col sm:flex-row gap-6 p-6 rounded-2xl bg-slate-50/80 border border-slate-100 mb-6">
                    <div className="text-center sm:text-left sm:min-w-[120px]">
                      <span className="text-4xl font-black text-slate-900 block">{product.rating}</span>
                      <div className="flex justify-center sm:justify-start text-amber-400 mt-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <FaStar key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2 block">Course rating</span>
                    </div>
                    <div className="flex-1 space-y-3">
                      {[5, 4, 3].map((stars) => (
                        <div key={stars} className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 w-5">{stars}</span>
                          <FaStar className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                          <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${RATING_DISTRIBUTION[stars] || 0}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-10 tabular-nums">{RATING_DISTRIBUTION[stars] || 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {MOCK_REVIEWS.map((r) => (
                      <div key={r.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:shadow-sm transition-all duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                            {r.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm">{r.name}</p>
                            <p className="text-xs text-slate-500">{r.time}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Right column - NOW SCROLLS WITH LEFT (removed sticky) */}
            <div className="lg:col-span-1 w-full">
              {/* Removed: lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto */}
              <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xl shadow-slate-200/50 p-6 sm:p-7 overflow-hidden">
                {/* Accent bar at top */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />
                <div className="pt-1">
                  {/* Price Section */}
                  <div className="flex items-baseline gap-2 flex-wrap mb-2">
                    <span className="text-4xl font-black text-slate-900 tracking-tight">{formatPrice(product.price)}</span>
                    {product.originalPrice > product.price && (
                      <span className="text-lg text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
                    )}
                    {discount > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider">{discount}% OFF</span>
                    )}
                  </div>

                  {/* Offer Timer */}
                  <div className="flex items-center gap-2 text-sm text-red-600 font-bold bg-red-50 border border-red-100 p-3 rounded-xl mb-6">
                    <span className="text-red-500">Offer ends in 02:45:12</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-bold text-white shadow-lg shadow-indigo-500/30 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:opacity-95 hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-200 active:scale-[0.99]"
                    >
                      <FaBolt className="w-4 h-4" />
                      Buy now
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold text-slate-700 border-2 border-slate-200 hover:bg-slate-50 transition-colors duration-200 active:scale-[0.99]"
                    >
                      <FaCartPlus className="w-4 h-4" />
                      Add to cart
                    </button>
                  </div>

                  {/* Security Note */}
                  <p className="text-xs text-slate-500 text-center mb-6 flex items-center justify-center gap-2">
                    <FaLock className="w-3.5 h-3.5" /> Secure payment · <FaUndo className="w-3.5 h-3.5" /> 7-day refund
                  </p>

                  {/* Course Includes */}
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">This course includes</h3>
                  <ul className="space-y-3 text-sm text-slate-700 mb-6">
                    <li className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <FaInfinity className="w-4 h-4 text-indigo-600" />
                      </span>
                      Full lifetime access
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <FaMobile className="w-4 h-4 text-indigo-600" />
                      </span>
                      Access on mobile and TV
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <FaCertificate className="w-4 h-4 text-indigo-600" />
                      </span>
                      Certificate of completion
                    </li>
                  </ul>

                  {/* Payment Icons */}
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-slate-300">
                    <FaCreditCard className="w-6 h-6" />
                    <FaMoneyBillAlt className="w-6 h-6" />
                    <FaUniversity className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        
        </div>
      </div>
    </>
  );
}