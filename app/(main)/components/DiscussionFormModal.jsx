"use client";
import { useState, useEffect } from "react";
import {
  FaUser,
  FaEnvelope,
  FaGlobe,
  FaGraduationCap,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaTimes,
  FaPhone,
} from "react-icons/fa";
import api from "@/lib/api";
import {
  countriesWithCodesSorted,
  countryCodeMap,
  classOptions,
} from "./constants/formConstants";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

import { useVerification } from "./hooks/useVerification";
import {
  validateForm as validateFormUtil,
  validateName,
  validateEmail,
  validatePhoneNumber,
  validateCountry,
  validateClassName,
} from "./utils/formValidation";

const DiscussionFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  formId = "Discussion-forum-post",
  initialData = {}
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    country: "",
    className: "",
    countryCode: "+91",
    phoneNumber: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState("");

  const {
    verificationQuestion,
    userVerificationAnswer,
    isVerified,
    generateVerification,
    handleVerificationChange,
    validateVerification,
    resetVerification,
  } = useVerification();

  useEffect(() => {
    if (isOpen) {
      generateVerification();
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || "",
        email: initialData.email || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "country" && value) {
        newData.countryCode = countryCodeMap[value] || "+1";
      }

      // Real-time validation with updated data
      setTimeout(() => {
        if (name === "name" && newData.name.trim()) {
          const error = validateName(newData.name);
          setErrors((prevErrors) => ({ ...prevErrors, name: error }));
        } else if (name === "email" && newData.email.trim()) {
          const error = validateEmail(newData.email);
          setErrors((prevErrors) => ({ ...prevErrors, email: error }));
        } else if (name === "country" && newData.country) {
          const error = validateCountry(newData.country);
          setErrors((prevErrors) => ({ ...prevErrors, country: error }));
        } else if (name === "className" && newData.className) {
          const error = validateClassName(newData.className);
          setErrors((prevErrors) => ({ ...prevErrors, className: error }));
        } else if (name === "phoneNumber" && newData.phoneNumber.trim()) {
          const error = validatePhoneNumber(
            newData.phoneNumber,
            newData.countryCode,
            newData.country
          );
          setErrors((prevErrors) => ({ ...prevErrors, phoneNumber: error }));
        } else if (errors[name]) {
          setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
        }
      }, 0);

      return newData;
    });

    if (submitStatus) {
      setSubmitStatus(null);
      setSubmitMessage("");
    }
  };

  const validateForm = () => {
    const formDataForValidation = {
      name: formData.name,
      email: formData.email,
      country: formData.country,
      className: formData.className,
      countryCode: formData.countryCode,
      phoneNumber: formData.phoneNumber,
    };

    const newErrors = validateFormUtil(formDataForValidation, validateVerification);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage("");

    try {
      // Capture full URL with query parameters for source tracking
      const sourcePath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "";

      const leadResponse = await api.post("/lead", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        country: formData.country.trim(),
        className: formData.className.trim(),
        phoneNumber: formData.countryCode + formData.phoneNumber.trim(),
        form_name: formId, // Form identifier (for backward compatibility)
        form_id: formId, // Form ID to track registration source
        source: sourcePath, // Full URL with query parameters
        prepared: "",
      });

      if (!leadResponse.data?.success) {
        throw new Error(leadResponse.data?.message || "Failed to submit form");
      }

      setSubmitStatus("success");
      const isUpdated = leadResponse.data?.data?.isUpdated || leadResponse.status === 200;
      const responseMessage = leadResponse.data?.message || "";

      if (isUpdated && responseMessage) {
        setSubmitMessage(
          `Thank you! Your information has been updated successfully. ${responseMessage.includes("Status") ? responseMessage.split(".")[0] + "." : ""} You can now continue with your action.`
        );
      } else {
        setSubmitMessage(
          isUpdated
            ? "Thank you! Your information has been updated successfully. You can now continue with your action."
            : "Thank you! Your information has been submitted successfully. You can now continue with your action."
        );
      }

      // Reset form
      setFormData({
        name: "",
        email: "",
        country: "",
        className: "",
        countryCode: "+91",
        phoneNumber: "",
      });
      setErrors({});
      resetVerification();
      generateVerification();

      // Call onSuccess callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
        setSubmitStatus(null);
        setSubmitMessage("");
      }, 1500);
    } catch (error) {
      setSubmitStatus("error");
      setSubmitMessage(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit your information. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: "",
        email: "",
        country: "",
        className: "",
        countryCode: "+91",
        phoneNumber: "",
      });
      setErrors({});
      setSubmitStatus(null);
      setSubmitMessage("");
      resetVerification();
      generateVerification();
      onClose();
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white/80 backdrop-blur-sm"
          aria-label="Close modal"
        >
          <FaTimes className="text-base sm:text-lg" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
          <div className="hidden lg:block relative h-full overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />

            {/* Image */}
            <img
              src={`${basePath}/images/form-placeholder.png`}
              alt="Form illustration"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Optional overlay */}
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="bg-blue-600 text-white text-[10px] xs:text-xs font-medium px-2 xs:px-3 py-0.5 xs:py-1 rounded-full inline-block mb-2">
                Complete Your Profile to Continue
              </div>

              <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                {formId === "Discussion-forum-post"
                  ? "Create Your Discussion Post"
                  : formId === "Discussion-forum-comment"
                    ? "Join the Discussion"
                    : formId === "Discussion-forum-reply"
                      ? "Reply to Discussion"
                      : formId === "Discussion-forum-thread-image"
                        ? "Join the Discussion"
                        : "Join the Discussion"}
              </h2>
              <p className="text-xs xs:text-sm text-gray-600 mb-3 sm:mb-4">
                Please provide your information to continue with your action.
              </p>

              <form onSubmit={handleSubmit} className="space-y-2 xs:space-y-2.5 sm:space-y-3">
                {submitStatus && (
                  <div
                    className={`p-2 xs:p-3 rounded-lg flex items-start gap-2 ${submitStatus === "success"
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-red-50 border border-red-200 text-red-800"
                      }`}
                  >
                    {submitStatus === "success" ? (
                      <FaCheckCircle className="text-green-600 text-xs xs:text-sm shrink-0 mt-0.5" />
                    ) : (
                      <FaExclamationCircle className="text-red-600 text-xs xs:text-sm shrink-0 mt-0.5" />
                    )}
                    <p className="text-xs xs:text-sm font-medium leading-relaxed">{submitMessage}</p>
                  </div>
                )}

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 xs:pl-2.5 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400 text-xs" />
                    </div>
                    <input
                      type="text"
                      id="discussion-name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full pl-7 xs:pl-8 pr-2 xs:pr-3 py-1.5 xs:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${errors.name
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Name"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-0.5 text-[10px] xs:text-xs text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 xs:pl-2.5 flex items-center pointer-events-none">
                      <FaEnvelope className="text-gray-400 text-xs" />
                    </div>
                    <input
                      type="email"
                      id="discussion-email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-7 xs:pl-8 pr-2 xs:pr-3 py-1.5 xs:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${errors.email
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Email Address"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-0.5 text-[10px] xs:text-xs text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 xs:pl-2.5 flex items-center pointer-events-none z-10">
                      <FaGlobe className="text-gray-400 text-xs" />
                    </div>
                    <select
                      id="discussion-country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className={`w-full pl-7 xs:pl-8 pr-8 xs:pr-10 py-1.5 xs:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white text-sm xs:text-base ${errors.country
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                        }`}
                      disabled={isSubmitting}
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
                    <p className="mt-0.5 text-[10px] xs:text-xs text-red-600">
                      {errors.country}
                    </p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 xs:pl-2.5 flex items-center pointer-events-none z-10">
                      <FaGraduationCap className="text-gray-400 text-xs" />
                    </div>
                    <select
                      id="discussion-className"
                      name="className"
                      value={formData.className}
                      onChange={handleChange}
                      className={`w-full pl-7 xs:pl-8 pr-8 xs:pr-10 py-1.5 xs:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white text-sm xs:text-base ${errors.className
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                        }`}
                      disabled={isSubmitting}
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
                    <p className="mt-0.5 text-[10px] xs:text-xs text-red-600">
                      {errors.className}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex gap-1.5 xs:gap-2">
                    <div className="w-16 xs:w-18 sm:w-20 shrink-0">
                      <input
                        type="text"
                        id="discussion-countryCode"
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleChange}
                        className="w-full px-1 xs:px-2 py-1.5 xs:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 text-center text-xs xs:text-sm"
                        placeholder="+91"
                        readOnly
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex-1 relative min-w-0">
                      <div className="absolute inset-y-0 left-0 pl-2 xs:pl-2.5 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400 text-xs" />
                      </div>
                      <input
                        type="tel"
                        id="discussion-phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className={`w-full pl-7 xs:pl-8 pr-2 xs:pr-3 py-1.5 xs:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${errors.phoneNumber
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-white"
                          }`}
                        placeholder="Contact No"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  {errors.phoneNumber && (
                    <p className="mt-0.5 text-[10px] xs:text-xs text-red-600">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                <div>
                  <div
                    className={`flex items-center gap-1.5 xs:gap-2 p-1.5 xs:p-2 border-2 rounded-lg transition-all ${errors.verification
                      ? "border-red-300 bg-red-50"
                      : isVerified
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 bg-white"
                      }`}
                  >
                    <div className="shrink-0">
                      {isVerified ? (
                        <div className="w-6 h-6 xs:w-7 xs:h-7 bg-green-500 rounded flex items-center justify-center">
                          <svg
                            className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-white"
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
                        <div className="w-6 h-6 xs:w-7 xs:h-7 bg-gray-200 rounded flex items-center justify-center">
                          <svg
                            className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-gray-500"
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
                    <div className="flex-1 flex items-center gap-1 xs:gap-2 min-w-0">
                      <div className="flex-1 bg-gray-50 border border-gray-300 rounded px-1.5 xs:px-2 py-1 xs:py-1.5 text-center min-w-0">
                        <span className="text-sm xs:text-base font-bold text-gray-800 tracking-wider break-all">
                          {verificationQuestion}
                        </span>
                      </div>
                      <div className="w-16 xs:w-20 shrink-0">
                        <input
                          type="text"
                          value={userVerificationAnswer}
                          onChange={(e) =>
                            handleVerificationChange(e.target.value, setErrors)
                          }
                          placeholder={
                            verificationQuestion.includes("=") ? "Ans" : "Code"
                          }
                          className={`w-full px-1.5 xs:px-2 py-1 xs:py-1.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center font-semibold text-xs xs:text-sm ${errors.verification
                            ? "border-red-300 bg-red-50"
                            : isVerified
                              ? "border-green-500 bg-green-50"
                              : "border-gray-300 bg-white"
                            }`}
                          autoComplete="off"
                          disabled={isSubmitting}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateVerification}
                        disabled={isSubmitting}
                        className="shrink-0 p-1 xs:p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh verification"
                      >
                        <svg
                          className="w-3 h-3 xs:w-3.5 xs:h-3.5"
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
                    <p className="mt-0.5 text-[10px] xs:text-xs text-red-600">
                      {errors.verification}
                    </p>
                  )}
                </div>

                <div className="pt-1 xs:pt-2 flex flex-col xs:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="w-full xs:flex-1 px-3 py-2 xs:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-xs xs:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full xs:flex-1 px-3 py-2 xs:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs xs:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner className="animate-spin text-xs xs:text-sm" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Continue</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscussionFormModal;
