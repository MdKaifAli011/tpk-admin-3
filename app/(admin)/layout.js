"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "./layouts/Header";
import Sidebar from "./layouts/Sidebar";
import AuthGuard from "./components/auth/AuthGuard";
import ErrorBoundary from "../../components/ErrorBoundary";
import api from "../../lib/api";

const AUTH_VERIFY_CACHE_MS = 45 * 1000; // 45 seconds – skip refetch if verified recently

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastVerifiedRef = useRef(0);

  useEffect(() => {
    const checkAuth = async () => {
      if (
        pathname?.endsWith("/admin/login") ||
        pathname?.endsWith("/admin/register")
      ) {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        localStorage.removeItem("user");
        router.push("/admin/login");
        setIsLoading(false);
        return;
      }

      const now = Date.now();
      const useCache = now - lastVerifiedRef.current < AUTH_VERIFY_CACHE_MS;

      if (useCache) {
        setIsAuthenticated(true);
        setIsLoading(false);
        // Refetch in background; only redirect if it fails
        api.get("/auth/verify").then((response) => {
          if (response?.data?.success && response?.data?.data) {
            lastVerifiedRef.current = Date.now();
            localStorage.setItem("user", JSON.stringify(response.data.data));
          }
        }).catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/admin/login");
          setIsAuthenticated(false);
        });
        return;
      }

      try {
        const response = await api.get("/auth/verify");

        if (response.data.success && response.data.data) {
          const userData = response.data.data;
          localStorage.setItem("user", JSON.stringify(userData));
          lastVerifiedRef.current = Date.now();
          setIsAuthenticated(true);
        } else {
          throw new Error("User not found or token invalid");
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/admin/login");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  const toggleSidebar = React.useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = React.useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // If on login/register pages, render without layout
  if (
    pathname?.endsWith("/admin/login") ||
    pathname?.endsWith("/admin/register")
  ) {
    return <>{children}</>;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <AuthGuard>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <Header onMenuToggle={toggleSidebar} />
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
          <main className="pt-16 lg:ml-64 px-6 py-8 transition-all duration-300 ease-in-out">
            <div className="w-full max-w-7xl mx-auto">
              <div className="space-y-6">{children}</div>
            </div>
          </main>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  );
}

