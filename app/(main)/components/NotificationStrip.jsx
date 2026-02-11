"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaTimes,
  FaInfoCircle,
  FaCommentDots,
  FaTrophy,
  FaFileAlt,
  FaBullhorn,
} from "react-icons/fa";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/** True if link is a full URL (use <a> and open as-is); false for paths (use Next Link). */
function isFullUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

// --- CONFIGURATION: whole strip bg = icon/type color (same to same), no slate ---
const ICON_CONFIG = {
  comment: {
    Icon: FaCommentDots,
    stripBg: "bg-indigo-600",
    stripBgGradient: "bg-gradient-to-r from-indigo-600 to-indigo-700",
    iconBox: "bg-white/20 ring-2 ring-white/30",
    pill: "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm",
    accent: "from-indigo-400 to-indigo-600",
  },
  trophy: {
    Icon: FaTrophy,
    stripBg: "bg-amber-500",
    stripBgGradient: "bg-gradient-to-r from-amber-500 to-orange-600",
    iconBox: "bg-white/20 ring-2 ring-white/30",
    pill: "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm",
    accent: "from-amber-400 to-orange-500",
  },
  document: {
    Icon: FaFileAlt,
    stripBg: "bg-emerald-600",
    stripBgGradient: "bg-gradient-to-r from-emerald-600 to-teal-700",
    iconBox: "bg-white/20 ring-2 ring-white/30",
    pill: "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm",
    accent: "from-emerald-400 to-teal-500",
  },
  info: {
    Icon: FaInfoCircle,
    stripBg: "bg-sky-600",
    stripBgGradient: "bg-gradient-to-r from-sky-600 to-blue-700",
    iconBox: "bg-white/20 ring-2 ring-white/30",
    pill: "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm",
    accent: "from-sky-400 to-blue-500",
  },
  announcement: {
    Icon: FaBullhorn,
    stripBg: "bg-violet-600",
    stripBgGradient: "bg-gradient-to-r from-violet-600 to-fuchsia-700",
    iconBox: "bg-white/20 ring-2 ring-white/30",
    pill: "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm",
    accent: "from-violet-400 to-fuchsia-500",
  },
};

const DEFAULT_CONFIG = {
  Icon: FaBullhorn,
  stripBg: "bg-blue-600",
  stripBgGradient: "bg-gradient-to-r from-blue-600 to-indigo-700",
  iconBox: "bg-white/20 ring-2 ring-white/30",
  pill: "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm",
  accent: "from-blue-400 to-indigo-500",
};

function getConfig(iconType) {
  return ICON_CONFIG[iconType] || DEFAULT_CONFIG;
}

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

// --- MAIN COMPONENT ---
export default function NotificationStrip() {
  const pathname = usePathname();
  const [items, setItems] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const s = localStorage.getItem("notification_strip_dismissed");
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch {
      return new Set();
    }
  });

  const segments = getPathSegments(pathname);
  const excludedFirstSegments = [
    "notification",
    "login",
    "register",
    "contact",
    "pages",
    "blog",
    "download",
    "calculator",
    "store",
  ];
  const isExamRoute =
    segments.exam && !excludedFirstSegments.includes(segments.exam);
  const isRootPage = !pathname || pathname === "/" || pathname === "";
  const shouldShowStrip = isExamRoute || isRootPage;

  useEffect(() => {
    if (!shouldShowStrip) return;
    let cancelled = false;
    // Pass hierarchy slugs so API returns: general (everywhere) + exam (page only) + exam_with_children (exam + children) + exact match for subject/unit/...
    const params = new URLSearchParams();
    if (segments.exam) params.set("exam", segments.exam);
    if (segments.subject) params.set("subject", segments.subject);
    if (segments.unit) params.set("unit", segments.unit);
    if (segments.chapter) params.set("chapter", segments.chapter);
    if (segments.topic) params.set("topic", segments.topic);
    if (segments.subtopic) params.set("subtopic", segments.subtopic);
    if (segments.definition) params.set("definition", segments.definition);
    params.set("limit", "20");

    fetch(`${basePath}/api/notification/for-context?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.success) {
          const list = Array.isArray(data?.data?.data)
            ? data.data.data
            : Array.isArray(data?.data)
              ? data.data
              : [];
          setItems(list);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [
    shouldShowStrip,
    pathname,
    segments.exam,
    segments.subject,
    segments.unit,
    segments.chapter,
    segments.topic,
    segments.subtopic,
    segments.definition,
  ]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter((n) => !dismissedIds.has(String(n._id)));
    // Priority: main first (orderNumber ascending), then newest first (createdAt descending)
    return [...filtered].sort((a, b) => {
      const orderA = typeof a.orderNumber === "number" ? a.orderNumber : 0;
      const orderB = typeof b.orderNumber === "number" ? b.orderNumber : 0;
      if (orderA !== orderB) return orderA - orderB;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // newer first when same orderNumber
    });
  }, [items, dismissedIds]);

  const dismiss = useCallback((id) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      try {
        localStorage.setItem(
          "notification_strip_dismissed",
          JSON.stringify([...next])
        );
      } catch (_) { }
      return next;
    });
  }, []);

  if (!shouldShowStrip || visibleItems.length === 0) return null;

  return (
    <div
      className="w-full mb-4 relative z-30 rounded-2xl overflow-hidden shadow-xl shadow-black/15 ring-1 ring-black/10 transition-shadow hover:shadow-2xl hover:ring-black/15 animate-in fade-in slide-in-from-top-2 duration-300"
      role="region"
      aria-label="Notifications"
    >
      {visibleItems.length === 1 ? (
        <SingleStripItem
          item={visibleItems[0]}
          onDismiss={() => dismiss(visibleItems[0]?._id)}
        />
      ) : (
        <ToastCarousel
          key={visibleItems.map((n) => n._id).join(",")}
          items={visibleItems}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}

// --- SINGLE ITEM (toast style: pill shape, squircle icon) ---
function SingleStripItem({ item, onDismiss }) {
  const config = getConfig(item.iconType);
  const { Icon } = config;
  const stripText = item.stripMessage?.trim() || item.title;
  const href = item.slug ? `/notification/${item.slug}` : (item.link || "#");
  const hasLink = item.slug || item.link;
  const actionLabel = item.linkLabel || "View";
  const external = hasLink && isFullUrl(item.link);
  const pillClass = `inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-all duration-200 active:scale-95 ${config.pill} focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`;

  return (
    <div
      className={`relative flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 text-white min-h-[52px] rounded-2xl ${config.stripBgGradient} shadow-inner`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`shrink-0 w-10 h-10 rounded-[14px] flex items-center justify-center ${config.iconBox} shadow-md`}
          aria-hidden
        >
          <Icon className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
        <p className="text-sm sm:text-base font-medium truncate text-white/95">
          {stripText}
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {hasLink && external && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={pillClass}
          >
            {actionLabel}
          </a>
        )}
        {hasLink && !external && (
          <Link href={href} className={pillClass}>
            {actionLabel}
          </Link>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onDismiss(); }}
          className="p-2 rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Dismiss"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl bg-gradient-to-r ${config.accent} opacity-80`}
        aria-hidden
      />
    </div>
  );
}

// --- TOAST CAROUSEL: one-by-one (pill toast + grey pagination box + capsule active dot, like image) ---
function ToastCarousel({ items, onDismiss }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const total = items.length;

  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % total), 5000);
    return () => clearInterval(t);
  }, [total, isPaused]);

  const item = items[index];
  if (!item) return null;

  const config = getConfig(item.iconType);
  const { Icon } = config;
  const stripText = item.stripMessage?.trim() || item.title;
  const href = item.slug ? `/notification/${item.slug}` : (item.link || "#");
  const hasLink = item.slug || item.link;
  const actionLabel = item.linkLabel || "View";
  const external = hasLink && isFullUrl(item.link);
  const linkClass = "inline-flex underline text-white/90 hover:text-white";

  return (
    <div
      className={`relative flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 text-white min-h-[52px] rounded-2xl ${config.stripBgGradient} shadow-inner`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`shrink-0 w-10 h-10 rounded-[14px] flex items-center justify-center ${config.iconBox} shadow-md`}
          aria-hidden
        >
          <Icon className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
        <p className="text-sm sm:text-base font-medium truncate text-white/95">
          {stripText}
        </p>
        {hasLink && external && (
          <a href={item.link} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {actionLabel}
          </a>
        )}
        {hasLink && !external && (
          <Link href={href} className={linkClass}>
            {actionLabel}
          </Link>
        )}
      </div>

      {/* Grey pagination box: 3/4 + dots (active = elongated capsule) */}
      <div className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/25 backdrop-blur-sm border border-white/10">
        <span className="text-[11px] font-medium text-white/90 tabular-nums">
          {index + 1}/{total}
        </span>
        <div className="flex items-center gap-1" role="tablist" aria-label="Notification slides">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Notification ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1 ${i === index ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/70"
                }`}
            />
          ))}
        </div>
      </div>

      {/* Action buttons: View and Dismiss */}
      <div className="shrink-0 flex items-center gap-2">
       
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onDismiss(item._id); }}
          className="p-2 rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Dismiss"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>

     
    </div>
  );
}

