"use client";
import Link from "next/link";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const ExaminationsMegaMenu = ({ onClose }) => {
  const examinations = [
    {
      name: "Engineering Preparation",
      displayName: "Engineering Preparartion",
      href: "/jee",
      slug: "jee",
      bgColor: "bg-purple-500",
    },
    {
      name: "Medical Preparation",
      displayName: "Medical Preparartion",
      href: "/neet",
      slug: "neet",
      bgColor: "bg-green-500",
    },
    {
      name: "SAT Preparation",
      displayName: "SAT Preparartion",
      href: "/sat",
      slug: "sat",
      bgColor: "bg-pink-500",
    },
    {
      name: "IB MYP & DP Preparation",
      displayName: "IB MYP & DP Preparartion",
      href: "/ib",
      slug: "ib",
      bgColor: "bg-orange-500",
    },
    {
      name: "AP Preparation",
      displayName: "AP Preparartion",
      href: "/ap",
      slug: "ap",
      bgColor: "bg-blue-500",
    },
    {
      name: "CBSE / School Preparation",
      displayName: "CBSE / School Preparartion",
      href: "/school-exam",
      slug: "school-exam",
      bgColor: "bg-yellow-400",
    },
  ];

  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-[95vw] max-w-6xl bg-white rounded-lg shadow-2xl border border-gray-200 py-6 z-50">
      <div className="px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {examinations.map((exam) => (
            <Link
              key={exam.slug}
              href={`${basePath}${exam.href}`}
              onClick={onClose}
              className="group block"
            >
              <div className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white">
                {/* Card Container */}
                <div className="aspect-[4/5] relative overflow-hidden flex flex-col">
                  {/* Colored Background with Dot Pattern */}
                  <div className={`${exam.bgColor} flex-1 relative overflow-hidden`}>
                    {/* Dot Pattern Overlay - small white dots */}
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
                        backgroundSize: "12px 12px",
                        backgroundPosition: "0 0",
                      }}
                    ></div>
                  </div>

                  {/* White Strip at Bottom with Text */}
                  <div className="bg-white px-3 py-2.5 flex items-center justify-center min-h-[60px] border-t border-gray-100">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 text-center leading-tight">
                      {exam.displayName}
                    </p>
                  </div>
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
