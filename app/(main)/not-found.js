"use client";
import React from "react";
import Link from "next/link";
import { FaHome, FaArrowLeft, FaExclamationTriangle } from "react-icons/fa";

const NotFound = () => {
  return (
    <div className="flex items-center justify-center min-h-[520px] sm:min-h-[600px] px-4 py-10">
      <div className="w-full max-w-xl text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-2xl animate-pulse" />
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
              <FaExclamationTriangle className="text-white text-xl sm:text-2xl" />
            </div>
          </div>
        </div>

        {/* 404 */}
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
            404
          </span>
        </h1>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
          Page not found
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-md mx-auto">
          The page you’re trying to access doesn’t exist or has been moved.
          <span className="block mt-1 font-medium text-indigo-600">
            Let’s get you back to learning.
          </span>
        </p>

        {/* Actions */}
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-md hover:opacity-95 transition"
          >
            <FaHome size={14} />
            Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 rounded-lg border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition"
          >
            <FaArrowLeft size={14} />
            Go Back
          </button>
        </div>

        {/* Links */}
        <div className="mt-8 pt-5 border-t border-gray-200">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
            Popular Sections
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
            <Link href="/jee" className="text-indigo-600 hover:underline">
              JEE
            </Link>
            <Link href="/neet" className="text-indigo-600 hover:underline">
              NEET
            </Link>
            <Link href="/sat" className="text-indigo-600 hover:underline">
              SAT
            </Link>
            <Link href="/ib" className="text-indigo-600 hover:underline">
              IB
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
