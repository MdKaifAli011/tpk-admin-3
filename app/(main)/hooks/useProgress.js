"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/**
 * Custom hook for managing progress tracking
 * Handles database persistence and local storage caching
 */
export const useProgress = (unitId, chapters = []) => {
  const storageKey = `unit-progress-${unitId}`;
  const [chaptersProgress, setChaptersProgress] = useState({});
  const [unitProgress, setUnitProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Check if student is authenticated
  const checkAuth = useCallback(() => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("student_token");
    return !!token;
  }, []);

  // Get student token for API requests
  const getAuthToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("student_token");
  }, []);

  // Load progress from localStorage (defined first to avoid circular dependency)
  const loadProgressFromLocalStorage = useCallback(() => {
    if (typeof window === "undefined") {
      return { progress: {}, unitProgress: 0 };
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Remove _unitProgress if it exists (old format)
        const { _unitProgress, ...progress } = parsed;
        return {
          progress,
          unitProgress: _unitProgress || 0,
        };
      }
    } catch (error) {
      // Handle specific localStorage errors
      if (error instanceof SyntaxError) {
        console.error("Error parsing progress from localStorage:", error);
        // Clear corrupted data
        try {
          localStorage.removeItem(storageKey);
        } catch (clearError) {
          console.error("Error clearing corrupted localStorage:", clearError);
        }
      } else if (error.name === "QuotaExceededError") {
        console.error("localStorage quota exceeded");
      } else {
        console.error("Error loading progress from localStorage:", error);
      }
    }

    // Initialize with default values
    const defaultProgress = {};
    chapters.forEach((chapter) => {
      defaultProgress[chapter._id] = {
        progress: 0,
        isCompleted: false,
      };
    });
    return { progress: defaultProgress, unitProgress: 0 };
  }, [storageKey, chapters]);

  // Load progress from database
  const loadProgressFromDB = useCallback(
    async (abortSignal) => {
    if (!isAuthenticated) {
      // If not authenticated, return empty progress (no localStorage fallback)
      return { progress: {}, unitProgress: 0 };
    }

    try {
      const token = getAuthToken();
      if (!token) {
        // No token, return empty progress
        return { progress: {}, unitProgress: 0 };
      }

        const response = await fetch(`${basePath}/api/student/progress?unitId=${unitId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: abortSignal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          const progressDoc = data.data[0];
          // Convert Map to object (progress is already converted to object by API)
          const progressObj = {};
            if (
              progressDoc.progress &&
              typeof progressDoc.progress === "object"
            ) {
            Object.keys(progressDoc.progress).forEach((key) => {
              const value = progressDoc.progress[key];
              progressObj[key] = {
                progress: value.progress || 0,
                isCompleted: value.isCompleted || false,
                isManualOverride: value.isManualOverride || false,
                manualProgress: value.manualProgress || null,
                autoCalculatedProgress: value.autoCalculatedProgress || 0,
                visitedItems: value.visitedItems || {
                  chapter: false,
                  topics: [],
                  subtopics: [],
                  definitions: [],
                },
                congratulationsShown: value.congratulationsShown || false,
              };
            });
          }

          // DO NOT save to localStorage - unit progress only in DB
          // Removed localStorage caching for unit progress

          return {
            progress: progressObj,
            unitProgress: progressDoc.unitProgress || 0,
          };
        }
      } else if (response.status === 401) {
        // Authentication error
        if (typeof window !== "undefined") {
          localStorage.removeItem("student_token");
        }
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Ignore abort errors
        if (error.name === "AbortError") {
        return null;
      }
      console.error("Error loading progress from database:", error);
    }

    // Return empty progress if DB fetch fails (no localStorage fallback)
    return { progress: {}, unitProgress: 0 };
    },
    [unitId, isAuthenticated, getAuthToken]
  );

  // Save progress to database
  const saveProgressToDB = useCallback(
    async (progressData, calculatedUnitProgress) => {
      if (!isAuthenticated) {
        // If not authenticated, don't save anywhere (unit and subject progress only in DB)
        return;
      }

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce saves to avoid too many API calls
      saveTimeoutRef.current = setTimeout(async () => {
        // Check if component is still mounted (via ref check)
        try {
          const token = getAuthToken();
          if (!token) return;

          // Convert progress object to Map format for API
          const progressMap = {};
          Object.keys(progressData).forEach((chapterId) => {
            progressMap[chapterId] = progressData[chapterId];
          });

          const response = await fetch(`${basePath}/api/student/progress`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              unitId,
              progress: progressMap,
              unitProgress: calculatedUnitProgress,
            }),
          });

          if (!response.ok) {
            if (response.status === 401) {
              // Authentication error
              if (typeof window !== "undefined") {
                localStorage.removeItem("student_token");
              }
              setIsAuthenticated(false);
            } else {
              console.error(
                "Failed to save progress to database:",
                response.status,
                response.statusText
              );
            }
          }
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error saving progress to database:", error);
          }
        }
      }, 500); // 500ms debounce
    },
    [unitId, isAuthenticated, getAuthToken]
  );

  // Calculate unit progress from chapters
  // IMPORTANT: Uses ALL chapters passed to hook (consistent with API calculation)
  const calculateUnitProgress = useCallback(
    (progressData) => {
    if (chapters.length === 0) return 0;

    // Sum progress for ALL chapters (0% for chapters without progress data)
    // This matches the API calculation in track-visit route
    const totalProgress = chapters.reduce((sum, chapter) => {
      const chapterData = progressData[chapter._id] || { progress: 0 };
      return sum + (chapterData.progress || 0);
    }, 0);

    return Math.round(totalProgress / chapters.length);
    },
    [chapters]
  );

  // Initialize progress on mount
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const init = async () => {
      setIsLoading(true);
      const authStatus = checkAuth();
      setIsAuthenticated(authStatus);

      try {
        const loaded = await loadProgressFromDB(abortController.signal);
        
        if (!isMounted || !loaded) return;
        
        setChaptersProgress(loaded.progress);
        setUnitProgress(loaded.unitProgress);
        isInitialLoadRef.current = false;
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error initializing progress:", error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [unitId, checkAuth, loadProgressFromDB]);

  // Listen for progress updates from visit tracking
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const handleProgressUpdate = async (event) => {
      if (!isMounted) return;
      if (event.detail?.unitId === unitId && isAuthenticated) {
        try {
          // Reload progress from database to get latest updates
          const loaded = await loadProgressFromDB(abortController.signal);
          if (isMounted && loaded) {
            setChaptersProgress(loaded.progress);
            setUnitProgress(loaded.unitProgress);
          }
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error updating progress:", error);
          }
        }
      }
    };

    const handleChapterProgressUpdate = async () => {
      if (!isMounted) return;
      if (isAuthenticated) {
        try {
          // Reload progress from database
          const loaded = await loadProgressFromDB(abortController.signal);
          if (isMounted && loaded) {
            setChaptersProgress(loaded.progress);
            setUnitProgress(loaded.unitProgress);
          }
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("Error updating chapter progress:", error);
          }
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("progress-updated", handleProgressUpdate);
      window.addEventListener(
        "chapterProgressUpdate",
        handleChapterProgressUpdate
      );
    }

    return () => {
      isMounted = false;
      abortController.abort();
      if (typeof window !== "undefined") {
        window.removeEventListener("progress-updated", handleProgressUpdate);
        window.removeEventListener(
          "chapterProgressUpdate",
          handleChapterProgressUpdate
        );
      }
    };
  }, [unitId, isAuthenticated, loadProgressFromDB]);

  // Update chapter progress
  const updateChapterProgress = useCallback(
    (chapterId, progress, isCompleted = false) => {
      setChaptersProgress((prev) => {
        const prevChapter = prev[chapterId] || {};
        const autoProgress = prevChapter.autoCalculatedProgress || 0;
        // If progress differs from auto-calculated, it's a manual override
        const isManual = progress !== autoProgress;
        
        const updated = {
          ...prev,
          [chapterId]: {
            progress: Math.max(0, Math.min(100, progress)),
            isCompleted: isCompleted || progress === 100,
            isManualOverride: isManual || prevChapter.isManualOverride || false,
            manualProgress: isManual
              ? progress
              : prevChapter.manualProgress || null,
            autoCalculatedProgress: prevChapter.autoCalculatedProgress || 0,
            visitedItems: prevChapter.visitedItems || {
              chapter: false,
              topics: [],
              subtopics: [],
              definitions: [],
            },
          },
        };

        // Calculate and update unit progress
        const newUnitProgress = calculateUnitProgress(updated);
        setUnitProgress(newUnitProgress);

        // Save to database only (no localStorage for authenticated users)
        if (!isInitialLoadRef.current && isAuthenticated) {
          saveProgressToDB(updated, newUnitProgress);
        }

        // Dispatch custom event for real-time updates
        if (typeof window !== "undefined") {
          // Use requestAnimationFrame for better performance than setTimeout
          requestAnimationFrame(() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("progress-updated", {
                  detail: { unitId, unitProgress: newUnitProgress },
                })
              );
            }
          });
        }

        return updated;
      });
    },
    [storageKey, calculateUnitProgress, unitId, saveProgressToDB]
  );

  // Mark chapter as done
  const markAsDone = useCallback(
    (chapterId) => {
      updateChapterProgress(chapterId, 100, true);
    },
    [updateChapterProgress]
  );

  // Reset chapter progress
  const resetChapterProgress = useCallback(
    (chapterId) => {
      updateChapterProgress(chapterId, 0, false);
    },
    [updateChapterProgress]
  );

  // Get chapter progress
  const getChapterProgress = useCallback(
    (chapterId) => {
      return chaptersProgress[chapterId] || { progress: 0, isCompleted: false };
    },
    [chaptersProgress]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    chaptersProgress,
    unitProgress,
    updateChapterProgress,
    markAsDone,
    resetChapterProgress,
    getChapterProgress,
    isLoading,
    isAuthenticated,
  };
};
