"use client";

import React from "react";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";
import { ERROR_MESSAGES } from "@/constants";

export default function Error({ error, reset }) {
  return (
    <div className="flex items-center justify-center min-h-[500px] sm:min-h-[600px] py-12 sm:py-16 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white border border-red-200 rounded-xl shadow-lg p-6 sm:p-8 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-4 sm:mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-red-400/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <FaExclamationTriangle className="text-white text-xl sm:text-2xl" />
              </div>
            </div>
          </div>

          {/* Error Title */}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
            Something went wrong!
          </h2>

          {/* Error Message */}
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
            {error?.message ||
              ERROR_MESSAGES.EXAM_NOT_FOUND ||
              "An unexpected error occurred. Please try again."}
          </p>

          {/* Retry Button */}
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <FaRedo className="text-xs sm:text-sm" />
            <span>Try again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
