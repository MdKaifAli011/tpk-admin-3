"use client";
import React, { useState, memo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  FaEnvelope,
  FaPhone,
} from "react-icons/fa";
import Image from "next/image";
import { useStudent } from "../hooks/useStudent";
import ExaminationsMegaMenu from "./components/ExaminationsMegaMenu";
import CoursesMegaMenu from "./components/CoursesMegaMenu";
import UtilitiesMegaMenu from "./components/UtilitiesMegaMenu";
import DownloadsMegaMenu from "./components/DownloadsMegaMenu";
import ContactMegaMenu from "./components/ContactMegaMenu";
import SearchModal from "./components/SearchModal";
import NotificationDropdown from "../components/NotificationDropdown";
import {
  ExaminationsMobileContent,
  CoursesMobileContent,
  UtilitiesMobileContent,
  DownloadsMobileContent,
  ContactMobileContent,
} from "./components/MobileMenuContent";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

function loginHref(pathname) {
  if (!pathname || pathname.includes("/login") || pathname.includes("/register")) return "/login";
  const pathOnly = pathname.startsWith(basePath) ? pathname.slice(basePath.length) || "/" : pathname;
  return `/login?redirect=${encodeURIComponent(pathOnly)}`;
}

const Navbar = memo(({ onMenuToggle, isMenuOpen, showSidebar }) => {
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState(null);
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { student, isLoading, isAuthenticated, logout } = useStudent();
  
  // Refs for hover delay management
  const hoverTimeoutRef = React.useRef(null);
  const leaveTimeoutRef = React.useRef(null);
  const isHoveringMegaMenuRef = React.useRef(false);

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

    const resizeObserver = new ResizeObserver(updateNavbarHeight);
    resizeObserver.observe(navbar);

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

  // Handle Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const handleOpenSearchModal = () => {
      if (showSidebar) {
        setIsSearchModalOpen(true);
      }
    };

    window.addEventListener("openSearchModal", handleOpenSearchModal);
    return () => {
      window.removeEventListener("openSearchModal", handleOpenSearchModal);
    };
  }, [showSidebar]);

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
      if (activeMegaMenu && !event.target.closest(".mega-menu-container")) {
        setActiveMegaMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen, activeMegaMenu]);

  // Handle logout - stay on current page (no redirect to home)
  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
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
    { name: "Examinations", key: "examinations" },
    { name: "Courses", key: "courses" },
    { name: "Utilities", key: "utilities" },
    { name: "Downloads", key: "downloads" },
    { name: "Contact", key: "contact" },
  ];

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  // Handle megamenu hover with delay
  const handleMegaMenuHover = (key) => {
    // Clear any pending leave timeout
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    
    // If already showing this menu, do nothing
    if (activeMegaMenu === key) {
      return;
    }
    
    // Clear any existing hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set delay before opening (300ms delay)
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(key);
      hoverTimeoutRef.current = null;
    }, 300);
  };

  // Handle megamenu leave with delay
  const handleMegaMenuLeave = () => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Only close if not hovering over the megamenu itself
    if (!isHoveringMegaMenuRef.current) {
      // Small delay before closing to allow moving to megamenu
      leaveTimeoutRef.current = setTimeout(() => {
        if (!isHoveringMegaMenuRef.current) {
          setActiveMegaMenu(null);
        }
        leaveTimeoutRef.current = null;
      }, 200);
    }
  };

  // Handle megamenu container hover (the actual megamenu content)
  const handleMegaMenuContentEnter = () => {
    isHoveringMegaMenuRef.current = true;
    // Clear any leave timeout since we're hovering over the menu
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleMegaMenuContentLeave = () => {
    isHoveringMegaMenuRef.current = false;
    // Close the menu after a short delay
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
      leaveTimeoutRef.current = null;
    }, 200);
  };

  const toggleMobileMenu = (key) => {
    setMobileExpandedMenu(mobileExpandedMenu === key ? null : key);
  };

  return (
    <nav data-navbar className="fixed top-0 left-0 right-0 w-full z-50">
      {/* Top Bar - Dark Gray (Condensed on mobile) */}
      <div className="bg-gray-800 text-white text-[10px] sm:text-xs py-1.5 sm:py-2">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 md:gap-4">
            {/* Left: Social Media Engagement */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 xl:gap-4 flex-wrap min-w-0 flex-1">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <FaInstagram className="text-[10px] sm:text-xs md:text-sm shrink-0" />
                <span className="hidden sm:inline text-[10px] sm:text-xs">
                  100k Followers
                </span>
                <span className="sm:hidden text-[10px]">100k</span>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <FaFacebook className="text-[10px] sm:text-xs md:text-sm shrink-0" />
                <span className="hidden sm:inline text-[10px] sm:text-xs">
                  500k Followers
                </span>
                <span className="sm:hidden text-[10px]">500k</span>
              </div>
              <a
                href="https://api.whatsapp.com/send?phone=15107069331"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-blue-300 transition-colors whitespace-nowrap"
              >
                <FaWhatsapp className="text-[10px] sm:text-xs md:text-sm shrink-0" />
                <span className="hidden sm:inline text-[10px] sm:text-xs">
                  +1 (510) 706-9331
                </span>
              </a>
            </div>

            {/* Center: Hot Button with Message */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 shrink-0 order-3 xl:order-2">
              <button className="bg-blue-600 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-0.5 sm:gap-1 whitespace-nowrap touch-manipulation active:bg-blue-700 transition-colors">
                <span>Hot</span>
                <span className="text-[10px] sm:text-xs">👏</span>
              </button>
              <span className="text-[10px] sm:text-xs hidden xl:inline whitespace-nowrap">
                Schedule Your Free Exam Readiness Analysis Session!
              </span>
            </div>

            {/* Right: Social Media Icons */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 xl:gap-3 shrink-0 order-2 xl:order-3">
              <a
                href="https://www.youtube.com/@Testprepkart"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors touch-manipulation"
              >
                <FaYoutube />
              </a>
              <a
                href="https://www.facebook.com/testprepkart"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors touch-manipulation"
              >
                <FaFacebook />
              </a>
              <a
                href="https://twitter.com/testprepkart"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors touch-manipulation"
              >
                <FaTwitter />
              </a>
              <a
                href="https://www.linkedin.com/company/testprepkart"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors hidden lg:inline touch-manipulation"
              >
                <FaLinkedin />
              </a>
              <a
                href="https://www.instagram.com/testprepkartonline"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] sm:text-xs md:text-sm cursor-pointer hover:text-blue-400 transition-colors hidden lg:inline touch-manipulation"
              >
                <FaInstagram />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar - White */}
      <div className="bg-white shadow-sm w-full">
        <div className="container mx-auto px-2.5 sm:px-3 md:px-4 lg:px-6">
          <div className="flex items-center justify-between py-2 sm:py-2.5 md:py-3 gap-2 sm:gap-3 md:gap-4">
            {/* Left: Logo */}
            <div className="flex items-center shrink-0 min-w-0">
              <Link href="/" className="touch-manipulation flex items-center">
                <Image
                  src={`${basePath}/logo.png`}
                  alt="Testprepkart Logo"
                  width={150}
                  height={150}
                  className="w-20 sm:w-24 md:w-28 lg:w-32 xl:w-36 h-auto object-contain"
                  priority
                  fetchPriority="high"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
                />
              </Link>
            </div>

            {/* Center: Category Button & Navigation Links */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-4 flex-1 justify-center font-semibold min-w-0 px-2">
              {/* Category Button */}
              <button className="flex items-center justify-center gap-2 px-3 xl:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700 whitespace-nowrap shrink-0">
                <FaTh className="text-sm shrink-0" />
                <span>Category</span>
              </button>

              {/* Navigation Links with Mega Menus */}
              <nav className="flex items-center gap-0.5 xl:gap-1 font-semibold min-w-0">
                {navLinks.map((link) => (
                  <div
                    key={link.key}
                    className="relative mega-menu-container shrink-0"
                    onMouseEnter={() => handleMegaMenuHover(link.key)}
                    onMouseLeave={handleMegaMenuLeave}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        // Clear any pending timeouts
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        if (leaveTimeoutRef.current) {
                          clearTimeout(leaveTimeoutRef.current);
                          leaveTimeoutRef.current = null;
                        }
                        setActiveMegaMenu(
                          activeMegaMenu === link.key ? null : link.key
                        );
                      }}
                      className="flex items-center justify-center gap-1 px-2 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors group whitespace-nowrap"
                    >
                      <span className="truncate">{link.name}</span>
                      <FaChevronDown className="text-xs text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                    </button>
                    {activeMegaMenu === link.key && (
                      <>
                        {/* Invisible bridge area to prevent menu from closing when moving to it */}
                        <div
                          onMouseEnter={handleMegaMenuContentEnter}
                          onMouseLeave={handleMegaMenuContentLeave}
                          className="absolute left-0 right-0 top-full h-4 z-[99]"
                          aria-hidden="true"
                        />
                        {/* Megamenu content */}
                        <div
                          onMouseEnter={handleMegaMenuContentEnter}
                          onMouseLeave={handleMegaMenuContentLeave}
                          className="absolute left-0 right-0 top-full pt-4 z-[100] pointer-events-auto"
                        >
                          {link.key === "examinations" && (
                            <ExaminationsMegaMenu
                              onClose={() => {
                                isHoveringMegaMenuRef.current = false;
                                setActiveMegaMenu(null);
                              }}
                            />
                          )}
                          {link.key === "courses" && (
                            <CoursesMegaMenu
                              onClose={() => {
                                isHoveringMegaMenuRef.current = false;
                                setActiveMegaMenu(null);
                              }}
                            />
                          )}
                          {link.key === "utilities" && (
                            <UtilitiesMegaMenu
                              onClose={() => {
                                isHoveringMegaMenuRef.current = false;
                                setActiveMegaMenu(null);
                              }}
                            />
                          )}
                          {link.key === "downloads" && (
                            <DownloadsMegaMenu
                              onClose={() => {
                                isHoveringMegaMenuRef.current = false;
                                setActiveMegaMenu(null);
                              }}
                            />
                          )}
                          {link.key === "contact" && (
                            <ContactMegaMenu
                              onClose={() => {
                                isHoveringMegaMenuRef.current = false;
                                setActiveMegaMenu(null);
                              }}
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            {/* Right: Search, Sign In, Enroll Now */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
              {/* Search Icon - Only show on pages with sidebar */}
              {showSidebar && (
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="p-2 sm:p-2.5 md:p-2 text-gray-600 hover:text-blue-600 active:text-blue-700 transition-colors touch-manipulation flex items-center justify-center min-w-[44px] min-h-[44px] group relative"
                  aria-label="Search (Ctrl+K)"
                  title="Search (Ctrl+K)"
                >
                  <FaSearch className="text-base sm:text-lg md:text-xl" />
                  {/* Ctrl+K hint */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    <kbd className="font-mono text-xs">Ctrl</kbd>+<kbd className="font-mono text-xs">K</kbd>
                  </div>
                </button>
              )}

              {/* Notifications - bell after search */}
              {showSidebar && <NotificationDropdown />}

              {/* User Menu / Sign In */}
              {isAuthenticated && !isLoading ? (
                <div className="hidden md:block user-menu-container relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center justify-center gap-1.5 xl:gap-2 px-2 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors whitespace-nowrap touch-manipulation min-h-[44px]"
                  >
                    <FaUser className="text-xs sm:text-sm shrink-0" />
                    <span className="max-w-[100px] xl:max-w-[120px] truncate">
                      {getUserDisplayName()}
                    </span>
                    <FaChevronDown
                      className={`text-xs transition-transform shrink-0 ${
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
                  href={loginHref(pathname)}
                  className="hidden md:flex items-center justify-center gap-1.5 xl:gap-2 px-2 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors whitespace-nowrap touch-manipulation min-h-[44px]"
                >
                  <FaUser className="text-xs sm:text-sm shrink-0" />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Enroll Now Button */}
              <Link
                href="/contact"
                className="px-2 sm:px-2 py-2 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 active:from-indigo-800 active:via-purple-800 active:to-pink-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap touch-manipulation flex items-center justify-center "
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
                {/* Mobile Menu Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50">
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <Link href="/" onClick={() => setIsNavMenuOpen(false)} className="shrink-0">
                      <Image
                        src={`${basePath}/logo.png`}
                        alt="Testprepkart Logo"
                        width={120}
                        height={120}
                        className="h-12 w-auto object-contain"
                      />
                    </Link>
                    <button
                      onClick={() => setIsNavMenuOpen(false)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px]"
                      aria-label="Close menu"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                    Hi, I&apos;m Testprepkart.
                    <br />
                    Your Partner In Exam Preparation
                  </p>
                  <ul className="space-y-2.5 text-sm">
                    <li>
                      <a
                        href="mailto:contact@rayofhopebihar.org"
                        className="flex items-center gap-2.5 text-gray-700 hover:text-indigo-600 transition-colors"
                      >
                        <FaEnvelope className="text-xs shrink-0" />
                        <span className="break-all">contact@rayofhopebihar.org</span>
                      </a>
                    </li>
                    <li>
                      <a
                        href="tel:+918800123492"
                        className="flex items-center gap-2.5 text-gray-700 hover:text-indigo-600 transition-colors"
                      >
                        <FaPhone className="text-xs shrink-0" />
                        <span>+91 8800123492</span>
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://api.whatsapp.com/send?phone=15107069331"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-gray-700 hover:text-indigo-600 transition-colors"
                      >
                        <FaWhatsapp className="text-xs shrink-0" />
                        <span>+1 (510) 706-9331</span>
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="p-3 sm:p-4 space-y-2">
                  {/* Home Link */}
                  <Link
                    href="/"
                    onClick={() => setIsNavMenuOpen(false)}
                    className="w-full flex items-center justify-start gap-2 px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg touch-manipulation min-h-[44px]"
                  >
                    <span>Home</span>
                  </Link>

                  {/* Category Button */}
                  <button className="w-full flex items-center justify-start gap-2 px-4 py-3 sm:py-3.5 bg-gray-100 rounded-lg text-sm sm:text-base font-medium text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation min-h-[44px]">
                    <FaTh className="text-sm sm:text-base shrink-0" />
                    <span>Category</span>
                  </button>

                  {/* Navigation Links with Mobile Mega Menus */}
                  {navLinks.map((link) => (
                    <div key={link.key} className="space-y-1.5">
                      <button
                        onClick={() => toggleMobileMenu(link.key)}
                        className="w-full flex items-center justify-between px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg touch-manipulation min-h-[44px]"
                      >
                        <span className="flex-1 text-left">{link.name}</span>
                        <FaChevronDown
                          className={`text-xs sm:text-sm text-gray-400 transition-transform shrink-0 ${
                            mobileExpandedMenu === link.key ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {mobileExpandedMenu === link.key && (
                        <div className="pl-4 pr-2 pb-2 space-y-1.5 bg-gray-50 rounded-lg mt-1">
                          {link.key === "examinations" && (
                            <ExaminationsMobileContent
                              onClose={() => {
                                setMobileExpandedMenu(null);
                                setIsNavMenuOpen(false);
                              }}
                            />
                          )}
                          {link.key === "courses" && (
                            <CoursesMobileContent
                              onClose={() => {
                                setMobileExpandedMenu(null);
                                setIsNavMenuOpen(false);
                              }}
                            />
                          )}
                          {link.key === "utilities" && (
                            <UtilitiesMobileContent
                              onClose={() => {
                                setMobileExpandedMenu(null);
                                setIsNavMenuOpen(false);
                              }}
                            />
                          )}
                          {link.key === "downloads" && (
                            <DownloadsMobileContent
                              onClose={() => {
                                setMobileExpandedMenu(null);
                                setIsNavMenuOpen(false);
                              }}
                            />
                          )}
                          {link.key === "contact" && (
                            <ContactMobileContent
                              onClose={() => {
                                setMobileExpandedMenu(null);
                                setIsNavMenuOpen(false);
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* User Menu / Sign In Link */}
                  {isAuthenticated && !isLoading ? (
                    <>
                      <div className="px-4 py-3 sm:py-3.5 border-t border-gray-200 mt-2">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {getUserDisplayName()}
                          </p>
                          {student?.email && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {student.email}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsNavMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-start gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg touch-manipulation min-h-[44px]"
                        >
                          <FaSignOutAlt className="text-sm shrink-0" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <Link
                      href={loginHref(pathname)}
                      className="flex items-center justify-start gap-2 px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg touch-manipulation min-h-[44px]"
                      onClick={() => setIsNavMenuOpen(false)}
                    >
                      <FaUser className="text-sm sm:text-base shrink-0" />
                      <span>Sign In</span>
                    </Link>
                  )}

                  {/* Enroll Now Button */}
                  <Link
                    href="/coaching-inquiry"
                    onClick={() => setIsNavMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 transition-all shadow-md hover:shadow-lg touch-manipulation min-h-[44px] mt-2"
                  >
                    <span>Enroll Now</span>
                  </Link>

                  {/* Social Media Links */}
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-900 mb-3 text-center sm:text-left">
                      Find With Us
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                      <a
                        href="https://www.facebook.com/testprepkart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                        aria-label="Facebook"
                      >
                        <FaFacebook className="text-base" />
                      </a>
                      <a
                        href="https://twitter.com/testprepkart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                        aria-label="Twitter"
                      >
                        <FaTwitter className="text-base" />
                      </a>
                      <a
                        href="https://www.instagram.com/testprepkartonline"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                        aria-label="Instagram"
                      >
                        <FaInstagram className="text-base" />
                      </a>
                      <a
                        href="https://www.linkedin.com/company/testprepkart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                        aria-label="LinkedIn"
                      >
                        <FaLinkedin className="text-base" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </nav>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;
