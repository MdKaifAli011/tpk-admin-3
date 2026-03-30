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
import Button from "./Button";
import Card from "./Card";
import { useExamPreparedDefault } from "./context/ExamLeadContext";

const ContactForm = () => {
  const examPreparedDefault = useExamPreparedDefault();
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
    getVerificationBlockStatus,
    recordVerificationFailure,
    resetVerificationFailures,
  } = useVerification();

  useEffect(() => {
    generateVerification();
  }, [generateVerification]);

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
    const blockStatus = getVerificationBlockStatus();
    if (blockStatus.blocked && blockStatus.retryAfterMs != null) {
      const minutes = Math.ceil(blockStatus.retryAfterMs / 60000);
      setErrors({
        verification: `Too many failed verification attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
      });
      return false;
    }
    const newErrors = validateFormUtil(formData, validateVerification);
    if (newErrors.verification) recordVerificationFailure();
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

      const response = await api.post("/lead", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        country: formData.country.trim(),
        className: formData.className.trim(),
        phoneNumber: formData.countryCode + formData.phoneNumber.trim(),
        form_name: "contact-form", // Form identifier
        form_id: "contact-form", // Form ID to track registration source
        source: sourcePath, // Full URL with query parameters
        prepared: examPreparedDefault,
      });

      if (response.data?.success) {
        setSubmitStatus("success");
        const isUpdated =
          response.data?.data?.isUpdated || response.status === 200;
        const responseMessage = response.data?.message || "";

        if (isUpdated && responseMessage) {
          setSubmitMessage(
            `Thank you! Your information has been updated successfully. ${responseMessage.includes("Status")
              ? responseMessage.split(".")[0] + "."
              : ""
            } We'll get back to you soon.`
          );
        } else {
          setSubmitMessage(
            isUpdated
              ? "Thank you! Your information has been updated successfully. We'll get back to you soon."
              : "Thank you! Your inquiry has been submitted successfully. We'll get back to you soon."
          );
        }

        setFormData({
          name: "",
          email: "",
          country: "",
          className: "",
          countryCode: "+91",
          phoneNumber: "",
        });
        setErrors({});
        resetVerificationFailures();
        resetVerification();
        generateVerification();
      } else {
        setSubmitStatus("error");
        setSubmitMessage(
          response.data?.message ||
          "Failed to submit your inquiry. Please try again."
        );
      }
    } catch (error) {
      setSubmitStatus("error");
      setSubmitMessage(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit your inquiry. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="">
      <div className="max-w-6xl mx-auto px-4 ">
        <Card variant="premium" className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">

            <div className="hidden lg:block relative h-full overflow-hidden">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />

              {/* Image */}
              <img
                src={`${basePath}/images/contact-illustration.png`}
                alt="Contact us"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Optional overlay */}
              <div className="absolute inset-0 bg-black/10" />
            </div>


            <div className="bg-white p-4 lg:p-5">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full inline-block mb-3 shadow-sm">
                WE WILL CALL YOU SOON
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Connect With Testprepkart
              </h1>

              <form onSubmit={handleSubmit} className="space-y-3">
                {submitStatus && (
                  <div
                    className={`p-3 rounded-lg flex items-start gap-2 border ${submitStatus === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                      }`}
                  >
                    {submitStatus === "success" ? (
                      <FaCheckCircle className="text-emerald-600 text-sm shrink-0 mt-0.5" />
                    ) : (
                      <FaExclamationCircle className="text-red-600 text-base shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm font-medium">{submitMessage}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="sr-only">Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400 text-xs" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${errors.name
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Name"
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-0.5 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="sr-only">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <FaEnvelope className="text-gray-400 text-xs" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${errors.email
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Email Address"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-0.5 text-xs text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="country" className="sr-only">Country</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none z-10">
                      <FaGlobe className="text-gray-400 text-xs" />
                    </div>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white text-sm ${errors.country
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                        }`}
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
                    <p className="mt-0.5 text-xs text-red-600">
                      {errors.country}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="className" className="sr-only">Class</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none z-10">
                      <FaGraduationCap className="text-gray-400 text-xs" />
                    </div>
                    <select
                      id="className"
                      name="className"
                      value={formData.className}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white text-sm ${errors.className
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                        }`}
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
                    <p className="mt-0.5 text-xs text-red-600">
                      {errors.className}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex gap-2">
                    <div className="w-18">
                      <input
                        type="text"
                        id="countryCode"
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleChange}
                        className="w-full px-2 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 text-center text-sm"
                        placeholder="+91"
                        readOnly
                      />
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400 text-xs" />
                      </div>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${errors.phoneNumber
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-white"
                          }`}
                        placeholder="Contact No"
                      />
                    </div>
                  </div>
                  {errors.phoneNumber && (
                    <p className="mt-0.5 text-xs text-red-600">
                      {errors.phoneNumber}
                    </p>
                  )}
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
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateVerification}
                        className="shrink-0 p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
                    <p className="mt-0.5 text-xs text-red-600">
                      {errors.verification}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    variant="primary"
                    size="md"
                    fullWidth
                    className="flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
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
        </Card>
      </div>
    </div>
  );
};

export default ContactForm;
