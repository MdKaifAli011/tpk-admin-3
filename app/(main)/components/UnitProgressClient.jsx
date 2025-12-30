"use client";

import React, { useEffect, useState, useRef } from "react";
import CongratulationsModal from "./CongratulationsModal";
import ProgressBar from "./ProgressBar";
import { logger } from "@/utils/logger";
import {
  checkUnitCongratulationsShown,
  markUnitCongratulationsShown,
} from "@/lib/congratulations";
// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";


const UnitProgressClient = ({ unitId, unitName, initialProgress = 0 }) => {
  const [progress, setProgress] = useState(initialProgress);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [congratulationsShown, setCongratulationsShown] = useState(false);
  const prevProgressRef = useRef(initialProgress);
  const isInitializedRef = useRef(false);
  const isCheckingRef = useRef(false);
  const congratulationsShownRef = useRef(false); // Use ref to avoid dependency issues
  const abortControllerRef = useRef(null);
  
  // Reset initialization flag when unitId changes
  useEffect(() => {
    // Abort any pending async operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    isInitializedRef.current = false;
    isCheckingRef.current = false;
    prevProgressRef.current = initialProgress;
    congratulationsShownRef.current = false;
    setCongratulationsShown(false);
    setShowCongratulations(false);
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [unitId, initialProgress]);

  useEffect(() => {
    // Check if student is authenticated
    const checkAuth = () => {
      if (typeof window === "undefined") return false;
      return !!localStorage.getItem("student_token");
    };

    const authStatus = checkAuth();
    setIsAuthenticated(authStatus);

    const storageKey = `unit-progress-${unitId}`;

    // Fetch progress from database if authenticated
    const fetchProgressFromDB = async () => {
      if (!authStatus) return null;

      try {
        const token = localStorage.getItem("student_token");
        if (!token) return null;

        const response = await fetch(`${basePath}/api/student/progress?unitId=${unitId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            const progressDoc = data.data[0];
            return progressDoc.unitProgress || 0;
          }
        }
      } catch (error) {
        logger.error("Error fetching progress from database:", error);
      }
      return null;
    };

    // Calculate unit progress from chapters in localStorage (fallback)
    const calculateProgress = async () => {
      try {
        // Try to fetch from database first if authenticated
        if (authStatus) {
          const dbProgress = await fetchProgressFromDB();
          if (dbProgress !== null) {
            setProgress(dbProgress);
            
            // On first check (initialization), set prevProgress to current progress
            // This prevents showing modal when visiting a page where unit is already completed
            // IMPORTANT: Once shown, NEVER show again, even on page reload or revisit
            if (!isInitializedRef.current && !isCheckingRef.current) {
              isCheckingRef.current = true;
              const controller = abortControllerRef.current;
              
              checkUnitCongratulationsShown(unitId)
                .then((hasShown) => {
                  if (controller && controller.signal.aborted) return;
                  
                  congratulationsShownRef.current = hasShown;
                  setCongratulationsShown(hasShown);
                  prevProgressRef.current = dbProgress;
                  isInitializedRef.current = true;
                  // If already shown before, ensure modal is closed
                  if (hasShown) {
                    setShowCongratulations(false);
                  }
                  isCheckingRef.current = false;
                })
                .catch((error) => {
                  if (controller && controller.signal.aborted) return;
                  console.error("Error checking unit congratulations:", error);
                  // On error, mark as initialized to prevent blocking
                  isInitializedRef.current = true;
                  congratulationsShownRef.current = false;
                  isCheckingRef.current = false;
                });
              return dbProgress; // Don't show modal on initial load
            }
            
            // CRITICAL: Only check for modal if initialization is complete
            // This prevents race condition where modal shows before async check completes
            if (!isInitializedRef.current) {
              return dbProgress; // Don't check for modal until initialization is done
            }

            // Check if we've already shown congratulations for this completion
            const wasCompleted = prevProgressRef.current === 100;
            const isNowCompleted = dbProgress === 100;
            
            // Show congratulations only if:
            // 1. Progress just reached exactly 100% (wasn't 100% before)
            // 2. We haven't shown the modal for this completion yet
            // 3. Initialization is complete (prevents showing on page visit)
            if (isNowCompleted && !wasCompleted && !congratulationsShownRef.current && isInitializedRef.current) {
              setShowCongratulations(true);
              // Mark as shown in database
              markUnitCongratulationsShown(unitId)
                .then((success) => {
                  if (success) {
                    congratulationsShownRef.current = true;
                    setCongratulationsShown(true);
                  }
                })
                .catch((error) => {
                  console.error("Error marking unit congratulations:", error);
                });
            }
            prevProgressRef.current = dbProgress;
            return dbProgress;
          }
        }

        // Fallback to localStorage
        let stored;
        try {
          stored = localStorage.getItem(storageKey);
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            logger.error("localStorage quota exceeded");
          } else {
            logger.error("Error accessing localStorage:", error);
          }
          stored = null;
        }
        
        if (stored) {
          let data;
          try {
            data = JSON.parse(stored);
          } catch (error) {
            logger.error("Error parsing progress from localStorage:", error);
            // Clear corrupted data
            try {
              localStorage.removeItem(storageKey);
            } catch (clearError) {
              logger.error("Error clearing corrupted localStorage:", clearError);
            }
            data = null;
          }
          
          if (data) {
          
          // Check if unit progress is already calculated
          if (data._unitProgress !== undefined) {
            const newProgress = data._unitProgress;
            setProgress(newProgress);
            
            // On first check (initialization), set prevProgress to current progress
            // IMPORTANT: Once shown, NEVER show again, even on page reload or revisit
            if (!isInitializedRef.current && !isCheckingRef.current) {
              isCheckingRef.current = true;
              const controller = abortControllerRef.current;
              
              checkUnitCongratulationsShown(unitId)
                .then((hasShown) => {
                  if (controller && controller.signal.aborted) return;
                  
                  congratulationsShownRef.current = hasShown;
                  setCongratulationsShown(hasShown);
                  prevProgressRef.current = newProgress;
                  isInitializedRef.current = true;
                  // If already shown before, ensure modal is closed
                  if (hasShown) {
                    setShowCongratulations(false);
                  }
                  isCheckingRef.current = false;
                })
                .catch((error) => {
                  if (controller && controller.signal.aborted) return;
                  console.error("Error checking unit congratulations:", error);
                  isInitializedRef.current = true;
                  congratulationsShownRef.current = false;
                  isCheckingRef.current = false;
                });
              return newProgress; // Don't show modal on initial load
            }
            
            // CRITICAL: Only check for modal if initialization is complete
            if (!isInitializedRef.current) {
              return newProgress; // Don't check for modal until initialization is done
            }

            // Check if we've already shown congratulations for this completion
            const wasCompleted = prevProgressRef.current === 100;
            const isNowCompleted = newProgress === 100;
            
            // Show congratulations only if:
            // 1. Progress just reached exactly 100% (wasn't 100% before)
            // 2. We haven't shown the modal for this completion yet
            // 3. Initialization is complete (prevents showing on page visit)
            if (isNowCompleted && !wasCompleted && !congratulationsShownRef.current && isInitializedRef.current) {
              setShowCongratulations(true);
              // Mark as shown in database
              markUnitCongratulationsShown(unitId)
                .then((success) => {
                  if (success) {
                    congratulationsShownRef.current = true;
                    setCongratulationsShown(true);
                  }
                })
                .catch((error) => {
                  console.error("Error marking unit congratulations:", error);
                });
            }
            prevProgressRef.current = newProgress;
            return newProgress;
          }
          
          // Calculate from chapters (fallback)
          const chapterKeys = Object.keys(data).filter(key => !key.startsWith('_'));
          if (chapterKeys.length > 0) {
            const totalProgress = chapterKeys.reduce((sum, key) => {
              return sum + (data[key]?.progress || 0);
            }, 0);
            const avgProgress = Math.round(totalProgress / chapterKeys.length);
            setProgress(avgProgress);
            
            // On first check (initialization), set prevProgress to current progress
            // IMPORTANT: Once shown, NEVER show again, even on page reload or revisit
            if (!isInitializedRef.current && !isCheckingRef.current) {
              isCheckingRef.current = true;
              const controller = abortControllerRef.current;
              
              checkUnitCongratulationsShown(unitId)
                .then((hasShown) => {
                  if (controller && controller.signal.aborted) return;
                  
                  congratulationsShownRef.current = hasShown;
                  setCongratulationsShown(hasShown);
                  prevProgressRef.current = avgProgress;
                  isInitializedRef.current = true;
                  // If already shown before, ensure modal is closed
                  if (hasShown) {
                    setShowCongratulations(false);
                  }
                  isCheckingRef.current = false;
                })
                .catch((error) => {
                  if (controller && controller.signal.aborted) return;
                  console.error("Error checking unit congratulations:", error);
                  isInitializedRef.current = true;
                  congratulationsShownRef.current = false;
                  isCheckingRef.current = false;
                });
              return avgProgress; // Don't show modal on initial load
            }
            
            // CRITICAL: Only check for modal if initialization is complete
            if (!isInitializedRef.current) {
              return avgProgress; // Don't check for modal until initialization is done
            }

            // Check if we've already shown congratulations for this completion
            const wasCompleted = prevProgressRef.current === 100;
            const isNowCompleted = avgProgress === 100;
            
            // Show congratulations only if:
            // 1. Progress just reached exactly 100% (wasn't 100% before)
            // 2. We haven't shown the modal for this completion yet
            // 3. Initialization is complete (prevents showing on page visit)
            if (isNowCompleted && !wasCompleted && !congratulationsShownRef.current && isInitializedRef.current) {
              setShowCongratulations(true);
              // Mark as shown in database
              markUnitCongratulationsShown(unitId)
                .then((success) => {
                  if (success) {
                    congratulationsShownRef.current = true;
                    setCongratulationsShown(true);
                  }
                })
                .catch((error) => {
                  console.error("Error marking unit congratulations:", error);
                });
            }
            prevProgressRef.current = avgProgress;
            return avgProgress;
          }
          }
          
          // If no valid data or parsing failed, set to 0
          setProgress(0);
          if (!isInitializedRef.current) {
            prevProgressRef.current = 0;
            isInitializedRef.current = true;
          }
          return 0;
        } else {
          setProgress(0);
          if (!isInitializedRef.current) {
            prevProgressRef.current = 0;
            isInitializedRef.current = true;
          }
          return 0;
        }
      } catch (error) {
        logger.error("Error reading progress:", error);
        setProgress(0);
        prevProgressRef.current = 0;
        return 0;
      }
    };

    // Check on mount
    calculateProgress();

    // Listen for custom progress-updated event
    const handleProgressUpdate = async (event) => {
      if (event.detail?.unitId === unitId) {
        const newProgress = event.detail.unitProgress;
        setProgress(newProgress);
        
        // CRITICAL: Only check for modal if initialization is complete
        if (!isInitializedRef.current) {
          prevProgressRef.current = newProgress;
          return; // Don't check for modal until initialization is done
        }
        
        // Check if we've already shown congratulations for this completion
        const wasCompleted = prevProgressRef.current === 100;
        const isNowCompleted = newProgress === 100;
        
        // Show congratulations only if:
        // 1. Progress just reached exactly 100% (wasn't 100% before)
        // 2. We haven't shown the modal for this completion yet
        // 3. Initialization is complete (prevents showing on page visit)
        if (isNowCompleted && !wasCompleted && !congratulationsShownRef.current && isInitializedRef.current) {
          setShowCongratulations(true);
          // Mark as shown in database
          markUnitCongratulationsShown(unitId)
            .then((success) => {
              if (success) {
                congratulationsShownRef.current = true;
                setCongratulationsShown(true);
              }
            })
            .catch((error) => {
              console.error("Error marking unit congratulations:", error);
            });
        }
        prevProgressRef.current = newProgress;
      } else {
        // Also recalculate if event doesn't have unitId (might be from chapters)
        await calculateProgress();
      }
    };

    // Listen for chapterProgressUpdate event
    const handleChapterProgressUpdate = async () => {
      try {
        const newProgress = await calculateProgress();
        if (newProgress !== null) {
          // CRITICAL: Only check for modal if initialization is complete
          if (!isInitializedRef.current) {
            prevProgressRef.current = newProgress;
            return; // Don't check for modal until initialization is done
          }

          // Check if we've already shown congratulations for this completion
          const wasCompleted = prevProgressRef.current === 100;
          const isNowCompleted = newProgress === 100;
          
          // Show congratulations only if:
          // 1. Progress just reached exactly 100% (wasn't 100% before)
          // 2. We haven't shown the modal for this completion yet
          // 3. Initialization is complete (prevents showing on page visit)
          if (isNowCompleted && !wasCompleted && !congratulationsShownRef.current && isInitializedRef.current) {
            setShowCongratulations(true);
            // Mark as shown in database
            markUnitCongratulationsShown(unitId)
              .then((success) => {
                if (success) {
                  congratulationsShownRef.current = true;
                  setCongratulationsShown(true);
                }
              })
              .catch((error) => {
                console.error("Error marking unit congratulations:", error);
              });
          }
          prevProgressRef.current = newProgress;
        }
      } catch (error) {
        console.error("Error handling chapter progress update:", error);
      }
    };

    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = async (e) => {
      if (e.key === storageKey) {
        await calculateProgress();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("progress-updated", handleProgressUpdate);
      window.addEventListener("chapterProgressUpdate", handleChapterProgressUpdate);
      window.addEventListener("storage", handleStorageChange);
    }

    // Poll for changes as backup (since storage event doesn't fire in same tab)
    // Reduced polling frequency to improve performance and reduce memory usage
    // Poll less frequently - only when authenticated and visible
    const pollInterval = authStatus ? 5000 : 3000;
    const interval = setInterval(() => {
      // Only poll when page is visible
      if (typeof document !== "undefined" && document.visibilityState === 'visible') {
        calculateProgress();
      }
    }, pollInterval);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("progress-updated", handleProgressUpdate);
        window.removeEventListener("chapterProgressUpdate", handleChapterProgressUpdate);
        window.removeEventListener("storage", handleStorageChange);
      }
      clearInterval(interval);
    };
  }, [unitId, isAuthenticated]); // Removed congratulationsShown to prevent infinite loops

  return (
    <>
      <div className="w-full sm:w-auto text-left sm:text-right">
  
        {/* Label */}
        <p className="text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-1.5 font-medium leading-none">
          Unit Progress
        </p>
  
        {/* Progress Row */}
        <ProgressBar
          progress={progress}
          size="lg"
          showLabel={true}
          labelPosition="left"
          variant="emerald"
          className="w-[110px] sm:w-[140px] md:w-[160px]"
        />
      </div>
  
      {/* Congratulations Modal */}
      <CongratulationsModal
        isOpen={showCongratulations}
        onClose={() => setShowCongratulations(false)}
        unitName={unitName}
        type="unit"
      />
    </>
  );
  
};

export default UnitProgressClient;
