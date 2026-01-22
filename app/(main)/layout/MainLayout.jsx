"use client";

import React, { Suspense, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../../../components/ErrorBoundary.jsx";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";
import ScrollToTop from "../components/ScrollToTop";
import WhatsAppFloatButton from "../components/WhatsAppFloatButton";
import api from "../../../lib/api.js";

const MainLayout = ({ children, showSidebar = true, fullWidth = false }) => {
  const pathname = usePathname();
  // Initialize sidebar as open on desktop, closed on mobile (only if showSidebar is true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (!showSidebar) return false;
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return true; // Default to open for SSR
  });

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);
  const closeSidebar = () => setIsSidebarOpen(false);

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
    const isMobile = window.innerWidth < 1024;

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

  return (
    <ErrorBoundary>
      <ServiceWorkerRegistration />
      <ScrollToTop />
      <WhatsAppFloatButton />
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* NAVBAR */}
        <Navbar 
          onMenuToggle={toggleSidebar} 
          isMenuOpen={isSidebarOpen} 
          showSidebar={showSidebar}
        />

        <div className="flex flex-1 relative">
          {/* SIDEBAR (Premium 300px Glass UI) - Only show if showSidebar is true */}
          {/* Sidebar is fixed positioned and handled independently */}
          {showSidebar && (
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
          )}

          {/* MAIN CONTENT */}
          <main
            className={`
              flex-1
              pt-[110px] md:pt-[120px]
              ${showSidebar && isSidebarOpen ? "lg:ml-[300px]" : ""}
              bg-white
              overflow-y-auto
              min-h-0
              ${fullWidth ? "" : "px-4 md:px-6 pb-6"}
              transition-all duration-300 ease-out
              [&::-webkit-scrollbar]:hidden
              [-ms-overflow-style:none]
              [scrollbar-width:none]
            `}
          >
            {fullWidth ? (
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
            ) : (
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
            )}
          </main>
        </div>

        {/* FOOTER */}
        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default MainLayout;
