"use client";
import React, { Suspense, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../../../components/ErrorBoundary.jsx";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";
import ScrollToTop from "../components/ScrollToTop";
import api from "../../../lib/api.js";

export default function MainLayoutClient({ children }) {
  const pathname = usePathname();
  
  // Determine if sidebar should be shown (false for homepage and contact page)
  const showSidebar = pathname !== "/" && pathname !== "/contact";
  
  // Initialize sidebar as open on desktop, closed on mobile (only if showSidebar is true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (!showSidebar) return false;
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return true; // Default to open for SSR
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((v) => !v);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // Update sidebar state when showSidebar changes
  useEffect(() => {
    if (!showSidebar) {
      setIsSidebarOpen(false);
    } else if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, [showSidebar]);

  /* -------------------------------------------------------
     Student Authentication Check — Verify token on mount
     -------------------------------------------------------- */
  useEffect(() => {
    const checkStudentAuth = async () => {
      // Skip auth check on login/register pages
      if (
        pathname?.includes("/login") ||
        pathname?.includes("/register")
      ) {
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

  // If on login/register pages, render without layout
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  return (
    <ErrorBoundary>
      <ServiceWorkerRegistration />
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Persistent Navbar - won't re-render on navigation */}
        <Navbar onMenuToggle={toggleSidebar} isMenuOpen={isSidebarOpen} />

        <div className="flex flex-1 relative">
          {/* Persistent Sidebar - won't re-render on navigation */}
          {showSidebar && (
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
          )}

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
            <div className="w-full max-w-7xl mx-auto">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4"></div>
                      <p className="text-gray-600 text-sm">Loading...</p>
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

