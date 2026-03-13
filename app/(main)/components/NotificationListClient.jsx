"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaCommentDots,
  FaTrophy,
  FaFileAlt,
  FaInfoCircle,
  FaBullhorn,
  FaBell,
  FaChevronRight,
} from "react-icons/fa";
import Card from "./Card";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

// Match NotificationStrip: per-type icon + color; list cards get left accent + subtle tint
const ICON_CONFIG = {
  comment: {
    Icon: FaCommentDots,
    label: "Comment",
    bg: "bg-indigo-500/15",
    iconColor: "text-indigo-600",
    border: "border-indigo-200",
    leftAccent: "border-l-4 border-l-indigo-500",
    cardTint: "bg-indigo-50/40",
    pill: "bg-indigo-100 text-indigo-700",
  },
  trophy: {
    Icon: FaTrophy,
    label: "Trophy",
    bg: "bg-amber-500/15",
    iconColor: "text-amber-600",
    border: "border-amber-200",
    leftAccent: "border-l-4 border-l-amber-500",
    cardTint: "bg-amber-50/40",
    pill: "bg-amber-100 text-amber-700",
  },
  document: {
    Icon: FaFileAlt,
    label: "Document",
    bg: "bg-emerald-500/15",
    iconColor: "text-emerald-600",
    border: "border-emerald-200",
    leftAccent: "border-l-4 border-l-emerald-500",
    cardTint: "bg-emerald-50/40",
    pill: "bg-emerald-100 text-emerald-700",
  },
  info: {
    Icon: FaInfoCircle,
    label: "Info",
    bg: "bg-sky-500/15",
    iconColor: "text-sky-600",
    border: "border-sky-200",
    leftAccent: "border-l-4 border-l-sky-500",
    cardTint: "bg-sky-50/40",
    pill: "bg-sky-100 text-sky-700",
  },
  announcement: {
    Icon: FaBullhorn,
    label: "Announcement",
    bg: "bg-violet-500/15",
    iconColor: "text-violet-600",
    border: "border-violet-200",
    leftAccent: "border-l-4 border-l-violet-500",
    cardTint: "bg-violet-50/40",
    pill: "bg-violet-100 text-violet-700",
  },
};

const DEFAULT_CONFIG = {
  Icon: FaBullhorn,
  label: "Announcement",
  bg: "bg-blue-500/15",
  iconColor: "text-blue-600",
  border: "border-blue-200",
  leftAccent: "border-l-4 border-l-blue-500",
  cardTint: "bg-blue-50/40",
  pill: "bg-blue-100 text-blue-700",
};

function getConfig(iconType) {
  return ICON_CONFIG[iconType] || DEFAULT_CONFIG;
}

function stripHtml(html, maxLen = 120) {
  if (!html || typeof html !== "string") return "";
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (maxLen && text.length > maxLen) return `${text.slice(0, maxLen)}…`;
  return text;
}

function relativeTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export default function NotificationListClient({
  examSlug = null,
  subjectSlug = null,
  unitSlug = null,
  chapterSlug = null,
  topicSlug = null,
  subtopicSlug = null,
  definitionSlug = null,
}) {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const limit = 20;
  const hasMore = list.length < total;

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("skip", "0");
  if (examSlug) queryParams.set("exam", examSlug);
  if (subjectSlug) queryParams.set("subject", subjectSlug);
  if (unitSlug) queryParams.set("unit", unitSlug);
  if (chapterSlug) queryParams.set("chapter", chapterSlug);
  if (topicSlug) queryParams.set("topic", topicSlug);
  if (subtopicSlug) queryParams.set("subtopic", subtopicSlug);
  if (definitionSlug) queryParams.set("definition", definitionSlug);

  useEffect(() => {
    let cancelled = false;
    fetch(`${basePath}/api/notification/list?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.success) {
          const payload = data.data ?? data;
          const items = Array.isArray(payload?.data) ? payload.data : [];
          const tot = payload?.total ?? items.length;
          setList(items);
          setTotal(tot);
          setSkip(items.length);
        }
      })
      .catch(() => {
        if (!cancelled) setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [examSlug, subjectSlug, unitSlug, chapterSlug, topicSlug, subtopicSlug, definitionSlug]);

  const loadMoreParams = new URLSearchParams();
  loadMoreParams.set("limit", String(limit));
  loadMoreParams.set("skip", String(skip));
  if (examSlug) loadMoreParams.set("exam", examSlug);
  if (subjectSlug) loadMoreParams.set("subject", subjectSlug);
  if (unitSlug) loadMoreParams.set("unit", unitSlug);
  if (chapterSlug) loadMoreParams.set("chapter", chapterSlug);
  if (topicSlug) loadMoreParams.set("topic", topicSlug);
  if (subtopicSlug) loadMoreParams.set("subtopic", subtopicSlug);
  if (definitionSlug) loadMoreParams.set("definition", definitionSlug);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetch(`${basePath}/api/notification/list?${loadMoreParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          const payload = data.data ?? data;
          const items = Array.isArray(payload?.data) ? payload.data : [];
          setList((prev) => [...prev, ...items]);
          setSkip((prev) => prev + items.length);
        }
      })
      .finally(() => setLoadingMore(false));
  };

  if (loading && list.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="standard" hover={false} className="p-4 sm:p-5">
            <div className="flex gap-4 animate-pulse">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gray-200" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <Card variant="standard" hover={false} className="p-6 sm:p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-6">
          <FaBell className="text-gray-400 text-2xl sm:text-3xl" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
          No notifications yet
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-sm mx-auto">
          When you have new updates or announcements, they’ll show up here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3" role="list">
        {list.map((n) => {
          const config = getConfig(n.iconType);
          const { Icon } = config;
          const href = n.slug ? `/notification/${n.slug}` : n.link || "#";
          const isRead = n.read === true;

          return (
            <li key={n._id}>
              <Card
                href={href}
                variant="standard"
                className={`block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${config.leftAccent} ${isRead ? "bg-gray-50! border-gray-100! hover:border-indigo-200!" : config.cardTint
                  }`}
              >
                <div className="group flex gap-4 p-4 sm:p-5">
                  <span
                    className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${config.bg} ${config.iconColor} border ${config.border}`}
                    aria-hidden
                  >
                    <Icon className="w-6 h-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium ${isRead ? "text-gray-600" : "text-gray-900"
                        }`}
                    >
                      {n.title}
                    </p>
                    {(n.stripMessage || n.message) && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {n.stripMessage?.trim() || stripHtml(n.message, 200)}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        {relativeTime(n.createdAt)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${config.pill}`}
                      >
                        {config.label}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 self-center text-gray-300 group-hover:text-blue-600 transition-colors">
                    <FaChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div className="pt-6 pb-2 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {loadingMore ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                Loading…
              </span>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
