"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { STORE_PRODUCTS } from "../storeData";
import {
  FaStar,
  FaCartPlus,
  FaCheck,
  FaPlay,
  FaInfinity,
  FaMobile,
  FaCertificate,
  FaChevronDown,
  FaChevronUp,
  FaUsers,
  FaGlobe,
  FaPhone,
} from "react-icons/fa";
import { useStore } from "../StoreContext";
import CartSlideOver from "../components/CartSlideOver";
import Link from "next/link";

// Course details table (can come from product/cms later)
const DEFAULT_COURSE_DETAILS = [
  { label: "Total No. of Course Hrs.:", value: "628 Hrs" },
  { label: "Course Focus On:", value: "JEE + SAT + BITSAT + CBSE (PCM) Grade 12th" },
  { label: "Concepts & Consolidation:", value: "480 Hrs" },
  { label: "Doubt Removal Sessions:", value: "120 Hrs" },
  { label: "Parent-Teacher Meeting:", value: "3 Meetings During Course Duration" },
];

const DEFAULT_FEATURES = [
  { icon: "video_library", title: "Live Classes", desc: "Interactive 2-way sessions where you can ask doubts in real-time." },
  { icon: "assignment", title: "Study Material", desc: "Comprehensive eBooks and practice modules designed by experts." },
  { icon: "analytics", title: "Performance Analysis", desc: "Detailed insights into your strengths and weaknesses." },
  { icon: "support_agent", title: "Doubt Clinic", desc: "24/7 dedicated support to clear any conceptual hurdles." },
];

const DEFAULT_FAQ = [
  { q: "How will an NRI / foreign student attend JEE online classes from home?", a: "NRI students can log in to the JEE online classroom through their student account provided after enrollment. Our team will also send the class link to the student's email." },
  { q: "What are the duration and timing of the JEE online classes for NRI Students?", a: "The JEE online classes will be 120 minutes (2 hours) per day and 3-4 days a week for Grade 11th and 12th grade students." },
  { q: "How can an NRI student ask doubts in JEE online coaching?", a: "NRI students can ask doubts through microphone or live chat on the whiteboard screen during the JEE online class." },
];

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { addToCart } = useStore();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [contactForm, setContactForm] = useState({ exam: "", class: "", name: "", email: "", country: "", contact: "", robot: false });

  const product = useMemo(() => STORE_PRODUCTS.find((p) => p.id === productId), [productId]);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-slate-400">?</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Product not found</h1>
          <p className="text-slate-600 mb-8">This resource may have been moved or removed.</p>
          <Link href="/store" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  const discount =
    product.originalPrice > 0
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const categoryLabel = product.category === "course" ? "Courses" : product.category === "ebook" ? "eBooks & Notes" : "Practice Papers";

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // TODO: submit to API
  };

  return (
    <>
      <CartSlideOver />

      <div className="min-h-screen flex flex-col">
        {/* Hero - gradient, breadcrumb + title + short desc + meta */}
        <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50/60 py-10 sm:py-12 lg:py-16 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-indigo-600 font-medium">Home</Link>
              <span className="text-slate-300">/</span>
              <Link href="/store" className="hover:text-indigo-600 font-medium">{categoryLabel}</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-md">{product.name}</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
              {product.name}
            </h1>
            <p className="text-slate-600 text-base sm:text-lg max-w-2xl leading-relaxed mb-6">
              {product.description}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
                <span className="font-medium">English</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FaCertificate className="w-4 h-4 text-indigo-600" />
                <span className="font-medium">Certified Course</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main: left = rich-text content (scrollable), right = sticky price card */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pb-24 lg:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left column - main content (richtext-style sections) */}
            <div className="lg:col-span-8 space-y-10 min-w-0">
              {/* Intro + details table */}
              <section>
                <h2 className="text-2xl font-bold text-indigo-600 mb-4">
                  {product.category === "course" ? "JEE 1 Year Online Coaching for NRI Students" : "About this course"}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  One Year JEE coaching programs are popular among students who have completed their 11th grade and are starting their 12th grade studies. These programs typically focus on classes scheduled on weekdays and weekends, covering Mathematics, Physics, and Chemistry, which are tested in the JEE exam.
                </p>
                <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-xl mb-8">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-indigo-600 font-bold">Details</th>
                        <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-indigo-600 font-bold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {(product.courseDetails || DEFAULT_COURSE_DETAILS).map((row, i) => (
                        <tr key={i}>
                          <td className="p-4 font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
                >
                  Book a Free Demo Class
                </button>
              </section>

              {/* Features grid */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  Features of 1 Year {product.category === "course" ? "JEE" : ""} Preparation Online Coaching
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {(product.featureCards || DEFAULT_FEATURES).map((f, i) => (
                    <div
                      key={i}
                      className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <span className="text-indigo-600 text-3xl mb-4 inline-block">📚</span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  {product.name} (FAQ)
                </h2>
                <div className="space-y-4">
                  {(product.faq || DEFAULT_FAQ).map((item, i) => (
                    <div
                      key={i}
                      className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/30"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {item.q}
                        {expandedFaq === i ? <FaChevronUp className="w-4 h-4 shrink-0" /> : <FaChevronDown className="w-4 h-4 shrink-0" />}
                      </button>
                      {expandedFaq === i && (
                        <div className="px-5 pb-4 pt-0">
                          <p className="text-slate-600 dark:text-slate-400">{item.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right column - sticky price/buy card (visible in content area only) */}
            <aside className="lg:col-span-4 w-full">
              <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
                  {/* Video thumbnail */}
                  <div className="relative group cursor-pointer aspect-video bg-slate-900">
                    <img src={product.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <FaPlay className="w-5 h-5 text-slate-900 ml-0.5" />
                      </div>
                      <span className="text-sm font-semibold flex items-center gap-2">
                        <FaPlay className="w-3.5 h-3.5 shrink-0" /> Watch course video
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl font-bold text-slate-900 dark:text-white">{formatPrice(product.price)}</span>
                      {discount > 0 && (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-3 rounded-xl mb-6">
                      <span>Batch closing in 3 days</span>
                    </div>
                    <div className="space-y-3 mb-6">
                      <button type="button" className="w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                        Download Course Brochure
                      </button>
                      <button type="button" className="w-full py-3 rounded-xl font-bold border-2 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        Connect With Counselor
                      </button>
                    </div>
                    <div className="space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-4">
                      {[
                        { label: "Made For", value: "Grade 12 Going / 12th Studying" },
                        { label: "Mode", value: "Live, 2-way Interactive" },
                        { label: "Target", value: "JEE (Main + Advanced)" },
                        { label: "Session Length", value: "120 Minutes" },
                        { label: "Time Zone", value: "Adjusted for Different Time Zones" },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <span className="text-slate-500 font-medium">{row.label}</span>
                          <span className="text-right font-semibold text-slate-900 dark:text-white">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                      <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-2">For details about the course</p>
                      <a href="tel:+918800529410" className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                        <FaPhone className="w-4 h-4" /> +91 8800529410
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="w-full mt-6 py-4 rounded-xl font-bold text-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
                    >
                      Enroll For Course
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* Contact form - full width, after main content */}
          <section className="mt-16 lg:mt-20 bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="max-w-xl mx-auto text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Here to help you with examinations</h2>
              <p className="text-slate-600 dark:text-slate-400">Get a callback from our academic experts</p>
            </div>
            <form onSubmit={handleContactSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <select
                value={contactForm.exam}
                onChange={(e) => setContactForm((c) => ({ ...c, exam: e.target.value }))}
                className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white"
              >
                <option value="">-- Preparing For --</option>
                <option value="jee">JEE Preparation</option>
                <option value="neet">NEET Preparation</option>
                <option value="sat">SAT Preparation</option>
                <option value="ib">IB Preparation</option>
                <option value="school">School Exam Preparation</option>
                <option value="ap">AP Preparation</option>
                <option value="others">Others</option>
              </select>
              <select
                value={contactForm.class}
                onChange={(e) => setContactForm((c) => ({ ...c, class: e.target.value }))}
                className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white"
              >
                <option value="">Select Class</option>
                <option value="12+">12th+</option>
                <option value="12">12th</option>
                <option value="11">11th</option>
                <option value="10">10th</option>
                <option value="9">9th</option>
                <option value="8">8th</option>
              </select>
              <input
                type="text"
                placeholder="Name *"
                value={contactForm.name}
                onChange={(e) => setContactForm((c) => ({ ...c, name: e.target.value }))}
                className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500"
              />
              <input
                type="email"
                placeholder="Email *"
                value={contactForm.email}
                onChange={(e) => setContactForm((c) => ({ ...c, email: e.target.value }))}
                className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500"
              />
              <select
                value={contactForm.country}
                onChange={(e) => setContactForm((c) => ({ ...c, country: e.target.value }))}
                className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white sm:col-span-2"
              >
                <option value="">-- Select Country --</option>
                <option value="IN">India</option>
                <option value="AE">United Arab Emirates</option>
                <option value="US">United States</option>
                <option value="OM">Oman</option>
                <option value="QA">Qatar</option>
                <option value="SA">Saudi Arabia</option>
                <option value="KW">Kuwait</option>
                <option value="SG">Singapore</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>
              <input
                type="tel"
                placeholder="Contact Number *"
                value={contactForm.contact}
                onChange={(e) => setContactForm((c) => ({ ...c, contact: e.target.value }))}
                className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500 sm:col-span-2"
              />
              <div className="sm:col-span-2 flex items-center gap-3 py-2">
                <input
                  id="robot"
                  type="checkbox"
                  checked={contactForm.robot}
                  onChange={(e) => setContactForm((c) => ({ ...c, robot: e.target.checked }))}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="robot" className="text-sm text-slate-700 dark:text-slate-300">I&apos;m not a robot</label>
              </div>
              <button type="submit" className="sm:col-span-2 py-3 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                Submit
              </button>
            </form>
          </section>

          {/* Mobile fixed bottom bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Price</p>
                <p className="font-bold text-lg text-slate-900 dark:text-white">{formatPrice(product.price)}</p>
              </div>
              <button
                type="button"
                onClick={() => addToCart(product)}
                className="flex-1 max-w-xs py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Enroll now
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
