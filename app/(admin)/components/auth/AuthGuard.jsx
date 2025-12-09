"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists in localStorage
        const token = localStorage.getItem("token");

        if (!token) {
          // No token, redirect to login
          localStorage.removeItem("user");
          router.push("/admin/login");
          return;
        }

        // CRITICAL: Verify token with server AND check if user exists in database
        // This ensures deleted users are immediately logged out
        try {
          const response = await api.get("/auth/verify");

          if (response.data.success && response.data.data) {
            // User exists and token is valid - update localStorage with fresh data
            const userData = response.data.data;
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
            setIsAuthenticated(true);

            // If we're on login/register page and user is authenticated, redirect to dashboard
            if (
              pathname === "/admin/login" ||
              pathname === "/admin/register"
            ) {
              router.push("/admin");
              return;
            }
          } else {
            // Token invalid or user not found
            throw new Error("Invalid token or user not found");
          }
        } catch (error) {
          // Token invalid, expired, or user deleted from database
          console.error("Auth verification failed:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          
          // Only redirect if not already on login/register page
          if (pathname !== "/admin/login" && pathname !== "/admin/register") {
            router.push("/admin/login");
          }
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (pathname !== "/admin/login" && pathname !== "/admin/register") {
          router.push("/admin/login");
        }
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

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

  // If on login/register pages, don't require auth
  if (pathname === "/admin/login" || pathname === "/admin/register") {
    return <>{children}</>;
  }

  // If not authenticated, don't render children (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default AuthGuard;
