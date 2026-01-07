"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaArrowRight,
} from "react-icons/fa";
import Image from "next/image";
import api from "../../../lib/api.js";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";

// Base path - used for public asset URLs (Next.js applies basePath automatically for navigation)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const LoginPage = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/student/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      if (response.data.success) {
        // Store token
        if (typeof window !== "undefined") {
          localStorage.setItem("student_token", response.data.data.token);
        }

        // Verify token immediately to ensure student exists in database
        try {
          const verifyResponse = await api.get("/student/auth/verify", {
            headers: {
              Authorization: `Bearer ${response.data.data.token}`,
            },
          });

          if (
            verifyResponse.data.success &&
            verifyResponse.data.data?.student
          ) {
            // Student verified, proceed to home page
            router.push("/");
          } else {
            // Student not found or inactive
            setError(
              "Account not found or inactive. Please contact administrator."
            );
            localStorage.removeItem("student_token");
            setLoading(false);
          }
        } catch (verifyError) {
          // Token verification failed
          setError("Failed to verify account. Please try again.");
          localStorage.removeItem("student_token");
          setLoading(false);
        }
      } else {
        // Show error message, no redirect
        setError(response.data.message || "Login failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      // Handle all errors - show message, no redirect
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Invalid email or password. Please check your credentials and try again.";

      setError(errorMessage);
      setLoading(false);

      // Ensure no redirect happens on error
      // Clear any potential redirect attempts
      if (typeof window !== "undefined") {
        // Don't redirect, just show error
      }
    }
  };

  return (
    <>
      <Navbar onMenuToggle={() => {}} isMenuOpen={false} />
      <div className="min-h-screen pt-24 sm:pt-28 md:pt-32 bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex flex-col relative overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          {/* Background Dots */}
          <div className="absolute inset-0 bg-grid-gray-200/40 bg-[size:22px_22px] pointer-events-none"></div>

          {/* Soft glow lights */}
          <div className="absolute top-20 left-10 w-60 h-60 bg-indigo-300 blur-3xl opacity-30 rounded-full"></div>
          <div className="absolute bottom-16 right-10 w-60 h-60 bg-purple-300 blur-3xl opacity-30 rounded-full"></div>

          <div className="w-full max-w-5xl relative z-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* LEFT SECTION – Illustration + Text */}
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

            {/* RIGHT SECTION – Main Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-7 border border-white/40 w-full max-w-md mx-auto">
              {/* Logo */}
              <div className="text-center mb-6">

                <h1 className="text-3xl font-bold mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome Back
                </h1>
                <p className="text-gray-600 text-sm font-medium">
                  Continue your learning journey
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-xs text-red-700 animate-[shake_0.3s_ease-in-out]">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Email Address
                  </label>

                  <div className="relative mt-1">
                    <FaEnvelope
                      className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${
                        focusedField === "email" || formData.email
                          ? "text-indigo-600"
                          : "text-gray-400"
                        }`}
                    />

                    <input
                      type="email"
                      name="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Password
                  </label>

                  <div className="relative mt-1">
                    <FaLock
                      className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${
                        focusedField === "password" || formData.password
                          ? "text-indigo-600"
                          : "text-gray-400"
                        }`}
                    />

                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600"
                    >
                      {showPassword ? (
                        <FaEyeSlash className="text-xs" />
                      ) : (
                        <FaEye className="text-xs" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot */}
                <div className="flex justify-end -mt-2">
                  <Link
                    href="#"
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-bold shadow-lg hover:shadow-xl transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                      Signing In...
                    </div>
                  ) : (
                    <>
                      Sign In <FaArrowRight className="text-xs" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-5">
                <div className="flex items-center">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="text-xs px-3 text-gray-500">New here?</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>
              </div>

              {/* Register */}
              <div className="text-center">
                <Link
                  href="/register"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <FaUser className="inline mr-1 text-sm" /> Create an Account
                </Link>
              </div>

              {/* Terms */}
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
  );
};

export default LoginPage;
