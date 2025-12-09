"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import AuthGuard from "../components/auth/AuthGuard";
import ErrorBoundary from "../../../components/ErrorBoundary";
import api from "../../../lib/api";

const MainLayout = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // If on login/register pages, don't check auth
      if (pathname === "/admin/login" || pathname === "/admin/register") {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        // No token, redirect to login
        localStorage.removeItem("user");
        router.push("/admin/login");
        setIsLoading(false);
        return;
      }

      try {
        // CRITICAL: Verify token with server AND check if user exists in database
        // This ensures deleted users are immediately logged out
        const response = await api.get("/auth/verify");

        if (response.data.success && response.data.data) {
          // User exists and token is valid
          const userData = response.data.data;
          localStorage.setItem("user", JSON.stringify(userData));
          setIsAuthenticated(true);
        } else {
          // User not found or token invalid
          throw new Error("User not found or token invalid");
        }
      } catch (error) {
        // Token invalid, expired, or user deleted from database
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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // If on login/register pages, render without layout
  if (pathname === "/admin/login" || pathname === "/admin/register") {
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

          <main className="pt-16 lg:ml-64 lg:pt-20 px-6 py-10 transition-all duration-300 ease-in-out">
            <div className="w-full max-w-7xl mx-auto">
              <div className="space-y-6">{children}</div>
            </div>
          </main>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  );
};

export default MainLayout;
