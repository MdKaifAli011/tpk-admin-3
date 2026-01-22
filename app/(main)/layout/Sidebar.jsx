"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { FaSearch, FaChevronDown, FaChevronRight } from "react-icons/fa";
import {
  fetchExams,
  fetchTree,
  createSlug,
  findByIdOrSlug,
  fetchBlogCategories,
  fetchDownloadFolders,
} from "../lib/api";
import { logger } from "@/utils/logger";
import ExamDropdown from "../components/ExamDropdown";
import SidebarNavigationTree from "../components/SidebarNavigationTree";

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
  const [blogCategories, setBlogCategories] = useState([]);
  const [downloadFolders, setDownloadFolders] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);

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
  const [navbarHeight, setNavbarHeight] = useState(120);

  // refs for auto-scrolling active items
  const sidebarBodyRef = useRef(null);
  const activeItemRef = useRef(null);

  const MAX_TREE_CACHE_SIZE = 12;

  // ✅ Subjects button visibility logic
  const shouldShowSubjectsButton = activeMenu !== "subjects";

  // sync prop
  useEffect(() => setSidebarOpen(isOpen), [isOpen]);

  // Monitor navbar height for accurate positioning - ensures no gap
  useEffect(() => {
    const updateNavbarHeight = () => {
      const navbar = document.querySelector("nav[data-navbar]");
      if (navbar) {
        const height = navbar.offsetHeight;
        if (height > 0) {
          setNavbarHeight(height);
          return;
        }
      }

      const cssHeight = getComputedStyle(document.documentElement)
        .getPropertyValue("--navbar-height")
        .trim();
      if (cssHeight && cssHeight !== "0px") {
        const numericHeight = parseInt(cssHeight, 10);
        if (!isNaN(numericHeight) && numericHeight > 0) {
          setNavbarHeight(numericHeight);
        }
      }
    };

    updateNavbarHeight();

    const navbar = document.querySelector("nav[data-navbar]");
    let resizeObserver = null;

    if (navbar && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateNavbarHeight();
      });
      resizeObserver.observe(navbar);
    }

    const interval = setInterval(updateNavbarHeight, 100);
    const timeout = setTimeout(() => clearInterval(interval), 2000);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
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
  const categorySlugFromPath =
    pathSegments[2] === "blog" && pathSegments[3] === "category"
      ? pathSegments[4]
      : null;

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
    if (!treeData || treeData.length === 0) {
      logger.warn("transformTreeData: Empty treeData received");
      return [];
    }
    
    const exam = treeData[0];
    if (!exam) {
      logger.warn("transformTreeData: No exam found in treeData", { treeDataLength: treeData.length });
      return [];
    }
    
    if (!exam.subjects || !Array.isArray(exam.subjects) || exam.subjects.length === 0) {
      logger.warn("transformTreeData: No subjects found in exam", { 
        examId: exam._id || exam.id, 
        examName: exam.name,
        hasSubjects: !!exam.subjects,
        subjectsType: typeof exam.subjects,
        subjectsLength: exam.subjects?.length || 0
      });
      return [];
    }

    const transformed = exam.subjects.map((subject) => ({
      ...buildNode(subject),
      units: (subject.units || []).map((unit) => ({
        ...buildNode(unit),
        chapters: (unit.chapters || []).map((chapter) => ({
          ...buildNode(chapter),
          topics: (chapter.topics || []).map((topic) => buildNode(topic)),
        })),
      })),
    }));

    logger.info("transformTreeData: Successfully transformed", {
      examId: exam._id || exam.id,
      subjectsCount: transformed.length
    });

    return transformed;
  }, []);

  /* -------------------- load tree with dedupe & cache -------------------- */
  const loadTree = useCallback(
    async (examId, forceRefresh = false) => {
      if (!examId) {
        setTree([]);
        setTreeLoading(false);
        setError("");
        return;
      }

      if (!forceRefresh && treeLoadingRef.current.has(examId)) {
        const key = `tree-${examId}`;
        if (pendingApiRequestsRef.current.has(key)) {
          try {
            await pendingApiRequestsRef.current.get(key);
            if (treeCacheRef.current.has(examId)) {
              setTree(treeCacheRef.current.get(examId));
              setTreeLoading(false);
              setError("");
              return;
            }
          } catch (err) {
            logger.warn("Previous tree request failed, retrying:", err);
          }
        }
      }

      if (forceRefresh) {
        treeCacheRef.current.delete(examId);
        pendingApiRequestsRef.current.delete(`tree-${examId}`);
      }

      if (!forceRefresh && treeCacheRef.current.has(examId)) {
        const cachedTree = treeCacheRef.current.get(examId);
        setTree(cachedTree);
        setTreeLoading(false);
        setError("");
        return;
      }

      treeLoadingRef.current.add(examId);
      setTreeLoading(true);
      setError("");

      try {
        const key = `tree-${examId}`;
        
        if (pendingApiRequestsRef.current.has(key)) {
          pendingApiRequestsRef.current.delete(key);
        }

        const promise = fetchTree({ examId, status: "active" });
        pendingApiRequestsRef.current.set(key, promise);

        const treeData = await promise;
        
        if (!treeLoadingRef.current.has(examId)) {
          pendingApiRequestsRef.current.delete(key);
          return;
        }

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
          setTreeLoading(false);
          treeLoadingRef.current.delete(examId);
          return;
        }

        if (treeLoadingRef.current.has(examId)) {
          treeCacheRef.current.set(examId, transformed);
          setTree(transformed);
          setError("");
          setTreeLoading(false);
          
          // Emit custom event for search modal
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("treeDataUpdated", {
              detail: { tree: transformed, activeExamId: examId }
            }));
          }
        }
      } catch (err) {
        if (treeLoadingRef.current.has(examId)) {
          const errorMessage = err?.message || err?.toString() || "Unknown error";
          logger.error("loadTree error", {
            message: errorMessage,
            examId,
            error: err ? String(err) : "Error object is empty",
          });

          setError("Unable to load sidebar content.");
          setTree([]);
          setTreeLoading(false);
        }
        
        pendingApiRequestsRef.current.delete(`tree-${examId}`);
      } finally {
        treeLoadingRef.current.delete(examId);
      }
    },
    [transformTreeData]
  );

  /* -------------------- lifecycle -------------------- */
  useEffect(() => {
    loadExams();
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
    let previousExamId = activeExamId;
    
    if (!activeExamId) {
      setTree([]);
      setTreeLoading(false);
      setError("");
      setOpenSubjectId(null);
      setOpenUnitId(null);
      setOpenChapterId(null);
      setBlogCategories([]);
      setDownloadFolders([]);
      return;
    }

    setOpenSubjectId(null);
    setOpenUnitId(null);
    setOpenChapterId(null);
    setError("");
    setTree([]);
    setTreeLoading(true);

    const cleanupPreviousExam = () => {
      const currentKey = `tree-${activeExamId}`;
      const keysToDelete = [];
      pendingApiRequestsRef.current.forEach((_, key) => {
        if (key !== currentKey) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => {
        pendingApiRequestsRef.current.delete(key);
      });

      const loadingExamsToDelete = [];
      treeLoadingRef.current.forEach((examId) => {
        if (examId !== activeExamId) {
          loadingExamsToDelete.push(examId);
        }
      });
      loadingExamsToDelete.forEach(examId => {
        treeLoadingRef.current.delete(examId);
      });
    };

    cleanupPreviousExam();

    loadTree(activeExamId);

    const loadCategories = async () => {
      try {
        const categories = await fetchBlogCategories({
          examId: activeExamId,
          status: "active",
          limit: 100,
        });
        setBlogCategories(categories || []);
      } catch (err) {
        logger.error("Error loading blog categories:", err);
        setBlogCategories([]);
      }
    };
    loadCategories();

    const loadDownloadFolders = async () => {
      try {
        const folders = await fetchDownloadFolders(activeExamId, {
          status: "active",
          limit: 100,
        });
        setDownloadFolders(folders || []);
      } catch (err) {
        logger.error("Error loading download folders:", err);
        setDownloadFolders([]);
      }
    };
    loadDownloadFolders();

    return () => {
      if (previousExamId && previousExamId !== activeExamId) {
        const prevKey = `tree-${previousExamId}`;
        pendingApiRequestsRef.current.delete(prevKey);
        treeLoadingRef.current.delete(previousExamId);
      }
    };
  }, [activeExamId, loadTree]);

  // Auto-expand menu based on path
  useEffect(() => {
    if (pathname.includes("/blog")) {
      setActiveMenu('blog');
    } else if (pathname.includes("/download")) {
      setActiveMenu('download');
    } else {
      setActiveMenu('subjects');
    }
  }, [pathname]);

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
  }, [filteredTree, subjectSlugFromPath, unitSlugFromPath, chapterSlugFromPath, topicSlugFromPath, normalizedQuery]);

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
  }, [filteredTree, tree, openSubjectId, openUnitId, openChapterId, subjectSlugFromPath, unitSlugFromPath, chapterSlugFromPath, topicSlugFromPath, normalizedQuery]);

  // render helpers
  const renderLoading = () => (
    <div className="px-2 py-2 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-8 rounded-lg bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse"
        />
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
  const toggleMenu = useCallback((menu) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  }, []);

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
      <aside
        className={`fixed left-0 z-[40] w-[280px] sm:w-[300px] min-w-[280px] sm:min-w-[300px] max-w-[280px] sm:max-w-[300px] bg-white/98 backdrop-blur-md border-r border-gray-200/80 transform transition-transform duration-300 ease-out ${
          sidebarOpen && isOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } ${!isOpen ? "lg:hidden" : ""} lg:flex lg:flex-col`}
        style={{
          top: `${navbarHeight}px`,
          height: `calc(100vh - ${navbarHeight}px)`,
          marginTop: 0,
          boxShadow:
            "0 4px 20px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)",
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
                if (activeExamId && activeExamId !== exam._id) {
                  const prevKey = `tree-${activeExamId}`;
                  pendingApiRequestsRef.current.delete(prevKey);
                  treeLoadingRef.current.delete(activeExamId);
                  setTree([]);
                  setTreeLoading(true);
                  setError("");
                }
                
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

            {/* ✅ SUBJECTS - HIDE BUTTON WHEN ACTIVE */}
            {!treeLoading && !error && listToRender.length > 0 && (
              <>
                {shouldShowSubjectsButton && (
                  <div className="mb-2.5">
                    <button
                      onClick={() => toggleMenu('subjects')}
                      className={`w-full flex items-center justify-between px-3 py-2 font-semibold rounded-lg cursor-pointer transition-all duration-200 ${
                        activeMenu === 'subjects'
                          ? "bg-indigo-100/60 shadow-sm text-indigo-900"
                          : "text-black hover:text-indigo-600 hover:bg-gray-50"
                      }`}
                    >
                      <span>Subjects</span>
                      {activeMenu === 'subjects' ? (
                        <FaChevronDown className="text-[10px] text-gray-400" />
                      ) : (
                        <FaChevronRight className="text-[10px] text-gray-400" />
                      )}
                    </button>
                  </div>
                )}
                
                {activeMenu === 'subjects' && (
                  <div className="mb-4 space-y-0.5 ">
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
                  </div>
                )}
              </>
            )}

            {/* Static links: Blog & Download - ALWAYS VISIBLE */}
            <div className="mt-2.5 pt-2.5 border-t border-gray-100">
              <ul className="space-y-1">
                {/* Blog with expandable categories */}
                {activeExamSlug ? (
                  <li>
                    <div>
                      <button
                        onClick={() => toggleMenu('blog')}
                        className={`w-full flex items-center justify-between px-3 py-2 font-semibold rounded-lg cursor-pointer transition-all duration-200 ${
                          pathname.includes("/blog")
                            ? "bg-indigo-100/60 shadow-sm text-indigo-900"
                            : "text-black hover:text-indigo-600 hover:bg-gray-50"
                        }`}
                      >
                        <span>Blog</span>
                        {activeMenu === 'blog' ? (
                          <FaChevronDown className="text-[10px] text-gray-400" />
                        ) : (
                          <FaChevronRight className="text-[10px] text-gray-400" />
                        )}
                      </button>
                      {activeMenu === 'blog' && (
                        <ul className="ml-3 mt-1 space-y-0.5 border-l border-gray-200 pl-2">
                          <li>
                            <Link
                              href={`/${activeExamSlug}/blog`}
                              className={`block px-2 py-1.5 font-normal text-[14px] rounded-md transition-all duration-200 ${
                                pathname === `/${activeExamSlug}/blog` ||
                                pathname === `/${activeExamSlug}/blog/`
                                  ? "text-indigo-600 bg-indigo-50 font-normal text-[14px]"
                                  : "text-black hover:text-indigo-600 hover:bg-gray-50"
                              }`}
                              onClick={closeOnMobile}
                            >
                              All Blogs
                            </Link>
                          </li>
                          {blogCategories.length > 0 ? (
                            blogCategories.map((category) => {
                              const categorySlug = createSlug(category.name);
                              const categoryPath = `/${activeExamSlug}/blog/category/${categorySlug}`;
                              const isActive = pathname === categoryPath;
                              return (
                                <li key={category._id || category.id}>
                                  <Link
                                    href={categoryPath}
                                    className={`block px-2 py-1.5 rounded-md font-light text-[14px] transition-all duration-200 ${
                                      isActive
                                        ? "bg-indigo-100/60 shadow-sm text-indigo-900"
                                        : "text-black hover:text-indigo-600 hover:bg-gray-50"
                                    }`}
                                    onClick={closeOnMobile}
                                  >
                                    {category.name}
                                  </Link>
                                </li>
                              );
                            })
                          ) : (
                            <li className="px-2 py-1.5 text-sm sm:text-md text-gray-400 italic">
                              No categories
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </li>
                ) : (
                  <li className="px-3 py-2 text-sm sm:text-md font-medium text-[14px] text-gray-400">
                    Blog
                  </li>
                )}

                {/* Download with expandable folders */}
                {activeExamSlug ? (
                  <li>
                    <div>
                      <button
                        onClick={() => toggleMenu('download')}
                        className={`w-full flex items-center justify-between px-3 py-2 font-semibold rounded-lg cursor-pointer transition-all duration-200 ${
                          pathname.includes("/download")
                            ? "text-indigo-600 bg-indigo-50"
                            : "text-black hover:text-indigo-600 hover:bg-gray-50"
                        }`}
                      >
                        <span>Download</span>
                        {activeMenu === 'download' ? (
                          <FaChevronDown className="text-[10px] text-gray-400" />
                        ) : (
                          <FaChevronRight className="text-[10px] text-gray-400" />
                        )}
                      </button>
                      {activeMenu === 'download' && (
                        <ul className="ml-3 mt-1 space-y-0.5 border-l border-gray-200 pl-2">
                          <li>
                            <Link
                              href={`/${activeExamSlug}/download`}
                              className={`block px-2 py-1.5 font-normal text-[14px] rounded-md transition-all duration-200 ${
                                pathname === `/${activeExamSlug}/download` ||
                                pathname === `/${activeExamSlug}/download/`
                                  ? "text-indigo-600 bg-indigo-50 font-normal text-[14px]"
                                  : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                              }`}
                              onClick={closeOnMobile}
                            >
                              All Folders
                            </Link>
                          </li>
                          {downloadFolders.length > 0 ? (
                            downloadFolders.map((folder) => {
                              const folderSlug =
                                folder.slug || createSlug(folder.name);
                              const folderPath = `/${activeExamSlug}/download/${folderSlug}`;
                              const isActive =
                                pathname === folderPath ||
                                pathname.startsWith(`${folderPath}/`);
                              return (
                                <li key={folder._id}>
                                  <Link
                                    href={folderPath}
                                    className={`block px-2 py-1.5 font-normal text-[14px] rounded-md transition-all duration-200 ${
                                      isActive
                                        ? "text-indigo-600 font-normal text-[14px] bg-indigo-50"
                                        : "text-gray-600 font-normal text-[14px] hover:text-indigo-600 hover:bg-gray-50"
                                    }`}
                                    onClick={closeOnMobile}
                                  >
                                    {folder.name}
                                  </Link>
                                </li>
                              );
                            })
                          ) : (
                            <li className="px-2 py-1.5 text-[11px] sm:text-xs text-gray-400 italic">
                              No folders
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </li>
                ) : (
                  <li className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-400">
                    Download
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = "Sidebar";

export default Sidebar;
