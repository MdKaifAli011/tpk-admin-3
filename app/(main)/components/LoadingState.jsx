"use client";
import React from "react";
import { FaSpinner } from "react-icons/fa";
import { PLACEHOLDERS } from "@/constants";

/**
 * Inline loading UI only — do not wrap in MainLayout (pages already use MainLayoutClient).
 * Nesting MainLayout here caused duplicate navbar/sidebar/footer mid-page and below the real footer.
 */
const LoadingState = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4" role="status" aria-live="polite">
      <FaSpinner className="text-indigo-600 text-3xl sm:text-4xl animate-spin mb-4" aria-hidden />
      <p className="text-sm sm:text-base font-medium text-gray-600 text-center">
        {message || PLACEHOLDERS?.LOADING || "Loading..."}
      </p>
    </div>
  );
};

export default LoadingState;
