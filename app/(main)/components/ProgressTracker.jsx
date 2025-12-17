"use client";

import { useEffect } from "react";
import { logger } from "@/utils/logger";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/**
 * Client component to track student visits to chapters, topics, subtopics, and definitions
 * Automatically tracks visits when students view content pages
 */
const ProgressTracker = ({
  unitId,
  chapterId,
  itemType, // "chapter", "topic", "subtopic", or "definition"
  itemId,
}) => {
  useEffect(() => {
    // Only track if all required props are provided
    // For chapter visits, itemId is the chapterId itself
    if (!unitId || !chapterId || !itemType) {
      return;
    }

    // For chapter visits, itemId is optional (use chapterId)
    const finalItemId = itemId || chapterId;

    // Check if student is authenticated
    let token;
    try {
      if (typeof window === "undefined") return;
      token = localStorage.getItem("student_token");
    } catch (error) {
      // Handle localStorage errors (quota, disabled, etc.)
      if (error.name === "QuotaExceededError") {
        logger.warn("localStorage quota exceeded, cannot track progress");
      } else {
        logger.warn("Error accessing localStorage:", error);
      }
      return;
    }

    if (!token) {
      // Not authenticated, skip tracking
      return;
    }

    // Track visit
    const trackVisit = async () => {
      try {
        const response = await fetch(`${basePath}/api/student/progress/track-visit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            unitId,
            chapterId,
            itemType,
            itemId: finalItemId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Dispatch event to update progress UI
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("progress-updated", {
                  detail: {
                    unitId,
                    chapterId,
                    unitProgress: data.data?.unitProgress || 0,
                    chapterProgress: data.data?.chapterProgress || 0,
                  },
                })
              );
              window.dispatchEvent(new CustomEvent("chapterProgressUpdate"));
            }
          } else {
            // Log the error message from the API
            logger.warn(
              "Failed to track visit:",
              data.message || "Unknown error"
            );
          }
        } else {
          // Handle specific HTTP error codes
          if (response.status === 401) {
            // Authentication error - clear token
            try {
              if (typeof window !== "undefined") {
                localStorage.removeItem("student_token");
              }
            } catch (e) {
              logger.warn("Error clearing token:", e);
            }
            logger.warn("Authentication failed, token cleared");
          } else {
            // Try to get error details from response
            let errorMessage = "Failed to track visit";
            try {
              const errorData = await response.json();
              errorMessage =
                errorData.message || errorData.error || errorMessage;
            } catch (e) {
              errorMessage = `Failed to track visit: ${response.status} ${response.statusText}`;
            }
            logger.warn(errorMessage);
          }
        }
      } catch (error) {
        // Handle network errors, abort errors, etc.
        if (error.name === "AbortError") {
          // Request was aborted, ignore
          return;
        }
        logger.error("Error tracking visit:", error);
      }
    };

    // Debounce tracking to avoid multiple calls
    const timeoutId = setTimeout(trackVisit, 1000);

    return () => clearTimeout(timeoutId);
  }, [unitId, chapterId, itemType, itemId]);

  return null; // This component doesn't render anything
};

export default ProgressTracker;
