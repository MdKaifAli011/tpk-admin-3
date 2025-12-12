"use client";
import { useEffect } from "react";
import { FaExclamationTriangle, FaHome, FaRedo } from "react-icons/fa";
import Link from "next/link";
import { ERROR_MESSAGES } from "@/constants";
import { logger } from "@/utils/logger";

export default function Error({ error, reset }) {
  useEffect(() => {
    logger.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <FaExclamationTriangle className="text-red-600 text-4xl" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4 leading-relaxed">
            {error?.message || ERROR_MESSAGES.SOMETHING_WENT_WRONG}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <FaRedo className="text-sm" />
            Try Again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-gray-700 rounded-lg border-2 border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-md hover:shadow-lg"
          >
            <FaHome className="text-sm" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
