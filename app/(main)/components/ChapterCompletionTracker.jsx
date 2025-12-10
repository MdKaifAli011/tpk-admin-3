"use client";

import React, { useEffect, useState, useRef } from "react";
import CongratulationsModal from "./CongratulationsModal";
import {
  checkChapterCongratulationsShown,
  markChapterCongratulationsShown,
} from "@/lib/congratulations";

const ChapterCompletionTracker = ({ chapterId, chapterName, unitId }) => {
  const [showModal, setShowModal] = useState(false);
  const previousProgressRef = useRef(null); // Use ref to avoid dependency issues
  const congratulationsShownRef = useRef(false); // Use ref to avoid dependency issues
  const isInitializedRef = useRef(false);
  const isCheckingRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Reset initialization flag when chapterId or unitId changes
  useEffect(() => {
    // Abort any pending async operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    isInitializedRef.current = false;
    isCheckingRef.current = false;
    previousProgressRef.current = null;
    congratulationsShownRef.current = false;
    setShowModal(false);
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [chapterId, unitId]);

  useEffect(() => {
    if (!chapterId || !unitId) return;

    const storageKey = `unit-progress-${unitId}`;

    const checkProgress = async () => {
      try {
        // Check if student is authenticated
        const token = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
        let chapterProgress = 0;

        if (token) {
          // Fetch from database
          try {
            const response = await fetch(`/api/student/progress?unitId=${unitId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data && data.data.length > 0) {
                const progressDoc = data.data[0];
                const chapterData = progressDoc.progress?.[chapterId];
                if (chapterData) {
                  chapterProgress = chapterData.progress || 0;
                }
              }
            }
          } catch (error) {
            console.error("Error fetching progress from database:", error);
          }
        }

        // Fallback to localStorage if not authenticated or if database doesn't have data
        if (chapterProgress === 0 && typeof window !== "undefined") {
          try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              try {
                const data = JSON.parse(stored);
                const chapterData = data[chapterId];
                if (chapterData) {
                  chapterProgress = chapterData.progress || 0;
                }
              } catch (parseError) {
                // Handle JSON parsing errors
                if (parseError instanceof SyntaxError) {
                  console.error("Error parsing progress from localStorage:", parseError);
                  // Clear corrupted data
                  try {
                    localStorage.removeItem(storageKey);
                  } catch (clearError) {
                    console.error("Error clearing corrupted localStorage:", clearError);
                  }
                } else {
                  console.error("Error parsing progress from localStorage:", parseError);
                }
              }
            }
          } catch (error) {
            // Handle localStorage access errors (quota, disabled, etc.)
            if (error.name === 'QuotaExceededError') {
              console.error("localStorage quota exceeded");
            } else {
              console.error("Error accessing localStorage:", error);
            }
          }
        }

        // On first check (initialization), set previousProgress to current progress
        // This prevents showing modal when visiting a page where chapter is already completed
        // IMPORTANT: Once shown, NEVER show again, even on page reload or revisit
        if (!isInitializedRef.current && !isCheckingRef.current) {
          isCheckingRef.current = true;
          const controller = abortControllerRef.current;
          
          checkChapterCongratulationsShown(chapterId, unitId)
            .then((hasShown) => {
              if (controller && controller.signal.aborted) return;
              
              congratulationsShownRef.current = hasShown;
              previousProgressRef.current = chapterProgress;
              isInitializedRef.current = true;
              // If already shown before, ensure modal is closed
              if (hasShown) {
                setShowModal(false);
              }
              isCheckingRef.current = false;
            })
            .catch((error) => {
              if (controller && controller.signal.aborted) return;
              console.error("Error checking chapter congratulations:", error);
              // On error, mark as initialized to prevent blocking
              isInitializedRef.current = true;
              congratulationsShownRef.current = false;
              previousProgressRef.current = chapterProgress;
              isCheckingRef.current = false;
            });
          return; // Don't show modal on initial load
        }

        // CRITICAL: Only check for modal if initialization is complete
        // This prevents race condition where modal shows before async check completes
        if (!isInitializedRef.current) {
          return; // Don't check for modal until initialization is done
        }

        // Check if we've already shown the modal for this completion
        const wasCompleted = previousProgressRef.current === 100;
        const isNowCompleted = chapterProgress === 100;

        // Show modal only if:
        // 1. Progress just reached exactly 100% (wasn't 100% before)
        // 2. We haven't shown the modal for this completion yet
        // 3. Initialization is complete (prevents showing on page visit)
        if (isNowCompleted && !wasCompleted && !congratulationsShownRef.current && isInitializedRef.current) {
          setShowModal(true);
          // Mark as shown in database
          markChapterCongratulationsShown(chapterId, unitId)
            .then((success) => {
              if (success) {
                congratulationsShownRef.current = true;
              }
            })
            .catch((error) => {
              console.error("Error marking chapter congratulations:", error);
            });
        }

        previousProgressRef.current = chapterProgress;
      } catch (error) {
        console.error("Error checking chapter progress:", error);
      }
    };

    // Initial check (will set previousProgress but not show modal)
    checkProgress();

    // Listen for storage events
    const handleStorageChange = (e) => {
      if (e.key === storageKey) {
        checkProgress();
      }
    };

    // Listen for custom progress-updated event
    const handleProgressUpdate = (event) => {
      // Check progress on any progress update (could be from chapter completion)
      if (event.detail?.chapterId === chapterId || event.detail?.unitId === unitId) {
        checkProgress();
      }
    };

    // Also listen for chapterProgressUpdate event
    const handleChapterProgressUpdate = () => {
      checkProgress();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("progress-updated", handleProgressUpdate);
      window.addEventListener("chapterProgressUpdate", handleChapterProgressUpdate);
    }

    // Poll for changes as backup - reduced frequency to improve performance
    // Only poll when page is visible
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === 'visible') {
        checkProgress();
      }
    }, 3000);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("progress-updated", handleProgressUpdate);
        window.removeEventListener("chapterProgressUpdate", handleChapterProgressUpdate);
      }
      clearInterval(interval);
    };
  }, [chapterId, unitId]); // Removed previousProgress and congratulationsShown to prevent infinite loops

  return (
    <CongratulationsModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      chapterName={chapterName}
      type="chapter"
    />
  );
};

export default ChapterCompletionTracker;

