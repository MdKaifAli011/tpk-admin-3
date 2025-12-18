"use client";
import Link from "next/link";

const CoursesMegaMenu = ({ onClose }) => {
  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-[90vw] max-w-5xl bg-white rounded-lg shadow-2xl border border-gray-200 py-6 z-50">
      <div className="px-6">
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">
            Preparation Courses
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Start building fast, core aptitude, problem solving skills and more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Engineering & Medical Prep Courses */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Engg. & Medical Prep Courses
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/jee/course-detail/10"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE 1 Year Course (12th)
                </Link>
              </li>
              <li>
                <Link
                  href="/jee/course-detail/11"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE 2 Year Course (11th)
                </Link>
              </li>
              <li>
                <Link
                  href="/jee/course-detail/12"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Foundation Course (9th+)
                </Link>
              </li>
              <li>
                <Link
                  href="/jee/course-detail/33"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Crash Course (12th)
                </Link>
              </li>
              <li>
                <Link
                  href="/neet/course-detail/15"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET 1 Year Course (12th)
                </Link>
              </li>
              <li>
                <Link
                  href="/neet/course-detail/16"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET 2 Year Course (11th)
                </Link>
              </li>
              <li>
                <Link
                  href="/neet/course-detail/17"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Foundation Course (9th)
                </Link>
              </li>
              <li>
                <Link
                  href="/neet/course-detail/34"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Crash Course (12th)
                </Link>
              </li>
            </ul>
          </div>

          {/* Course Listing */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Course Listing
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/sat/course-detail/19"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SAT Prep Course (42 Hours)
                </Link>
              </li>
              <li>
                <Link
                  href="/sat/course-detail/20"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SAT Prep Course (60 Hours)
                </Link>
              </li>
              <li>
                <Link
                  href="/sat/course-detail/21"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SAT Prep Course (72 Hours)
                </Link>
              </li>
              <li>
                <Link
                  href="/sat/course-detail/22"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SAT Prep Course (90 Hours)
                </Link>
              </li>
              <li>
                <Link
                  href="/ib/courses"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  IB MYP Courses
                </Link>
              </li>
              <li>
                <Link
                  href="/ib/courses"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  IB DP (SL / HL) Courses
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  CBSE Courses
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Custom 1 on 1 Tutoring{" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    New
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Quick Access Links */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <ul className="flex flex-wrap gap-4">
            <li>
              <Link
                href="#"
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                <span>📁</span> Quick Start Guide
              </Link>
            </li>
            <li>
              <Link
                href="/trial-session"
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                <span>📁</span> Book Trial Session
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                <span>📁</span> Connect With Counselor
              </Link>
            </li>
            <li>
              <Link
                href="#"
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                <span>📁</span> Operational Support
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CoursesMegaMenu;

