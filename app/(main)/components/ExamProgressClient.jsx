"use client";

import React, { useEffect, useState } from "react";
import { logger } from "../../../utils/logger.js";

/**
 * ExamProgressClient - Client component to fetch and display exam progress
 * Exam progress = Average of all subject progress for that exam
 * Fetches from database (not localStorage) for accurate progress tracking
 */
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

    // Fetch progress from database if authenticated
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

        const response = await fetch(`/api/student/progress/exam?examId=${examId}`, {
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

    fetchProgressFromDB();

    // Listen for progress updates from other components
    const handleProgressUpdate = () => {
      fetchProgressFromDB();
    };

    window.addEventListener("progress-updated", handleProgressUpdate);
    window.addEventListener("chapterProgressUpdate", handleProgressUpdate);

    // Poll for updates (less frequently than subject/unit progress)
    const pollInterval = setInterval(fetchProgressFromDB, 10000); // 10 seconds

    return () => {
      window.removeEventListener("progress-updated", handleProgressUpdate);
      window.removeEventListener("chapterProgressUpdate", handleProgressUpdate);
      clearInterval(pollInterval);
    };
  }, [examId, isAuthenticated]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="text-right">
        <p className="text-[10px] text-gray-500 mb-1">Progress</p>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-400">...</span>
          <div className="w-20 sm:w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gray-300 animate-pulse" style={{ width: "30%" }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <p className="text-[10px] text-gray-500 mb-1">Progress</p>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm text-gray-700">{progress}%</span>
        <div className="w-20 sm:w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ${
              progress >= 100 ? "from-emerald-500 to-emerald-600" : ""
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ExamProgressClient;

