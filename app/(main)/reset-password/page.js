"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaLock, FaEye, FaEyeSlash, FaCheck, FaArrowLeft } from "react-icons/fa";
import Image from "next/image";
import api from "../../../lib/api.js";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import { SearchProvider } from "../layout/context/SearchContext";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const redirect = searchParams.get("redirect") || "";

  useEffect(() => {
    if (!token && typeof window !== "undefined") {
      setError("Invalid reset link. Please request a new password reset from the forgot password page.");
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Please use the link from your email.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/student/auth/reset-password", {
        token: token.trim(),
        newPassword: formData.newPassword,
      });
      if (response.data?.success) {
        setSuccess(true);
      } else {
        setError(response.data?.message || "Failed to reset password. The link may have expired.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to reset password. The link may have expired. Please request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token && !error) {
    return null;
  }

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
              {/* LEFT SECTION – Illustration + Text (same as login / forgot) */}
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
                  <h1 id="reset-password-title" className="text-3xl font-bold mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Reset Password
                  </h1>
                  <p className="text-gray-600 text-sm font-medium">
                    Enter your new password below.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-xs text-red-700 animate-[shake_0.3s_ease-in-out]">
                    ⚠️ {error}
                  </div>
                )}

                {success ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-start gap-2">
                      <FaCheck className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
                      <span>Your password has been reset. You can now sign in with your new password.</span>
                    </div>
                    <Link
                      href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
                      className="inline-flex items-center justify-center w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-bold shadow-lg hover:shadow-xl transition transform hover:scale-[1.02] active:scale-95"
                    >
                      Sign in
                    </Link>
                  </div>
                ) : token ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="new-password" className="text-xs font-semibold text-gray-700">
                        New password
                      </label>
                      <div className="relative mt-1">
                        <FaLock
                          className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${
                            focusedField === "newPassword" || formData.newPassword ? "text-indigo-600" : "text-gray-400"
                          }`}
                          aria-hidden
                        />
                        <input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleChange}
                          onFocus={() => setFocusedField("newPassword")}
                          onBlur={() => setFocusedField(null)}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          placeholder="At least 6 characters"
                          className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-indigo-600"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="confirm-password" className="text-xs font-semibold text-gray-700">
                        Confirm password
                      </label>
                      <div className="relative mt-1">
                        <FaLock
                          className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${
                            focusedField === "confirmPassword" || formData.confirmPassword ? "text-indigo-600" : "text-gray-400"
                          }`}
                          aria-hidden
                        />
                        <input
                          id="confirm-password"
                          type={showPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          onFocus={() => setFocusedField("confirmPassword")}
                          onBlur={() => setFocusedField(null)}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          placeholder="Re-enter your new password"
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
                          Resetting...
                        </div>
                      ) : (
                        "Reset password"
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Invalid reset link. Please request a new password reset.</p>
                    <Link
                      href={redirect ? `/forgot-password?redirect=${encodeURIComponent(redirect)}` : "/forgot-password"}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline"
                    >
                      Request a new reset link
                    </Link>
                  </div>
                )}

                {/* Divider (same as login) */}
                <div className="my-5">
                  <div className="flex items-center">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs px-3 text-gray-500">Back to sign in</span>
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
