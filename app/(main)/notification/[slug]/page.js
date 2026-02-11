import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import RichContent from "@/app/(main)/components/RichContent";
import {
  FaCommentDots,
  FaTrophy,
  FaFileAlt,
  FaInfoCircle,
  FaBullhorn,
  FaChevronLeft,
} from "react-icons/fa";

const ICON_CONFIG = {
  comment: {
    Icon: FaCommentDots,
    label: "Comment",
    leftAccent: "border-l-indigo-500",
    iconBox: "bg-indigo-500/15 text-indigo-600 border-indigo-200",
    pill: "bg-indigo-100 text-indigo-700",
  },
  trophy: {
    Icon: FaTrophy,
    label: "Trophy",
    leftAccent: "border-l-amber-500",
    iconBox: "bg-amber-500/15 text-amber-600 border-amber-200",
    pill: "bg-amber-100 text-amber-700",
  },
  document: {
    Icon: FaFileAlt,
    label: "Document",
    leftAccent: "border-l-emerald-500",
    iconBox: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
    pill: "bg-emerald-100 text-emerald-700",
  },
  info: {
    Icon: FaInfoCircle,
    label: "Info",
    leftAccent: "border-l-sky-500",
    iconBox: "bg-sky-500/15 text-sky-600 border-sky-200",
    pill: "bg-sky-100 text-sky-700",
  },
  announcement: {
    Icon: FaBullhorn,
    label: "Announcement",
    leftAccent: "border-l-violet-500",
    iconBox: "bg-violet-500/15 text-violet-600 border-violet-200",
    pill: "bg-violet-100 text-violet-700",
  },
};

const DEFAULT_CONFIG = {
  Icon: FaBullhorn,
  label: "Announcement",
  leftAccent: "border-l-blue-500",
  iconBox: "bg-blue-500/15 text-blue-600 border-blue-200",
  pill: "bg-blue-100 text-blue-700",
};

function getConfig(iconType) {
  return ICON_CONFIG[iconType] || DEFAULT_CONFIG;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  await connectDB();
  const notification = await Notification.findOne({
    slug: slug?.trim(),
    status: "active",
  }).select("title message").lean();

  if (!notification) {
    return { title: "Notification | TestPrepKart" };
  }

  const desc = notification.message
    ? notification.message.replace(/<[^>]*>/g, "").slice(0, 160)
    : notification.title;

  return {
    title: `${notification.title} | Notifications | TestPrepKart`,
    description: desc,
  };
}

export default async function NotificationDetailPage({ params }) {
  const { slug } = await params;
  await connectDB();
  const notification = await Notification.findOne({
    slug: slug?.trim(),
    status: "active",
  }).lean();

  if (!notification) {
    notFound();
  }

  const config = getConfig(notification.iconType);
  const Icon = config.Icon;

  return (
    <div className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
      <Link
        href="/notification"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-lg py-1 pr-2 -ml-2 transition-colors"
      >
        <FaChevronLeft className="w-4 h-4 shrink-0" />
        Back to all notifications
      </Link>

      <article
        className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm overflow-hidden ${config.leftAccent}`}
      >
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border ${config.iconBox}`}
              aria-hidden
            >
              <Icon className="w-6 h-6" />
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${config.pill}`}
            >
              {config.label}
            </span>
            <time
              dateTime={notification.createdAt}
              className="text-sm text-gray-500"
            >
              {formatDate(notification.createdAt)}
            </time>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            {notification.title}
          </h1>

          <div className="text-gray-600 prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-900 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 rich-text-content">
            {notification.message ? (
              <RichContent html={notification.message} />
            ) : (
              <p>{notification.stripMessage || notification.title}</p>
            )}
          </div>

          {(notification.link || notification.slug) && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <Link
                href={notification.link || `/notification/${notification.slug}`}
                className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
              >
                {notification.linkLabel || "View"}
              </Link>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
