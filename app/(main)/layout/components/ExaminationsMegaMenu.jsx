"use client";

import Link from "next/link";
import Image from "next/image";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const ExaminationsMegaMenu = ({ onClose }) => {
  const examinations = [
    {
      title: "Engineering Preparation",
      href: "/jee",
      image: "/images/jee-preview.jpg",
      color: "bg-purple-600",
    },
    {
      title: "Medical Preparation",
      href: "/neet",
      image: "/images/neet-preview.jpg",
      color: "bg-emerald-600",
    },
    {
      title: "SAT Preparation",
      href: "/sat",
      image: "/images/sat-preview.jpg",
      color: "bg-pink-600",
    },
    {
      title: "IB MYP & DP Preparation",
      href: "/ib",
      image: "/images/ib-preview.jpg",
      color: "bg-orange-500",
    },
    {
      title: "AP Preparation",
      href: "/ap",
      image: "/images/ap-preview.jpg",
      color: "bg-blue-600",
    },
    {
      title: "CBSE / School Preparation",
      href: "/school-exam",
      image: "/images/cbse-preview.jpg",
      color: "bg-yellow-500 text-black",
    },
  ];

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-[calc(100vw-2rem)] max-w-[1440px] rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-2xl border border-white/10 z-50 overflow-hidden">
      {/* Scroll Wrapper */}
      <div className="px-4 sm:px-6 py-6 sm:py-8 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 sm:gap-6 min-w-max justify-center">
          {examinations.map((exam, index) => (
            <Link
              key={index}
              // NOTE: Next.js basePath is applied automatically for internal navigation.
              href={exam.href}
              onClick={onClose}
              className="group flex-shrink-0"
            >
              <div className="w-[180px] sm:w-[200px] md:w-[220px] lg:w-[240px] rounded-xl overflow-hidden bg-slate-800 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                {/* Image */}
                <div className="relative aspect-[4/5]">
                  <Image
                    src={`${basePath}${exam.image}`}
                    alt={exam.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Bottom Label */}
                <div
                  className={`text-center text-xs sm:text-sm font-semibold py-2.5 sm:py-3 px-2 ${exam.color}`}
                >
                  <span className="line-clamp-2">{exam.title}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExaminationsMegaMenu;
