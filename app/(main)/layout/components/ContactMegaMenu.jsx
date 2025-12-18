"use client";
import Link from "next/link";

const ContactMegaMenu = ({ onClose }) => {
  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-[90vw] max-w-5xl bg-white rounded-lg shadow-2xl border border-gray-200 py-6 z-50">
      <div className="px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Get in Touch */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Get in Touch
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contact"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Contact TestprepKart
                </Link>
              </li>
              <li>
                <Link
                  href="/class-operations"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Class Operations
                </Link>
              </li>
              <li>
                <Link
                  href="/admissions-and-sales"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Admission & Sales
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Service Locations */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Service Locations
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/coaching-in-usa"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  United States{" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    Popular
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-uae"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  United Arab Emirates{" "}
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    Popular
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-oman"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Oman
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-qatar"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Qatar
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-saudi-arabia"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Saudi Arabia
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-kuwait"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Kuwait
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-singapore"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Singapore
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-japan"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Japan
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-europe"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Europe
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-australia"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Australia
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-canada"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  Canada
                </Link>
              </li>
              <li>
                <Link
                  href="/coaching-in-united-kingdom"
                  onClick={onClose}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors block py-1"
                >
                  United Kingdom
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactMegaMenu;

