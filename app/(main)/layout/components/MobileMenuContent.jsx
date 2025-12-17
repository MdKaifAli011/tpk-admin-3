"use client";
import Link from "next/link";
import { FaChevronRight } from "react-icons/fa";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

export const ExaminationsMobileContent = ({ onClose }) => {
  const examinations = [
    { name: "Engineering Preparation", href: "/jee" },
    { name: "Medical Preparation", href: "/neet" },
    { name: "SAT Preparation", href: "/sat" },
    { name: "IB MYP & DP Preparation", href: "/ib" },
    { name: "AP Preparation", href: "/ap" },
    { name: "School Exam", href: "/school-exam" },
  ];

  return (
    <div className="space-y-1">
      {examinations.map((exam) => (
        <Link
          key={exam.href}
          href={`${basePath}${exam.href}`}
          onClick={onClose}
          className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {exam.name}
        </Link>
      ))}
    </div>
  );
};

export const CoursesMobileContent = ({ onClose }) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          Engg. & Medical Prep Courses
        </h4>
        <div className="space-y-1">
          <Link
            href={`${basePath}/jee/course-detail/10`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE 1 Year Course (12th)
          </Link>
          <Link
            href={`${basePath}/jee/course-detail/11`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE 2 Year Course (11th)
          </Link>
          <Link
            href={`${basePath}/jee/course-detail/12`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Foundation Course (9th+)
          </Link>
          <Link
            href={`${basePath}/jee/course-detail/33`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Crash Course (12th)
          </Link>
          <Link
            href={`${basePath}/neet/course-detail/15`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET 1 Year Course (12th)
          </Link>
          <Link
            href={`${basePath}/neet/course-detail/16`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET 2 Year Course (11th)
          </Link>
          <Link
            href={`${basePath}/neet/course-detail/17`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Foundation Course (9th)
          </Link>
          <Link
            href={`${basePath}/neet/course-detail/34`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Crash Course (12th)
          </Link>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          Course Listing
        </h4>
        <div className="space-y-1">
          <Link
            href={`${basePath}/sat/course-detail/19`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SAT Prep Course (42 Hours)
          </Link>
          <Link
            href={`${basePath}/sat/course-detail/20`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SAT Prep Course (60 Hours)
          </Link>
          <Link
            href={`${basePath}/sat/course-detail/21`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SAT Prep Course (72 Hours)
          </Link>
          <Link
            href={`${basePath}/sat/course-detail/22`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SAT Prep Course (90 Hours)
          </Link>
          <Link
            href={`${basePath}/ib/courses`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            IB MYP Courses
          </Link>
          <Link
            href={`${basePath}/ib/courses`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            IB DP (SL / HL) Courses
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            CBSE Courses
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Custom 1 on 1 Tutoring{" "}
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              New
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export const UtilitiesMobileContent = ({ onClose }) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          Preparation Resources
        </h4>
        <div className="space-y-1">
          <Link
            href={`${basePath}/coaching-inquiry`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Enroll for Coaching
          </Link>
          <Link
            href={`${basePath}/downloads`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Downloads
          </Link>
          <Link
            href={`${basePath}/recent-announcements`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Recent Announcements
          </Link>
          <Link
            href={`${basePath}/explore`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Universities
          </Link>
          <Link
            href={`${basePath}/blog`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Blog
          </Link>
          <Link
            href={`${basePath}/jee/ebook-download`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NRI Quota Admission Guide
          </Link>
          <Link
            href={`${basePath}/answers`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Discussion Forum
          </Link>
          <Link
            href={`${basePath}/online-tutors`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Tutor Profiles
          </Link>
          <Link
            href={`${basePath}/online-preparation`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Online Preparation
          </Link>
          <Link
            href={`${basePath}/prime-videos`}
            onClick={onClose}
            target="_blank"
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Prime Videos
          </Link>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">Media</h4>
        <div className="space-y-1">
          <a
            href="https://www.youtube.com/@TestprepKart"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Youtube Channel
          </a>
          <a
            href="https://www.youtube.com/channel/UCZtlOUF4mt-tjERDZ7AfdTw"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SAT Youtube Channel
          </a>
          <a
            href="https://www.youtube.com/channel/UC5PjPwbLTzLgGXHPL-pG-yQ/about"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Youtube Channel
          </a>
          <Link
            href={`${basePath}/jee/demo-videos`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Demo Videos
          </Link>
          <Link
            href={`${basePath}/jee/mindmap-videos`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Mindmap Videos
          </Link>
          <Link
            href={`${basePath}/faqs`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            FAQs
          </Link>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          Buy Online
        </h4>
        <div className="space-y-1">
          <Link
            href={`${basePath}/trial-session`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Book Analysis Session{" "}
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              Free
            </span>
          </Link>
          <Link
            href={`${basePath}/jee/parent-counseling`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Buy JEE Counseling Package
          </Link>
          <a
            href="https://satlas.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Buy Online Tests
          </a>
          <Link
            href={`${basePath}/jee/dasa-counseling-kit`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            DASA / CIWG Package{" "}
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
              Frequently Bought
            </span>
          </Link>
          <a
            href="https://satlas.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SATLAS
          </a>
          <Link
            href={`${basePath}/fee-payment`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Course Fee Payment
          </Link>
        </div>
      </div>
    </div>
  );
};

export const DownloadsMobileContent = ({ onClose }) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          JEE Downloads
        </h4>
        <div className="space-y-1">
          <Link
            href={`${basePath}/jee/downloads/exam/JEE%20Main%20Paper%201/category/Study%20Material`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Study Material{" "}
            <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
              Hot
            </span>
          </Link>
          <Link
            href={`${basePath}/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20Past%20Year%20Papers`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Past Year Papers
          </Link>
          <Link
            href={`${basePath}/jee/downloads/exam/JEE%20Main%20Paper%201/category/Sample%20Papers`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Sample Papers
          </Link>
          <Link
            href={`${basePath}/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20Revision%20Notes`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Revision Notes
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Mindmaps (Videos){" "}
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              New
            </span>
          </Link>
          <Link
            href={`${basePath}/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20DPP%20%28Daily%20Practice%20Papers%29`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE DPP{" "}
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              New
            </span>
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Popular Books
          </Link>
          <Link
            href={`${basePath}/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20Main%20Brochure%20Download`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Brochure
          </Link>
          <Link
            href={`${basePath}/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20Main%20Cut%20Off%20Rank%20`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            JEE Last Year Cut Off
          </Link>
          <Link
            href={`${basePath}/jee/downloads/exam/JEE%20Main%20Paper%201/category/DASA%20CIWG%20Brochure`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            DASA CIWG Brochure
          </Link>
          <Link
            href={`${basePath}/jee/info/69/170/DASA+%2F+CIWG++Cut-Off+Score+For+NRIs+Engineering+Admission`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            DASA CIWG Cut Off
          </Link>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          NEET Downloads
        </h4>
        <div className="space-y-1">
          <Link
            href={`${basePath}/neet/downloads/exam/NEET/category/Study%20Material`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Study Material{" "}
            <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
              Hot
            </span>
          </Link>
          <Link
            href={`${basePath}/neet/downloads/exam/NEET/category/NEET%20Past%20Year%20Papers`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Past Year Papers
          </Link>
          <Link
            href={`${basePath}/neet/downloads/exam/NEET/category/NEET%20Sample%20Papers`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Sample Papers
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Revision Notes
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Mindmaps (Videos){" "}
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              New
            </span>
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET DPP{" "}
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              New
            </span>
          </Link>
          <Link
            href={`${basePath}/neet/downloads/exam/NEET/category/NEET%20Preparation%20Books`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Popular Books
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Brochure
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            NEET Last Year Cut Off
          </Link>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          SAT & IB Downloads
        </h4>
        <div className="space-y-1">
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SAT Sample Papers
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SAT English Practice Questions
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SAT Math Practice Questions
          </Link>
          <Link
            href="#"
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            SAT Online Test Papers
          </Link>
          <Link
            href={`${basePath}/ib/downloads/exam/IB/category/IB%20Guides%20&%20Syllabus`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            IB Downloads
          </Link>
        </div>
      </div>
      <Link
        href={`${basePath}/contact`}
        onClick={onClose}
        className="block w-full mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md text-center"
      >
        Contact Us →
      </Link>
    </div>
  );
};

export const ContactMobileContent = ({ onClose }) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          Get in Touch
        </h4>
        <div className="space-y-1">
          <Link
            href={`${basePath}/contact`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Contact TestprepKart
          </Link>
          <Link
            href={`${basePath}/class-operations`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Class Operations
          </Link>
          <Link
            href={`${basePath}/admissions-and-sales`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Admission & Sales
          </Link>
          <Link
            href={`${basePath}/about`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            About Us
          </Link>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          Service Locations
        </h4>
        <div className="space-y-1">
          <Link
            href={`${basePath}/coaching-in-usa`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            United States{" "}
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
              Popular
            </span>
          </Link>
          <Link
            href={`${basePath}/coaching-in-uae`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            United Arab Emirates{" "}
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
              Popular
            </span>
          </Link>
          <Link
            href={`${basePath}/coaching-in-oman`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Oman
          </Link>
          <Link
            href={`${basePath}/coaching-in-qatar`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Qatar
          </Link>
          <Link
            href={`${basePath}/coaching-in-saudi-arabia`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Saudi Arabia
          </Link>
          <Link
            href={`${basePath}/coaching-in-kuwait`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Kuwait
          </Link>
          <Link
            href={`${basePath}/coaching-in-singapore`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Singapore
          </Link>
          <Link
            href={`${basePath}/coaching-in-japan`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Japan
          </Link>
          <Link
            href={`${basePath}/coaching-in-europe`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Europe
          </Link>
          <Link
            href={`${basePath}/coaching-in-australia`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Australia
          </Link>
          <Link
            href={`${basePath}/coaching-in-canada`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Canada
          </Link>
          <Link
            href={`${basePath}/coaching-in-united-kingdom`}
            onClick={onClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            United Kingdom
          </Link>
        </div>
      </div>
    </div>
  );
};

