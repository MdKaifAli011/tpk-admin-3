"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { FaSpinner, FaTimes, FaUser, FaExclamationCircle } from "react-icons/fa";
import api from "@/lib/api";
import { countryCodeMap } from "@/app/(main)/components/constants/formConstants";
import { useVerification } from "../hooks/useVerification";
import { validateField as validateFieldUtil } from "./formUtils";
import FormFieldInput from "./FormFieldInput";
import VerificationInput from "./VerificationInput";
import SubmitStatusMessage from "./SubmitStatusMessage";
import { logger } from "@/utils/logger";

// Default form image
const DEFAULT_FORM_IMAGE = "/images/form-placeholder.png";

// Default inline contact form config when API/form not found — so inline form always shows and submits to /lead
const DEFAULT_INLINE_FORM_CONFIG = {
  formId: "contact-form",
  fields: [
    { name: "name", type: "text", label: "Name", required: true, order: 0, placeholder: "Your name" },
    { name: "email", type: "email", label: "Email", required: true, order: 1, placeholder: "Your email" },
    { name: "country", type: "select", label: "Country", required: true, order: 2, placeholder: "Select country" },
    { name: "className", type: "select", label: "Class", required: false, order: 3, placeholder: "Select class" },
    { name: "phoneNumber", type: "tel", label: "Phone", required: false, order: 4, placeholder: "Contact No" },
  ],
  settings: {
    successMessage: "Thank you! Your request has been submitted successfully.",
    title: "Contact",
  },
};


// Helper function to capitalize button text
const capitalizeButtonText = (text) => {
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper function to resolve image path with base path
const resolveImagePath = (path) => {
  if (!path || typeof path !== "string") return "";
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
  // Avoid double slashes or double base paths
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (cleanPath.startsWith(basePath)) {
    return cleanPath;
  }
  return `${basePath}${cleanPath}`;
};

const FormRenderer = ({
  formId,
  isOpen,
  onClose,
  prepared = "",
  buttonLink = "",
  imageUrl = "",
  title = "",
  description = "",
  inline = false,
}) => {
  const [formConfig, setFormConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState("");
  const [imageError, setImageError] = useState(false);


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

  // Fetch form configuration (when modal open or when inline with formId)
  useEffect(() => {
    if (formId && (isOpen || inline)) {
      fetchFormConfig();
      generateVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, isOpen, inline]);

  const fetchFormConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/form/${formId}`);
      if (response.data?.success) {
        setFormConfig(response.data.data);
        // Initialize form data with default values
        const initialData = {};
        response.data.data.fields.forEach((field) => {
          if (field.defaultValue) {
            initialData[field.name] = field.defaultValue;
          } else {
            initialData[field.name] = "";
          }
        });
        // Initialize countryCode if phoneNumber field exists
        const hasPhoneNumber = response.data.data.fields.some(
          (f) => f.name === "phoneNumber"
        );
        if (hasPhoneNumber) {
          initialData.countryCode = "+91";
        }
        setFormData(initialData);
      }
    } catch (error) {
      // Inline form: use default contact form so we always show a form and store leads
      if (inline) {
        logger.warn("Form config not found, using default contact form for inline embed:", formId, error?.response?.status || error?.message);
        const defaultConfig = {
          ...DEFAULT_INLINE_FORM_CONFIG,
          formId,
          settings: {
            ...DEFAULT_INLINE_FORM_CONFIG.settings,
            title: title || DEFAULT_INLINE_FORM_CONFIG.settings.title,
          },
        };
        setFormConfig(defaultConfig);
        const initialData = {
          name: "",
          email: "",
          country: "",
          className: "",
          phoneNumber: "",
          countryCode: "+91",
        };
        setFormData(initialData);
      } else {
        logger.error("Error fetching form config:", error?.response?.data || error?.message || error);
        setSubmitStatus("error");
        setSubmitMessage("Failed to load form. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Auto-update country code when country changes
      if (name === "country" && value && countryCodeMap[value]) {
        newData.countryCode = countryCodeMap[value] || "+1";
      }

      // Clear error for this field
      if (errors[name]) {
        setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
      }

      return newData;
    });

    if (submitStatus) {
      setSubmitStatus(null);
      setSubmitMessage("");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formConfig) return false;

    const blockStatus = getVerificationBlockStatus();
    if (blockStatus.blocked && blockStatus.retryAfterMs != null && formConfig.settings.showVerification) {
      const minutes = Math.ceil(blockStatus.retryAfterMs / 60000);
      newErrors.verification = `Too many failed verification attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`;
      setErrors(newErrors);
      return false;
    }

    formConfig.fields.forEach((field) => {
      const value = formData[field.name];
      const error = validateFieldUtil(field, value);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    // Validate verification if enabled
    if (formConfig.settings.showVerification && !validateVerification()) {
      newErrors.verification = "Please complete the verification";
      recordVerificationFailure();
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
      // Extract exam name from URL
      const extractExamName = (urlString) => {
        if (!urlString) return "";
        try {
          const url = new URL(urlString);
          const pathname = url.pathname;

          // Remove leading/trailing slashes and split
          const segments = pathname
            .split("/")
            .filter((seg) => seg && seg.trim() && seg !== "");

          // Extract first segment as exam name (e.g., /neet, /ib, /jee)
          if (segments.length > 0) {
            const firstSegment = segments[0].toUpperCase();
            // Return if it's a reasonable length (2-20 characters)
            if (firstSegment.length >= 2 && firstSegment.length <= 20) {
              return firstSegment;
            }
          }

          return "";
        } catch {
          // If URL parsing fails, try to extract from string directly
          const match = urlString.match(/\/([a-z]{2,20})(?:\/|$|\?)/i);
          if (match && match[1]) {
            return match[1].toUpperCase();
          }
          return "";
        }
      };

      // Get the full URL including query parameters (e.g., /neet/biology?tab=practice&test=6929927c76c02d5a5e862de7)
      const fullUrl =
        typeof window !== "undefined" ? window.location.href : "";
      const pathnameWithQuery =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "";
      const extractedExamName = extractExamName(fullUrl);

      // Prepare submission data
      const submissionData = {
        ...formData,
        form_name: formId, // Use formId as form_name
        form_id: formId,
        source: pathnameWithQuery, // Store full pathname with query parameters (e.g., /neet/biology?tab=practice&test=...)
        prepared: extractedExamName || prepared || "",
      };

      // Combine country code and phone number if both exist
      if (submissionData.countryCode && submissionData.phoneNumber) {
        submissionData.phoneNumber =
          submissionData.countryCode + submissionData.phoneNumber.trim();
        delete submissionData.countryCode;
      }

      const response = await api.post("/lead", submissionData);

      if (response.data?.success) {
        setSubmitStatus("success");
        setSubmitMessage(
          formConfig.settings.successMessage ||
          "Thank you! Your request has been submitted successfully."
        );

        // Reset form
        const resetData = {};
        formConfig.fields.forEach((field) => {
          if (field.defaultValue) {
            resetData[field.name] = field.defaultValue;
          } else if (field.type === "tel" && field.name === "countryCode") {
            resetData[field.name] = "+91";
          } else {
            resetData[field.name] = "";
          }
        });
        setFormData(resetData);
        setErrors({});
        resetVerificationFailures();
        resetVerification();
        generateVerification();

        // Handle redirect or auto-close
        const redirectUrl = formConfig.settings.redirectLink || buttonLink;
        const delay = redirectUrl && redirectUrl.trim() ? 1500 : 2000;
        setTimeout(() => {
          if (redirectUrl && redirectUrl.trim()) {
            try {
              // Validate URL before redirecting
              const url = redirectUrl.trim();
              const basePath =
                process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
              if (url.startsWith("http://") || url.startsWith("https://")) {
                // External URL - use as is
                window.location.href = url;
              } else if (url.startsWith("/")) {
                // Relative URL starting with / - include basePath
                const finalUrl = url.startsWith(basePath) ? url : `${basePath}${url}`;
                window.location.href = finalUrl;
              } else {
                // If no protocol, assume it's a relative URL or add https://
                window.location.href = url.startsWith("/")
                  ? `${basePath}${url}`
                  : `https://${url}`;
              }
            } catch (error) {
              logger.error("Error redirecting:", error);
              // Fallback to closing modal
              onClose();
              setSubmitStatus(null);
              setSubmitMessage("");
            }
          } else {
            // Auto-close if no link
            onClose();
            setSubmitStatus(null);
            setSubmitMessage("");
          }
        }, delay);
      } else {
        setSubmitStatus("error");
        setSubmitMessage(
          response.data?.message ||
          "Failed to submit your request. Please try again."
        );
      }
    } catch (error) {
      setSubmitStatus("error");
      setSubmitMessage(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit your request. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({});
      setErrors({});
      setSubmitStatus(null);
      setSubmitMessage("");
      setImageError(false);
      resetVerification();
      onClose();
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({});
      setErrors({});
      setSubmitStatus(null);
      setSubmitMessage("");
      setImageError(false);
      resetVerification();
    }
  }, [isOpen, resetVerification]);

  // Prevent body scroll when modal is open (not when inline)
  useEffect(() => {
    if (inline) return;
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, inline]);

  // Handle ESC key to close modal (not when inline)
  useEffect(() => {
    if (inline || !isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape" && !isSubmitting) {
        setFormData({});
        setErrors({});
        setSubmitStatus(null);
        setSubmitMessage("");
        setImageError(false);
        resetVerification();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isSubmitting, onClose, resetVerification]);

  const isModal = !inline;
  const showContent = isModal ? isOpen : true;

  if (!showContent && isModal) return null;
  if (inline && !formId) return null;

  if (loading) {
    if (inline) {
      return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 flex items-center justify-center gap-3 min-h-[200px]">
          <FaSpinner className="animate-spin text-blue-600" />
          <span className="text-sm text-gray-700">Loading form...</span>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-6 flex items-center gap-3">
          <FaSpinner className="animate-spin text-blue-600" />
          <span className="text-sm text-gray-700">Loading form...</span>
        </div>
      </div>
    );
  }

  if (!formConfig) {
    if (inline) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <FaExclamationCircle className="text-red-500 text-2xl mx-auto mb-2" />
          <p className="text-sm text-red-700">Form not found. Check form ID.</p>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <div className="text-center">
            <FaExclamationCircle className="text-red-500 text-3xl mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Form Not Found
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The form you&apos;re looking for doesn&apos;t exist or is
              inactive.
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sortedFields = [...formConfig.fields].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  const formContent = (
    <>
      <div
        className={inline
          ? "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full max-w-4xl mx-auto"
          : "relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        }
        role={inline ? undefined : "dialog"}
        aria-modal={inline ? undefined : "true"}
        aria-labelledby={inline ? undefined : "form-title"}
      >
        {isModal && (
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute top-3 right-3 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white/80 backdrop-blur-sm"
            aria-label="Close modal"
            type="button"
          >
            <FaTimes className="text-lg" aria-hidden="true" />
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
          <div
            className={`relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 ${
              inline ? "block min-h-[200px] sm:min-h-[240px] lg:min-h-0" : "hidden lg:block"
            }`}
          >
            <img
              src={resolveImagePath(
                (() => {
                  // Inline embed: prefer image from editor (imageUrl prop); else form config; else default
                  const fromProp = imageUrl && String(imageUrl).trim();
                  const fromConfig = formConfig.settings?.imageUrl && String(formConfig.settings.imageUrl).trim();
                  const effective = fromProp || fromConfig || "";
                  if (effective && !imageError) return effective;
                  return DEFAULT_FORM_IMAGE;
                })()
              )}
              alt={title || formConfig.settings?.title || formConfig?.formId || "Form"}
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{
                margin: "0",
                borderRadius: "0px",
              }}
              onError={() => setImageError(true)}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {(description || formConfig.settings.description) && (
                <div className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full inline-block mb-2">
                  {description || formConfig.settings.description}
                </div>
              )}

              <h2
                id="form-title"
                className="text-xl font-bold text-gray-900 mb-3"
              >
                {title || formConfig.settings.title || formConfig.formId}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
                <SubmitStatusMessage
                  status={submitStatus}
                  message={submitMessage}
                />

                {sortedFields.map((field) => (
                  <FormFieldInput
                    key={field.fieldId}
                    field={field}
                    value={formData[field.name] || ""}
                    error={errors[field.name]}
                    formData={formData}
                    isSubmitting={isSubmitting}
                    onChange={handleChange}
                  />
                ))}

                {formConfig.settings.showVerification && (
                  <VerificationInput
                    verificationQuestion={verificationQuestion}
                    userVerificationAnswer={userVerificationAnswer}
                    isVerified={isVerified}
                    error={errors.verification}
                    isSubmitting={isSubmitting}
                    onChange={(e) =>
                      handleVerificationChange(e.target.value, setErrors)
                    }
                    onRefresh={generateVerification}
                  />
                )}

                <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium rounded-md sm:rounded-lg text-xs sm:text-sm md:text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                    aria-label="Cancel form"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-white font-semibold rounded-md sm:rounded-lg text-xs sm:text-sm md:text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-95"
                    style={{
                      backgroundColor: formConfig.settings.buttonColor || "#2563eb",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.filter = "brightness(1.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.filter = "brightness(1)";
                      }
                    }}
                    aria-label={
                      isSubmitting ? "Submitting form" : "Submit form"
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner
                          className="animate-spin text-xs sm:text-sm"
                          aria-hidden="true"
                        />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>
                        {capitalizeButtonText(
                          formConfig.settings.buttonText || "Submit"
                        )}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (inline) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      {formContent}
    </div>
  );
};

export default FormRenderer;
