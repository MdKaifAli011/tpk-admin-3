"use client";
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

const SearchContext = createContext();

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const pathname = usePathname();
  const [tree, setTree] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [activeExamId, setActiveExamId] = useState(null);
  const [activeExamSlug, setActiveExamSlug] = useState("");
  const [exams, setExams] = useState([]);

  /** Derive full hierarchy IDs from current URL path + tree (exam, subject, unit, chapter, topic; subtopic/definition when in tree) */
  const hierarchyIds = useMemo(() => {
    const out = {
      examId: activeExamId || null,
      subjectId: null,
      unitId: null,
      chapterId: null,
      topicId: null,
      subTopicId: null,
      definitionId: null,
    };
    if (!pathname || !tree?.length) return out;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
    const basePathSegments = basePath.split("/").filter(Boolean);
    const pathSegments = pathname.split("/").filter((s) => s && !basePathSegments.includes(s));

    if (pathSegments.length < 2) return out; // need at least examSlug + subjectSlug

    const [examSlug, subjectSlug, unitSlug, chapterSlug, topicSlug, subTopicSlug, definitionSlug] = pathSegments;
    if (examSlug !== activeExamSlug) return out;

    const subject = tree.find((s) => (s.slug && s.slug === subjectSlug) || createSlug(s.name) === subjectSlug);
    if (!subject) return out;
    out.subjectId = subject.id || subject._id || null;

    const units = subject.units || [];
    const unit = units.find((u) => (u.slug && u.slug === unitSlug) || createSlug(u.name) === unitSlug);
    if (!unit) return out;
    out.unitId = unit.id || unit._id || null;

    const chapters = unit.chapters || [];
    const chapter = chapters.find((c) => (c.slug && c.slug === chapterSlug) || createSlug(c.name) === chapterSlug);
    if (!chapter) return out;
    out.chapterId = chapter.id || chapter._id || null;

    const topics = chapter.topics || [];
    const topic = topics.find((t) => (t.slug && t.slug === topicSlug) || createSlug(t.name) === topicSlug);
    if (!topic) return out;
    out.topicId = topic.id || topic._id || null;

    if (topic.subTopics?.length && subTopicSlug) {
      const subTopic = topic.subTopics.find((st) => (st.slug && st.slug === subTopicSlug) || createSlug(st.name) === subTopicSlug);
      if (subTopic) {
        out.subTopicId = subTopic.id || subTopic._id || null;
        if (subTopic.definitions?.length && definitionSlug) {
          const def = subTopic.definitions.find((d) => (d.slug && d.slug === definitionSlug) || createSlug(d.name) === definitionSlug);
          if (def) out.definitionId = def.id || def._id || null;
        }
      }
    }

    return out;
  }, [pathname, tree, activeExamId, activeExamSlug]);

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
    hierarchyIds,
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
