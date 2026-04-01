"use client";
import React, { useState, useEffect, memo, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaUser,
  FaBook,
  FaRegFolderOpen,
  FaClipboardList,
  FaTimes,
  FaNewspaper,
  FaChevronDown,
  FaChevronRight,
  FaComments,
  FaChartLine,
  FaFileAlt,
  FaUserCog,
  FaPhotoVideo,
  FaGraduationCap,
} from "react-icons/fa";
import { canAccessRoute, normalizeRole } from "../config/adminRoutes";
import api from "@/lib/api";

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
      { name: "Overview Comments", href: "/admin/overview-comments" },
      { name: "Result Page", href: "/admin/result-page" },
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
    name: "Courses",
    icon: FaGraduationCap,
    children: [
      { name: "Course Management", href: "/admin/course" },
    ],
  },
  {
    name: "Pages",
    icon: FaFileAlt,
    children: [
      { name: "Manage Pages", href: "/admin/pages" },
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
    icon: FaChartLine,
    children: [
      { name: "IP Management", href: "/admin/analytics/ip-management" },
    ],
  },
  {
    name: "Admin",
    icon: FaUserCog,
    sectionStart: true,
    children: [
      {
        name: "Users & Access",
        children: [
          { name: "Lead Management", href: "/admin/lead" },
          { name: "Students", href: "/admin/student" },
          { name: "Role Management", href: "/admin/user-role" },
        ],
      },
      {
        name: "Content & Media",
        children: [
          { name: "Media Management", href: "/admin/media" },
          { name: "Forms", href: "/admin/form" },
          { name: "Notifications", href: "/admin/notification" },
          { name: "Store", href: "/admin/store" },
        ],
      },
      {
        name: "Email",
        children: [
          { name: "Email & Notifications", href: "/admin/email-settings" },
          { name: "Email Templates", href: "/admin/email-templates" },
        ],
      },
      {
        name: "Import & Export",
        children: [
          { name: "NEET Counseling", href: "/admin/neet-counseling" },
          { name: "Import Self Study Data", href: "/admin/bulk-import" },
          { name: "Book JSON Import", href: "/admin/book-import" },
          { name: "Meta Import", href: "/admin/seo-import" },
          { name: "URL Export", href: "/admin/url-export" },
        ],
      },
      {
        name: "Settings",
        children: [
          { name: "Site Settings", href: "/admin/site-settings" },
          { name: "Common CSS", href: "/admin/common-css" },
        ],
      },
    ],
  },
];

/** Recursively collect all hrefs from an item (for permissions and active check). */
function getAllHrefs(item) {
  if (item.href) return [item.href];
  if (Array.isArray(item.children)) return item.children.flatMap(getAllHrefs);
  return [];
}

/** Recursively filter item tree by route permission; keeps structure. */
function filterItemByRole(item, role) {
  if (item.href) return canAccessRoute(item.href, role) ? item : null;
  if (Array.isArray(item.children)) {
    const filtered = item.children.map((c) => filterItemByRole(c, role)).filter(Boolean);
    return filtered.length ? { ...item, children: filtered } : null;
  }
  return null;
}

/** Flatten to list of links for active-child resolution (respects nesting). */
function flattenLinks(children) {
  if (!children?.length) return [];
  return children.flatMap((c) => (c.href ? [c] : flattenLinks(c.children)));
}

const Sidebar = memo(({ isOpen, onClose }) => {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [discussionPendingCount, setDiscussionPendingCount] = useState(0);
  const [discussionReplyPendingCount, setDiscussionReplyPendingCount] = useState(0);
  const [overviewCommentPendingCount, setOverviewCommentPendingCount] = useState(0);
  const [leadPendingCount, setLeadPendingCount] = useState(0);

  // Fetch discussion pending (threads) and reply-pending counts (admin only)
  const fetchDiscussionCounts = useCallback(async () => {
    try {
      const [pendingRes, replyPendingRes] = await Promise.all([
        api.get("/discussion/threads/pending-count"),
        api.get("/discussion/threads/reply-pending-count"),
      ]);
      if (pendingRes?.data?.success && typeof pendingRes.data.count === "number") {
        setDiscussionPendingCount(pendingRes.data.count);
      }
      if (replyPendingRes?.data?.success && typeof replyPendingRes.data.count === "number") {
        setDiscussionReplyPendingCount(replyPendingRes.data.count);
      }
    } catch (err) {
      // Silently ignore (e.g. not logged in or no permission)
    }
  }, []);

  // Debounce refetch on focus: only if last fetch was > 60s ago
  const discussionCountsLastFetchedRef = React.useRef(0);
  const DISCUSSION_DEBOUNCE_MS = 60 * 1000;

  useEffect(() => {
    fetchDiscussionCounts().then(() => {
      discussionCountsLastFetchedRef.current = Date.now();
    });
  }, [fetchDiscussionCounts]);

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - discussionCountsLastFetchedRef.current < DISCUSSION_DEBOUNCE_MS) return;
      discussionCountsLastFetchedRef.current = now;
      fetchDiscussionCounts();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchDiscussionCounts]);

  // Update counts when discussion page approves/unapproves/deletes (no extra API call)
  useEffect(() => {
    const handleUpdate = (e) => {
      const d = e?.detail;
      if (d && typeof d.count === "number") {
        setDiscussionPendingCount(Math.max(0, d.count));
      } else if (d && typeof d.delta === "number") {
        setDiscussionPendingCount((prev) => Math.max(0, prev + d.delta));
      }
    };
    const handleReplyPendingUpdate = (e) => {
      const d = e?.detail;
      if (d && typeof d.count === "number") {
        setDiscussionReplyPendingCount(Math.max(0, d.count));
      } else if (d && typeof d.delta === "number") {
        setDiscussionReplyPendingCount((prev) => Math.max(0, prev + d.delta));
      }
    };
    const handleRefetch = () => {
      discussionCountsLastFetchedRef.current = 0;
      fetchDiscussionCounts().then(() => {
        discussionCountsLastFetchedRef.current = Date.now();
      });
    };
    window.addEventListener("admin-discussion-pending-updated", handleUpdate);
    window.addEventListener("admin-discussion-reply-pending-updated", handleReplyPendingUpdate);
    window.addEventListener("admin-discussion-pending-refetch", handleRefetch);
    return () => {
      window.removeEventListener("admin-discussion-pending-updated", handleUpdate);
      window.removeEventListener("admin-discussion-reply-pending-updated", handleReplyPendingUpdate);
      window.removeEventListener("admin-discussion-pending-refetch", handleRefetch);
    };
  }, [fetchDiscussionCounts]);

  // Overview Comments pending count (single fetch + event updates)
  const fetchOverviewCommentPendingCount = useCallback(async () => {
    try {
      const res = await api.get("/overview-comment/pending-count");
      if (res?.data?.success && typeof res.data.count === "number") {
        setOverviewCommentPendingCount(res.data.count);
      }
    } catch (err) {
      // Silently ignore
    }
  }, []);

  const overviewCommentLastFetchedRef = React.useRef(0);
  const OVERVIEW_DEBOUNCE_MS = 60 * 1000;

  useEffect(() => {
    fetchOverviewCommentPendingCount().then(() => {
      overviewCommentLastFetchedRef.current = Date.now();
    });
  }, [fetchOverviewCommentPendingCount]);

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - overviewCommentLastFetchedRef.current < OVERVIEW_DEBOUNCE_MS) return;
      overviewCommentLastFetchedRef.current = now;
      fetchOverviewCommentPendingCount();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchOverviewCommentPendingCount]);

  useEffect(() => {
    const handleUpdate = (e) => {
      const d = e?.detail;
      if (d && typeof d.count === "number") {
        setOverviewCommentPendingCount(Math.max(0, d.count));
      } else if (d && typeof d.delta === "number") {
        setOverviewCommentPendingCount((c) => Math.max(0, c + d.delta));
      }
    };
    const handleRefetch = () => {
      overviewCommentLastFetchedRef.current = 0;
      fetchOverviewCommentPendingCount().then(() => {
        overviewCommentLastFetchedRef.current = Date.now();
      });
    };
    window.addEventListener("admin-overview-comment-pending-updated", handleUpdate);
    window.addEventListener("admin-overview-comment-pending-refetch", handleRefetch);
    return () => {
      window.removeEventListener("admin-overview-comment-pending-updated", handleUpdate);
      window.removeEventListener("admin-overview-comment-pending-refetch", handleRefetch);
    };
  }, [fetchOverviewCommentPendingCount]);

  // Lead pending count (new + updated status)
  const fetchLeadPendingCount = useCallback(async () => {
    try {
      const res = await api.get("/lead/pending-count");
      if (res?.data?.success && typeof res.data.count === "number") {
        setLeadPendingCount(res.data.count);
      }
    } catch (_) {}
  }, []);

  const leadLastFetchedRef = React.useRef(0);
  const LEAD_DEBOUNCE_MS = 60 * 1000;

  useEffect(() => {
    fetchLeadPendingCount().then(() => {
      leadLastFetchedRef.current = Date.now();
    });
  }, [fetchLeadPendingCount]);

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - leadLastFetchedRef.current < LEAD_DEBOUNCE_MS) return;
      leadLastFetchedRef.current = now;
      fetchLeadPendingCount();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchLeadPendingCount]);

  useEffect(() => {
    const handleUpdate = (e) => {
      const d = e?.detail;
      if (d && typeof d.count === "number") {
        setLeadPendingCount(Math.max(0, d.count));
      } else if (d && typeof d.delta === "number") {
        setLeadPendingCount((c) => Math.max(0, c + d.delta));
      }
    };
    const handleRefetch = () => {
      leadLastFetchedRef.current = 0;
      fetchLeadPendingCount().then(() => {
        leadLastFetchedRef.current = Date.now();
      });
    };
    window.addEventListener("admin-lead-pending-updated", handleUpdate);
    window.addEventListener("admin-lead-pending-refetch", handleRefetch);
    return () => {
      window.removeEventListener("admin-lead-pending-updated", handleUpdate);
      window.removeEventListener("admin-lead-pending-refetch", handleRefetch);
    };
  }, [fetchLeadPendingCount]);

  useEffect(() => {
    const readRole = () => {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem("user");
        if (raw) return JSON.parse(raw).role || null;
      } catch (_) {}
      return null;
    };

    const syncRole = () => {
      const role = readRole();
      setUserRole((prev) => (prev === role ? prev : role));
    };

    syncRole();
    window.addEventListener("storage", syncRole);
    return () => window.removeEventListener("storage", syncRole);
  }, []);

  // Filter menu items by route permission; support nested Admin children
  const MENU_ITEMS = useMemo(() => {
    const role = normalizeRole(userRole);
    return ALL_MENU_ITEMS.filter((item) => {
      if (!item.children) return canAccessRoute(item.href, role);
      const hrefs = item.children.flatMap((c) => (c.href ? [c.href] : getAllHrefs(c)));
      return hrefs.some((href) => canAccessRoute(href, role));
    }).map((item) => {
      if (!item.children) return item;
      const isNested = item.children.some((c) => Array.isArray(c.children));
      return {
        ...item,
        children: isNested
          ? item.children.map((c) => filterItemByRole(c, role)).filter(Boolean)
          : item.children.filter((child) => canAccessRoute(child.href, role)),
      };
    });
  }, [userRole]);

  const normalizedPath = pathname?.replace(/\/$/, "") || "";

  /** Match for top-level or non-sibling links (exact or prefix). */
  const isActive = (href) => {
    if (!href) return false;
    const h = href.replace(/\/$/, "");
    return normalizedPath === h || normalizedPath.startsWith(h + "/");
  };

  /**
   * Among sibling children (or flattened nested links), the most specific (longest) href that matches pathname is active.
   */
  const getActiveChildHref = (children) => {
    const links = flattenLinks(children);
    if (!links.length) return null;
    let best = null;
    let bestLen = 0;
    for (const child of links) {
      const h = (child.href || "").replace(/\/$/, "");
      if (normalizedPath !== h && !normalizedPath.startsWith(h + "/")) continue;
      if (h.length > bestLen) {
        bestLen = h.length;
        best = child.href;
      }
    }
    return best;
  };

  const toggleMenu = (name) => {
    setExpandedMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleNestedMenu = (parentName, groupName) => {
    const key = `${parentName}::${groupName}`;
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isNestedExpanded = (parentName, groupName) => expandedMenus[`${parentName}::${groupName}`];

  // Auto-expand top-level and nested menus when current path matches
  useEffect(() => {
    const updates = {};
    MENU_ITEMS.forEach((item) => {
      if (!item.children) return;
      const links = flattenLinks(item.children);
      const hasActiveChild = links.some((link) => isActive(link.href));
      if (hasActiveChild) {
        updates[item.name] = true;
        item.children.forEach((child) => {
          if (child.children) {
            const groupLinks = flattenLinks(child.children);
            const groupHasActive = groupLinks.some((link) => isActive(link.href));
            if (groupHasActive) updates[`${item.name}::${child.name}`] = true;
          }
        });
      }
    });
    if (Object.keys(updates).length) {
      setExpandedMenus((prev) => ({ ...prev, ...updates }));
    }
  }, [pathname, userRole, MENU_ITEMS]);

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
            {MENU_ITEMS.map(({ name, href, icon: Icon, children, sectionStart }, index) => {
              const active = isActive(href);
              const isExpanded = expandedMenus[name] || false;
              const hasActiveChild = children?.some((child) => isActive(child.href));

              if (children) {
                return (
                  <div
                    key={name}
                    className={sectionStart ? "mt-4 pt-4 border-t border-gray-200" : ""}
                  >
                    <button
                      onClick={() => toggleMenu(name)}
                      className={`
                        group relative w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
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
                      <span className="relative shrink-0">
                        <Icon
                          className={`text-base block ${hasActiveChild || active
                            ? "text-white"
                            : "text-gray-500 group-hover:text-gray-700"
                            }`}
                        />
                        {name === "Discussion" && (discussionPendingCount > 0 || discussionReplyPendingCount > 0) && (
                          <span
                            className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white animate-pulse"
                            title={`${discussionPendingCount} thread(s) pending${discussionReplyPendingCount > 0 ? `, ${discussionReplyPendingCount} reply pending` : ""}`}
                            aria-hidden
                          />
                        )}
                        {name === "Self Study" && overviewCommentPendingCount > 0 && (
                          <span
                            className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white animate-pulse"
                            title={`${overviewCommentPendingCount} pending`}
                            aria-hidden
                          />
                        )}
                        {name === "Admin" && leadPendingCount > 0 && (
                          <span
                            className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white animate-pulse"
                            title={`${leadPendingCount} new leads`}
                            aria-hidden
                          />
                        )}
                      </span>
                      <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-left">
                        {name}
                      </span>
                      {name === "Admin" && leadPendingCount > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full text-[10px] font-bold bg-blue-500 text-white" title={`${leadPendingCount} new leads`}>
                          {leadPendingCount > 99 ? "99+" : leadPendingCount}
                        </span>
                      )}
                      {name === "Discussion" && (discussionPendingCount > 0 || discussionReplyPendingCount > 0) && (
                        <span className="shrink-0 flex items-center gap-1">
                          {discussionPendingCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full text-[10px] font-bold bg-green-500 text-white" title={`${discussionPendingCount} thread(s) pending`}>
                              {discussionPendingCount > 99 ? "99+" : discussionPendingCount}
                            </span>
                          )}
                          {discussionReplyPendingCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full text-[10px] font-bold bg-amber-500 text-white" title={`${discussionReplyPendingCount} reply pending`}>
                              {discussionReplyPendingCount > 99 ? "99+" : discussionReplyPendingCount}
                            </span>
                          )}
                        </span>
                      )}
                      {name === "Self Study" && overviewCommentPendingCount > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full text-[10px] font-bold bg-green-500 text-white" title={`${overviewCommentPendingCount} pending`}>
                          {overviewCommentPendingCount > 99 ? "99+" : overviewCommentPendingCount}
                        </span>
                      )}
                      {isExpanded ? (
                        <FaChevronDown className={`text-xs shrink-0 ${hasActiveChild || active ? "text-white" : "text-gray-500"}`} />
                      ) : (
                        <FaChevronRight className={`text-xs shrink-0 ${hasActiveChild || active ? "text-white" : "text-gray-500"}`} />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {children.map((child) => {
                          const activeChildHref = getActiveChildHref(children);
                          if (child.children) {
                            const nestedExpanded = isNestedExpanded(name, child.name);
                            const groupLinks = flattenLinks(child.children);
                            const groupActiveHref = getActiveChildHref(child.children);
                            return (
                              <div key={child.name} className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleNestedMenu(name, child.name)}
                                  className={`
                                    group w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition-colors text-left
                                    ${groupActiveHref ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 font-normal hover:bg-gray-50 hover:text-gray-900"}
                                  `}
                                >
                                  <span className="w-2 h-2 rounded-full bg-current opacity-50 block shrink-0" />
                                  <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{child.name}</span>
                                  {nestedExpanded ? (
                                    <FaChevronDown className="text-[10px] text-gray-500 shrink-0" />
                                  ) : (
                                    <FaChevronRight className="text-[10px] text-gray-500 shrink-0" />
                                  )}
                                </button>
                                {nestedExpanded && (
                                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                                    {child.children.map((link) => {
                                      const linkActive = groupActiveHref !== null && link.href === groupActiveHref;
                                      return (
                                        <Link
                                          key={link.name}
                                          href={link.href}
                                          onClick={onClose}
                                          className={`
                                            group flex items-center gap-3 px-2 py-1.5 text-xs rounded-md transition-colors
                                            ${linkActive
                                              ? "bg-blue-100 text-blue-700 font-medium"
                                              : "text-gray-600 font-normal hover:bg-gray-50 hover:text-gray-900"
                                            }
                                          `}
                                        >
                                          <span className="relative shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 block" />
                                            {link.name === "Overview Comments" && overviewCommentPendingCount > 0 && (
                                              <span
                                                className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-green-500 ring-2 ring-white animate-pulse"
                                                title={`${overviewCommentPendingCount} pending`}
                                                aria-hidden
                                              />
                                            )}
                                            {link.name === "Lead Management" && leadPendingCount > 0 && (
                                              <span
                                                className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white animate-pulse"
                                                title={`${leadPendingCount} new leads`}
                                                aria-hidden
                                              />
                                            )}
                                          </span>
                                          <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1.5">
                                            {link.name}
                                            {link.name === "Overview Comments" && overviewCommentPendingCount > 0 && (
                                              <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold bg-green-500 text-white">
                                                {overviewCommentPendingCount > 99 ? "99+" : overviewCommentPendingCount}
                                              </span>
                                            )}
                                            {link.name === "Lead Management" && leadPendingCount > 0 && (
                                              <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                                                {leadPendingCount > 99 ? "99+" : leadPendingCount}
                                              </span>
                                            )}
                                          </span>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          const childActive = activeChildHref !== null && child.href === activeChildHref;
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
                              <span className="relative shrink-0">
                                <span className="w-2 h-2 rounded-full bg-current opacity-50 block" />
                                {child.name === "Threads" && (discussionPendingCount > 0 || discussionReplyPendingCount > 0) && (
                                  <span
                                    className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white animate-pulse"
                                    title={`${discussionPendingCount} thread(s) pending${discussionReplyPendingCount > 0 ? `, ${discussionReplyPendingCount} reply pending` : ""}`}
                                    aria-hidden
                                  />
                                )}
                                {child.name === "Overview Comments" && overviewCommentPendingCount > 0 && (
                                  <span
                                    className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white animate-pulse"
                                    title={`${overviewCommentPendingCount} pending`}
                                    aria-hidden
                                  />
                                )}
                              </span>
                              <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1.5">
                                {child.name}
                                {child.name === "Threads" && (discussionPendingCount > 0 || discussionReplyPendingCount > 0) && (
                                  <span className="shrink-0 flex items-center gap-1">
                                    {discussionPendingCount > 0 && (
                                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full text-[10px] font-bold bg-green-500 text-white" title={`${discussionPendingCount} thread(s) pending`}>
                                        {discussionPendingCount > 99 ? "99+" : discussionPendingCount}
                                      </span>
                                    )}
                                    {discussionReplyPendingCount > 0 && (
                                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full text-[10px] font-bold bg-amber-500 text-white" title={`${discussionReplyPendingCount} reply pending`}>
                                        {discussionReplyPendingCount > 99 ? "99+" : discussionReplyPendingCount}
                                      </span>
                                    )}
                                  </span>
                                )}
                                {child.name === "Overview Comments" && overviewCommentPendingCount > 0 && (
                                  <span className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-2 rounded-full text-[10px] font-bold bg-green-500 text-white" title={`${overviewCommentPendingCount} pending`}>
                                    {overviewCommentPendingCount > 99 ? "99+" : overviewCommentPendingCount}
                                  </span>
                                )}
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
                    className={`text-base shrink-0 ${active
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


      </aside>
    </>
  );
});

Sidebar.displayName = "Sidebar";

export default Sidebar;
