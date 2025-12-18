"use client";
import Link from "next/link";

const DownloadsMegaMenu = ({ onClose }) => {
  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-[90vw] max-w-5xl bg-white rounded-lg shadow-2xl border border-gray-200 py-6 z-50">
      <div className="px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* JEE Downloads */}
          <div>
            <ul className="space-y-2">
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/downloads/exam/JEE%20Main%20Paper%201/category/Study%20Material"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Study Material{" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                    Hot
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20Past%20Year%20Papers"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Past Year Papers
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/downloads/exam/JEE%20Main%20Paper%201/category/Sample%20Papers"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Sample Papers
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20Revision%20Notes"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Revision Notes
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Mindmaps (Videos){" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    New
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20DPP%20%28Daily%20Practice%20Papers%29"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE DPP{" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    New
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Popular Books
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20Main%20Brochure%20Download"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Brochure
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/downloads/exam/JEE%20Main%20Paper%201/category/JEE%20Main%20Cut%20Off%20Rank%20"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  JEE Last Year Cut Off
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/downloads/exam/JEE%20Main%20Paper%201/category/DASA%20CIWG%20Brochure"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  DASA CIWG Brochure
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/info/69/170/DASA+%2F+CIWG++Cut-Off+Score+For+NRIs+Engineering+Admission"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  DASA CIWG Cut Off
                </Link>
              </li>
            </ul>
          </div>

          {/* NEET Downloads */}
          <div>
            <ul className="space-y-2">
              <li>
                <Link
                  href="https://www.testprepkart.com/neet/downloads/exam/NEET/category/Study%20Material"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Study Material{" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                    Hot
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/neet/downloads/exam/NEET/category/NEET%20Past%20Year%20Papers"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Past Year Papers
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/neet/downloads/exam/NEET/category/NEET%20Sample%20Papers"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Sample Papers
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Revision Notes
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Mindmaps (Videos){" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    New
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET DPP{" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    New
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/neet/downloads/exam/NEET/category/NEET%20Preparation%20Books"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Popular Books
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Brochure
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  NEET Last Year Cut Off
                </Link>
              </li>
            </ul>
          </div>

          {/* SAT & IB Downloads */}
          <div>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SAT Sample Papers
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SAT English Practice Questions
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SAT Math Practice Questions
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  SAT Online Test Papers
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/ib/downloads/exam/IB/category/IB%20Guides%20&%20Syllabus"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  IB Downloads
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <Link
            href="https://www.testprepkart.com/contact"
            onClick={onClose}
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <span>Contact Us</span>
            <span className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DownloadsMegaMenu;

