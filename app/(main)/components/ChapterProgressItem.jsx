"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { FaCheck, FaEye } from "react-icons/fa";
import CongratulationsModal from "./CongratulationsModal";
import LoginPromptModal from "./LoginPromptModal";
import {
  checkChapterCongratulationsShown,
  markChapterCongratulationsShown,
} from "@/lib/congratulations";

const ChapterProgressItem = ({
  chapter,
  index,
  href,
  unitId,
  examName,
  progress: initialProgress = 0,
  isCompleted: initialIsCompleted = false,
  onProgressChange,
  onMarkAsDone,
  onReset,
}) => {
  const [localProgress, setLocalProgress] = useState(initialProgress);
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
  const [isDragging, setIsDragging] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [congratulationsShown, setCongratulationsShown] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingProgress, setPendingProgress] = useState(null); // Store progress that needs authentication
  const prevProgressRef = useRef(initialProgress);
  const isInitializedRef = useRef(false);
  const congratulationsShownRef = useRef(false); // Use ref to avoid dependency issues
  const abortControllerRef = useRef(null);

  // Check authentication status and apply pending progress after login
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("student_token");
        const wasAuthenticated = isAuthenticated;
        const nowAuthenticated = !!token;
        setIsAuthenticated(nowAuthenticated);

        // If user just logged in and there's pending progress, apply it
        if (!wasAuthenticated && nowAuthenticated && pendingProgress !== null) {
          // Apply the pending progress
          setLocalProgress(pendingProgress);
          setIsCompleted(pendingProgress === 100);
          prevProgressRef.current = pendingProgress;

          // Save the progress
          if (onProgressChange) {
            try {
              onProgressChange(chapter._id, pendingProgress, pendingProgress === 100);
            } catch (error) {
              console.error("Error updating progress after login:", error);
            }
          }

          // Clear pending progress
          setPendingProgress(null);
        }
      }
    };

    checkAuth();

    // Listen for login events
    const handleLogin = () => {
      checkAuth();
    };

    window.addEventListener("student-login", handleLogin);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("student-login", handleLogin);
      window.removeEventListener("storage", checkAuth);
    };
  }, [isAuthenticated, pendingProgress, chapter._id, onProgressChange]);

  // Reset initialization flag when chapter or unit changes
  React.useEffect(() => {
    // Abort any pending async operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    isInitializedRef.current = false;
    congratulationsShownRef.current = false;
    setCongratulationsShown(false);
    setShowCongratulations(false);

    // Create new abort controller for this chapter/unit
    abortControllerRef.current = new AbortController();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [chapter._id, unitId]);

  // Sync with prop changes (from database updates)
  React.useEffect(() => {
    setLocalProgress(initialProgress);
    setIsCompleted(initialIsCompleted);
    prevProgressRef.current = initialProgress;
    // Clear pending progress when prop updates (user logged in and progress synced)
    if (isAuthenticated && pendingProgress !== null) {
      setPendingProgress(null);
    }
  }, [initialProgress, initialIsCompleted, isAuthenticated, pendingProgress]);

  // Check if congratulations were already shown (prevent duplicate)
  // CRITICAL: This must complete before allowing modal to show
  React.useEffect(() => {
    let isMounted = true;

    if (unitId && chapter._id) {
      isInitializedRef.current = false;
      const controller = abortControllerRef.current;

      checkChapterCongratulationsShown(chapter._id, unitId)
        .then((hasShown) => {
          if (!isMounted || (controller && controller.signal.aborted)) return;

          congratulationsShownRef.current = hasShown;
          setCongratulationsShown(hasShown);
          isInitializedRef.current = true; // Mark as initialized
          if (hasShown) {
            setShowCongratulations(false);
          }
        })
        .catch((error) => {
          if (!isMounted || (controller && controller.signal.aborted)) return;
          console.error("Error checking congratulations:", error);
          // On error, mark as initialized to prevent blocking
          isInitializedRef.current = true;
          congratulationsShownRef.current = false;
        });
    } else {
      isInitializedRef.current = true; // If no unitId/chapterId, mark as initialized
    }

    return () => {
      isMounted = false;
    };
  }, [chapter._id, unitId]);

  const weightage = chapter.weightage ?? "20%";
  const engagement = chapter.engagement ?? "2.2K";

  const colorVariants = {
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    black: "bg-black",
    indigo: "bg-indigo-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
  };

  const getColor = () => {
    const colors = ["blue", "blue", "yellow", "green", "black"];
    return colorVariants[colors[index % colors.length]] || colorVariants.blue;
  };

  const indicatorColor = getColor();
  const progressPercent = Math.min(100, Math.max(0, localProgress));
  const progressLabel = Math.round(progressPercent);

  const handleSliderChange = useCallback(
    async (e) => {
      e.stopPropagation();
      const newProgress = parseInt(e.target.value);
      const prevProgress = prevProgressRef.current;

      // Check authentication - if not authenticated, show login prompt
      if (!isAuthenticated) {
        // Store the intended progress value
        setPendingProgress(newProgress);
        // Allow visual update but don't save
        setLocalProgress(newProgress);
        setIsCompleted(newProgress === 100);
        
        // Show login prompt modal
        setShowLoginPrompt(true);
        return;
      }

      // User is authenticated - proceed with normal flow
      setLocalProgress(newProgress);
      setIsCompleted(newProgress === 100);
      prevProgressRef.current = newProgress;

      // Show congratulations when progress reaches 100% via slider
      // Only show if:
      // 1. Progress just reached exactly 100% (wasn't 100% before)
      // 2. We haven't shown the modal for this completion yet
      // 3. Initialization is complete (prevents showing on page visit)
      if (
        newProgress === 100 &&
        prevProgress < 100 &&
        !congratulationsShownRef.current &&
        unitId &&
        isInitializedRef.current
      ) {
        setShowCongratulations(true);
        // Mark as shown in database to prevent duplicate
        try {
          const success = await markChapterCongratulationsShown(
            chapter._id,
            unitId
          );
          if (success) {
            congratulationsShownRef.current = true;
            setCongratulationsShown(true);
          }
        } catch (error) {
          console.error("Error marking congratulations as shown:", error);
          // Don't block UI on error, just log it
        }
      }

      if (onProgressChange) {
        try {
          onProgressChange(chapter._id, newProgress, newProgress === 100);
        } catch (error) {
          console.error("Error updating progress:", error);
        }
      }
    },
    [chapter._id, onProgressChange, unitId, isAuthenticated]
  );

  const handleMarkAsDone = useCallback(
    async (e) => {
      e.stopPropagation();
      const checked = e.target.checked;

      // Check authentication - if not authenticated, show login prompt
      if (!isAuthenticated && checked) {
        // Don't allow marking as done without login
        e.target.checked = false;
        setShowLoginPrompt(true);
        return;
      }

      if (checked) {
        // Mark as done
        const prevProgress = prevProgressRef.current;
        setLocalProgress(100);
        setIsCompleted(true);
        prevProgressRef.current = 100;

        // Show congratulations when "mark as done" is checked
        // Only show if:
        // 1. Previous progress was less than 100% (just completed)
        // 2. We haven't shown the modal for this completion yet
        // 3. Initialization is complete (prevents showing on page visit)
        if (
          prevProgress < 100 &&
          !congratulationsShownRef.current &&
          unitId &&
          isInitializedRef.current
        ) {
          setShowCongratulations(true);
          // Mark as shown in database to prevent duplicate
          try {
            const success = await markChapterCongratulationsShown(
              chapter._id,
              unitId
            );
            if (success) {
              congratulationsShownRef.current = true;
              setCongratulationsShown(true);
            }
          } catch (error) {
            console.error("Error marking congratulations as shown:", error);
            // Don't block UI on error
          }
        }

        if (onMarkAsDone) {
          try {
            onMarkAsDone(chapter._id);
          } catch (error) {
            console.error("Error marking chapter as done:", error);
          }
        }
      } else {
        // Reset if unchecked (only if authenticated)
        if (isAuthenticated) {
          setLocalProgress(0);
          setIsCompleted(false);
          prevProgressRef.current = 0;
          // Reset congratulations shown flag when unchecked
          congratulationsShownRef.current = false;
          setCongratulationsShown(false);
          if (onReset) {
            try {
              onReset(chapter._id);
            } catch (error) {
              console.error("Error resetting chapter progress:", error);
            }
          }
        } else {
          // If not authenticated, prevent unchecking
          e.target.checked = true;
        }
      }
    },
    [chapter._id, onMarkAsDone, onReset, unitId, isAuthenticated]
  );

  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback((e) => {
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const statusMarkup = (
    <label className="flex items-center cursor-pointer group/checkbox">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={handleMarkAsDone}
        className="sr-only"
        aria-label={isCompleted ? "Mark as incomplete" : "Mark as done"}
      />
      <div
        className={`relative inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 transition-all duration-300 ${
          isCompleted
            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500 shadow-lg shadow-emerald-200/60 group-hover/checkbox:shadow-xl group-hover/checkbox:scale-110 group-hover/checkbox:from-emerald-600 group-hover/checkbox:to-emerald-700 ring-2 ring-emerald-200/50"
            : "bg-white border-gray-300 group-hover/checkbox:border-emerald-400 group-hover/checkbox:bg-gradient-to-br group-hover/checkbox:from-emerald-50 group-hover/checkbox:to-emerald-100/50 group-hover/checkbox:scale-110 group-hover/checkbox:shadow-md"
        }`}
      >
        {isCompleted && (
          <FaCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white drop-shadow-md animate-in fade-in zoom-in duration-200" />
        )}
      </div>
    </label>
  );

  return (
    <div
      className={`group/item relative block px-4 py-4 transition-all duration-300 border-b border-gray-100 last:border-b-0 bg-white hover:bg-gradient-to-r hover:from-indigo-50/40 hover:via-white hover:to-purple-50/40 hover:shadow-sm hover:border-indigo-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:px-6 ${
        isDragging ? "cursor-grabbing bg-gray-50" : ""
      } ${
        isCompleted
          ? "bg-gradient-to-r from-emerald-50/20 via-white to-emerald-50/10"
          : ""
      }`}
    >
      {/* Subtle left border accent on hover */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-r-full"></div>

      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_140px_220px] sm:items-center sm:gap-6">
        {/* Chapter Name Section */}
        <div className="flex items-start gap-3">
          <span
            className={`hidden sm:block w-1 self-stretch rounded-full ${indicatorColor} transition-all duration-300 group-hover/item:shadow-sm`}
            aria-hidden="true"
          />
          <span
            className={`block h-0.5 w-12 rounded-full ${indicatorColor} sm:hidden transition-all duration-300`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            {href ? (
              <Link href={href} className="block group/link">
                <p className="text-sm font-semibold text-gray-900 sm:text-base group-hover/link:text-indigo-600 transition-all duration-200 break-words line-clamp-2 leading-normal group-hover/link:translate-x-0.5">
                  {chapter.name}
                </p>
              </Link>
            ) : (
              <p className="text-sm font-semibold text-gray-900 sm:text-base break-words line-clamp-2 leading-normal">
                {chapter.name}
              </p>
            )}
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
        <div
          className="flex items-center justify-start sm:justify-center transition-all duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 transform transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            {statusMarkup}
          </div>
        </div>

        {/* Progress Section with Slider */}
        <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
          {/* Single Slider with Percentage Label */}
          <div
            className="flex-1 sm:flex-initial sm:w-52 lg:w-60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative group/slider">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={localProgress}
                onChange={handleSliderChange}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="w-full h-2.5 sm:h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider pointer-events-auto shadow-inner transition-all duration-200 group-hover/slider:shadow-md"
                style={{
                  background: `linear-gradient(to right, ${
                    progressPercent >= 100
                      ? "#10b981"
                      : progressPercent >= 50
                      ? "#34d399"
                      : "#6ee7b7"
                  } 0%, ${
                    progressPercent >= 100
                      ? "#10b981"
                      : progressPercent >= 50
                      ? "#34d399"
                      : "#6ee7b7"
                  } ${progressPercent}%, #e5e7eb ${progressPercent}%, #e5e7eb 100%)`,
                }}
                aria-label={`Progress for ${chapter.name}`}
              />
              <style jsx>{`
                .slider::-webkit-slider-thumb {
                  appearance: none;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: ${progressPercent >= 100
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : progressPercent >= 50
                    ? "linear-gradient(135deg, #34d399 0%, #10b981 100%)"
                    : "linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)"};
                  cursor: pointer;
                  border: 3px solid white;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15),
                    0 0 0 3px
                      ${progressPercent >= 100
                        ? "rgba(16, 185, 129, 0.15)"
                        : progressPercent >= 50
                        ? "rgba(52, 211, 153, 0.15)"
                        : "rgba(110, 231, 183, 0.15)"},
                    inset 0 1px 2px rgba(255, 255, 255, 0.5);
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                @media (min-width: 640px) {
                  .slider::-webkit-slider-thumb {
                    width: 22px;
                    height: 22px;
                  }
                }
                .slider::-webkit-slider-thumb:hover {
                  transform: scale(1.2);
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2),
                    0 0 0 4px
                      ${progressPercent >= 100
                        ? "rgba(16, 185, 129, 0.25)"
                        : progressPercent >= 50
                        ? "rgba(52, 211, 153, 0.25)"
                        : "rgba(110, 231, 183, 0.25)"},
                    inset 0 1px 2px rgba(255, 255, 255, 0.6);
                }
                .slider::-webkit-slider-thumb:active {
                  transform: scale(1.15);
                  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25),
                    0 0 0 3px
                      ${progressPercent >= 100
                        ? "rgba(16, 185, 129, 0.3)"
                        : progressPercent >= 50
                        ? "rgba(52, 211, 153, 0.3)"
                        : "rgba(110, 231, 183, 0.3)"};
                }
                .slider::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: ${progressPercent >= 100
                    ? "#10b981"
                    : progressPercent >= 50
                    ? "#34d399"
                    : "#6ee7b7"};
                  cursor: pointer;
                  border: 3px solid white;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15),
                    0 0 0 3px
                      ${progressPercent >= 100
                        ? "rgba(16, 185, 129, 0.15)"
                        : progressPercent >= 50
                        ? "rgba(52, 211, 153, 0.15)"
                        : "rgba(110, 231, 183, 0.15)"};
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                @media (min-width: 640px) {
                  .slider::-moz-range-thumb {
                    width: 22px;
                    height: 22px;
                  }
                }
                .slider::-moz-range-thumb:hover {
                  transform: scale(1.2);
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2),
                    0 0 0 4px
                      ${progressPercent >= 100
                        ? "rgba(16, 185, 129, 0.25)"
                        : progressPercent >= 50
                        ? "rgba(52, 211, 153, 0.25)"
                        : "rgba(110, 231, 183, 0.25)"};
                }
                .slider::-moz-range-thumb:active {
                  transform: scale(1.15);
                  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25),
                    0 0 0 3px
                      ${progressPercent >= 100
                        ? "rgba(16, 185, 129, 0.3)"
                        : progressPercent >= 50
                        ? "rgba(52, 211, 153, 0.3)"
                        : "rgba(110, 231, 183, 0.3)"};
                }
                .slider:focus-visible {
                  outline: 2px solid
                    ${progressPercent >= 100
                      ? "#10b981"
                      : progressPercent >= 50
                      ? "#34d399"
                      : "#6ee7b7"};
                  outline-offset: 2px;
                }
              `}</style>
            </div>
          </div>
          {/* Percentage Label */}
          <div className="flex items-center gap-2">
            <span
              className={`min-w-[3rem] sm:min-w-[3.5rem] text-right text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
                progressPercent >= 100 ? "text-emerald-600" : "text-gray-700"
              }`}
            >
              {progressLabel}%
            </span>
            {progressPercent >= 100 && (
              <span
                className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md"
                title="Completed"
              >
                <FaCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white drop-shadow-sm" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Congratulations Modal - Shows when "mark as done" is checked */}
      <CongratulationsModal
        isOpen={showCongratulations}
        onClose={() => setShowCongratulations(false)}
        chapterName={chapter.name}
        type="chapter"
      />

      {/* Login Prompt Modal - Shows when unauthenticated user tries to change progress */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => {
          setShowLoginPrompt(false);
          // Reset to previous progress if user closes without logging in
          if (pendingProgress !== null && !isAuthenticated) {
            setLocalProgress(prevProgressRef.current);
            setIsCompleted(prevProgressRef.current === 100);
            setPendingProgress(null);
          }
        }}
        examName={examName}
      />
    </div>
  );
};

export default ChapterProgressItem;
