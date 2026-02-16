"use client";

import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

const CongratulationsModal = ({ isOpen, onClose, chapterName, unitName, subjectName, type = "chapter" }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => setShowConfetti(true), 100);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "unset";
      setShowConfetti(false);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const title =
    type === "chapter" && chapterName
      ? chapterName
      : type === "unit" && unitName
        ? unitName
        : type === "subject" && subjectName
          ? subjectName
          : "Done!";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-sm rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 z-10"
          aria-label="Close"
        >
          <FaTimes className="w-4 h-4" />
        </button>

        <div className="px-5 pt-5 pb-4">
          {/* Icon */}
          <div className="relative flex justify-center mb-4">
            <div className="relative">
              {showConfetti && (
                <>
                  <span className="absolute -top-0.5 -left-1 text-amber-400 text-sm animate-bounce">✨</span>
                  <span className="absolute -top-0.5 -right-1 text-amber-400 text-sm animate-bounce" style={{ animationDelay: "0.15s" }}>✨</span>
                  <span className="absolute -bottom-0.5 -left-1 text-blue-400 text-sm animate-bounce" style={{ animationDelay: "0.3s" }}>✨</span>
                  <span className="absolute -bottom-0.5 -right-1 text-blue-400 text-sm animate-bounce" style={{ animationDelay: "0.45s" }}>✨</span>
                </>
              )}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-200/50">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Text */}
          <h2 className="text-center text-lg font-bold text-slate-800 mb-0.5">
            Congratulations
          </h2>
          <p className="text-center text-sm text-slate-600 mb-4">
            <span className="font-semibold text-blue-600">{title}</span> completed
          </p>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default CongratulationsModal;
