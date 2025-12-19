"use client";
import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../../../components/ErrorBoundary.jsx";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";
import ScrollToTop from "../components/ScrollToTop";
import WhatsAppFloatButton from "../components/WhatsAppFloatButton";
import api from "../../../lib/api.js";

export default function MainLayoutClient({ children }) {
  const pathname = usePathname();

  // Memoize showSidebar to prevent unnecessary recalculations
  const showSidebar = useMemo(() => {
    return (
      pathname !== "/" &&
      pathname !== "/contact" &&
      !pathname?.startsWith("/calculator")
    );
  }, [pathname]);

  // Track previous showSidebar value to detect actual changes
  const prevShowSidebarRef = useRef(showSidebar);

  // Initialize sidebar as open on desktop, closed on mobile
  // Only initialize once, don't reset on every navigation
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024; // lg breakpoint - open on desktop by default
    }
    return true; // Default to open for SSR
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((v) => !v);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

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
     Student Authentication Check — Verify token on mount
     -------------------------------------------------------- */
  useEffect(() => {
    const checkStudentAuth = async () => {
      // Skip auth check on login/register pages
      if (pathname?.includes("/login") || pathname?.includes("/register")) {
        return;
      }

      const studentToken = localStorage.getItem("student_token");
      if (!studentToken) {
        return;
      }

      try {
        const response = await api.get("/student/auth/verify", {
          headers: {
            Authorization: `Bearer ${studentToken}`,
          },
        });

        if (!response.data.success || !response.data.data?.student) {
          // Student not found or inactive, clear token
          localStorage.removeItem("student_token");
        }
      } catch (error) {
        // Token invalid or expired, clear it
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem("student_token");
        }
      }
    };

    checkStudentAuth();
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

  // If on login/register pages, render without layout
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  return (
    <ErrorBoundary>
      <ServiceWorkerRegistration />
      <ScrollToTop />
      <WhatsAppFloatButton />
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Persistent Navbar - won't re-render on navigation */}
        <Navbar onMenuToggle={toggleSidebar} isMenuOpen={isSidebarOpen} />

        <div className="flex flex-1 relative">
          {/* Persistent Sidebar - always rendered to prevent flickering */}
          <Sidebar
            isOpen={showSidebar && isSidebarOpen}
            onClose={closeSidebar}
          />

          {/* Main content area - only this changes on navigation */}
          <main
            className={`
              flex-1
              pt-[110px] md:pt-[120px]
              ${showSidebar && isSidebarOpen ? "lg:ml-[300px]" : ""}
              bg-white
              overflow-y-auto
              min-h-0
              px-4 md:px-6 pb-6
              transition-all duration-300 ease-out
              [&::-webkit-scrollbar]:hidden
              [-ms-overflow-style:none]
              [scrollbar-width:none]
            `}
          >
            <div className="w-full max-w-7xl mx-auto min-h-[400px]">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-[500px] sm:min-h-[600px] py-12 sm:py-16">
                    <div className="text-center">
                      {/* Spinner with gradient and glow effect */}
                      <div className="relative inline-flex items-center justify-center mb-4 sm:mb-5">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full blur-2xl opacity-30 animate-pulse" />
                        {/* Spinner */}
                        <div className="relative">
                          <div
                            className="inline-block animate-spin rounded-full h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 border-4 border-indigo-500 border-t-transparent"
                            style={{ animationDuration: "1s" }}
                          />
                        </div>
                      </div>
                      {/* Loading text */}
                      <p className="text-sm sm:text-base font-semibold text-gray-700">
                        Loading...
                      </p>
                    </div>
                  </div>
                }
              >
                {children}
              </Suspense>
            </div>
          </main>
        </div>

        {/* Persistent Footer - won't re-render on navigation */}
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
