"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FaBell, FaCommentDots, FaTrophy, FaFileAlt, FaInfoCircle, FaBullhorn } from "react-icons/fa";
import { usePathname } from "next/navigation";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

const ICON_MAP = {
  comment: FaCommentDots,
  trophy: FaTrophy,
  document: FaFileAlt,
  info: FaInfoCircle,
  announcement: FaBullhorn,
};

/** Get hierarchy slugs from pathname for notification for-context API. Strips basePath so exam/subject/... match route. */
function getPathSegments(pathname) {
  let p = (pathname || "").trim();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
  if (basePath && p.startsWith(basePath)) p = p.slice(basePath.length).trim() || "/";
  p = p.replace(/^\/+/, "");
  const parts = p ? p.split("/").filter(Boolean) : [];
  return {
    exam: parts[0] || "",
    subject: parts[1] || "",
    unit: parts[2] || "",
    chapter: parts[3] || "",
    topic: parts[4] || "",
    subtopic: parts[5] || "",
    definition: parts[6] || "",
  };
}

function relativeTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export default function NotificationDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  const segments = getPathSegments(pathname);

  // Fetch unread count for red dot (when student is logged in)
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
    if (!token) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    const isContentPage = segments.exam && !["notification", "login", "register", "contact", "pages"].includes(segments.exam);
    const params = new URLSearchParams();
    if (isContentPage) {
      if (segments.exam) params.set("exam", segments.exam);
      if (segments.subject) params.set("subject", segments.subject);
      if (segments.unit) params.set("unit", segments.unit);
      if (segments.chapter) params.set("chapter", segments.chapter);
      if (segments.topic) params.set("topic", segments.topic);
      if (segments.subtopic) params.set("subtopic", segments.subtopic);
      if (segments.definition) params.set("definition", segments.definition);
    }
    fetch(`${basePath}/api/notification/unread-count?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.success && typeof data?.data?.count === "number") setUnreadCount(data.data.count);
      })
      .catch(() => { if (!cancelled) setUnreadCount(0); });
    return () => { cancelled = true; };
  }, [pathname, segments.exam, segments.subject, segments.unit, segments.chapter, segments.topic, segments.subtopic, segments.definition]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
    const isContentPage = segments.exam && !["notification", "login", "register", "contact", "pages"].includes(segments.exam);
    // On content pages: for-context returns general + exam (page only) + exam_with_children + exact match for level
    const url = isContentPage
      ? `${basePath}/api/notification/for-context?${new URLSearchParams({
        ...(segments.exam && { exam: segments.exam }),
        ...(segments.subject && { subject: segments.subject }),
        ...(segments.unit && { unit: segments.unit }),
        ...(segments.chapter && { chapter: segments.chapter }),
        ...(segments.topic && { topic: segments.topic }),
        ...(segments.subtopic && { subtopic: segments.subtopic }),
        ...(segments.definition && { definition: segments.definition }),
        limit: "10",
      }).toString()}`
      : `${basePath}/api/notification/list?limit=10&skip=0&forHeader=1`;

    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.success) {
          const arr = data?.data?.data ?? data?.data ?? [];
          setNotifications(Array.isArray(arr) ? arr : []);
        }
      })
      .catch(() => { if (!cancelled) setNotifications([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, segments.exam, segments.subject, segments.unit, segments.chapter, segments.topic, segments.subtopic, segments.definition]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
      if (!token) return;
      await fetch(`${basePath}/api/notification/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
    } catch (_) { }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 sm:p-2.5 md:p-2 text-gray-600 hover:text-blue-600 active:text-blue-700 transition-colors touch-manipulation flex items-center justify-center min-w-[44px] min-h-[44px] relative"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "Notifications"}
      >
        <FaBell className="text-base sm:text-lg md:text-xl" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[80vh] overflow-hidden bg-white rounded-xl shadow-xl border border-gray-200 z-[100] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <span className="font-bold text-gray-900">Notifications</span>
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium min-h-[44px] flex items-center"
              aria-label="Mark all notifications as read"
            >
              Mark all read
            </button>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[400px]">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">No notifications</div>
            ) : (
              <ul className="py-2">
                {notifications.map((n) => {
                  const Icon = ICON_MAP[n.iconType] || FaBullhorn;
                  const href = n.slug ? `/notification/${n.slug}` : (n.link || "#");
                  const isExternal = n.link && (n.link.startsWith("http") || n.link.startsWith("//"));
                  return (
                    <li key={n._id} className="border-b border-gray-100 last:border-0">
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{relativeTime(n.createdAt)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-200 px-4 py-2.5">
            <Link
              href="/notification"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
