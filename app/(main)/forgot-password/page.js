"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";
import Image from "next/image";
import api from "../../../lib/api.js";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import { SearchProvider } from "../layout/context/SearchContext";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const redirect = searchParams.get("redirect") || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await api.post("/student/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      if (response.data?.success) {
        setSuccess(true);
      } else {
        setError(response.data?.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SearchProvider>
      <>
        <Navbar onMenuToggle={() => {}} isMenuOpen={false} showSidebar={false} />
        <div className="min-h-screen pt-24 sm:pt-28 md:pt-32 bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex flex-col relative overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center p-4 relative">
            {/* Background Dots */}
            <div className="absolute inset-0 bg-grid-gray-200/40 bg-[size:22px_22px] pointer-events-none"></div>

            {/* Soft glow lights */}
            <div className="absolute top-20 left-10 w-60 h-60 bg-indigo-300 blur-3xl opacity-30 rounded-full"></div>
            <div className="absolute bottom-16 right-10 w-60 h-60 bg-purple-300 blur-3xl opacity-30 rounded-full"></div>

            <div className="w-full max-w-5xl relative z-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              {/* LEFT SECTION – Illustration + Text (same as login) */}
              <div className="hidden md:flex flex-col items-start px-6">
                <Image
                  src={`${basePath}/images/login.png`}
                  alt="Learning Illustration"
                  width={420}
                  height={420}
                  className="drop-shadow-xl mx-auto"
                />
                <h2 className="text-3xl font-bold text-gray-900 mt-6 leading-tight">
                  Unlock Your Learning
                  <span className="text-indigo-600"> Potential</span>
                </h2>
                <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                  Access lectures, practice tests, videos, and personalized study
                  material — all in one smart learning platform.
                </p>
              </div>

              {/* RIGHT SECTION – Main Card (same style as login) */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-7 border border-white/40 w-full max-w-md mx-auto">
                <div className="text-center mb-6">
                  <h1 id="forgot-password-title" className="text-3xl font-bold mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Forgot Password?
                  </h1>
                  <p className="text-gray-600 text-sm font-medium">
                    No problem. Enter your email and we’ll send you a reset link.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-xs text-red-700 animate-[shake_0.3s_ease-in-out]">
                    ⚠️ {error}
                  </div>
                )}

                {success ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                      If an account exists with this email, you will receive a password reset link shortly. Please check your inbox and spam folder. The link is valid for 1 hour.
                    </div>
                    <Link
                      href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline"
                    >
                      <FaArrowLeft /> Back to sign in
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="forgot-email" className="text-xs font-semibold text-gray-700">
                        Email Address
                      </label>
                      <div className="relative mt-1">
                        <FaEnvelope
                          className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${
                            focusedField === "email" || email ? "text-indigo-600" : "text-gray-400"
                          }`}
                          aria-hidden
                        />
                        <input
                          id="forgot-email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError(null);
                          }}
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField(null)}
                          required
                          autoComplete="email"
                          placeholder="your.email@example.com"
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-bold shadow-lg hover:shadow-xl transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                          Sending...
                        </div>
                      ) : (
                        "Send reset link"
                      )}
                    </button>
                  </form>
                )}

                {/* Divider (same as login) */}
                <div className="my-5">
                  <div className="flex items-center">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs px-3 text-gray-500">Remember your password?</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>
                </div>

                <div className="text-center">
                  <Link
                    href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    <FaArrowLeft className="inline mr-1 text-sm" /> Back to sign in
                  </Link>
                </div>

                <p className="text-center text-[11px] text-gray-500 mt-4">
                  By continuing, you agree to our{" "}
                  <span className="text-indigo-600">Terms</span> &{" "}
                  <span className="text-indigo-600">Privacy Policy</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    </SearchProvider>
  );
}
