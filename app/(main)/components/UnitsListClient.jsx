"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FaCheck, FaEye } from "react-icons/fa";
import { createSlug as createSlugUtil } from "@/utils/slug";
import { logger } from "@/utils/logger";
import api from "@/lib/api";

const UnitsListClient = ({ units, subjectId, examSlug, subjectSlug }) => {
  const [progressData, setProgressData] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if student is authenticated
  const checkAuth = () => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("student_token");
  };

  // Fetch unit progress from database
  const fetchUnitProgressFromDB = async (unitId) => {
    if (!isAuthenticated) return null;

    try {
      if (typeof window === "undefined") return null;

      // Note: Token injection is handled by api interceptor
      const response = await api.get(`/student/progress?unitId=${unitId}`);

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const progressDoc = response.data.data[0];
        return progressDoc.unitProgress || 0;
      }
    } catch (error) {
      // 401 is handled by api interceptor (redirects if needed)
      // For other errors, just log
      if (error.response?.status !== 401) {
        logger.error(`Error fetching progress for unit ${unitId}:`, error);
      } else {
        setIsAuthenticated(false);
      }
    }
    return null;
  };

  const getUnitProgress = async (unitId) => {
    // Use state if available
    if (progressData[unitId] !== undefined) {
      return progressData[unitId];
    }

    // Try to fetch from database first if authenticated
    if (isAuthenticated) {
      const dbProgress = await fetchUnitProgressFromDB(unitId);
      if (dbProgress !== null) {
        return {
          progress: dbProgress,
          isCompleted: dbProgress === 100,
        };
      }
    }

    // Fallback to localStorage
    if (typeof window === "undefined")
      return { progress: 0, isCompleted: false };

    try {
      const storageKey = `unit-progress-${unitId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if unit progress is already calculated
        if (data._unitProgress !== undefined) {
          return {
            progress: data._unitProgress,
            isCompleted: data._unitProgress === 100,
          };
        }
        // Calculate from chapters (fallback)
        // Note: This uses only chapters with progress data, which may differ from API
        // For consistency, should fetch all chapters from API, but this is fallback
        const chapterKeys = Object.keys(data).filter(
          (key) => !key.startsWith("_")
        );
        if (chapterKeys.length > 0) {
          const totalProgress = chapterKeys.reduce((sum, key) => {
            return sum + (data[key]?.progress || 0);
          }, 0);
          const avgProgress = Math.round(totalProgress / chapterKeys.length);
          return {
            progress: avgProgress,
            isCompleted: avgProgress === 100,
          };
        }
      }
    } catch (error) {
      // Handle specific localStorage errors
      if (error instanceof SyntaxError) {
        logger.error(`Invalid JSON in localStorage for unit ${unitId}:`, error);
        // Clear corrupted data
        try {
          localStorage.removeItem(`unit-progress-${unitId}`);
        } catch (clearError) {
          logger.error(`Error clearing corrupted localStorage:`, clearError);
        }
      } else if (error.name === "QuotaExceededError") {
        logger.error(`localStorage quota exceeded for unit ${unitId}`);
      } else {
        logger.error(`Error reading progress for unit ${unitId}:`, error);
      }
    }
    return { progress: 0, isCompleted: false };
  };

  // Update progress data for all units
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const authStatus = checkAuth();
    setIsAuthenticated(authStatus);

    const updateProgress = async () => {
      if (!isMounted) return;

      try {
        const newProgressData = {};
        // Use Promise.all to wait for all async operations
        const progressPromises = units.map(async (unit) => {
          try {
            const progress = await getUnitProgress(unit._id);
            return { unitId: unit._id, progress };
          } catch (error) {
            logger.error(`Error getting progress for unit ${unit._id}:`, error);
            return {
              unitId: unit._id,
              progress: { progress: 0, isCompleted: false },
            };
          }
        });

        const results = await Promise.all(progressPromises);

        if (!isMounted) return;

        const newData = {};
        results.forEach(({ unitId, progress }) => {
          newData[unitId] = progress;
        });

        setProgressData(newData);
      } catch (error) {
        logger.error("Error updating progress:", error);
        if (isMounted) {
          // Set default values on error
          const defaultData = {};
          units.forEach((unit) => {
            defaultData[unit._id] = { progress: 0, isCompleted: false };
          });
          setProgressData(defaultData);
        }
      }
    };

    // Initial update
    updateProgress();

    // Listen for storage events
    const handleStorageChange = async (e) => {
      if (!isMounted) return;
      if (e.key && e.key.startsWith("unit-progress-")) {
        await updateProgress();
      }
    };

    // Listen for custom progress-updated event
    const handleProgressUpdate = async () => {
      if (!isMounted) return;
      await updateProgress();
    };

    // Also listen for chapterProgressUpdate event
    const handleChapterProgressUpdate = async () => {
      if (!isMounted) return;
      await updateProgress();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("progress-updated", handleProgressUpdate);
      window.addEventListener(
        "chapterProgressUpdate",
        handleChapterProgressUpdate
      );
    }

    // Poll for changes as backup - reduced frequency to improve performance
    // Only poll when component is visible and authenticated
    const pollInterval = authStatus ? 5000 : 3000;
    const interval = setInterval(() => {
      if (isMounted && document.visibilityState === "visible") {
        updateProgress();
      }
    }, pollInterval);

    return () => {
      isMounted = false;
      abortController.abort();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("progress-updated", handleProgressUpdate);
        window.removeEventListener(
          "chapterProgressUpdate",
          handleChapterProgressUpdate
        );
      }
      clearInterval(interval);
    };
  }, [units, isAuthenticated]);

  const colorVariants = {
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    black: "bg-black",
    indigo: "bg-indigo-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
  };

  const getColor = (index) => {
    const colors = ["blue", "blue", "yellow", "green", "black"];
    return colorVariants[colors[index % colors.length]] || colorVariants.blue;
  };

  if (units.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900 sm:text-base mb-1">
          No units available
        </p>
        <p className="text-xs text-gray-500 sm:text-sm">
          Units will appear here once they are added to this subject.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {units.map((unit, index) => {
        const unitSlug = unit.slug || createSlugUtil(unit.name);
        const unitUrl = `/${examSlug}/${subjectSlug}/${unitSlug}`;
        // Use progressData from state (always populated before render)
        // Never call async function in render
        const unitProgressData = progressData[unit._id] || {
          progress: 0,
          isCompleted: false,
        };
        const progressPercent = Math.min(
          100,
          Math.max(0, unitProgressData.progress || 0)
        );
        const progressLabel = Math.round(progressPercent);
        const isCompleted = unitProgressData.isCompleted || false;
        const weightage = unit.weightage ?? "20%";
        const engagement = unit.engagement ?? "2.2K";
        const indicatorColor = getColor(index);

        const statusMarkup = isCompleted ? (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-emerald-200 bg-emerald-500 text-white">
            <FaCheck className="text-xs" />
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-400">Progress</span>
        );

        return (
          <div
            key={unit._id}
            className="block px-4 py-4 transition-colors hover:bg-gray-50 sm:px-6"
          >
            <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_140px_180px] sm:items-center sm:gap-6">
              {/* Unit Name Section */}
              <div className="flex items-start gap-3">
                <span
                  className={`hidden sm:block w-1 self-stretch rounded-full ${indicatorColor}`}
                  aria-hidden="true"
                />
                <span
                  className={`block h-0.5 w-12 rounded-full ${indicatorColor} sm:hidden`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <Link href={unitUrl} className="block">
                    <p className="text-sm font-semibold text-gray-900 sm:text-base hover:text-indigo-600 transition-colors">
                      {unit.name}
                    </p>
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 sm:text-sm">
                    <span className="font-medium text-emerald-600">
                      Weightage: {weightage}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FaEye className="text-gray-400" />
                      {engagement}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex items-center justify-start sm:justify-center">
                {statusMarkup}
              </div>

              {/* Progress Section */}
              <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-gray-200 sm:w-48">
                  <div
                    className={`h-full transition-all duration-300 ${progressPercent >= 100
                        ? "bg-emerald-500"
                        : progressPercent >= 50
                          ? "bg-emerald-400"
                          : "bg-emerald-300"
                      }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="min-w-[3rem] sm:min-w-[3.5rem] text-right text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                  {progressLabel}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UnitsListClient;
