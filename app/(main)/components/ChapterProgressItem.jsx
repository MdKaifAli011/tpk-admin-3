"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { FaCheck, FaEye } from "react-icons/fa";
import CongratulationsModal from "./CongratulationsModal";
import {
  checkChapterCongratulationsShown,
  markChapterCongratulationsShown,
} from "@/lib/congratulations";

const ChapterProgressItem = ({
  chapter,
  index,
  href,
  unitId,
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
  const prevProgressRef = useRef(initialProgress);
  const isInitializedRef = useRef(false);
  const congratulationsShownRef = useRef(false); // Use ref to avoid dependency issues
  const abortControllerRef = useRef(null);
  
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
  }, [initialProgress, initialIsCompleted]);
  
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

  const handleSliderChange = useCallback(async (e) => {
    e.stopPropagation();
    const newProgress = parseInt(e.target.value);
    const prevProgress = prevProgressRef.current;
    setLocalProgress(newProgress);
    setIsCompleted(newProgress === 100);
    prevProgressRef.current = newProgress;
    
    // Show congratulations when progress reaches 100% via slider
    // Only show if:
    // 1. Progress just reached exactly 100% (wasn't 100% before)
    // 2. We haven't shown the modal for this completion yet
    // 3. Initialization is complete (prevents showing on page visit)
    if (newProgress === 100 && prevProgress < 100 && !congratulationsShownRef.current && unitId && isInitializedRef.current) {
      setShowCongratulations(true);
      // Mark as shown in database to prevent duplicate
      try {
        const success = await markChapterCongratulationsShown(chapter._id, unitId);
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
  }, [chapter._id, onProgressChange, unitId]);

  const handleMarkAsDone = useCallback(async (e) => {
    e.stopPropagation();
    const checked = e.target.checked;
    
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
      if (prevProgress < 100 && !congratulationsShownRef.current && unitId && isInitializedRef.current) {
        setShowCongratulations(true);
        // Mark as shown in database to prevent duplicate
        try {
          const success = await markChapterCongratulationsShown(chapter._id, unitId);
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
      // Reset if unchecked
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
    }
  }, [chapter._id, onMarkAsDone, onReset, unitId]);

  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback((e) => {
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const statusMarkup = (
    <label className="flex items-center cursor-pointer group">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={handleMarkAsDone}
        className="sr-only"
        aria-label={isCompleted ? "Mark as incomplete" : "Mark as done"}
      />
      <div
        className={`relative inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded border-2 transition-all duration-200 ${
          isCompleted
            ? "bg-emerald-500 border-emerald-500 shadow-md"
            : "bg-white border-gray-300 group-hover:border-emerald-400"
        }`}
      >
        {isCompleted && (
          <FaCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
        )}
      </div>
    </label>
  );

  return (
    <div
      className={`block px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4 transition-colors hover:bg-gray-50 active:bg-gray-100 ${
        isDragging ? "cursor-grabbing" : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:gap-4 md:grid md:grid-cols-[minmax(0,1fr)_120px_200px] md:items-center md:gap-6">
        {/* Chapter Name Section */}
        <div className="flex items-start gap-2 sm:gap-3">
          <span
            className={`hidden md:block w-1 self-stretch rounded-full ${indicatorColor}`}
            aria-hidden="true"
          />
          <span
            className={`block h-0.5 w-8 sm:w-12 rounded-full ${indicatorColor} md:hidden`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            {href ? (
              <Link href={href} className="block group/link">
                <p className="text-sm sm:text-base md:text-base font-semibold text-gray-900 group-hover/link:text-indigo-600 transition-colors break-words line-clamp-2">
                  {chapter.name}
                </p>
              </Link>
            ) : (
              <p className="text-sm sm:text-base md:text-base font-semibold text-gray-900 break-words line-clamp-2">
                {chapter.name}
              </p>
            )}
            <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs md:text-sm text-gray-500">
              <span className="font-medium text-emerald-600 whitespace-nowrap">
                Weightage: {weightage}
              </span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <FaEye className="text-gray-400 text-[10px] sm:text-xs" />
                {engagement}
              </span>
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="flex items-center justify-start md:justify-center" onClick={(e) => e.stopPropagation()}>
          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
            {statusMarkup}
          </div>
        </div>

        {/* Progress Section with Slider */}
        <div className="flex w-full items-center gap-2 sm:gap-3 md:w-auto md:justify-end">
          {/* Single Slider with Percentage Label */}
          <div className="flex-1 sm:flex-1 md:w-48 lg:w-56" onClick={(e) => e.stopPropagation()}>
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
              className="w-full h-1.5 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider pointer-events-auto"
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
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: ${progressPercent >= 100
                  ? "#10b981"
                  : progressPercent >= 50
                  ? "#34d399"
                  : "#6ee7b7"};
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                transition: all 0.2s;
              }
              @media (min-width: 640px) {
                .slider::-webkit-slider-thumb {
                  width: 18px;
                  height: 18px;
                }
              }
              .slider::-webkit-slider-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
              }
              .slider::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: ${progressPercent >= 100
                  ? "#10b981"
                  : progressPercent >= 50
                  ? "#34d399"
                  : "#6ee7b7"};
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                transition: all 0.2s;
              }
              @media (min-width: 640px) {
                .slider::-moz-range-thumb {
                  width: 18px;
                  height: 18px;
                }
              }
              .slider::-moz-range-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
              }
            `}</style>
          </div>
          {/* Percentage Label */}
          <span className="min-w-[2.5rem] sm:min-w-[2.75rem] md:min-w-[3rem] text-right text-[10px] sm:text-xs font-semibold text-gray-500 whitespace-nowrap">
            {progressLabel}%
          </span>
        </div>
      </div>

      {/* Congratulations Modal - Shows when "mark as done" is checked */}
      <CongratulationsModal
        isOpen={showCongratulations}
        onClose={() => setShowCongratulations(false)}
        chapterName={chapter.name}
        type="chapter"
      />
    </div>
  );
};

export default ChapterProgressItem;

