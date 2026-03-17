"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaGlobe,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaCheckCircle,
  FaSpinner,
  FaExclamationCircle,
} from "react-icons/fa";
import api from "@/lib/api";
import { logger } from "@/utils/logger";
import {
  countriesWithCodesSorted,
  countryCodeMap,
  classOptions,
} from "./constants/formConstants";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
import { useVerification } from "./hooks/useVerification";
import {
  validateName,
  validateEmail,
  validatePhoneNumber,
  validateCountry,
  validateClassName,
  validatePassword,
  validateConfirmPassword,
} from "./utils/formValidation";
import Button from "./Button";
import { getFormPlaceholderImageSrc } from "./utils/formPlaceholderImage";

const DiscussionForumSavePostModal = ({
  isOpen,
  onClose,
  onRegistrationSuccess,
  formId = "Discussion-forum-save-post",
}) => {
  const pathname = usePathname();
  const { src: formPlaceholderSrc, fallbackSrc: formPlaceholderFallback } = getFormPlaceholderImageSrc(pathname, basePath, { variant: "discussion" });
  const [formPlaceholderImgSrc, setFormPlaceholderImgSrc] = useState(formPlaceholderSrc);
  useEffect(() => setFormPlaceholderImgSrc(formPlaceholderSrc), [formPlaceholderSrc]);

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
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState("");
  const registrationSuccessCalledRef = React.useRef(false);

  const {
    verificationQuestion,
    userVerificationAnswer,
    isVerified,
    generateVerification,
    handleVerificationChange,
    validateVerification: validateCaptcha,
    resetVerification,
    getVerificationBlockStatus,
    recordVerificationFailure,
    resetVerificationFailures,
  } = useVerification();

  useEffect(() => {
    const loadExams = async () => {
      try {
        const response = await fetch(`${basePath}/api/exam?status=active&limit=100`);
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
    if (isOpen) {
      loadExams();
      generateVerification();
    }
  }, [isOpen, generateVerification]);

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

  useEffect(() => {
    if (!isOpen) {
      setFormData({
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
      setErrors({});
      setError(null);
      setSubmitStatus(null);
      setSubmitMessage("");
      resetVerification();
    }
  }, [isOpen, resetVerification]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => {
      const newData = { ...p, [name]: value };

      if (name === "firstName" && newData.firstName.trim()) {
        const error = validateName(newData.firstName);
        setErrors((prevErrors) => ({ ...prevErrors, firstName: error }));
      } else if (name === "lastName" && newData.lastName.trim()) {
        const error = validateName(newData.lastName);
        setErrors((prevErrors) => ({ ...prevErrors, lastName: error }));
      } else if (name === "className" && newData.className.trim()) {
        const error = validateClassName(newData.className);
        setErrors((prevErrors) => ({ ...prevErrors, className: error }));
      } else if (name === "email" && newData.email.trim()) {
        const error = validateEmail(newData.email);
        setErrors((prevErrors) => ({ ...prevErrors, email: error }));
      } else if (name === "country" && newData.country) {
        const error = validateCountry(newData.country);
        setErrors((prevErrors) => ({ ...prevErrors, country: error }));
        newData.countryCode = countryCodeMap[value] || "+1";
      } else if (name === "phoneNumber" && newData.phoneNumber.trim()) {
        const error = validatePhoneNumber(
          newData.phoneNumber,
          newData.countryCode,
          newData.country
        );
        setErrors((prevErrors) => ({ ...prevErrors, phoneNumber: error }));
      } else if (name === "password" && newData.password) {
        const error = validatePassword(newData.password);
        setErrors((prevErrors) => ({ ...prevErrors, password: error }));
        if (newData.confirmPassword) {
          const confirmError = validateConfirmPassword(
            newData.password,
            newData.confirmPassword
          );
          setErrors((prevErrors) => ({
            ...prevErrors,
            confirmPassword: confirmError,
          }));
        }
      } else if (name === "confirmPassword" && newData.confirmPassword.trim()) {
        const error = validateConfirmPassword(
          newData.password,
          newData.confirmPassword
        );
        setErrors((prevErrors) => ({
          ...prevErrors,
          confirmPassword: error,
        }));
      } else if (errors[name]) {
        setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
      }
      return newData;
    });
    if (submitStatus) {
      setSubmitStatus(null);
      setSubmitMessage("");
    }
  };

  const handleClassSelect = (className) => {
    setFormData((prev) => ({ ...prev, className }));
    setShowClassDropdown(false);
    if (className) {
      const error = validateClassName(className);
      setErrors((prevErrors) => ({ ...prevErrors, className: error }));
    }
  };

  const handleCountrySelect = (country) => {
    setFormData((prev) => ({
      ...prev,
      country: country.name,
      countryCode: country.code,
    }));
    setShowCountryDropdown(false);
    if (country.name) {
      const error = validateCountry(country.name);
      setErrors((prevErrors) => ({ ...prevErrors, country: error }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const blockStatus = getVerificationBlockStatus();
    if (blockStatus.blocked && blockStatus.retryAfterMs != null) {
      const minutes = Math.ceil(blockStatus.retryAfterMs / 60000);
      newErrors.verification = `Too many failed verification attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`;
      setErrors(newErrors);
      return false;
    }
    const firstNameError = validateName(formData.firstName);
    if (firstNameError) newErrors.firstName = firstNameError;
    const lastNameError = validateName(formData.lastName);
    if (lastNameError) newErrors.lastName = lastNameError;
    const classNameError = validateClassName(formData.className);
    if (classNameError) newErrors.className = classNameError;
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    const phoneNumberError = validatePhoneNumber(
      formData.phoneNumber,
      formData.countryCode,
      formData.country
    );
    if (phoneNumberError) newErrors.phoneNumber = phoneNumberError;
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    const confirmPasswordError = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    if (!validateCaptcha()) {
      newErrors.verification = "Please complete the verification";
      recordVerificationFailure();
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    setSubmitStatus(null);
    setSubmitMessage("");

    try {
      const fullPhoneNumber =
        formData.countryCode + formData.phoneNumber.trim().replace(/^\+/, "");

      const sourceUrl =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "";

      const response = await api.post("/student/auth/register", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phoneNumber: fullPhoneNumber,
        className: formData.className.trim(),
        prepared: formData.prepared || null,
        country: formData.country || null,
        source: sourceUrl,
        formId,
      });

      if (response.data?.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("student_token", response.data.data.token);
          logger.info(
            "Token stored after registration:",
            response.data.data.token ? "Token saved" : "No token"
          );
          window.dispatchEvent(new CustomEvent("student-login"));
          logger.info("Student login event dispatched");
        }

        setSubmitStatus("success");
        setSubmitMessage(
          "Account created successfully! Saving post to your bookmarks..."
        );
        resetVerificationFailures();

        if (registrationSuccessCalledRef.current) {
          logger.info("Registration success callback already called, skipping duplicate");
          setLoading(false);
          return;
        }
        registrationSuccessCalledRef.current = true;

        setTimeout(() => {
          if (onRegistrationSuccess) {
            onRegistrationSuccess(response.data.data.token);
          }
        }, 100);
      } else {
        setSubmitStatus("error");
        setSubmitMessage(
          response.data?.message || "Registration failed. Please try again."
        );
        setLoading(false);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setSubmitStatus("error");
      setSubmitMessage(
        err.response?.data?.message ||
        err.message ||
        "Registration failed. Please check your information and try again."
      );
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      registrationSuccessCalledRef.current = false;
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      registrationSuccessCalledRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] h-screen flex items-center justify-center ">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden">
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-3 right-3 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white/80 backdrop-blur-sm"
          aria-label="Close modal"
        >
          <FaTimes className="text-lg" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
          <div className="hidden lg:block relative h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
            <img
              src={formPlaceholderImgSrc}
              alt="Registration illustration"
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setFormPlaceholderImgSrc(formPlaceholderFallback)}
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full inline-block mb-3 shadow-sm">
                We Will Connect With You Soon
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                Create account to save this post
              </h2>

              <form id="Discussion-forum-save-post" onSubmit={handleSubmit} className="space-y-2">
                {submitStatus && (
                  <div
                    className={`p-2 rounded-lg flex items-start gap-2 border ${submitStatus === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                      }`}
                  >
                    {submitStatus === "success" ? (
                      <FaCheckCircle className="text-emerald-600 text-sm shrink-0 mt-0.5" />
                    ) : (
                      <FaExclamationCircle className="text-red-600 text-sm shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm font-medium">{submitMessage}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <FaUser className="text-gray-400 text-xs" />
                      </div>
                      <input
                        type="text"
                        id="save-post-modal-firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${errors.firstName
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-white"
                          }`}
                        placeholder="First Name"
                        disabled={loading}
                      />
                    </div>
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <FaUser className="text-gray-400 text-xs" />
                      </div>
                      <input
                        type="text"
                        id="save-post-modal-lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${errors.lastName
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-white"
                          }`}
                        placeholder="Last Name"
                        disabled={loading}
                      />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="class-dropdown-container relative">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none z-10">
                        <FaGraduationCap className="text-gray-400 text-xs" />
                      </div>
                      <select
                        id="save-post-modal-className"
                        name="className"
                        value={formData.className}
                        onChange={(e) => {
                          handleClassSelect(e.target.value);
                        }}
                        className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white text-sm ${errors.className
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                          }`}
                        disabled={loading}
                      >
                        <option value="">Select Class</option>
                        {classOptions.map((className) => (
                          <option key={className} value={className}>
                            {className}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.className && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.className}
                      </p>
                    )}
                  </div>

                  <div className="country-dropdown-container relative">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none z-10">
                        <FaGlobe className="text-gray-400 text-xs" />
                      </div>
                      <select
                        id="save-post-modal-country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white text-sm ${errors.country
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                          }`}
                        disabled={loading}
                      >
                        <option value="">-- Select Country --</option>
                        {countriesWithCodesSorted.map((country) => (
                          <option key={country.name} value={country.name}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.country && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.country}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <FaEnvelope className="text-gray-400 text-xs" />
                    </div>
                    <input
                      type="email"
                      id="save-post-modal-email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${errors.email
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Email Address"
                      disabled={loading}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex gap-2">
                    <div className="w-18">
                      <input
                        type="text"
                        id="save-post-modal-countryCode"
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleChange}
                        className="w-full px-2 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 text-center text-sm"
                        placeholder="+91"
                        readOnly
                        disabled={loading}
                      />
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400 text-xs" />
                      </div>
                      <input
                        type="tel"
                        id="save-post-modal-phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${errors.phoneNumber
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-white"
                          }`}
                        placeholder="Contact No"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  {errors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400 text-xs" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="save-post-modal-password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${errors.password
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Password (min 6 characters)"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                      disabled={loading}
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

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400 text-xs" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="save-post-modal-confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${errors.confirmPassword
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Confirm Password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                      disabled={loading}
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

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none z-10">
                      <FaGraduationCap className="text-gray-400 text-xs" />
                    </div>
                    <select
                      id="save-post-modal-prepared"
                      name="prepared"
                      value={formData.prepared}
                      onChange={handleChange}
                      className="w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white text-sm border-gray-300"
                      disabled={loading}
                    >
                      <option value="">Select exam (optional)</option>
                      {exams.map((exam) => (
                        <option key={exam._id || exam.name} value={exam.name}>
                          {exam.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div
                    className={`flex items-center gap-2 p-2 border-2 rounded-lg transition-all ${errors.verification
                      ? "border-red-300 bg-red-50"
                      : isVerified
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-300 bg-white"
                      }`}
                  >
                    <div className="shrink-0">
                      {isVerified ? (
                        <div className="w-7 h-7 bg-emerald-500 rounded flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-7 h-7 bg-gray-200 rounded flex items-center justify-center">
                          <svg
                            className="w-3.5 h-3.5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-300 rounded px-2 py-1.5 text-center">
                        <span className="text-base font-bold text-gray-800 tracking-wider">
                          {verificationQuestion}
                        </span>
                      </div>
                      <div className="w-20">
                        <input
                          type="text"
                          value={userVerificationAnswer}
                          onChange={(e) =>
                            handleVerificationChange(e.target.value, setErrors)
                          }
                          placeholder={
                            verificationQuestion.includes("=") ? "Ans" : "Code"
                          }
                          className={`w-full px-2 py-1.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center font-semibold text-sm ${errors.verification
                            ? "border-red-300 bg-red-50"
                            : isVerified
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-300 bg-white"
                            }`}
                          autoComplete="off"
                          disabled={loading}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateVerification}
                        disabled={loading}
                        className="shrink-0 p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh verification"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {errors.verification && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.verification}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    variant="ghost"
                    size="md"
                    fullWidth
                    className="flex items-center justify-center"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    variant="primary"
                    size="md"
                    fullWidth
                    className="flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin text-sm" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit</span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscussionForumSavePostModal;
