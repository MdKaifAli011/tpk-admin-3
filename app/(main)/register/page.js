"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaGlobe,
  FaLock,
  FaArrowRight,
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaStar,
  FaChevronDown,
} from "react-icons/fa";
import Image from "next/image";
import api from "../../../lib/api.js";

/**
 * RegisterPage - Upgraded UI to match the new LoginPage theme.
 * - Uses a left-side illustration (different from Login) at /education-register-illustration.png
 * - Keeps your original logic, validations, API calls and flow intact.
 * - Two-step flow: Step 1 (basic info) -> Step 2 (account details)
 * - Improved, consistent styling with the login UI.
 */

/* === Constants (your original lists preserved) === */
const CLASS_OPTIONS = [
  "12th+",
  "12th",
  "11th",
  "10th",
  "9th",
  "8th",
  "7th",
  "6th",
  "5th",
  "4th",
  "3rd",
  "2nd",
  "1st",
];

const COUNTRIES = [
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "UAE", code: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱" },
  { name: "Belgium", code: "+32", flag: "🇧🇪" },
  { name: "Switzerland", code: "+41", flag: "🇨🇭" },
  { name: "Sweden", code: "+46", flag: "🇸🇪" },
  { name: "Norway", code: "+47", flag: "🇳🇴" },
  { name: "Denmark", code: "+45", flag: "🇩🇰" },
  { name: "Finland", code: "+358", flag: "🇫🇮" },
  { name: "Poland", code: "+48", flag: "🇵🇱" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "Kenya", code: "+254", flag: "🇰🇪" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Sri Lanka", code: "+94", flag: "🇱🇰" },
  { name: "Nepal", code: "+977", flag: "🇳🇵" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "New Zealand", code: "+64", flag: "🇳🇿" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Chile", code: "+56", flag: "🇨🇱" },
  { name: "Colombia", code: "+57", flag: "🇨🇴" },
  { name: "Peru", code: "+51", flag: "🇵🇪" },
  { name: "Venezuela", code: "+58", flag: "🇻🇪" },
  { name: "Other", code: "+", flag: "🌍" },
];

const RegisterPage = () => {
  const router = useRouter();

  // Step & transitions
  const [step, setStep] = useState(1);
  const [stepTransition, setStepTransition] = useState(false);

  // form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    className: "",
    email: "",
    phoneNumber: "",
    countryCode: "+91",
    country: "",
    password: "",
    confirmPassword: "",
    prepared: "",
  });

  // UI controls
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // data & loading/error
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  /* ---------- Load available exams (your original behavior) ---------- */
  useEffect(() => {
    const loadExams = async () => {
      try {
        const response = await fetch("/api/exam?status=active&limit=100");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setExams(data.data.filter((exam) => exam && exam.name));
          }
        }
      } catch (err) {
        console.error("Error loading exams:", err);
      }
    };
    loadExams();
  }, []);

  /* ---------- Close dropdowns when clicking outside ---------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showClassDropdown &&
        !e.target.closest?.(".class-dropdown-container")
      ) {
        setShowClassDropdown(false);
      }
      if (
        showCountryDropdown &&
        !e.target.closest?.(".country-dropdown-container")
      ) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showClassDropdown, showCountryDropdown]);

  /* ---------- Handlers ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    setError(null);
  };

  const handleClassSelect = (className) => {
    setFormData((p) => ({ ...p, className }));
    setShowClassDropdown(false);
    if (errors.className) setErrors((p) => ({ ...p, className: "" }));
  };

  const handleCountrySelect = (country) => {
    setFormData((p) => ({
      ...p,
      country: country.name,
      countryCode: country.code,
    }));
    setShowCountryDropdown(false);
  };

  /* ---------- Validation (keeps your original logic) ---------- */
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.className.trim())
      newErrors.className = "Class name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Please enter a valid email";
    if (!formData.phoneNumber.trim())
      newErrors.phoneNumber = "Phone number is required";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---------- Step navigation ---------- */
  const handleNext = () => {
    if (!validateStep1()) return;
    setStepTransition(true);
    setTimeout(() => {
      setStep(2);
      setStepTransition(false);
    }, 200);
  };

  const handleBack = () => {
    setStepTransition(true);
    setTimeout(() => {
      setStep(1);
      setStepTransition(false);
      setError(null);
    }, 200);
  };

  /* ---------- Submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    setError(null);

    try {
      const fullPhoneNumber =
        formData.countryCode + formData.phoneNumber.trim().replace(/^\+/, "");
      const response = await api.post("/student/auth/register", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phoneNumber: fullPhoneNumber,
        className: formData.className.trim(),
        prepared: formData.prepared || null,
        country: formData.country || null,
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
          
          if (verifyResponse.data.success && verifyResponse.data.data?.student) {
            // Student verified, proceed to home page
            router.push("/");
          } else {
            // Student not found or inactive
            setError("Account verification failed. Please try logging in.");
            localStorage.removeItem("student_token");
          }
        } catch (verifyError) {
          // Token verification failed
          setError("Failed to verify account. Please try logging in.");
          localStorage.removeItem("student_token");
        } finally {
          setLoading(false);
        }
      } else {
        setError(response.data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.message ||
          "Registration failed. Please check your information and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Derived values ---------- */
  const selectedCountry =
    COUNTRIES.find((c) => c.name === formData.country) || COUNTRIES[0];

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* subtle grid background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-50 to-transparent opacity-40"></div>
      {/* soft glows */}
      <div className="absolute -left-10 top-8 w-72 h-72 rounded-full bg-indigo-300 blur-3xl opacity-30 pointer-events-none"></div>
      <div className="absolute -right-10 bottom-8 w-72 h-72 rounded-full bg-pink-300 blur-3xl opacity-30 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Left Illustration + marketing (different illustration as requested) */}
        <div className="hidden md:flex flex-col items-start justify-center px-6">
          <Image
            src="/images/register.png"
            alt="Register Illustration"
            width={520}
            height={520}
            className="drop-shadow-xl"
            priority
          />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 leading-tight">
            Join the community of{" "}
            <span className="text-indigo-600">aspiring achievers</span>
          </h2>
          <p className="mt-3 text-gray-600 max-w-sm">
            Create your free account to access practice tests, video lessons,
            and personalized study plans tailored to your goals.
          </p>
        </div>

        {/* Right: Form Card */}
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-5">
            <Link
              href="/"
              className="inline-block mb-2 transform hover:scale-105 transition-transform duration-300"
            >
              <div className="relative inline-block">
                <Image
                  src="/logo.png"
                  alt="TestPrepKart Logo"
                  width={84}
                  height={84}
                  className="rounded-full"
                  priority
                />
                <div className="absolute -top-0.5 -right-0.5">
                  <FaStar className="text-yellow-400 text-base animate-pulse" />
                </div>
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Create Your Account
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              Join thousands of students preparing for success
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20">
            {/* Error box */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-xs text-red-700 animate-[shake_0.3s_ease-in-out]">
                <div className="flex items-center gap-2">⚠️ {error}</div>
              </div>
            )}

            {/* Progress (matching login style) */}
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                      step >= 1
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step > 1 ? <FaCheckCircle /> : <span>1</span>}
                  </div>
                  <span
                    className={`text-[11px] mt-1 ${
                      step >= 1 ? "text-indigo-600" : "text-gray-400"
                    }`}
                  >
                    Basic
                  </span>
                </div>
                <div
                  className={`flex-1 h-1 rounded-full ${
                    step >= 2
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600"
                      : "bg-gray-200"
                  }`}
                ></div>
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                      step >= 2
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step > 2 ? <FaCheckCircle /> : <span>2</span>}
                  </div>
                  <span
                    className={`text-[11px] mt-1 ${
                      step >= 2 ? "text-indigo-600" : "text-gray-400"
                    }`}
                  >
                    Account
                  </span>
                </div>
              </div>
            </div>

            {/* Animated transition container */}
            <div
              className={`transition-all duration-250 ${
                stepTransition
                  ? "opacity-0 translate-x-4"
                  : "opacity-100 translate-x-0"
              }`}
            >
              {step === 1 ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleNext();
                  }}
                >
                  <div className="space-y-4">
                    <div className="text-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Let's get started
                      </h3>
                      <p className="text-xs text-gray-500">
                        Tell us a bit about yourself
                      </p>
                    </div>

                    {/* First Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaUser
                            className={`text-xs ${
                              formData.firstName
                                ? "text-indigo-600"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                        <input
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="John"
                          className={`w-full pl-9 pr-3 py-2.5 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                            errors.firstName
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.firstName}
                        </p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaUser
                            className={`text-xs ${
                              formData.lastName
                                ? "text-indigo-600"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                        <input
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Doe"
                          className={`w-full pl-9 pr-3 py-2.5 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                            errors.lastName
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                      {errors.lastName && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.lastName}
                        </p>
                      )}
                    </div>

                    {/* Class dropdown */}
                    <div className="class-dropdown-container relative">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Select Class <span className="text-red-500">*</span>
                      </label>
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowClassDropdown((s) => !s)}
                          className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 rounded-lg border-2 text-sm ${
                            errors.className
                              ? "border-red-300 bg-red-50"
                              : formData.className
                              ? "border-indigo-500 bg-white"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FaGraduationCap
                              className={`text-xs ${
                                formData.className
                                  ? "text-indigo-600"
                                  : "text-gray-400"
                              }`}
                            />
                            <span
                              className={`${
                                formData.className
                                  ? "text-gray-900"
                                  : "text-gray-400"
                              }`}
                            >
                              {formData.className || "Select Class"}
                            </span>
                          </div>
                          <FaChevronDown
                            className={`text-xs ${
                              showClassDropdown ? "rotate-180 transform" : ""
                            }`}
                          />
                        </button>

                        {showClassDropdown && (
                          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                            {CLASS_OPTIONS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => handleClassSelect(c)}
                                className={`w-full text-left px-4 py-2 text-sm ${
                                  formData.className === c
                                    ? "bg-gray-100 text-indigo-600 font-semibold"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {errors.className && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.className}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-3 py-2.5 rounded-lg text-white font-bold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      Continue <FaArrowRight className="text-xs" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Almost there!
                        </h3>
                        <p className="text-xs text-gray-500">
                          Complete your account details
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleBack}
                        className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600"
                      >
                        <FaArrowLeft />
                      </button>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaEnvelope
                            className={`text-xs ${
                              formData.email
                                ? "text-indigo-600"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                        <input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john.doe@example.com"
                          className={`w-full pl-9 pr-3 py-2.5 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                            errors.email
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Country + Phone in row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="country-dropdown-container relative">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Country{" "}
                          <span className="text-xs text-gray-500">
                            (Optional)
                          </span>
                        </label>
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowCountryDropdown((s) => !s)}
                            className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 rounded-lg border-2 text-sm ${
                              formData.country
                                ? "border-indigo-500 bg-white"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FaGlobe
                                className={`text-xs ${
                                  formData.country
                                    ? "text-indigo-600"
                                    : "text-gray-400"
                                }`}
                              />
                              <span
                                className={`${
                                  formData.country
                                    ? "text-gray-900 truncate"
                                    : "text-gray-400"
                                }`}
                              >
                                {formData.country || "Select country"}
                              </span>
                            </div>
                            <FaChevronDown
                              className={`text-xs ${
                                showCountryDropdown
                                  ? "rotate-180 transform"
                                  : ""
                              }`}
                            />
                          </button>

                          {showCountryDropdown && (
                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                              {COUNTRIES.map((c) => (
                                <button
                                  key={c.name}
                                  type="button"
                                  onClick={() => handleCountrySelect(c)}
                                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                                    formData.country === c.name
                                      ? "bg-gray-100 text-indigo-600 font-semibold"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <span className="text-base">{c.flag}</span>
                                  <span className="flex-1 truncate">
                                    {c.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {c.code}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-xs font-semibold text-indigo-600">
                              {formData.countryCode}
                            </span>
                          </div>
                          <input
                            name="phoneNumber"
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            placeholder="1234567890"
                            className={`w-full pl-20 pr-3 py-2.5 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                              errors.phoneNumber
                                ? "border-red-300 bg-red-50"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <FaPhone className="text-xs text-gray-400" />
                          </div>
                        </div>
                        {errors.phoneNumber && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock
                            className={`text-xs ${
                              formData.password
                                ? "text-indigo-600"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Minimum 6 characters"
                          className={`w-full pl-9 pr-12 py-2.5 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                            errors.password
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-indigo-600"
                        >
                          {showPassword ? (
                            <FaEyeSlash className="text-xs" />
                          ) : (
                            <FaEye className="text-xs" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock
                            className={`text-xs ${
                              formData.confirmPassword
                                ? "text-indigo-600"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                        <input
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Re-enter your password"
                          className={`w-full pl-9 pr-12 py-2.5 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                            errors.confirmPassword
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((s) => !s)}
                          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-indigo-600"
                        >
                          {showConfirmPassword ? (
                            <FaEyeSlash className="text-xs" />
                          ) : (
                            <FaEye className="text-xs" />
                          )}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>

                    {/* Preparing For (exams) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Preparing For{" "}
                        <span className="text-xs text-gray-500">
                          (Optional)
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaGraduationCap
                            className={`text-xs ${
                              formData.prepared
                                ? "text-indigo-600"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                        <select
                          name="prepared"
                          value={formData.prepared}
                          onChange={handleChange}
                          className="w-full pl-9 pr-8 py-2.5 rounded-lg border-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        >
                          <option value="">Select exam (optional)</option>
                          {exams.map((exam) => (
                            <option
                              key={exam._id || exam.name}
                              value={exam.name}
                            >
                              {exam.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <FaChevronDown className="text-xs text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-2.5 rounded-lg text-white font-bold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account <FaCheckCircle className="text-xs" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bottom links */}
            <div className="mt-5 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-indigo-600 hover:text-indigo-700 font-bold"
                >
                  Sign In
                </Link>
              </p>
            </div>

            <p className="mt-3 text-[11px] text-center text-gray-500">
              By continuing, you agree to our{" "}
              <span className="text-indigo-600">Terms</span> &{" "}
              <span className="text-indigo-600">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
