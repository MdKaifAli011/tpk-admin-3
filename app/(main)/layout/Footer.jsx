"use client";
import React from "react";
import Link from "next/link";
import {
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaLinkedin,
  FaYoutube,
  FaArrowRight,
  FaPhone,
  FaWhatsapp,
  FaEnvelope,
  FaBuilding,
} from "react-icons/fa";
import Image from "next/image";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const Footer = () => {
  const usefulLinks = [
    "Connect With Counselor",
    "University Admissions",
    "Prime Videos",
    "Enrollment Form",
    "Online Fee Payment",
    "Testprepkart Operations",
    "Faculty Registration",
    "Downloads",
  ];

  const companyLinks = [
    "Contact Us",
    "Work With Us",
    "Blogs",
    "Facultie",
    "Partner",
  ];

  return (
    <footer className="bg-gray-50 z-50 relative">
      {/* Upper Section - Four Columns */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {/* Column 1: Brand and CTA */}
          <div className="space-y-4">
            {/* Logo */}
            <Link href="https://www.testprepkart.com">
              <Image
                src={`${basePath}/logo.png`}
                  alt="Testprepkart Logo"
                width={150}
                height={150}
                className="w-24 sm:w-28 md:w-32 lg:w-36 h-auto"
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
              />
            </Link>
            {/* Description */}
            <p className="text-gray-500 text-sm leading-relaxed">
              Enabling students prepare and crack toughest examinations
              worldwide for over a decade with problem solving aptitude!
            </p>

            {/* CTA Button */}
            <Link
              href="https://www.testprepkart.com/contact"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
            >
              <span>Contact Us</span>
              <FaArrowRight className="text-sm" />
            </Link>
          </div>

          {/* Column 2: Useful Links */}
          <div>
            <h3 className="text-gray-900 font-bold text-base mb-4">
              Useful Links
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="https://www.testprepkart.com/jee/parent_counseling"
                  className="text-gray-500 text-sm hover:text-blue-600 transition-colors"
                >
                  Connect With Counselor
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/explore/"
                  className="text-gray-500 text-sm hover:text-blue-600 transition-colors"
                >
                  University Admissions
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/prime-videos"
                  className="text-gray-500 text-sm hover:text-blue-600 transition-colors"
                >
                  Prime Videos
                </Link>
              </li>
              <li>
                <Link
                  href="https://testprepkart-operations.com/enrollment-form.php"
                  className="text-gray-500 text-sm hover:text-blue-600 transition-colors"
                >
                  Enrollment Form
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.testprepkart.com/fee-payment"
                  className="text-gray-500 text-sm hover:text-blue-600 transition-colors"
                >
                  Online Fee Payment
                </Link>
              </li>
              <li>
                <Link
                  href="https://testprepkart-operations.com/"
                  className="text-gray-500 text-sm hover:text-blue-600 transition-colors"
                >
                  Testprepkart Operations
                </Link>
              </li>
              <li>
                <Link
                  href="https://testprepkart-operations.com/faculty_registration.php"
                  className="text-gray-500 text-sm hover:text-blue-600 transition-colors"
                >
                  Faculty Registration
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Our Company */}
          <div>
            <h3 className="text-gray-900 font-bold text-base mb-4">
              Our Company
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={`https://www.testprepkart.com/${link.toLowerCase().replace(/ /g, '-')}`}
                    className="text-gray-500 text-sm hover:text-blue-600 transition-colors"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Details */}
          <div>
            <h3 className="text-gray-900 font-bold text-base mb-4">
              Contact Details
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-gray-500 text-sm">
                <FaPhone className="text-gray-400 mt-0.5 shrink-0 text-sm" />
                <span>Phone: +91 0120 4525484</span>
              </li>
              <li className="flex items-start gap-2 text-gray-500 text-sm">
                <FaWhatsapp className="text-gray-400 mt-0.5 shrink-0 text-sm" />
                <span>Whatsapp: +1 (510) 706-9331</span>
              </li>
              <li className="flex items-start gap-2 text-gray-500 text-sm">
                <FaPhone className="text-gray-400 mt-0.5 shrink-0 text-sm" />
                <span>Admission: +91 8800123492</span>
              </li>
              <li className="flex items-start gap-2 text-gray-500 text-sm">
                <FaEnvelope className="text-gray-400 mt-0.5 shrink-0 text-sm" />
                <span>E-mail: contact@rayofhopebihar.org</span>
              </li>
              <li className="flex items-start gap-2 text-gray-500 text-sm">
                <FaBuilding className="text-gray-400 mt-0.5 shrink-0 text-sm" />
                <span>
                  Head Office: F 377, Sector 63, Noida, Uttar Pradesh, India
                </span>
              </li>
            </ul>

            {/* Social Media Icons */}
            <div className="flex items-center gap-3 mt-6">
              <FaYoutube className="text-gray-400 text-lg cursor-pointer hover:text-red-600 transition-colors" />
              <FaFacebook className="text-gray-400 text-lg cursor-pointer hover:text-blue-600 transition-colors" />
              <FaTwitter className="text-gray-400 text-lg cursor-pointer hover:text-blue-400 transition-colors" />
              <FaInstagram className="text-gray-400 text-lg cursor-pointer hover:text-pink-600 transition-colors" />
              <FaLinkedin className="text-gray-400 text-lg cursor-pointer hover:text-blue-700 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Copyright and Legal Links */}
      <div className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            {/* Copyright */}
            <p className="text-center md:text-left">
              Copyright © 2024 CounselKart Educational Services Pvt. Ltd.. All
              Rights Reserved
            </p>

            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
              <Link href="https://www.testprepkart.com/policies/terms-and-conditions" className="hover:text-blue-600 transition-colors">
                Terms of service
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="https://www.testprepkart.com/policies/privacy-policy" className="hover:text-blue-600 transition-colors">
                Privacy policy
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="https://www.testprepkart.com/policies/refund-policy" className="hover:text-blue-600 transition-colors">
                Refund Policy
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="https://www.testprepkart.com/register" className="hover:text-blue-600 transition-colors">
                Login & Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
