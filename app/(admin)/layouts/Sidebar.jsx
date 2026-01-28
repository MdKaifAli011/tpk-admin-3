"use client";
import React, { useState, useEffect, memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaUser,
  FaBook,
  FaLayerGroup,
  FaRegFolderOpen,
  FaClipboardList,
  FaUserTag,
  FaTimes,
  FaUserGraduate,
  FaNewspaper,
  FaChevronDown,
  FaChevronRight,
  FaComments,
} from "react-icons/fa";

const ALL_MENU_ITEMS = [
  {
    name: "Self Study",
    icon: FaBook,
    children: [
      { name: "Exams", href: "/admin/exam" },
      { name: "Subjects", href: "/admin/subject" },
      { name: "Units", href: "/admin/unit" },
      { name: "Chapters", href: "/admin/chapter" },
      { name: "Topics", href: "/admin/topic" },
      { name: "Sub Topics", href: "/admin/sub-topic" },
      { name: "Definitions", href: "/admin/definitions" },
    ],
  },
  {
    name: "Test Papers",
    icon: FaClipboardList,
    children: [
      { name: "Exams", href: "/admin/practice" },
    ],
  },
  {
    name: "Download",
    icon: FaRegFolderOpen,
    children: [
      { name: "Folder", href: "/admin/download" },
      { name: "Sub Folder", href: "/admin/download/subfolder" },
      { name: "Files", href: "/admin/download/file" },
    ],
  },
  {
    name: "Blog",
    icon: FaNewspaper,
    children: [
      { name: "Posts", href: "/admin/blog" },
      { name: "Categories", href: "/admin/blog-category" },
      { name: "Comments", href: "/admin/blog-comment" },
    ],
  },
  {
    name: "Discussion",
    icon: FaComments,
    children: [
      { name: "Threads", href: "/admin/discussion" },
      { name: "Banner Upload", href: "/admin/discussion/banner" },
      { name: "Import/Export", href: "/admin/discussion-import" },
    ],
  },
  {
    name: "Analytics",
    icon: FaClipboardList,
    children: [
      { name: "IP Management", href: "/admin/analytics/ip-management" },
    ],
  },
  {
    name: "Admin",
    icon: FaUser,
    adminOnly: true,
    children: [
      { name: "Lead Management", href: "/admin/lead" },
      { name: "Students", href: "/admin/student" },
      { name: "Forms", href: "/admin/form" },
      { name: "Role Management", href: "/admin/user-role" },
      { name: "Import Self Study Data", href: "/admin/bulk-import" },
      { name: "Meta Import", href: "/admin/seo-import" },
    ],
  },
];

const Sidebar = memo(({ isOpen, onClose }) => {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({});

  // Get user role from localStorage (memoized)
  useEffect(() => {
    const getUserRole = () => {
      if (typeof window === "undefined") return null;
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          return userData.role || null;
        } catch (error) {
          console.error("Error parsing user data:", error);
          return null;
        }
      }
      return null;
    };

    setUserRole(getUserRole());

    // Listen for storage changes
    const handleStorageChange = () => {
      setUserRole(getUserRole());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [pathname]); // Update when pathname changes

  // Filter menu items based on user role (memoized)
  const MENU_ITEMS = useMemo(() => {
    return ALL_MENU_ITEMS.filter((item) => {
      // Show admin-only items only if user is admin
      if (item.adminOnly) {
        return userRole === "admin";
      }
      // Show all other items to all users
      return true;
    });
  }, [userRole]);

  const isActive = (href) =>
    pathname === href || pathname.startsWith(href + "/");

  const toggleMenu = (name) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // Auto-expand menu if current path matches
  useEffect(() => {
    const filteredItems = ALL_MENU_ITEMS.filter((item) => {
      if (item.adminOnly) {
        return userRole === "admin";
      }
      return true;
    });

    filteredItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) =>
          isActive(child.href)
        );
        if (hasActiveChild) {
          setExpandedMenus((prev) => ({ ...prev, [item.name]: true }));
        }
      }
    });
  }, [pathname, userRole]);

  return (
    <>
      {/* Overlay for mobile with fade animation */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden animate-fade-in transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar with slide animation */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 lg:hidden">
          <span className="text-sm font-medium text-gray-900">Navigation</span>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <FaTimes className="text-base" />
          </button>
        </div>

        {/* Desktop Header Spacer */}
        <div className="hidden lg:block h-16 border-b border-gray-200" />

        {/* Navigation Links */}
        <nav className="flex-1 px-4 pt-2 overflow-y-auto hide-scrollbar">
          <div className="flex flex-col gap-1">
            {MENU_ITEMS.map(({ name, href, icon: Icon, children }, index) => {
              const active = isActive(href);
              const isExpanded = expandedMenus[name] || false;
              const hasActiveChild = children?.some((child) => isActive(child.href));

              if (children) {
                return (
                  <div key={name}>
                    <button
                      onClick={() => toggleMenu(name)}
                      className={`
                        group w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
                        ${hasActiveChild || active
                          ? "bg-blue-600 text-white font-medium"
                          : "text-gray-700 font-normal hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}
                      style={
                        isOpen
                          ? {
                            animation: `slideInLeft 0.4s ease-out ${index * 0.05
                              }s both`,
                          }
                          : {}
                      }
                    >
                      <Icon
                        className={`text-base flex-shrink-0 ${hasActiveChild || active
                          ? "text-white"
                          : "text-gray-500 group-hover:text-gray-700"
                          }`}
                      />
                      <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-left">
                        {name}
                      </span>
                      {isExpanded ? (
                        <FaChevronDown className={`text-xs flex-shrink-0 ${hasActiveChild || active ? "text-white" : "text-gray-500"}`} />
                      ) : (
                        <FaChevronRight className={`text-xs flex-shrink-0 ${hasActiveChild || active ? "text-white" : "text-gray-500"}`} />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              onClick={onClose}
                              className={`
                                group flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition-colors
                                ${childActive
                                  ? "bg-blue-100 text-blue-700 font-medium"
                                  : "text-gray-600 font-normal hover:bg-gray-50 hover:text-gray-900"
                                }
                              `}
                            >
                              <span className="w-2 h-2 rounded-full bg-current opacity-50"></span>
                              <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                {child.name}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  href={href}
                  key={name}
                  onClick={onClose}
                  className={`
                    group flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
                    ${active
                      ? "bg-blue-600 text-white font-medium"
                      : "text-gray-700 font-normal hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                  style={
                    isOpen
                      ? {
                        animation: `slideInLeft 0.4s ease-out ${index * 0.05
                          }s both`,
                      }
                      : {}
                  }
                >
                  <Icon
                    className={`text-base flex-shrink-0 ${active
                      ? "text-white"
                      : "text-gray-500 group-hover:text-gray-700"
                      }`}
                  />
                  <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    {name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer Section */}
        <div className="p-4 mt-auto border-t border-gray-200">
          <Link
            href="/admin/profile"
            onClick={onClose}
            className={`group flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors mb-4 ${pathname === "/admin/profile"
              ? "bg-blue-600 text-white font-medium"
              : "text-gray-700 font-normal hover:bg-gray-50 hover:text-gray-900"
              }`}
          >
            <FaUser
              className={`text-base flex-shrink-0 ${pathname === "/admin/profile"
                ? "text-white"
                : "text-gray-500 group-hover:text-gray-700"
                }`}
            />
            <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
              Profile Settings
            </span>
          </Link>
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-center font-medium text-gray-900">
              Admin Panel
            </div>
            <div className="text-xs text-center text-gray-500 mt-0.5">v1.0</div>
          </div>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = "Sidebar";

export default Sidebar;
