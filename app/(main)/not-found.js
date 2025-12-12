"use client";
import React from "react";
import Link from "next/link";
import {
  FaHome,
  FaArrowLeft,
  FaSearch,
  FaExclamationTriangle,
} from "react-icons/fa";


const NotFound = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">


      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar placeholder for layout consistency */}
        <div className="hidden lg:block w-64 bg-gray-50 border-r border-gray-200"></div>

        {/* 404 Content */}
        <main className="flex-1 flex items-center justify-center p-6 bg-white">
          <div className="max-w-2xl mx-auto text-center">
            {/* 404 Icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full blur-3xl opacity-30"></div>
                <div className="relative bg-gradient-to-r from-purple-500 to-blue-600 rounded-full p-8">
                  <FaExclamationTriangle className="text-6xl text-white" />
                </div>
              </div>
            </div>

            {/* Error Code */}
            <h1 className="text-8xl sm:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 mb-4">
              404
            </h1>

            {/* Error Message */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h2>

            <p className="text-base sm:text-lg text-gray-600 mb-8 leading-relaxed">
              Oops! The page you're looking for doesn't exist or has been moved.
              Let's get you back on track with your exam preparation journey.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/"
                className="flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FaHome className="text-sm" />
                <span>Go to Homepage</span>
              </Link>

              <button
                onClick={() => window.history.back()}
                className="flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-semibold bg-white text-gray-700 rounded-lg border-2 border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-md hover:shadow-lg"
              >
                <FaArrowLeft className="text-sm" />
                <span>Go Back</span>
              </button>
            </div>

            {/* Quick Links */}
            <div className="border-t border-gray-200 pt-8">
              <p className="text-xs sm:text-sm text-gray-500 mb-4 font-medium">
                Popular Pages:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/jee"
                  className="text-sm sm:text-base text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  JEE Preparation
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/neet"
                  className="text-sm sm:text-base text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  NEET Preparation
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/sat"
                  className="text-sm sm:text-base text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  SAT Preparation
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/ib"
                  className="text-sm sm:text-base text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  IB Preparation
                </Link>
              </div>
            </div>

            {/* Search Suggestion */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600 mb-2">
                Can't find what you're looking for?
              </p>
              <button className="flex items-center gap-2 text-sm sm:text-base text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                <FaSearch className="text-xs" />
                <span>Try searching instead</span>
              </button>
            </div>
          </div>
        </main>
      </div>

  
    </div>
  );
};

export default NotFound;
