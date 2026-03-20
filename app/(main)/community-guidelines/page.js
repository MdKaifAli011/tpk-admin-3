"use client";

import React from "react";
import Link from "next/link";
import {
  FaHandshake,
  FaShieldAlt,
  FaGraduationCap,
  FaCommentDots,
  FaBan,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHeart,
  FaArrowRight,
} from "react-icons/fa";
import Card from "@/app/(main)/components/Card";

const GUIDELINES = [
  {
    icon: FaHandshake,
    title: "Be respectful and kind",
    description: "Treat everyone with respect. We're all here to learn. Use polite language and avoid personal attacks, name-calling, or harassment. Constructive criticism is welcome; mean-spirited comments are not.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    icon: FaGraduationCap,
    title: "Academic integrity",
    description: "Do not post answers to live exams, share leaked materials, or help others cheat. Original work and honest discussion strengthen everyone's learning. Cite sources when you share content from elsewhere.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    icon: FaCommentDots,
    title: "Stay on topic",
    description: "Keep discussions relevant to the subject, chapter, or exam. Use the right thread or create a new one instead of derailing. This helps others find useful answers quickly.",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  {
    icon: FaShieldAlt,
    title: "No spam or self-promotion",
    description: "Do not post ads, referral links, or repeated promotional content. Occasional sharing of helpful resources may be allowed when relevant; commercial or off-topic promotion is not.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    icon: FaBan,
    title: "Prohibited content",
    description: "No hate speech, discrimination, illegal content, or anything that threatens or demeans others. Do not share personal information of others without consent. Violations may lead to removal of content or access.",
    color: "bg-red-50 text-red-600 border-red-100",
  },
  {
    icon: FaHeart,
    title: "Help the community",
    description: "Answer questions when you can, upvote helpful posts, and report content that breaks these guidelines. Your participation makes the hub better for everyone.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
];

const QUICK_TIPS = [
  "Use a clear, descriptive title for new threads.",
  "Search before posting to avoid duplicates.",
  "Mark the best answer when your question is resolved.",
  "Report only content that violates guidelines, not opinions you disagree with.",
];

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 space-y-6 mt-6">
      {/* Hero — same as course/store */}
      <section className="relative rounded-xl p-3 sm:p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <nav className="flex items-center gap-1.5 mb-5" aria-label="Breadcrumb">
            <Link
              href="/"
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors rounded px-1.5 py-0.5 hover:bg-indigo-50"
            >
              Home
            </Link>
            <span className="text-slate-300 select-none" aria-hidden>/</span>
            <span className="text-xs font-semibold text-slate-800 bg-slate-50 rounded px-2 py-0.5 truncate max-w-[200px] sm:max-w-none">
              Community Guidelines
            </span>
          </nav>

          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-600/10 text-indigo-600 text-[11px] font-semibold uppercase tracking-wider">
                Discussion Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
              Community <span className="text-indigo-600">Guidelines</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-snug max-w-xl">
              By participating in our discussion hub, you agree to follow these guidelines. They help keep the community safe, helpful, and focused on learning.
            </p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {GUIDELINES.map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} variant="standard" hover={false} className="p-5 sm:p-6 border-gray-200/60">
                  <div className="flex gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border ${item.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">
                        {item.title}
                      </h2>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <aside className="lg:col-span-4">
            <Card variant="standard" hover={false} className="p-5 border-gray-200/60 sticky top-24">
              <h3 className="text-[11px] font-extrabold text-gray-900 uppercase tracking-widest mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
                <FaCheckCircle className="text-indigo-600 w-4 h-4" />
                Quick tips
              </h3>
              <ul className="space-y-3">
                {QUICK_TIPS.map((tip, i) => (
                  <li key={i} className="text-[13px] text-slate-600 leading-snug flex gap-2">
                    <span className="text-indigo-500 shrink-0 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-[11px] text-gray-500 font-medium mb-2">
                  Questions about moderation?
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Contact us <FaArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          </aside>
        </div>

        {/* Notice */}
        <div className="mt-10 p-4 sm:p-5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0">
            <FaExclamationTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 mb-1">Moderation</h4>
            <p className="text-[13px] text-blue-800/80 leading-relaxed">
              Every post is reviewed by our team. Content that violates these guidelines may be removed, and repeated violations can result in restricted access. We aim to keep the hub helpful and respectful for everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
