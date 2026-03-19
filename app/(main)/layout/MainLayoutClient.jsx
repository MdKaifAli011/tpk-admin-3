"use client";
import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  lazy,
} from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../../../components/ErrorBoundary.jsx";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import CustomCodeInjector from "../components/CustomCodeInjector";
import { SearchProvider } from "./context/SearchContext";
import api from "../../../lib/api.js";

// Defer non-critical UI to reduce TBT and main-thread work
const Footer = lazy(() => import("./Footer"));
const ServiceWorkerRegistration = lazy(() => import("../components/ServiceWorkerRegistration"));
const ScrollToTop = lazy(() => import("../components/ScrollToTop"));
const WhatsAppFloatButton = lazy(() => import("../components/WhatsAppFloatButton"));

export default function MainLayoutClient({ children }) {
  const pathname = usePathname();

  // Memoize showSidebar to prevent unnecessary recalculations
  const showSidebar = useMemo(() => {
    // No sidebar on: home, contact, calculator, store, explore, auth, tool pages, or exam-level pages
    const isExamPagesRoute = pathname?.match(/^\/[^/]+\/pages(\/|$)/);
    const isToolPage = pathname?.includes("/tool");
    return (
      pathname !== "/" &&
      pathname !== "/contact" &&
      !isToolPage &&
      !pathname?.startsWith("/calculator") &&
      !pathname?.startsWith("/store") &&
      !pathname?.startsWith("/explore") &&
      !pathname?.startsWith("/forgot-password") &&
      !pathname?.startsWith("/reset-password") &&
      !pathname?.startsWith("/pages") &&
      !isExamPagesRoute
    );
  }, [pathname]);

  // Track previous showSidebar value to detect actual changes
  const prevShowSidebarRef = useRef(showSidebar);

  // Initialize closed so server and client match (avoids hydration mismatch).
  // useEffect below opens on desktop after mount.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((v) => !v);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // After mount: open sidebar on desktop so UX matches previous behavior (avoids hydration mismatch)
  useEffect(() => {
    if (!showSidebar) return;
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, [showSidebar]);

  // Only update sidebar state when transitioning TO/FROM pages that don't show sidebar
  // This prevents flickering during normal navigation
  useEffect(() => {
    const prevShowSidebar = prevShowSidebarRef.current;
    prevShowSidebarRef.current = showSidebar;

    // Only update if showSidebar actually changed (transitioning to/from homepage/contact)
    if (prevShowSidebar !== showSidebar) {
      if (!showSidebar) {
        // Navigating to homepage/contact - close sidebar
        setIsSidebarOpen(false);
      } else {
        // Navigating from homepage/contact to a page with sidebar - open on desktop
        if (typeof window !== "undefined" && window.innerWidth >= 1024) {
          setIsSidebarOpen(true);
        }
      }
    }
  }, [showSidebar]);

  /* -------------------------------------------------------
     Student Authentication Check — Defer until idle to reduce TBT
     -------------------------------------------------------- */
  useEffect(() => {
    const checkStudentAuth = async () => {
      if (pathname?.includes("/login") || pathname?.includes("/register") || pathname?.includes("/forgot-password") || pathname?.includes("/reset-password")) return;
      const studentToken = localStorage.getItem("student_token");
      if (!studentToken) return;
      try {
        const response = await api.get("/student/auth/verify", {
          headers: { Authorization: `Bearer ${studentToken}` },
        });
        if (!response.data.success || !response.data.data?.student) {
          localStorage.removeItem("student_token");
        }
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem("student_token");
        }
      }
    };

    const runWhenIdle = () => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => checkStudentAuth(), { timeout: 3000 });
      } else {
        setTimeout(checkStudentAuth, 1500);
      }
    };
    const t = setTimeout(runWhenIdle, 0);
    return () => clearTimeout(t);
  }, [pathname]);

  /* -------------------------------------------------------
     Mobile Scroll Lock — Simplified + Reliable
     -------------------------------------------------------- */
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

    if (isSidebarOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // Keep sidebar open on desktop when window is resized (only if showSidebar is true)
  useEffect(() => {
    if (!showSidebar) return;

    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      const isMobile = window.innerWidth < 1024;

      // Auto-open on desktop, auto-close on mobile
      if (isDesktop && !isSidebarOpen) {
        setIsSidebarOpen(true);
      } else if (isMobile && isSidebarOpen) {
        // Optionally close on mobile resize, but let user control it
        // setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen, showSidebar]);

  /* -------------------------------------------------------
     Mobile Swipe Gesture — Swipe from left edge to open sidebar
     (Standard mobile pattern: start from left edge, swipe right)
     -------------------------------------------------------- */
  const touchStartRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    // Only enable swipe gesture on mobile and when sidebar should be shown
    if (!showSidebar) return;

    const handleTouchStart = (e) => {
      // Only handle touches on mobile
      if (typeof window === "undefined" || window.innerWidth >= 1024) return;

      const touch = e.touches[0];
      if (!touch) return;

      const startX = touch.clientX;
      const startY = touch.clientY;

      // Only start tracking if touch starts from left edge (within 20px)
      // This prevents interfering with normal scrolling
      if (startX <= 20) {
        touchStartRef.current = true;
        touchStartXRef.current = startX;
        touchStartYRef.current = startY;
      }
    };

    const handleTouchMove = (e) => {
      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const currentX = touch.clientX;
      const currentY = touch.clientY;
      const deltaX = currentX - touchStartXRef.current;
      const deltaY = Math.abs(currentY - touchStartYRef.current);

      // Prevent default scrolling if we're swiping horizontally
      // Only prevent if horizontal movement is greater than vertical (swipe gesture)
      if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      if (!touchStartRef.current) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        touchStartRef.current = null;
        return;
      }

      const endX = touch.clientX;
      const endY = touch.clientY;
      const deltaX = endX - touchStartXRef.current;
      const deltaY = Math.abs(endY - touchStartYRef.current);

      // Detect swipe-from-left-edge gesture:
      // 1. Started from left edge (already checked in touchstart)
      // 2. Swiped right (deltaX > 0) - finger moves right, opening sidebar
      // 3. Horizontal movement is greater than vertical (swipe gesture, not scroll)
      // 4. Minimum swipe distance of 50px for reliable detection
      const isSwipeRight = deltaX > 0;
      const isHorizontalSwipe = Math.abs(deltaX) > deltaY;
      const minSwipeDistance = 50;

      if (
        isSwipeRight &&
        isHorizontalSwipe &&
        Math.abs(deltaX) >= minSwipeDistance &&
        !isSidebarOpen
      ) {
        // Open sidebar on swipe-right gesture
        setIsSidebarOpen(true);
      }

      // Reset touch tracking
      touchStartRef.current = null;
      touchStartXRef.current = 0;
      touchStartYRef.current = 0;
    };

    // Attach touch event listeners to document for global swipe detection
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [showSidebar, isSidebarOpen]);

  // If on login/register pages, render without layout (but still inject custom code e.g. GA)
  if (pathname === "/login" || pathname === "/register") {
    return (
      <>
        <CustomCodeInjector />
        {children}
      </>
    );
  }

  return (
    <ErrorBoundary>
      <SearchProvider>
        <CustomCodeInjector />
        <div
          id="main-app-root"
          className="flex flex-col min-h-screen min-w-0 w-full bg-gray-50"
          data-app-root
        >
          <Navbar
            onMenuToggle={toggleSidebar}
            isMenuOpen={isSidebarOpen}
            showSidebar={showSidebar}
          />

          <div className="flex flex-1 relative min-h-0 min-w-0 w-full">
            <Sidebar
              isOpen={showSidebar && isSidebarOpen}
              onClose={closeSidebar}
            />

            <main
              className={`
    flex-1 min-w-0 min-h-0 w-full max-w-full
    pt-[calc(var(--navbar-height)+1rem)]
    ${showSidebar && isSidebarOpen ? "lg:ml-[300px]" : ""}
    bg-white px-4 sm:px-4 md:px-6 pb-6
    transition-transform duration-300 ease-out
  `}
            >
              <div className="w-full max-w-7xl mx-auto min-w-0 min-h-[400px]">
                <Suspense
                  fallback={
                    <div className="min-h-[400px] py-8 animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
                      <div className="h-4 bg-gray-100 rounded w-full max-w-2xl mb-2" />
                      <div className="h-4 bg-gray-100 rounded w-full max-w-xl" />
                    </div>
                  }
                >
                  {children}
                </Suspense>
              </div>
            </main>
          </div>

          {/* Footer is the last visible UI. CustomCodeInjector appends its footer nodes inside #main-app-root after this so nothing appears below the footer. */}
          <Suspense
            fallback={
              <div className="min-h-[200px] bg-gray-50" aria-hidden="true" />
            }
          >
            <ServiceWorkerRegistration />
            <ScrollToTop />
            <WhatsAppFloatButton />
            <Footer />
          </Suspense>
        </div>
      </SearchProvider>
    </ErrorBoundary>
  );
}
