"use client";
import Link from "next/link";
import Image from "next/image";

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
                  href="https://www.testprepkart.com/coaching-inquiry"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Enroll for Coaching
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/downloads"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Downloads
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/recent-announcements"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Recent Announcements
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/explore"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Universities
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/blog"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/ebook-download"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NRI Quota Admission Guide
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/answers"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Discussion Forum
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/online-tutors"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Tutor Profiles
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/online-preparation"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Online Preparation
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/prime-videos"
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
                  href="https://www.youtube.com/@Testprepkart"
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
                  href="https://www.testprepkart.com/jee/demo-videos"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Demo Videos
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/mindmap-videos"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Mindmap Videos
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/faqs"
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
                  href="https://www.testprepkart.com/trial-session"
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
                  href="https://www.testprepkart.com/jee/parent-counseling"
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
                  href="https://www.testprepkart.com/jee/dasa-counseling-kit"
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
                  href="https://www.testprepkart.com/fee-payment"
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
            <div className="space-y-2">
              {/* Check Exam Preparedness */}
              <div className="relative bg-gray-100 rounded-t-lg overflow-hidden hover:bg-gray-200 transition-colors group cursor-pointer">
                <div className="flex items-center justify-between p-4">
                  <Link
                    href="https://www.testprepkart.com/trial-session"
                    onClick={onClose}
                    className="text-sm font-bold text-gray-900 flex items-center gap-2 z-10 relative"
                  >
                    <span>Check Exam Preparedness</span>
                    <span className="text-gray-900">→</span>
                  </Link>
                  <div className="absolute right-0 top-0 bottom-0 w-32 opacity-60 group-hover:opacity-80 transition-opacity">
                    <Image
                      src="https://www.testprepkart.com/public/assets/images/tpk_home_page/tpk%20menu%20image%201.png"
                      alt="Exam Preparedness"
                      width={128}
                      height={80}
                      className="w-full h-full object-cover object-right"
                    />
                  </div>
                </div>
              </div>

              {/* Watch Us On Youtube */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors group cursor-pointer">
                <div className="flex items-center justify-between p-4">
                  <a
                    href="https://www.youtube.com/@Testprepkart"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className="text-sm font-bold text-gray-900 flex items-center gap-2 z-10 relative"
                  >
                    <span>Watch Us On Youtube</span>
                    <span className="text-gray-900">→</span>
                  </a>
                  <div className="absolute right-0 top-0 bottom-0 w-32 opacity-60 group-hover:opacity-80 transition-opacity">
                    <Image
                      src="https://www.testprepkart.com/public/assets/images/tpk_home_page/tpk%20menu%20image%202.png"
                      alt="Watch Us On Youtube"
                      width={128}
                      height={80}
                      className="w-full h-full object-cover object-right"
                    />
                  </div>
                </div>
              </div>

              {/* University Status */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors group cursor-pointer">
                <div className="flex items-center justify-between p-4">
                  <Link
                    href="#"
                    onClick={onClose}
                    className="text-sm font-bold text-gray-900 flex items-center gap-2 z-10 relative"
                  >
                    <span>University Status</span>
                    <span className="text-gray-900">→</span>
                  </Link>
                  <div className="absolute right-0 top-0 bottom-0 w-32 opacity-60 group-hover:opacity-80 transition-opacity">
                    <Image
                      src="https://www.testprepkart.com/public/assets/images/tpk_home_page/tpk%20menu%20image%203.png"
                      alt="University Status"
                      width={128}
                      height={80}
                      className="w-full h-full object-cover object-right"
                    />
                  </div>
                </div>
              </div>

             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilitiesMegaMenu;

