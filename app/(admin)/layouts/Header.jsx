"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, memo } from "react";
import { FaUser, FaSignOutAlt, FaBars, FaSyncAlt } from "react-icons/fa";
import { usePathname } from "next/navigation";
import api from "@/lib/api";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const Header = memo(({ onMenuToggle }) => {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [visitStatsRefreshing, setVisitStatsRefreshing] = useState(false);
  const [visitStatsMessage, setVisitStatsMessage] = useState(null);

  useEffect(() => {
    // Get user from localStorage and update on pathname change
    const updateUser = () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } catch (error) {
          // Silently handle parse error
        }
      }
    };

    updateUser();
    // Listen for storage changes (when user data is updated elsewhere)
    window.addEventListener("storage", updateUser);
    return () => window.removeEventListener("storage", updateUser);
  }, [pathname]); // Update when pathname changes (in case user data was updated)

  const handleRefreshVisitStats = async () => {
    setVisitStatsMessage(null);
    setVisitStatsRefreshing(true);
    try {
      const res = await api.post("/admin/refresh-visit-stats");
      if (res?.data?.success) {
        setVisitStatsMessage(res.data?.message || "Visit stats refreshed");
        // Reload the page so updated visit stats are visible
        setTimeout(() => window.location.reload(), 800);
      } else {
        setVisitStatsRefreshing(false);
        setVisitStatsMessage(res?.data?.message || "Failed to refresh");
      }
    } catch (err) {
      setVisitStatsRefreshing(false);
      setVisitStatsMessage(err?.response?.data?.message || "Failed to refresh visit stats");
    }
  };

  useEffect(() => {
    if (visitStatsMessage !== null) {
      const t = setTimeout(() => setVisitStatsMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [visitStatsMessage]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Menu Button + Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <FaBars className="text-base" />
          </button>

          {/* Logo */}
          <div className="flex items-center">
            <Image
              src={`${basePath}/logo.png`}
              alt="TestPrepKart Logo"
              width={150}
              height={150}
              className="h-8 w-auto"
              priority
              loading="eager"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
            />
          </div>
        </div>

        {/* Right: Refresh visit stats + User & Logout */}
        <div className="flex items-center gap-3">
          {/* Refresh visit stats (cron) */}
          <div className="relative">
            <button
              type="button"
              onClick={handleRefreshVisitStats}
              disabled={visitStatsRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title="Refresh visit stats (runs cron update)"
            >
              <FaSyncAlt className={`text-sm ${visitStatsRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh visits</span>
            </button>
            {visitStatsMessage && (
              <div className="absolute top-full right-0 mt-1 px-2 py-1 text-xs bg-gray-800 text-white rounded shadow-lg whitespace-nowrap z-50">
                {visitStatsMessage}
              </div>
            )}
          </div>

          {/* User Info */}
          <Link href="/admin/profile">
            <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white">
                <FaUser className="text-sm" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {user?.role === "admin" ? "Admin" : user?.role || "User"}
                </span>
                <span className="text-xs text-gray-500">
                  {user?.name || "Administrator"}
                </span>
              </div>
            </div>
          </Link>

          {/* Logout Button */}
          <Link
            href="/logout"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FaSignOutAlt className="text-sm" />
            <span className="hidden sm:inline">Logout</span>
          </Link>
        </div>
      </div>
    </header>
  );
});

Header.displayName = "Header";

export default Header;
