"use client";

import React, { useEffect, useState, useRef } from "react";
import CongratulationsModal from "./CongratulationsModal";
import ProgressBar from "./ProgressBar";
import {
  checkSubjectCongratulationsShown,
  markSubjectCongratulationsShown,
} from "@/lib/congratulations";
import api from "@/lib/api";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const SubjectProgressClient = ({
  subjectId,
  subjectName,
  unitIds = [],
  initialProgress = 0,
}) => {
  const [progress, setProgress] = useState(initialProgress);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [congratulationsShown, setCongratulationsShown] = useState(false);
  const prevProgressRef = useRef(initialProgress);
  const isInitializedRef = useRef(false);
  const isCheckingRef = useRef(false);

  // Reset initialization flag when subjectId or unitIds change
  useEffect(() => {
    isInitializedRef.current = false;
    prevProgressRef.current = initialProgress;
  }, [subjectId, unitIds.length, initialProgress]);

  useEffect(() => {
    if (unitIds.length === 0) {
      setProgress(0);
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
      if (!authStatus) return null;

      try {
        const token = localStorage.getItem("student_token");
        if (!token) return null;

        // Fetch progress for all units
        const unitProgressPromises = unitIds.map(async (unitId) => {
          try {
            const response = await fetch(
              `${basePath}/api/student/progress?unitId=${unitId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data && data.data.length > 0) {
                const progressDoc = data.data[0];
                return progressDoc.unitProgress || 0;
              }
            }
          } catch (error) {
            console.error(`Error fetching progress for unit ${unitId}:`, error);
          }
          return 0;
        });

        const unitProgresses = await Promise.all(unitProgressPromises);
        const totalProgress = unitProgresses.reduce((sum, p) => sum + p, 0);
        return Math.round(totalProgress / unitIds.length);
      } catch (error) {
        console.error("Error fetching progress from database:", error);
      }
      return null;
    };

    // Calculate subject progress from all units
    // Method: Sum of all unit progress / Total number of units
    // Example: 4 units with progress [80%, 60%, 0%, 0%] = (80+60+0+0) / 4 = 35%
    // IMPORTANT: Includes ALL units (even those with 0% progress) for accurate calculation
    const calculateProgress = async () => {
      try {
        // Try to fetch from database first if authenticated
        if (authStatus) {
          const dbProgress = await fetchProgressFromDB();
          if (dbProgress !== null) {
            setProgress(dbProgress);

            // On first check (initialization), set prevProgress to current progress
            // This prevents showing modal when visiting a page where subject is already completed
            if (!isInitializedRef.current && !isCheckingRef.current) {
              isCheckingRef.current = true;
              checkSubjectCongratulationsShown(subjectId).then((hasShown) => {
                setCongratulationsShown(hasShown);
                prevProgressRef.current = dbProgress;
                isInitializedRef.current = true;
                // If already shown before, ensure modal is closed
                if (hasShown) {
                  setShowCongratulations(false);
                }
                isCheckingRef.current = false;
              });
              return; // Don't show modal on initial load
            }

            // CRITICAL: Only check for modal if initialization is complete
            // This prevents race condition where modal shows before async check completes
            if (!isInitializedRef.current) {
              return; // Don't check for modal until initialization is done
            }

            // Check if we've already shown congratulations for this completion
            const wasCompleted = prevProgressRef.current === 100;
            const isNowCompleted = dbProgress === 100;

            // Show congratulations only if:
            // 1. Progress just reached exactly 100% (wasn't 100% before)
            // 2. We haven't shown the modal for this completion yet
            // 3. Initialization is complete (prevents showing on page visit)
            if (
              isNowCompleted &&
              !wasCompleted &&
              !congratulationsShown &&
              isInitializedRef.current
            ) {
              setShowCongratulations(true);
              // Mark as shown in database
              markSubjectCongratulationsShown(subjectId).then((success) => {
                if (success) {
                  setCongratulationsShown(true);
                }
              });
            }
            prevProgressRef.current = dbProgress;

            // Save subject progress to database
            try {
              // Get token for authorization header
              const token = localStorage.getItem("student_token");
              if (!token) {
                console.error("No token available for saving subject progress");
                return;
              }

              const saveResponse = await fetch(
                `${basePath}/api/student/progress/subject`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    subjectId,
                    subjectProgress: dbProgress,
                  }),
                }
              );

              if (!saveResponse.ok) {
                console.error("Failed to save subject progress to database");
              }
            } catch (error) {
              console.error(
                "Error saving subject progress to database:",
                error
              );
            }

            return;
          }
        }

        // If not authenticated, set progress to 0 (no localStorage fallback)
        const subjectProgress = 0;

        // On first check (initialization), set prevProgress to current progress
        if (!isInitializedRef.current && !isCheckingRef.current) {
          isCheckingRef.current = true;
          checkSubjectCongratulationsShown(subjectId).then((hasShown) => {
            setCongratulationsShown(hasShown);
            setProgress(subjectProgress);
            prevProgressRef.current = subjectProgress;
            isInitializedRef.current = true;
            if (hasShown) {
              setShowCongratulations(false);
            }
            isCheckingRef.current = false;
          });
          return;
        }

        setProgress(subjectProgress);
        prevProgressRef.current = subjectProgress;
      } catch (error) {
        console.error("Error calculating subject progress:", error);
        setProgress(0);
      }
    };

    // Check on mount
    calculateProgress();

    // Listen for custom progress-updated event (from unit progress updates)
    const handleProgressUpdate = async () => {
      await calculateProgress();
    };

    // Also listen for chapterProgressUpdate event
    const handleChapterProgressUpdate = async () => {
      await calculateProgress();
    };

    window.addEventListener("progress-updated", handleProgressUpdate);
    window.addEventListener(
      "chapterProgressUpdate",
      handleChapterProgressUpdate
    );

    // Poll for changes when authenticated (to sync with DB updates from other tabs)
    // Poll less frequently to improve performance
    const pollInterval = authStatus ? 5000 : null; // Only poll when authenticated
    let interval = null;
    if (pollInterval) {
      interval = setInterval(calculateProgress, pollInterval);
    }

    return () => {
      window.removeEventListener("progress-updated", handleProgressUpdate);
      window.removeEventListener(
        "chapterProgressUpdate",
        handleChapterProgressUpdate
      );
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [subjectId, unitIds, isAuthenticated, congratulationsShown]);

  return (
    <>
      <div className="w-full md:w-auto text-left md:text-right">
        <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
          Subject Progress
        </p>
        <ProgressBar
          progress={progress}
          size="lg"
          showLabel={true}
          labelPosition="left"
          variant="emerald"
          className="w-full max-w-[140px] sm:max-w-[160px] md:ml-auto"
        />
      </div>

      {/* Congratulations Modal for Subject Completion */}
      <CongratulationsModal
        isOpen={showCongratulations}
        onClose={() => setShowCongratulations(false)}
        subjectName={subjectName}
        type="subject"
      />
    </>
  );
};

export default SubjectProgressClient;