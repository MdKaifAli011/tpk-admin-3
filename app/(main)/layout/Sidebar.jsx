"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { FaSearch } from "react-icons/fa";
import { fetchExams, fetchTree, createSlug, findByIdOrSlug } from "../lib/api";
import { logger } from "@/utils/logger";
import ExamDropdown from "../components/ExamDropdown";
import SidebarNavigationTree from "../components/SidebarNavigationTree";

/* ------------------------------------------------------------------------- */
/* Premium ChatGPT-style Light Sidebar (UI only changes)                     */
/* - Compact width (300px)                                                   */
/* - Light mode, rounded corners, subtle shadows                             */
/* - Compact spacing, smaller fonts                                          */
/* - Smooth animations & polished hover states                               */
/* - Keeps all original logic/behaviour                                      */
/* ------------------------------------------------------------------------- */

// Helper: build node (same as your original)
const buildNode = (item) => ({
  id: item?._id ?? "",
  name: item?.name ?? "",
  order: item?.orderNumber ?? 0,
  slug: item?.slug || (item?.name ? createSlug(item.name) : ""),
});

/* ------------------------------------------------------------------------- */
/* MAIN SIDEBAR                                                              */
/* ------------------------------------------------------------------------- */
const Sidebar = React.memo(function Sidebar({ isOpen = true, onClose }) {
  const router = useRouter();
  const pathname = usePathname();

  // --- Data states ---
  const [exams, setExams] = useState([]);
  const [activeExamId, setActiveExamId] = useState(null);
  const [tree, setTree] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // internal caches & dedupe
  const hasLoadedExamsRef = useRef(false);
  const treeCacheRef = useRef(new Map());
  const treeLoadingRef = useRef(new Set());
  const pendingApiRequestsRef = useRef(new Map());

  // ui state
  const [sidebarOpen, setSidebarOpen] = useState(isOpen);
  const [openSubjectId, setOpenSubjectId] = useState(null);
  const [openUnitId, setOpenUnitId] = useState(null);
  const [openChapterId, setOpenChapterId] = useState(null);
  const [navbarHeight, setNavbarHeight] = useState(120); // Default fallback

  // refs for auto-scrolling active items
  const sidebarBodyRef = useRef(null);
  const activeItemRef = useRef(null);

  const MAX_TREE_CACHE_SIZE = 12;

  // sync prop
  useEffect(() => setSidebarOpen(isOpen), [isOpen]);

  // Monitor navbar height CSS variable for accurate positioning
  useEffect(() => {
    const updateNavbarHeight = () => {
      const height = getComputedStyle(document.documentElement)
        .getPropertyValue("--navbar-height")
        .trim();
      if (height && height !== "0px") {
        const numericHeight = parseInt(height, 10);
        if (!isNaN(numericHeight) && numericHeight > 0) {
          setNavbarHeight(numericHeight);
        }
      }
    };

    // Initial check
    updateNavbarHeight();

    // Watch for changes
    const interval = setInterval(updateNavbarHeight, 100);
    const timeout = setTimeout(() => clearInterval(interval), 2000); // Stop after 2s

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // lru eviction
  useEffect(() => {
    if (treeCacheRef.current.size > MAX_TREE_CACHE_SIZE) {
      const firstKey = treeCacheRef.current.keys().next().value;
      treeCacheRef.current.delete(firstKey);
    }
  }, [tree]);

  // path segments for auto open
  const pathSegments = useMemo(
    () => (pathname ? pathname.split("/").filter(Boolean) : []),
    [pathname]
  );
  const examSlugFromPath = pathSegments[0] || "";
  const subjectSlugFromPath = pathSegments[1] || "";
  const unitSlugFromPath = pathSegments[2] || "";
  const chapterSlugFromPath = pathSegments[3] || "";
  const topicSlugFromPath = pathSegments[4] || "";

  const activeExam = useMemo(
    () => exams.find((e) => e._id === activeExamId) || null,
    [exams, activeExamId]
  );
  const activeExamSlug = activeExam
    ? activeExam.slug || createSlug(activeExam.name)
    : "";

  // close on mobile helper - closes sidebar when navigating on mobile
  const closeOnMobile = useCallback(() => {
    if (onClose && typeof window !== "undefined" && window.innerWidth < 1024) {
      onClose();
    }
  }, [onClose]);

  const navigateTo = useCallback(
    (segments = []) => {
      if (!activeExamSlug) return;
      const path = `/${[activeExamSlug, ...segments]
        .filter(Boolean)
        .join("/")}`;
      router.push(path);
      closeOnMobile();
    },
    [activeExamSlug, router, closeOnMobile]
  );

  /* -------------------- API: exams -------------------- */
  const loadExams = useCallback(async (force = false) => {
    if (!force && hasLoadedExamsRef.current) return;
    hasLoadedExamsRef.current = true;
    try {
      setError("");
      const res = await fetchExams({ limit: 200 });
      setExams(res || []);
    } catch (err) {
      logger.error("loadExams error", err);
      setError("Unable to load exams.");
      hasLoadedExamsRef.current = false;
    }
  }, []);

  /* -------------------- transform tree -------------------- */
  const transformTreeData = useCallback((treeData) => {
    if (!treeData || treeData.length === 0) return [];
    const exam = treeData[0];
    if (!exam || !exam.subjects) return [];

    return exam.subjects.map((subject) => ({
      ...buildNode(subject),
      units: (subject.units || []).map((unit) => ({
        ...buildNode(unit),
        chapters: (unit.chapters || []).map((chapter) => ({
          ...buildNode(chapter),
          topics: (chapter.topics || []).map((topic) => buildNode(topic)),
        })),
      })),
    }));
  }, []);

  /* -------------------- load tree with dedupe & cache -------------------- */
  const loadTree = useCallback(
    async (examId) => {
      if (!examId) {
        setTree([]);
        setTreeLoading(false);
        setError("");
        return;
      }

      if (treeCacheRef.current.has(examId)) {
        setTree(treeCacheRef.current.get(examId));
        setTreeLoading(false);
        setError("");
        return;
      }

      if (treeLoadingRef.current.has(examId)) return;

      treeLoadingRef.current.add(examId);
      setTreeLoading(true);
      setError("");

      try {
        const key = `tree-${examId}`;
        if (pendingApiRequestsRef.current.has(key)) {
          const existing = pendingApiRequestsRef.current.get(key);
          try {
            await existing;
          } catch {}
          if (treeCacheRef.current.has(examId)) {
            setTree(treeCacheRef.current.get(examId));
            setTreeLoading(false);
            setError("");
            treeLoadingRef.current.delete(examId);
            return;
          }
        }

        const promise = fetchTree({ examId, status: "active" });
        pendingApiRequestsRef.current.set(key, promise);

        const treeData = await promise;
        pendingApiRequestsRef.current.delete(key);

        if (!treeData || treeData.length === 0) {
          setError("No navigation data available for this exam.");
          setTree([]);
          setTreeLoading(false);
          treeLoadingRef.current.delete(examId);
          return;
        }

        const transformed = transformTreeData(treeData);
        if (transformed.length === 0) {
          setError("No subjects found for this exam.");
          setTree([]);
        } else {
          treeCacheRef.current.set(examId, transformed);
          setTree(transformed);
          setError("");
        }
      } catch (err) {
        const errorMessage = err?.message || err?.toString() || "Unknown error";
        const errorStack = err?.stack || "No stack trace available";

        logger.error("loadTree error", {
          message: errorMessage,
          stack: errorStack,
          examId,
          error: err ? String(err) : "Error object is empty",
        });

        pendingApiRequestsRef.current.delete(`tree-${examId}`);
        setError("Unable to load sidebar content.");
        setTree([]);
      } finally {
        setTreeLoading(false);
        treeLoadingRef.current.delete(examId);
      }
    },
    [transformTreeData]
  );

  /* -------------------- lifecycle -------------------- */
  useEffect(() => {
    loadExams();
    // Increased interval from 2 minutes to 5 minutes to reduce API calls
    const interval = setInterval(() => loadExams(true), 5 * 60 * 1000);
    const onFocus = () => loadExams(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadExams]);

  // set active exam id from path or default
  useEffect(() => {
    if (!exams.length) return;
    const matched = findByIdOrSlug(exams, examSlugFromPath) || exams[0] || null;
    if (matched?._id && matched._id !== activeExamId)
      setActiveExamId(matched._id);
    else if (!matched && activeExamId && examSlugFromPath)
      setActiveExamId(null);
  }, [exams, examSlugFromPath, activeExamId]);

  // load tree when activeExamId changes
  useEffect(() => {
    if (!activeExamId) {
      setTree([]);
      setTreeLoading(false);
      setError("");
      setOpenSubjectId(null);
      setOpenUnitId(null);
      setOpenChapterId(null);
      return;
    }

    setOpenSubjectId(null);
    setOpenUnitId(null);
    setOpenChapterId(null);

    loadTree(activeExamId);
  }, [activeExamId, loadTree]);

  // debounced query filtered tree
  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const filteredTree = useMemo(() => {
    if (!normalizedQuery) return tree;
    const match = (t) => t && t.toLowerCase().includes(normalizedQuery);

    return tree
      .map((subject) => {
        const subjectMatches = match(subject.name);
        const units = (subject.units || [])
          .map((u) => {
            const um = subjectMatches || match(u.name);
            const chapters = (u.chapters || [])
              .map((c) => {
                const cm = um || match(c.name);
                const topics = (c.topics || []).filter((t) =>
                  cm ? true : match(t.name)
                );
                if (cm || topics.length) return { ...c, topics };
                return null;
              })
              .filter(Boolean);
            if (um || chapters.length) return { ...u, chapters };
            return null;
          })
          .filter(Boolean);
        if (subjectMatches || units.length) return { ...subject, units };
        return null;
      })
      .filter(Boolean);
  }, [tree, normalizedQuery]);

  // auto-open based on path
  useEffect(() => {
    if (!filteredTree.length || normalizedQuery) return;

    if (subjectSlugFromPath) {
      filteredTree.forEach((subject) => {
        if (subject.slug === subjectSlugFromPath) {
          setOpenSubjectId(subject.id);

          if (unitSlugFromPath) {
            subject.units.forEach((unit) => {
              if (unit.slug === unitSlugFromPath) {
                setOpenUnitId(unit.id);

                if (chapterSlugFromPath) {
                  unit.chapters.forEach((chapter) => {
                    if (chapter.slug === chapterSlugFromPath)
                      setOpenChapterId(chapter.id);
                  });
                } else if (topicSlugFromPath) {
                  unit.chapters.forEach((chapter) => {
                    const topicExists = chapter.topics.some(
                      (t) => t.slug === topicSlugFromPath
                    );
                    if (topicExists) setOpenChapterId(chapter.id);
                  });
                }
              }
            });
          }
        }
      });
    } else {
      const first = filteredTree[0];
      if (first) {
        setOpenSubjectId(first.id);
        if (first.units.length > 0) {
          const fu = first.units[0];
          setOpenUnitId(fu.id);
          if (fu.chapters.length > 0) setOpenChapterId(fu.chapters[0].id);
        }
      }
    }
  }, [
    filteredTree,
    subjectSlugFromPath,
    unitSlugFromPath,
    chapterSlugFromPath,
    topicSlugFromPath,
    normalizedQuery,
  ]);

  // pick list to render
  const listToRender = filteredTree.length ? filteredTree : tree;

  // auto-scroll active item into view when sidebar mounts or path changes
  useEffect(() => {
    if (!activeItemRef.current || !sidebarBodyRef.current || normalizedQuery)
      return;

    const timeoutId = setTimeout(() => {
      if (activeItemRef.current && sidebarBodyRef.current) {
        activeItemRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    filteredTree,
    tree,
    openSubjectId,
    openUnitId,
    openChapterId,
    subjectSlugFromPath,
    unitSlugFromPath,
    chapterSlugFromPath,
    topicSlugFromPath,
    normalizedQuery,
  ]);

  // render helpers
  const renderLoading = () => (
    <div className="px-2 py-2 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-8 rounded-lg bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse" />
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="px-3 py-4 text-xs sm:text-sm text-gray-600 text-center bg-gray-50 rounded-lg border border-gray-200">
      {activeExam
        ? "No navigation data available for this exam."
        : "Select an exam to view its content."}
    </div>
  );

  // accordion toggles
  const toggleSubject = useCallback((subjectId) => {
    setOpenSubjectId((prev) => (prev === subjectId ? null : subjectId));
    setOpenUnitId(null);
    setOpenChapterId(null);
  }, []);

  const toggleUnit = useCallback((unitId, subjectId) => {
    setOpenSubjectId(subjectId);
    setOpenUnitId((prev) => (prev === unitId ? null : unitId));
    setOpenChapterId(null);
  }, []);

  const toggleChapter = useCallback((chapterId, subjectId, unitId) => {
    setOpenSubjectId(subjectId);
    setOpenUnitId(unitId);
    setOpenChapterId((prev) => (prev === chapterId ? null : chapterId));
  }, []);

  // mobile handler for overlay close
  const closeSidebarMobile = useCallback(() => {
    setSidebarOpen(false);
    if (onClose) onClose();
  }, [onClose]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[35] bg-black/40 backdrop-blur-[2px] lg:hidden transition-opacity"
          onClick={closeSidebarMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Premium Compact 300px (280px on mobile) */}
      {/* Positioned right after navbar - no overlap */}
      <aside
        className={`fixed left-0 z-[40] w-[280px] sm:w-[300px] min-w-[280px] sm:min-w-[300px] max-w-[280px] sm:max-w-[300px] bg-white/98 backdrop-blur-md border-r border-gray-200/80 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } lg:flex lg:flex-col`}
        style={{
          top: `${navbarHeight}px`,
          height: `calc(100vh - ${navbarHeight}px)`,
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)",
        }}
        role="complementary"
        aria-label="Exam navigation sidebar"
      >
        <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden p-2.5 sm:p-3 min-h-0 min-w-[280px] sm:min-w-[300px] max-w-[280px] sm:max-w-[300px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Exam dropdown */}
          <div className="mb-2.5">
            <ExamDropdown
              exams={exams}
              activeExamId={activeExamId}
              onSelect={(exam) => {
                setActiveExamId(exam._id);
                const slug = exam.slug || createSlug(exam.name);
                router.push(`/${slug}`);
                closeOnMobile();
              }}
            />
          </div>

          {/* Search */}
          {tree.length > 0 && (
            <div className="mb-2.5">
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="search"
                  aria-label="Search subjects, units, chapters, and topics"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-7 py-2 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-400 transition-all duration-200 touch-manipulation shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-gray-300"
                />
              </div>
            </div>
          )}

          {/* Body — Y-scroll only */}
          <div ref={sidebarBodyRef} className="flex-1 min-h-0 w-full">
            {treeLoading && renderLoading()}

            {!treeLoading && error && (
              <div className="px-3 py-2.5 text-xs sm:text-sm text-red-600 font-medium bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {!treeLoading &&
              !error &&
              listToRender.length === 0 &&
              renderEmpty()}

            {!treeLoading && !error && listToRender.length > 0 && (
              <SidebarNavigationTree
                tree={listToRender}
                navigateTo={navigateTo}
                openSubjectId={openSubjectId}
                openUnitId={openUnitId}
                openChapterId={openChapterId}
                toggleSubject={toggleSubject}
                toggleUnit={toggleUnit}
                toggleChapter={toggleChapter}
                subjectSlugFromPath={subjectSlugFromPath}
                unitSlugFromPath={unitSlugFromPath}
                chapterSlugFromPath={chapterSlugFromPath}
                topicSlugFromPath={topicSlugFromPath}
                activeItemRef={activeItemRef}
              />
            )}
          </div>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = "Sidebar";

export default Sidebar;
