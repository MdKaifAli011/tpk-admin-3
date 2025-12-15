"use client";
import React, { useState, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaInstagram,
  FaFacebook,
  FaWhatsapp,
  FaYoutube,
  FaTwitter,
  FaLinkedin,
  FaSearch,
  FaUser,
  FaTh,
  FaBars,
  FaChevronDown,
  FaSignOutAlt,
} from "react-icons/fa";
import Image from "next/image";
import { useStudent } from "../hooks/useStudent";

const Navbar = memo(({ onMenuToggle, isMenuOpen }) => {
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const { student, isLoading, isAuthenticated, logout } = useStudent();

  // Handle default props
  const handleMenuToggle = onMenuToggle || (() => {});

  // Calculate navbar height and set CSS variable for sidebar positioning
  React.useEffect(() => {
    const navbar = document.querySelector("nav[data-navbar]");
    if (!navbar) return;

    const updateNavbarHeight = () => {
      const height = navbar.offsetHeight;
      if (height > 0) {
        document.documentElement.style.setProperty(
          "--navbar-height",
          `${height}px`
        );
      }
    };

    // Set initial height immediately
    updateNavbarHeight();

    // Use ResizeObserver for more accurate height tracking
    const resizeObserver = new ResizeObserver(() => {
      updateNavbarHeight();
    });
    resizeObserver.observe(navbar);

    // Also listen to window resize as fallback
    window.addEventListener("resize", updateNavbarHeight);

    // Recalculate after multiple delays to catch all render phases
    const timeouts = [
      setTimeout(updateNavbarHeight, 0),
      setTimeout(updateNavbarHeight, 100),
      setTimeout(updateNavbarHeight, 300),
    ];

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateNavbarHeight);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Prevent body scroll when nav menu is open on mobile
  React.useEffect(() => {
    if (isNavMenuOpen) {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        document.body.style.overflow = "hidden";
      }
    } else {
      // Only restore scroll if sidebar is also closed
      if (!isMenuOpen) {
        document.body.style.overflow = "";
      }
    }

    return () => {
      if (!isMenuOpen) {
        document.body.style.overflow = "";
      }
    };
  }, [isNavMenuOpen, isMenuOpen]);

  // Close user menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserMenuOpen && !event.target.closest(".user-menu-container")) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  // Handle logout
  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push("/");
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!student) return "User";
    if (student.firstName && student.lastName) {
      return `${student.firstName} ${student.lastName}`;
    }
    if (student.firstName) return student.firstName;
    if (student.email) return student.email.split("@")[0];
    return "User";
  };

  const navLinks = [
    "Examinations",
    "Courses",
    "Utilities",
    "Downloads",
    "Contact",
  ];

  return (
    <nav data-navbar className="fixed top-0 left-0 right-0 w-full z-50">
      {/* Top Bar - Dark Gray (Condensed on mobile) */}
      <div className="bg-gray-800 text-white text-[10px] sm:text-xs py-1.5 sm:py-2">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 md:gap-3">
            {/* Left: Social Media Engagement */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 xl:gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <FaInstagram className="text-[10px] sm:text-xs md:text-sm" />
                <span className="hidden sm:inline text-[10px] sm:text-xs">
                  100k Followers
                </span>
                <span className="sm:hidden text-[10px]">100k</span>
              </div>
              <div className="flex items-center gap-1">
                <FaFacebook className="text-[10px] sm:text-xs md:text-sm" />
                <span className="hidden sm:inline text-[10px] sm:text-xs">
                  500k Followers
                </span>
                <span className="sm:hidden text-[10px]">500k</span>
              </div>
              <div className="flex items-center gap-1">
                <FaWhatsapp className="text-[10px] sm:text-xs md:text-sm" />
                <span className="hidden lg:inline text-[10px] sm:text-xs">
                  +1 (510) 706-9331
                </span>
                <span className="lg:hidden hidden sm:inline text-[10px] sm:text-xs">
                  +1 (510) 706-9331
                </span>
              </div>
            </div>

            {/* Center: Hot Button with Message */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button className="bg-blue-600 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-0.5 sm:gap-1 whitespace-nowrap touch-manipulation active:bg-blue-700">
                <span>Hot</span>
                <span className="text-[10px] sm:text-xs">👏</span>
              </button>
              <span className="text-[10px] sm:text-xs hidden xl:inline">
                Schedule Your Free Exam Readiness Analysis Session!
              </span>
            </div>

            {/* Right: Social Media Icons */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 xl:gap-3">
              <FaYoutube className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors touch-manipulation" />
              <FaFacebook className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors touch-manipulation" />
              <FaTwitter className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors touch-manipulation" />
              <FaLinkedin className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors hidden lg:inline touch-manipulation" />
              <FaInstagram className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors hidden lg:inline touch-manipulation" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar - White */}
      <div className="bg-white shadow-sm w-full">
        <div className="container mx-auto px-2.5 sm:px-3 md:px-4">
          <div className="flex items-center justify-between py-2 sm:py-2.5 md:py-3">
            {/* Left: Logo */}
            <div className="flex items-center shrink-0">
              <Link href="/" className="touch-manipulation">
                <Image
                  src="/logo.png"
                  alt="TestPrepKart Logo"
                  width={150}
                  height={150}
                  className="w-20 sm:w-24 md:w-28 lg:w-32 xl:w-36 h-auto"
                  priority
                  fetchPriority="high"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
                />
              </Link>
            </div>

            {/* Center: Category Button & Navigation Links */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-4 flex-1 justify-center font-semibold">
              {/* Category Button */}
              <button className="flex items-center gap-2 px-3 xl:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700 whitespace-nowrap">
                <FaTh className="text-sm" />
                <span>Category</span>
              </button>

              {/* Navigation Links */}
              <nav className="flex items-center gap-0.5 xl:gap-1 font-semibold">
                {navLinks.map((link) => (
                  <Link
                    key={link}
                    href="#"
                    className="flex items-center gap-1 px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors group whitespace-nowrap"
                  >
                    <span>{link}</span>
                    <FaChevronDown className="text-xs text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right: Search, Sign In, Enroll Now */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              {/* Search Icon */}
              <button
                className="p-2 sm:p-2.5 md:p-2 text-gray-600 hover:text-blue-600 active:text-blue-700 transition-colors touch-manipulation"
                aria-label="Search"
              >
                <FaSearch className="text-base sm:text-lg md:text-xl" />
              </button>

              {/* User Menu / Sign In */}
              {isAuthenticated && !isLoading ? (
                <div className="hidden md:block user-menu-container relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 xl:gap-2 px-2 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors whitespace-nowrap touch-manipulation"
                  >
                    <FaUser className="text-xs sm:text-sm" />
                    <span className="max-w-[100px] truncate">
                      {getUserDisplayName()}
                    </span>
                    <FaChevronDown
                      className={`text-xs transition-transform ${
                        isUserMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {getUserDisplayName()}
                        </p>
                        {student?.email && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {student.email}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FaSignOutAlt className="text-xs" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden md:flex items-center gap-1.5 xl:gap-2 px-2 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors whitespace-nowrap touch-manipulation"
                >
                  <FaUser className="text-xs sm:text-sm" />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Enroll Now Button */}
              <Link
                href="/contact"
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 active:from-indigo-800 active:via-purple-800 active:to-pink-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap touch-manipulation"
              >
                <span className="hidden sm:inline">Enroll Now</span>
                <span className="sm:hidden">Enroll</span>
              </Link>

              {/* Mobile Menu Buttons */}
              <div className="lg:hidden flex items-center gap-1 sm:gap-1.5">
                {/* Sidebar Menu Button - Controls Exam/Subject/Unit Navigation */}
                <button
                  onClick={handleMenuToggle}
                  className={`p-2 sm:p-2.5 transition-colors relative touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    isMenuOpen
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-blue-600 active:text-blue-700"
                  }`}
                  aria-label={
                    isMenuOpen
                      ? "Close navigation menu"
                      : "Open navigation menu"
                  }
                  aria-expanded={isMenuOpen}
                  title="Navigation Menu"
                >
                  <FaBars className="text-base sm:text-lg" />
                  {isMenuOpen && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </button>

                {/* Nav Menu Button - Controls Category/Examinations/Courses */}
                <button
                  onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
                  className="p-2 sm:p-2.5 text-gray-600 hover:text-blue-600 active:text-blue-700 transition-colors relative touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Toggle main menu"
                  title="Main Menu"
                  aria-expanded={isNavMenuOpen}
                >
                  <FaTh className="text-base sm:text-lg" />
                  {isNavMenuOpen && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu - Category, Examinations, Courses, etc. */}
          {isNavMenuOpen && (
            <>
              {/* Mobile Overlay for Nav Menu */}
              <div
                className="fixed inset-0 lg:hidden"
                onClick={() => setIsNavMenuOpen(false)}
                aria-hidden="true"
              />

              {/* Mobile Menu Dropdown */}
              <div
                data-nav-menu
                data-nav-menu-open={isNavMenuOpen ? "true" : "false"}
                className="lg:hidden border-t border-gray-200 bg-white absolute top-full left-0 right-0 z-[55] shadow-xl max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-180px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-in slide-in-from-top-2 duration-200"
              >
                <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                  {/* Category Button */}
                  <button className="w-full flex items-center gap-2 px-4 py-3 sm:py-3.5 bg-gray-100 rounded-lg text-sm sm:text-base font-medium text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation min-h-[44px]">
                    <FaTh className="text-sm sm:text-base" />
                    <span>Category</span>
                  </button>

                  {/* Navigation Links */}
                  {navLinks.map((link) => (
                    <Link
                      key={link}
                      href="#"
                      className="flex items-center justify-between px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg touch-manipulation min-h-[44px]"
                      onClick={() => setIsNavMenuOpen(false)}
                    >
                      <span>{link}</span>
                      <FaChevronDown className="text-xs sm:text-sm text-gray-400" />
                    </Link>
                  ))}

                  {/* User Menu / Sign In Link */}
                  {isAuthenticated && !isLoading ? (
                    <>
                      <div className="px-4 py-3 sm:py-3.5 border-t border-gray-200">
                        <div className="mb-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {getUserDisplayName()}
                          </p>
                          {student?.email && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {student.email}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsNavMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg touch-manipulation min-h-[44px]"
                        >
                          <FaSignOutAlt className="text-sm" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="flex items-center gap-2 px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg touch-manipulation min-h-[44px]"
                      onClick={() => setIsNavMenuOpen(false)}
                    >
                      <FaUser className="text-sm sm:text-base" />
                      <span>Sign In</span>
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;
