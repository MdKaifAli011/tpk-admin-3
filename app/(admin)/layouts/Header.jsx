"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { FaUser, FaSignOutAlt, FaBars } from "react-icons/fa";
import api from "../../../lib/api";

const Header = ({ onMenuToggle }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage (will be updated by AuthGuard/MainLayout)
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        // Silently handle parse error - user will be redirected by AuthGuard
      }
    }
  }, []);

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
            src="/logo.png"
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

      {/* Right: User & Logout */}
      <div className="flex items-center gap-3">
        {/* User Info */}
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
};

export default Header;
