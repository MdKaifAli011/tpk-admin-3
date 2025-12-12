"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import MainLayout from "./layout/MainLayout";
import ExamCard from "./components/ExamCard";
import Card from "./components/Card";
import Button from "./components/Button";
import { ExamCardSkeleton } from "./components/SkeletonLoader";
import { fetchExams } from "./lib/api";
import { STATUS, PLACEHOLDERS } from "@/constants";
import {
  FaArrowRight,
  FaBook,
  FaUsers,
  FaChartLine,
  FaAward,
  FaGraduationCap,
  FaLightbulb,
  FaRocket,
  FaCheckCircle,
  FaStar,
  FaQuoteLeft,
  FaPlayCircle,
  FaClock,
  FaTrophy,
  FaShieldAlt,
} from "react-icons/fa";

/* =======================================================
   STAT COMPONENT - Trust Building
======================================================= */
function Stat({ number, label, subtext }) {
  return (
    <Card variant="stat" className="p-6 text-center">
      <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent mb-2">
        {number}
      </div>
      <div className="text-base font-semibold text-gray-900 mb-1">{label}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </Card>
  );
}

/* =======================================================
   TESTIMONIAL COMPONENT
======================================================= */
function Testimonial({ name, role, text, rating = 5, image = null }) {
  return (
    <Card variant="premium" className="p-8 h-full flex flex-col">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(rating)].map((_, i) => (
          <FaStar key={i} className="text-yellow-400 text-sm" />
        ))}
      </div>
      <FaQuoteLeft className="text-indigo-200 text-3xl mb-4" />
      <p className="text-gray-700 text-sm leading-relaxed mb-6 flex-grow">
        {text}
      </p>
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold">
          {name.charAt(0)}
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-sm">{name}</div>
          <div className="text-xs text-gray-500">{role}</div>
        </div>
      </div>
    </Card>
  );
}

/* =======================================================
   MAIN HOMEPAGE CONTENT
======================================================= */
function HomepageContent() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  /* --- Fetch exams --- */
  useEffect(() => {
    const loadExams = async () => {
      try {
        const res = await fetchExams({ limit: 100, status: STATUS.ACTIVE });
        setExams(res || []);
      } catch (error) {
        console.error(error);
        setExams([]);
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, []);

  /* --- Feature Data --- */
  const features = [
    {
      icon: FaBook,
      title: "Comprehensive Study Material",
      desc: "Expertly curated notes, theory, and practice papers designed for maximum retention and understanding.",
      color: "bg-blue-50 text-blue-600",
      benefit: "Learn Faster",
    },
    {
      icon: FaUsers,
      title: "Expert Faculty",
      desc: "Learn from top-rated teachers with proven track records of helping students excel in competitive exams.",
      color: "bg-purple-50 text-purple-600",
      benefit: "Expert Guidance",
    },
    {
      icon: FaChartLine,
      title: "Smart Progress Tracking",
      desc: "Track your performance across chapters, topics, and subjects with detailed analytics and insights.",
      color: "bg-green-50 text-green-600",
      benefit: "Track Growth",
    },
    {
      icon: FaAward,
      title: "Proven Success Rate",
      desc: "Join thousands of successful students who cracked their dream exams with our comprehensive preparation.",
      color: "bg-yellow-50 text-yellow-700",
      benefit: "95% Success",
    },
  ];

  const steps = [
    {
      step: "01",
      icon: FaLightbulb,
      title: "Choose Your Exam",
      desc: "Select from our comprehensive range of exam preparation courses tailored to your goals.",
      bg: "bg-indigo-600",
    },
    {
      step: "02",
      icon: FaBook,
      title: "Study & Practice",
      desc: "Access structured modules, interactive lessons, practice tests, and mock exams at your pace.",
      bg: "bg-purple-600",
    },
    {
      step: "03",
      icon: FaTrophy,
      title: "Ace Your Exam",
      desc: "Build confidence with comprehensive test series and personalized strategies for exam success.",
      bg: "bg-pink-500",
    },
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "NEET 2024, AIR 342",
      text: "The structured approach and detailed explanations helped me understand concepts I struggled with. The practice tests were a game-changer!",
      rating: 5,
    },
    {
      name: "Arjun Patel",
      role: "JEE Main 2024, 99.2 Percentile",
      text: "Best platform for JEE preparation! The chapter-wise tracking kept me motivated, and the quality of study material is excellent.",
      rating: 5,
    },
    {
      name: "Sarah Johnson",
      role: "SAT 2024, 1520 Score",
      text: "As an NRI student, finding quality prep material was challenging. TestPrepKart made it easy with their comprehensive resources.",
      rating: 5,
    },
    {
      name: "Rahul Kumar",
      role: "JEE Advanced 2024, IIT Delhi",
      text: "The progress tracking feature helped me identify weak areas. The mock tests perfectly simulated the actual exam environment.",
      rating: 5,
    },
  ];

  const guarantees = [
    {
      icon: FaShieldAlt,
      title: "100% Quality Guarantee",
      desc: "Premium study material curated by experts",
    },
    {
      icon: FaClock,
      title: "24/7 Access",
      desc: "Learn anytime, anywhere at your convenience",
    },
    {
      icon: FaAward,
      title: "Proven Results",
      desc: "95% success rate with thousands of successful students",
    },
    {
      icon: FaUsers,
      title: "Expert Support",
      desc: "Get help from experienced faculty whenever you need",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* =======================================================
          HERO SECTION (PREMIUM & CONVERSION-FOCUSED)
      ======================================================= */}
      <section className="relative overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-60"></div>

        {/* Subtle Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.25) 1px, transparent 0)`,
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28">
          <div className="text-center max-w-5xl mx-auto space-y-8">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200 px-6 py-3 rounded-full font-semibold text-sm">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 flex items-center justify-center">
                <FaRocket className="text-white text-sm" />
              </div>
              <span className="text-gray-900">
                Trusted by 50,000+ Students Worldwide
              </span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className="text-yellow-400 text-xs" />
                ))}
              </div>
            </div>

            {/* Main Headline - Value Proposition */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.1] text-gray-900">
              Crack Your{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                Dream Exam
              </span>
              <br />
              with Confidence
            </h1>

            {/* Subheadline - Benefit-Focused */}
            <p className="text-xl sm:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium">
              Master concepts, track progress, and ace competitive exams with
              our comprehensive preparation platform designed for serious
              students.
            </p>

            {/* Primary CTA Section */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link
                href="#exams"
                className="group inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-xl font-semibold text-sm sm:text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                Start Free Learning Journey
                <FaArrowRight className="text-sm group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-white border-2 border-gray-300 text-gray-900 rounded-xl font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl hover:border-indigo-500 transition-all"
              >
                <FaPlayCircle className="text-indigo-600 text-sm" />
                Watch Demo
              </Link>
            </div>

            {/* Social Proof - Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-12 max-w-4xl mx-auto">
              <Stat
                number="50K+"
                label="Active Students"
                subtext="Learning daily"
              />
              <Stat
                number="100+"
                label="Expert Teachers"
                subtext="top-rated faculty"
              />
              <Stat
                number="95%"
                label="Success Rate"
                subtext="exam clearance"
              />
              <Stat
                number="24/7"
                label="Available"
                subtext="Always accessible"
              />
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>Free to Start</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================
          FEATURES SECTION (BENEFIT-FOCUSED)
      ======================================================= */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-white">
        <div className="text-center mb-20">
          <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
            Why Choose Us
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            A comprehensive learning platform designed to help you master
            concepts, track progress, and achieve exam success.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((item, i) => (
            <Card key={i} variant="premium" className="group p-8">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-16 h-16 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}
                >
                  <item.icon className="text-3xl" />
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {item.benefit}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                {item.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {item.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* =======================================================
          EXAM SECTION (PRIMARY CONVERSION POINT)
      ======================================================= */}
      <section
        id="exams"
        className="relative bg-gradient-to-b from-gray-50 to-white py-24"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
              Get Started Today
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Exam Path
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Select from our comprehensive range of exam preparation courses
              and start your journey to success.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 md:p-12">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => (
                  <ExamCardSkeleton key={i} />
                ))}
              </div>
            ) : exams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {exams.slice(0, 8).map((exam) => (
                  <ExamCard key={exam._id} exam={exam} />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm sm:text-base text-gray-500 py-12">
                {PLACEHOLDERS.NO_DATA}
              </p>
            )}
          </div>

          {/* Secondary CTA */}
          {exams.length > 8 && (
            <div className="text-center mt-12">
              <Link
                href="#exams"
                className="inline-flex items-center gap-2 text-sm sm:text-base text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
              >
                View All Exams
                <FaArrowRight className="text-sm" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* =======================================================
          HOW IT WORKS (PROCESS SIMPLIFICATION)
      ======================================================= */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-white">
        <div className="text-center mb-20">
          <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4">
            Simple Process
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Your Journey to Success in 3 Steps
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Getting started is easy. Follow these simple steps to begin your
            exam preparation journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-center relative">
              {i < 2 && (
                <div className="hidden md:block absolute top-16 right-[-50%] w-full h-[4px] bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 opacity-60 z-0" />
              )}

              <div
                className={`${step.bg} w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-extrabold mx-auto shadow-2xl mb-6 relative z-10`}
              >
                {step.step}
              </div>

              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <step.icon className="text-4xl text-gray-700" />
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =======================================================
          TESTIMONIALS (SOCIAL PROOF)
      ======================================================= */}
      <section className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-white text-indigo-700 rounded-full text-sm font-semibold mb-4 shadow-sm">
              Success Stories
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loved by Thousands of Students
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              See what our successful students have to say about their journey
              with TestPrepKart.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {testimonials.map((testimonial, i) => (
              <Testimonial key={i} {...testimonial} />
            ))}
          </div>
        </div>
      </section>

      {/* =======================================================
          GUARANTEES (RISK REVERSAL)
      ======================================================= */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-white">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Your Success is Our Commitment
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We&apos;re committed to providing you with the best learning
            experience and helping you achieve your goals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {guarantees.map((item, i) => (
            <div
              key={i}
              className="text-center p-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 flex items-center justify-center mx-auto mb-4">
                <item.icon className="text-white text-2xl" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =======================================================
          FINAL CTA (CONVERSION CLOSER)
      ======================================================= */}
      <section className="relative overflow-hidden py-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white">
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "30px 30px",
          }}
        />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
              Ready to Start Your Journey?
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Join 50,000+ Students
              <br />
              <span className="text-yellow-300">
                Cracking Their Dream Exams
              </span>
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Start your free learning journey today. No credit card required.
              Access premium study material and track your progress instantly.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link
                href="#exams"
                className="group inline-flex items-center justify-center gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-white text-indigo-700 rounded-xl font-semibold text-sm sm:text-base md:text-lg shadow-2xl hover:shadow-3xl hover:scale-105 transition-all"
              >
                Start Learning Free
                <FaArrowRight className="text-sm group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-transparent border-2 sm:border-3 border-white text-white rounded-xl font-semibold text-sm sm:text-base md:text-lg hover:bg-white/10 transition-all"
              >
                Create Free Account
              </Link>
            </div>

            {/* Final Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <FaCheckCircle />
                <span>100% Free to Start</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle />
                <span>No Hidden Charges</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle />
                <span>Instant Access</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =======================================================
   MAIN PAGE WRAPPER
======================================================= */
export default function HomePage() {
  return (
    <MainLayout showSidebar={false}>
      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
              <p className="text-gray-500">Loading amazing content...</p>
            </div>
          </div>
        }
      >
        <HomepageContent />
      </Suspense>
    </MainLayout>
  );
}
