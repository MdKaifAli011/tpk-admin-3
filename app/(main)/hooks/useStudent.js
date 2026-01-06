"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "../../../utils/logger.js";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/**
 * Custom hook to fetch and manage student data from the database
 * Replaces localStorage usage for student data
 */
export const useStudent = () => {
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get student token
  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("student_token");
  }, []);

  // Check if student is authenticated
  const isAuthenticated = useCallback(() => {
    return !!getToken();
  }, [getToken]);

  // Fetch student data from API
  const fetchStudent = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setStudent(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${basePath}/api/student/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.student) {
          setStudent(data.data.student);
        } else {
          setStudent(null);
          // Token might be invalid, clear it
          if (typeof window !== "undefined") {
            localStorage.removeItem("student_token");
          }
        }
      } else {
        // Token invalid or expired
        setStudent(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("student_token");
        }
      }
    } catch (err) {
      logger.error("Error fetching student data:", err);
      setError("Failed to load student data");
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // Logout - clear token and student data
  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("student_token");
    }
    setStudent(null);
    setError(null);
  }, []);

  // Refresh student data
  const refresh = useCallback(() => {
    return fetchStudent();
  }, [fetchStudent]);

  // Fetch student data on mount and when token changes
  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  // Listen for student-login event to refresh student data immediately
  useEffect(() => {
    const handleStudentLogin = () => {
      // Small delay to ensure token is stored in localStorage
      setTimeout(() => {
        fetchStudent();
      }, 100);
    };

    window.addEventListener("student-login", handleStudentLogin);
    // Also listen for storage changes (for cross-tab login)
    const handleStorageChange = (e) => {
      if (e.key === "student_token") {
        fetchStudent();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("student-login", handleStudentLogin);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fetchStudent]);

  return {
    student,
    isLoading,
    error,
    isAuthenticated: isAuthenticated(),
    refresh,
    logout,
    getToken,
  };
};
