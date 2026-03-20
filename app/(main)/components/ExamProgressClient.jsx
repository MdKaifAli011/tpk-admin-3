"use client";

import React, { useEffect, useState } from "react";
import { logger } from "../../../utils/logger.js";
import ProgressBar from "./ProgressBar";

/**
 * ExamProgressClient - Client component to fetch and display exam progress
 * Exam progress = Average of all subject progress for that exam
 * Fetches from database (not localStorage) for accurate progress tracking
 */
// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
const ExamProgressClient = ({ examId, initialProgress = 0 }) => {
  const [progress, setProgress] = useState(initialProgress);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!examId) {
      setProgress(0);
      setIsLoading(false);
      return;
    }

    // Check if student is authenticated
    const checkAuth = () => {
      if (typeof window === "undefined") return false;
      return !!localStorage.getItem("student_token");
    };

    const authStatus = checkAuth();
    setIsAuthenticated(authStatus);

    // Fetch progress from database if authenticated — defer until after first paint to avoid competing with LCP
    const fetchProgressFromDB = async () => {
      if (!authStatus) {
        setProgress(0);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const token = localStorage.getItem("student_token");
        if (!token) {
          setProgress(0);
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${basePath}/api/student/progress/exam?examId=${examId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.examProgress !== undefined) {
            setProgress(data.data.examProgress);
          } else {
            setProgress(0);
          }
        } else {
          // If 401/403, user might not be authenticated
          if (response.status === 401 || response.status === 403) {
            setIsAuthenticated(false);
          }
          setProgress(0);
        }
      } catch (error) {
        logger.error("Error fetching exam progress:", error);
        setProgress(0);
      } finally {
        setIsLoading(false);
      }
    };

    const runAfterPaint = () => {
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          requestAnimationFrame(fetchProgressFromDB);
        });
      } else {
        setTimeout(fetchProgressFromDB, 100);
      }
    };

    const timeoutId = setTimeout(runAfterPaint, 0);

    // Listen for progress updates from other components
    const handleProgressUpdate = () => {
      fetchProgressFromDB();
    };

    window.addEventListener("progress-updated", handleProgressUpdate);
    window.addEventListener("chapterProgressUpdate", handleProgressUpdate);

    // Poll for updates (less frequently than subject/unit progress)
    const pollInterval = setInterval(fetchProgressFromDB, 10000); // 10 seconds

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("progress-updated", handleProgressUpdate);
      window.removeEventListener("chapterProgressUpdate", handleProgressUpdate);
      clearInterval(pollInterval);
    };
  }, [examId, isAuthenticated]);

  return (
    <div className="text-right min-h-[44px] flex flex-col justify-center" aria-label="Exam progress">
      <p className="text-[10px] text-gray-600 mb-1">Progress</p>
      <ProgressBar
        progress={progress}
        size="md"
        showLabel={true}
        labelPosition="left"
        variant="blue"
        isLoading={isLoading}
        className="justify-end"
      />
    </div>
  );
};

export default ExamProgressClient;

