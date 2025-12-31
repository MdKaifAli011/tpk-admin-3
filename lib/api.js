import axios from "axios";
import { API_CONFIG, ERROR_MESSAGES } from "../constants/index.js";
import { logger } from "../utils/logger.js";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

// Create axios instance with default config
// Note: Request deduplication should be handled at the component/hook level
// (e.g., in useDataFetching, useOptimizedFetch) rather than in interceptors
const api = axios.create({
  baseURL: `${basePath}/api`,
  timeout: API_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor with deduplication
api.interceptors.request.use(
  (config) => {
    // Add auth tokens here if needed
    if (typeof window !== "undefined") {
      const studentToken = localStorage.getItem("student_token");
      const adminToken = localStorage.getItem("token");

      const isStudentApi = config.url?.includes("/student/") ||
        config.url?.includes("/discussion/") ||
        (config.url?.includes("/blog/") && config.url?.includes("/comment") && config.method === "post");

      // For discussion routes, allow both tokens, prioritizing student if it exists for normal usage, 
      // but admin token is crucial for moderation views.
      const token = isStudentApi ? (studentToken || adminToken) : adminToken;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    logger.error("Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor with improved error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      ERROR_MESSAGES.API_ERROR;

    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const isStudentApi = error.config?.url?.includes("/student/");
        const isStudentAuth = error.config?.url?.includes("/student/auth");
        const isStudentPage =
          currentPath.includes("/login") || currentPath.includes("/register");
        const isAdminPage = currentPath.includes("/admin");

        // Handle admin token removal and redirect
        if (isAdminPage && !isStudentPage) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          // Only redirect if not already on admin login/register page
          if (
            !currentPath.includes("/admin/login") &&
            !currentPath.includes("/admin/register")
          ) {
            window.location.href = `${basePath}/admin/login`;
          }
        }
        // Handle student token removal and redirect
        else if (isStudentApi && !isStudentAuth && !isStudentPage) {
          // Clear student token if API call failed (student deleted or inactive)
          localStorage.removeItem("student_token");
          // Only redirect if not already on student login/register page
          if (
            !currentPath.includes("/login") &&
            !currentPath.includes("/register")
          ) {
            window.location.href = `${basePath}/login`;
          }
        }
      }
    } else if (error.response?.status === 403) {
      // Handle forbidden - use logger instead of console
      logger.warn("Access forbidden:", errorMessage);
    } else if (error.response?.status === 500) {
      logger.error("Server error:", errorMessage);
    } else if (error.code === "ECONNABORTED") {
      logger.error("Request timeout");
      return Promise.reject(new Error(ERROR_MESSAGES.TIMEOUT_ERROR));
    } else if (!error.response) {
      // Only log network errors when there's truly no response (actual network issue)
      logger.error(
        "Network error:",
        error.message || "No response from server"
      );
      return Promise.reject(new Error(ERROR_MESSAGES.NETWORK_ERROR));
    }

    // For errors with response (400, 404, etc.), pass through the original error
    // so calling code can handle them appropriately
    return Promise.reject(error);
  }
);

// Submit download form (unlock downloads)
export const submitDownloadForm = async (formData) => {
  const isServer = typeof window === "undefined";

  if (isServer) {
    return { success: false, message: "Cannot submit form on server" };
  }

  try {
    // Store form data in localStorage to unlock downloads
    localStorage.setItem("download_form_submitted", "true");
    localStorage.setItem("download_form_data", JSON.stringify(formData));

    // Optionally send to API if you want to track submissions
    // const response = await api.post("/download/form", formData);
    // if (response.data.success) {
    //   return { success: true, data: response.data.data };
    // }

    return { success: true, message: "Form submitted successfully" };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to submit form",
    };
  }
};

// Check if download form is submitted
export const isDownloadFormSubmitted = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("download_form_submitted") === "true";
};

export default api;
