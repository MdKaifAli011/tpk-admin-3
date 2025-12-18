"use client";
import Link from "next/link";

const UtilitiesMegaMenu = ({ onClose }) => {
  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-[90vw] max-w-6xl bg-white rounded-lg shadow-2xl border border-gray-200 py-6 z-50">
      <div className="px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Preparation Resources */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Preparation Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/coaching-inquiry"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Enroll for Coaching
                </Link>
              </li>
              <li>
                <Link
                  href="/downloads"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Downloads
                </Link>
              </li>
              <li>
                <Link
                  href="/recent-announcements"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Recent Announcements
                </Link>
              </li>
              <li>
                <Link
                  href="/explore"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Universities
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/jee/ebook-download"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NRI Quota Admission Guide
                </Link>
              </li>
              <li>
                <Link
                  href="/answers"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Discussion Forum
                </Link>
              </li>
              <li>
                <Link
                  href="/online-tutors"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Tutor Profiles
                </Link>
              </li>
              <li>
                <Link
                  href="/online-preparation"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Online Preparation
                </Link>
              </li>
              <li>
                <Link
                  href="/prime-videos"
                  onClick={onClose}
                  target="_blank"
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Prime Videos
                </Link>
              </li>
            </ul>
          </div>

          {/* Media */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Media</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.youtube.com/@TestprepKart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Youtube Channel
                </a>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/channel/UCZtlOUF4mt-tjERDZ7AfdTw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SAT Youtube Channel
                </a>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/channel/UC5PjPwbLTzLgGXHPL-pG-yQ/about"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Youtube Channel
                </a>
              </li>
              <li>
                <Link
                  href="/jee/demo-videos"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Demo Videos
                </Link>
              </li>
              <li>
                <Link
                  href="/jee/mindmap-videos"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Mindmap Videos
                </Link>
              </li>
              <li>
                <Link
                  href="/faqs"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Buy Online */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Buy Online
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/trial-session"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Book Analysis Session{" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    Free
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/jee/parent-counseling"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Buy JEE Counseling Package
                </Link>
              </li>
              <li>
                <a
                  href="https://satlas.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Buy Online Tests
                </a>
              </li>
              <li>
                <Link
                  href="/jee/dasa-counseling-kit"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  DASA / CIWG Package{" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    Frequently Bought
                  </span>
                </Link>
              </li>
              <li>
                <a
                  href="https://satlas.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SATLAS
                </a>
              </li>
              <li>
                <Link
                  href="/fee-payment"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Course Fee Payment
                </Link>
              </li>
            </ul>
          </div>

          {/* Category Items */}
          <div>
            <div className="space-y-3">
              <div className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors">
                <div className="w-full h-24 bg-gray-100 rounded mb-2"></div>
                <Link
                  href="/trial-session"
                  onClick={onClose}
                  className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors flex items-center justify-between"
                >
                  <span>Check Exam Preparedness</span>
                  <span>→</span>
                </Link>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors">
                <div className="w-full h-24 bg-gray-100 rounded mb-2"></div>
                <a
                  href="https://www.youtube.com/@TestprepKart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors flex items-center justify-between"
                >
                  <span>Watch Us On Youtube</span>
                  <span>→</span>
                </a>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors">
                <div className="w-full h-24 bg-gray-100 rounded mb-2"></div>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors flex items-center justify-between"
                >
                  <span>University Status</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilitiesMegaMenu;

