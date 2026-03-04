import React from "react";
import { FaSpinner } from "react-icons/fa";
import { PLACEHOLDERS } from "@/constants";

/**
 * Unified loading animation for the app. Use everywhere for consistent loader UI.
 * - full: main content area (e.g. sidebar navigation, page load)
 * - compact: section loading (e.g. tabs, lists)
 * - minimal: spinner only (e.g. overlays, modals)
 */
export default function ExamAreaLoading({ variant = "full", message }) {
  const isFull = variant === "full";
  const isCompact = variant === "compact";
  const isMinimal = variant === "minimal";

  const spinner = (
    <div className="relative inline-flex items-center justify-center">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full blur-2xl opacity-30 animate-pulse scale-150" />
      {/* Spinner */}
      <div className="relative">
        <FaSpinner
          className={`text-indigo-600 animate-spin ${isMinimal ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl md:text-6xl"}`}
          style={{ animationDuration: "1s" }}
        />
      </div>
    </div>
  );

  if (isMinimal) {
    return (
      <div className="flex items-center justify-center p-6" role="status" aria-live="polite" aria-busy="true">
        {spinner}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${isFull ? "min-h-[500px] sm:min-h-[600px] py-12 sm:py-16" : "py-10 sm:py-12"} ${!isCompact ? "" : "min-h-[200px]"}`}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="text-center">
        <div className={`relative inline-flex items-center justify-center ${isFull ? "mb-4 sm:mb-5" : "mb-4"}`}>
          {spinner}
        </div>
        <p className="text-sm sm:text-base font-semibold text-gray-700">
          {message ?? (PLACEHOLDERS.LOADING || "Loading...")}
        </p>
        {isFull && (
          <p className="text-xs text-gray-400 mt-1.5">Preparing content</p>
        )}
      </div>
    </div>
  );
}
