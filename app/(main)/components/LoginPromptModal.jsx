"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaTimes,
  FaLock,
  FaUser,
  FaCheckCircle,
  FaChartLine,
  FaTrophy,
} from "react-icons/fa";

const LoginPromptModal = ({ isOpen, onClose, examName }) => {
  const router = useRouter();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      setAnimate(false);
      return;
    }
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => setAnimate(true), 80);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const redirect = (path) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "redirectAfterLogin",
        window.location.pathname + window.location.search
      );
    }
    router.push(path);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm sm:max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-7 md:p-8 animate-fadeScale"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <FaTimes size={16} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
              <FaLock className="text-white text-xl sm:text-2xl" />
            </div>
            {animate && (
              <span className="absolute inset-0 rounded-full animate-ping bg-indigo-400/20" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold text-center text-gray-900">
          Login Required
        </h2>

        {/* Description */}
        <p className="mt-2 text-sm sm:text-base text-gray-600 text-center leading-relaxed">
          {examName ? (
            <>
              Login to track your progress for{" "}
              <span className="font-semibold text-indigo-600">
                {examName} Preparation
              </span>
              .
            </>
          ) : (
            "Login to track your learning progress."
          )}
        </p>

        {/* Benefits */}
        <div className="mt-5 space-y-3">
          <Feature
            icon={<FaChartLine />}
            title="Track Progress"
            desc="Monitor learning status"
            color="blue"
          />
          <Feature
            icon={<FaTrophy />}
            title="Save Achievements"
            desc="Your success stays safe"
            color="emerald"
          />
          <Feature
            icon={<FaCheckCircle />}
            title="Personalized Content"
            desc="Tailored learning paths"
            color="purple"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => redirect("/register")}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-semibold py-2.5 rounded-lg shadow-lg hover:opacity-95 transition"
          >
            <FaUser />
            Create Account
          </button>

          <button
            onClick={() => redirect("/login")}
            className="flex items-center justify-center gap-2 border border-indigo-600 text-indigo-600 font-semibold py-2.5 rounded-lg hover:bg-indigo-50 transition"
          >
            <FaLock />
            Login
          </button>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Maybe later
        </button>
      </div>

      <style jsx>{`
        .animate-fadeScale {
          animation: fadeScale 0.35s ease-out;
        }
        @keyframes fadeScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

/* Reusable Feature Row */
const Feature = ({ icon, title, desc, color }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center ${colors[color]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
};

export default LoginPromptModal;
