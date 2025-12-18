"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const ExaminationsMegaMenu = ({ onClose }) => {
  const examinations = [
    {
      title: "Engineering",
      subtitle: "JEE Mains & Advanced",
      href: "/jee",
      image: "/images/jee-preview.jpg",
      color: "#8B5CF6",
    },
    {
      title: "Medical",
      subtitle: "NEET UG Prep",
      href: "/neet",
      image: "/images/neet-preview.jpg",
      color: "#10B981",
    },
    {
      title: "SAT Prep",
      subtitle: "Digital SAT",
      href: "/sat",
      image: "/images/sat-preview.jpg",
      color: "#EC4899",
    },
    {
      title: "IB Program",
      subtitle: "MYP & DP Levels",
      href: "/ib",
      image: "/images/ib-preview.jpg",
      color: "#F97316",
    },
    {
      title: "AP Exams",
      subtitle: "College Board",
      href: "/ap",
      image: "/images/ap-preview.jpg",
      color: "#3B82F6",
    },
    {
      title: "School",
      subtitle: "CBSE & School",
      href: "/school-exam",
      image: "/images/cbse-preview.jpg",
      color: "#EAB308",
    },
  ];

  return (
    <div className="fixed inset-x-0 z-[100] px-2 pt-2 sm:px-4 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Main Container */}
      <div className="mx-auto max-w-7xl overflow-hidden rounded border border-white/[0.08] bg-[#0B0F1A]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="p-4 sm:p-8">
          {/* Grid Layout: Responsive adjustments */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {examinations.map((exam, index) => (
              <Link
                key={index}
                href={exam.href}
                onClick={onClose}
                className="group relative flex flex-col items-center"
              >
                {/* Image (no fixed frame) */}
                <div className="relative w-full rounded overflow-hidden">
                  <Image
                    src={`${basePath}${exam.image}`}
                    alt={exam.title}
                    width={520}
                    height={650}
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 16vw"
                    className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105 bg-white"
                    priority
                  />

                  {/* High-end Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B0F1A]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Subtle Accent Glow */}
                  <div
                    className="absolute -bottom-10 -left-10 h-32 w-32 blur-3xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-700"
                    style={{ backgroundColor: exam.color }}
                  />
                </div>

                {/* Typography Container */}
                <div className="mt-4 w-full text-center space-y-0.5">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[13px] sm:text-[15px] font-semibold text-white/90 group-hover:text-white transition-colors">
                      {exam.title}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all -translate-y-1" />
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 tracking-tight group-hover:text-slate-400">
                    {exam.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Decorative Bar */}
        <div className="flex h-1 w-full overflow-hidden">
          {examinations.map((exam, i) => (
            <div
              key={i}
              className="h-full flex-1 opacity-20"
              style={{ backgroundColor: exam.color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExaminationsMegaMenu;
