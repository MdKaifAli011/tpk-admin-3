import React from "react";
import { FaSpinner } from "react-icons/fa";
import { PLACEHOLDERS } from "@/constants";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[500px] sm:min-h-[600px] py-12 sm:py-16">
      <div className="text-center">
        {/* Spinner with gradient and glow effect */}
        <div className="relative inline-flex items-center justify-center mb-4 sm:mb-5">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full blur-2xl opacity-30 animate-pulse" />
          {/* Spinner */}
          <div className="relative">
            <FaSpinner
              className="text-indigo-600 text-4xl sm:text-5xl md:text-6xl animate-spin"
              style={{ animationDuration: "1s" }}
            />
          </div>
        </div>
        {/* Loading text */}
        <p className="text-sm sm:text-base font-semibold text-gray-700">
          {PLACEHOLDERS.LOADING || "Loading..."}
        </p>
      </div>
    </div>
  );
}
