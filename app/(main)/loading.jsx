import React from "react";
import { FaSpinner } from "react-icons/fa";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6">
          <FaSpinner className="text-indigo-600 text-4xl sm:text-5xl animate-spin" />
        </div>
        <p className="text-sm sm:text-base font-medium text-gray-600">Loading...</p>
      </div>
    </div>
  );
}


