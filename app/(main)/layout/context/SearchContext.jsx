"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

const SearchContext = createContext();

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [tree, setTree] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [activeExamId, setActiveExamId] = useState(null);
  const [activeExamSlug, setActiveExamSlug] = useState("");
  const [exams, setExams] = useState([]);

  // Get active exam from localStorage on mount and detect URL changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateExamSlugFromURL = () => {
        const storedExamId = localStorage.getItem("activeExamId");
        if (storedExamId) {
          setActiveExamId(storedExamId);
        }
        
        // Get exam slug from current URL
        const pathname = window.location.pathname;
        const pathSegments = pathname.split('/').filter(Boolean);
        
        // Remove basePath if present
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
        const basePathSegments = basePath.split('/').filter(Boolean);
        
        // Filter out basePath segments
        const filteredSegments = pathSegments.filter(segment => 
          !basePathSegments.includes(segment)
        );
        
        if (filteredSegments.length > 0) {
          // First segment should be the exam slug
          const newExamSlug = filteredSegments[0];
          setActiveExamSlug(newExamSlug);
        }
      };

      // Initial update
      updateExamSlugFromURL();

      // Listen for URL changes (navigation)
      const handlePopState = () => {
        updateExamSlugFromURL();
      };

      // Also listen for custom navigation events
      const handleNavigation = () => {
        setTimeout(updateExamSlugFromURL, 100); // Small delay to ensure URL is updated
      };

      window.addEventListener("popstate", handlePopState);
      window.addEventListener("navigation", handleNavigation);
      
      // Override pushState to detect programmatic navigation
      const originalPushState = window.history.pushState;
      window.history.pushState = function(...args) {
        originalPushState.apply(window.history, args);
        setTimeout(updateExamSlugFromURL, 100);
      };

      return () => {
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("navigation", handleNavigation);
        window.history.pushState = originalPushState;
      };
    }
  }, []);

  // Update active exam ID when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== "undefined") {
        const storedExamId = localStorage.getItem("activeExamId");
        if (storedExamId !== activeExamId) {
          setActiveExamId(storedExamId);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [activeExamId]);

  // Listen for custom events from sidebar
  useEffect(() => {
    const handleTreeUpdate = (event) => {
      const { tree: newTree, activeExamId: newActiveExamId, exams: newExams } = event.detail;
      setTree(newTree || []);
      setActiveExamId(newActiveExamId);
      setExams(newExams || []);
      
      // Calculate exam slug
      if (newActiveExamId && newExams) {
        const activeExam = newExams.find((e) => e._id === newActiveExamId);
        if (activeExam) {
          const slug = activeExam.slug || createSlug(activeExam.name);
          setActiveExamSlug(slug);
        }
      }
    };

    window.addEventListener("treeDataUpdated", handleTreeUpdate);
    return () => window.removeEventListener("treeDataUpdated", handleTreeUpdate);
  }, []);

  const value = {
    tree,
    treeLoading,
    activeExamId,
    activeExamSlug,
    exams,
    setTree,
    setTreeLoading,
    setActiveExamId,
    setActiveExamSlug,
    setExams,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

// Helper function to create slug (same as sidebar)
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};
