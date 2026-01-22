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

  // Get active exam from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedExamId = localStorage.getItem("activeExamId");
      if (storedExamId) {
        setActiveExamId(storedExamId);
      }
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
      const { tree: newTree, activeExamId: newActiveExamId } = event.detail;
      setTree(newTree || []);
      setActiveExamId(newActiveExamId);
    };

    window.addEventListener("treeDataUpdated", handleTreeUpdate);
    return () => window.removeEventListener("treeDataUpdated", handleTreeUpdate);
  }, []);

  const value = {
    tree,
    treeLoading,
    activeExamId,
    setTree,
    setTreeLoading,
    setActiveExamId,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};
