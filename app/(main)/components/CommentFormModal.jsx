"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
  FaCommentDots,
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
import { getFormPlaceholderImageSrc } from "./utils/formPlaceholderImage";

const CommentFormModal = ({ isOpen, onClose, onSubmit, initialComment = "", blogId, initialData = {} }) => {
  const pathname = usePathname();
  const { src: formPlaceholderSrc, fallbackSrc: formPlaceholderFallback } = getFormPlaceholderImageSrc(pathname, basePath);
  const [formPlaceholderImgSrc, setFormPlaceholderImgSrc] = useState(formPlaceholderSrc);
  useEffect(() => setFormPlaceholderImgSrc(formPlaceholderSrc), [formPlaceholderSrc]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    country: "",
    className: "",
    countryCode: "+91",
    phoneNumber: "",
    comment: initialComment,
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
        comment: initialComment,
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
        } else if (name === "comment" && newData.comment.trim()) {
          if (newData.comment.trim().length > 2000) {
            setErrors((prevErrors) => ({
              ...prevErrors,
              comment: "Comment cannot exceed 2000 characters",
            }));
          } else {
            setErrors((prevErrors) => ({ ...prevErrors, comment: "" }));
          }
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
    // Create custom validation that includes comment
    const formDataForValidation = {
      name: formData.name,
      email: formData.email,
      country: formData.country,
      className: formData.className,
      countryCode: formData.countryCode,
      phoneNumber: formData.phoneNumber,
    };

    const newErrors = validateFormUtil(formDataForValidation, validateVerification);

    // Add comment validation
    if (!formData.comment || !formData.comment.trim()) {
      newErrors.comment = "Comment is required";
    } else if (formData.comment.trim().length > 2000) {
      newErrors.comment = "Comment cannot exceed 2000 characters";
    }

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
      // Step 1: Submit lead form
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
        form_name: "blog-comment", // Form identifier (for backward compatibility)
        form_id: "blog-comment", // Form ID to track registration source
        source: sourcePath, // Full URL with query parameters
        prepared: "",
      });

      if (!leadResponse.data?.success) {
        throw new Error(leadResponse.data?.message || "Failed to submit lead form");
      }

      // Step 2: Submit comment
      await onSubmit({
        name: formData.name.trim(),
        email: formData.email.trim(),
        comment: formData.comment.trim(),
      });

      setSubmitStatus("success");
      const isUpdated = leadResponse.data?.data?.isUpdated || leadResponse.status === 200;
      const responseMessage = leadResponse.data?.message || "";

      if (isUpdated && responseMessage) {
        setSubmitMessage(
          `Thank you! Your information has been updated successfully. ${responseMessage.includes("Status") ? responseMessage.split(".")[0] + "." : ""} Your comment will be reviewed before being published.`
        );
      } else {
        setSubmitMessage(
          isUpdated
            ? "Thank you! Your information has been updated successfully. Your comment will be reviewed before being published."
            : "Thank you! Your comment has been submitted successfully. It will be reviewed before being published."
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
        comment: "",
      });
      setErrors({});
      resetVerification();
      generateVerification();

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSubmitStatus(null);
        setSubmitMessage("");
      }, 2000);
    } catch (error) {
      setSubmitStatus("error");
      setSubmitMessage(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit your comment. Please try again."
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
        comment: initialComment,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-3 right-3 z-10 min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white/80 backdrop-blur-sm flex items-center justify-center"
          aria-label="Close modal"
        >
          <FaTimes className="text-lg" aria-hidden />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
          <div className="hidden lg:block relative h-full overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />

            {/* Image */}
            <img
              src={formPlaceholderImgSrc}
              alt="Form illustration"
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setFormPlaceholderImgSrc(formPlaceholderFallback)}
            />

            {/* Optional overlay */}
            <div className="absolute inset-0 bg-black/10" />
          </div>


          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full inline-block mb-2">
                We Will Connect With You Soon
              </div>

              <h2 id="modal-title" className="text-xl font-bold text-gray-900 mb-3">
                Let&apos;s Connect With You Soon
              </h2>

              <form onSubmit={handleSubmit} className="space-y-2.5">
                {submitStatus && (
                  <div
                    className={`p-3 rounded-lg flex items-start gap-2 ${submitStatus === "success"
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-red-50 border border-red-200 text-red-800"
                      }`}
                  >
                    {submitStatus === "success" ? (
                      <FaCheckCircle className="text-green-600 text-sm shrink-0 mt-0.5" aria-hidden />
                    ) : (
                      <FaExclamationCircle className="text-red-600 text-sm shrink-0 mt-0.5" aria-hidden />
                    )}
                    <p className="text-sm font-medium">{submitMessage}</p>
                  </div>
                )}

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400 text-xs" aria-hidden />
                    </div>
                    <label htmlFor="modal-name" className="sr-only">Name</label>
                    <input
                      type="text"
                      id="modal-name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${errors.name
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Name"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-0.5 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <FaEnvelope className="text-gray-400 text-xs" aria-hidden />
                    </div>
                    <label htmlFor="modal-email" className="sr-only">Email</label>
                    <input
                      type="email"
                      id="modal-email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${errors.email
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Email Address"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-0.5 text-xs text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none z-10">
                      <FaGlobe className="text-gray-400 text-xs" aria-hidden />
                    </div>
                    <label htmlFor="modal-country" className="sr-only">Country</label>
                    <select
                      id="modal-country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white text-base ${errors.country
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
                    <p className="mt-0.5 text-xs text-red-600">
                      {errors.country}
                    </p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none z-10">
                      <FaGraduationCap className="text-gray-400 text-xs" aria-hidden />
                    </div>
                    <label htmlFor="modal-className" className="sr-only">Class</label>
                    <select
                      id="modal-className"
                      name="className"
                      value={formData.className}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white text-base ${errors.className
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
                    <p className="mt-0.5 text-xs text-red-600">
                      {errors.className}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex gap-2">
                    <div className="w-18">
                      <label htmlFor="modal-countryCode" className="sr-only">Country code</label>
                      <input
                        type="text"
                        id="modal-countryCode"
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleChange}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 text-center text-sm"
                        placeholder="+91"
                        readOnly
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400 text-xs" aria-hidden />
                      </div>
                      <label htmlFor="modal-phoneNumber" className="sr-only">Phone number</label>
                      <input
                        type="tel"
                        id="modal-phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${errors.phoneNumber
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-white"
                          }`}
                        placeholder="Contact No"
                        disabled={isSubmitting}
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
                  <div className="relative">
                    <div className="absolute top-2.5 left-3 flex items-start pointer-events-none">
                      <FaCommentDots className="text-gray-400 text-xs mt-0.5" aria-hidden />
                    </div>
                    <label htmlFor="modal-comment" className="sr-only">Comment</label>
                    <textarea
                      id="modal-comment"
                      name="comment"
                      value={formData.comment}
                      onChange={handleChange}
                      rows={4}
                      maxLength={2000}
                      className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none ${errors.comment
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-white"
                        }`}
                      placeholder="Write your comment here..."
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    {errors.comment && (
                      <p className="text-xs text-red-600">{errors.comment}</p>
                    )}
                    <p className="text-xs text-gray-500 ml-auto">
                      {formData.comment.length}/2000 characters
                    </p>
                  </div>
                </div>

                <div>
                  <div
                    className={`flex items-center gap-2 p-2 border-2 rounded-lg transition-all ${errors.verification
                      ? "border-red-300 bg-red-50"
                      : isVerified
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 bg-white"
                      }`}
                  >
                    <div className="shrink-0">
                      {isVerified ? (
                        <div className="w-7 h-7 bg-green-500 rounded flex items-center justify-center">
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
                        <label htmlFor="modal-verification" className="sr-only">Verification answer</label>
                        <input
                          type="text"
                          id="modal-verification"
                          value={userVerificationAnswer}
                          onChange={(e) =>
                            handleVerificationChange(e.target.value, setErrors)
                          }
                          placeholder={
                            verificationQuestion.includes("=") ? "Ans" : "Code"
                          }
                          className={`w-full px-2 py-1.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center font-semibold text-sm ${errors.verification
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
                        className="shrink-0 min-h-[44px] min-w-[44px] p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Refresh verification"
                        aria-label="Refresh verification code"
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

                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="min-h-[44px] flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    aria-label={isSubmitting ? "Submitting form" : "Submit comment"}
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner className="animate-spin text-sm" aria-hidden />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit</span>
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

export default CommentFormModal;
