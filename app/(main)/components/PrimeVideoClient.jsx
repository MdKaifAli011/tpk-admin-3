"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FaPlay,
  FaFilm,
  FaGraduationCap,
  FaChevronDown,
  FaChevronUp,
  FaYoutube,
  FaLayerGroup,
} from "react-icons/fa";

// --- Configuration ---

/** YouTube thumbnail URLs. hqdefault (480x360) exists for almost all videos; maxresdefault often 404s. */
const YOUTUBE_THUMB_HQ = (id) => (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "");
const YOUTUBE_THUMB_MQ = (id) => (id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : "");
const YOUTUBE_THUMB_HD = (id) => (id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : "");

/** Extract 11-char YouTube video ID from video object (youtubeVideoId or from embedUrl). */
function getYouTubeVideoId(video) {
  if (!video) return null;
  const raw = video.youtubeVideoId || "";
  const idFromRaw = String(raw).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(idFromRaw)) return idFromRaw;
  const embed = video.embedUrl || "";
  const m = String(embed).match(/(?:youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return m ? m[1] : (idFromRaw || null);
}

const LEVEL_ORDER = [
  "exam",
  "subject",
  "unit",
  "chapter",
  "topic",
  "subtopic",
  "definition",
];

const LEVEL_CONFIG = {
  exam: { label: "Exam", color: "bg-purple-600", text: "text-purple-600", bgLight: "bg-purple-50" },
  subject: { label: "Subject", color: "bg-blue-600", text: "text-blue-600", bgLight: "bg-blue-50" },
  unit: { label: "Unit", color: "bg-indigo-600", text: "text-indigo-600", bgLight: "bg-indigo-50" },
  chapter: { label: "Chapter", color: "bg-cyan-600", text: "text-cyan-600", bgLight: "bg-cyan-50" },
  topic: { label: "Topic", color: "bg-teal-600", text: "text-teal-600", bgLight: "bg-teal-50" },
  subtopic: { label: "SubTopic", color: "bg-emerald-600", text: "text-emerald-600", bgLight: "bg-emerald-50" },
  definition: { label: "Definition", color: "bg-green-600", text: "text-green-600", bgLight: "bg-green-50" },
};

/** Number of videos shown per level row before "View more" */
const INITIAL_VIDEOS_PER_ROW = 8;

// --- Helpers ---

function collectRows(exam) {
  const rows = [];
  if (exam.videos?.length)
    rows.push({ pathLabel: exam.name, level: "exam", videos: exam.videos });
  (exam.subjects || []).forEach((sub) => {
    if (sub.videos?.length)
      rows.push({ pathLabel: sub.pathLabel, level: "subject", videos: sub.videos });
    (sub.units || []).forEach((unit) => {
      if (unit.videos?.length)
        rows.push({ pathLabel: unit.pathLabel, level: "unit", videos: unit.videos });
      (unit.chapters || []).forEach((ch) => {
        if (ch.videos?.length)
          rows.push({ pathLabel: ch.pathLabel, level: "chapter", videos: ch.videos });
        (ch.topics || []).forEach((topic) => {
          if (topic.videos?.length)
            rows.push({ pathLabel: topic.pathLabel, level: "topic", videos: topic.videos });
          (topic.subtopics || []).forEach((st) => {
            if (st.videos?.length)
              rows.push({ pathLabel: st.pathLabel, level: "subtopic", videos: st.videos });
            (st.definitions || []).forEach((def) => {
              if (def.videos?.length)
                rows.push({
                  pathLabel: def.pathLabel || def.name,
                  level: "definition",
                  videos: def.videos,
                });
            });
          });
        });
      });
    });
  });
  return rows;
}

function getLevelName(pathLabel) {
  if (!pathLabel) return "";
  const parts = pathLabel.split(" → ");
  return parts[parts.length - 1]?.trim() || pathLabel;
}

// --- Components ---

/**
 * VideoCard: lazy-loads thumbnail only when card is in viewport (Intersection Observer).
 * No img request until visible — saves bandwidth. "View more" only reveals more cards; their images load when scrolled into view.
 */
function VideoCard({ video, pathLabel, level, onPlay, priority = false }) {
  const id = getYouTubeVideoId(video);
  const embedUrl = video?.embedUrl && /youtube|youtu\.be/i.test(video.embedUrl)
    ? video.embedUrl
    : id
      ? `https://www.youtube.com/embed/${id}`
      : "";
  const [imgLoaded, setImgLoaded] = useState(false);
  const [thumbSrc, setThumbSrc] = useState(() => (id ? YOUTUBE_THUMB_HQ(id) : ""));
  const [inView, setInView] = useState(priority);
  const cardRef = useRef(null);

  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.topic;
  const displayName = getLevelName(pathLabel);

  // Lazy: only load thumbnail when card is in viewport (or priority = first 8)
  useEffect(() => {
    if (priority || !cardRef.current || !id) return;
    const el = cardRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setInView(true);
        }
      },
      { rootMargin: "100px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, id]);

  const handlePlay = useCallback(() => {
    if (embedUrl) onPlay?.({ embedUrl, title: pathLabel });
  }, [onPlay, embedUrl, pathLabel]);

  const handleThumbError = useCallback(() => {
    setThumbSrc((prev) => {
      if (prev === YOUTUBE_THUMB_HQ(id)) return YOUTUBE_THUMB_MQ(id);
      return prev;
    });
  }, [id]);

  if (!id) return null;

  const shouldLoadImage = inView;

  return (
    <div
      ref={cardRef}
      className="group relative flex flex-col w-full min-w-0 cursor-pointer"
      onClick={handlePlay}
    >
      {/* Thumbnail Container - image only requested when inView (or priority) */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100 shadow-sm transition-all duration-300 group-hover:shadow-md ring-1 ring-black/5">
        {shouldLoadImage ? (
          <img
            src={thumbSrc || YOUTUBE_THUMB_HQ(id)}
            alt={displayName}
            onError={(e) => {
              e.target.onerror = null;
              handleThumbError();
            }}
            onLoad={() => setImgLoaded(true)}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={`h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-105 ${!imgLoaded ? "opacity-0" : "opacity-100"
              }`}
          />
        ) : null}

        {/* Skeleton until in view or image loaded */}
        {(!shouldLoadImage || !imgLoaded) && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Level Badge - Top Left */}
        <div className="absolute left-2 top-2">
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md ${config.color} bg-opacity-90`}>
            {config.label}
          </span>
        </div>

        {/* Play Button - Center */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 transform items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-indigo-600 shadow-lg">
              <FaPlay className="ml-0.5 text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 px-1">
        <h4
          className="line-clamp-2 text-sm font-semibold text-gray-900 transition-colors group-hover:text-indigo-600"
          title={displayName}
        >
          {displayName}
        </h4>
        <div className="mt-1 flex items-center gap-2">
          <FaYoutube className="text-xs text-gray-400" />
          <span className="truncate text-xs text-gray-500">Video Lesson</span>
        </div>
      </div>
    </div>
  );
}

function VideoRow({ pathLabel, videos, level, onPlay }) {
  const [expanded, setExpanded] = useState(false);

  const totalCount = videos?.length ?? 0;
  const displayVideos = useMemo(() => {
    if (!videos?.length) return [];
    if (expanded || totalCount <= INITIAL_VIDEOS_PER_ROW) return videos;
    return videos.slice(0, INITIAL_VIDEOS_PER_ROW);
  }, [videos, expanded, totalCount]);
  const hasMore = totalCount > INITIAL_VIDEOS_PER_ROW;
  const moreCount = totalCount - INITIAL_VIDEOS_PER_ROW;

  if (!videos?.length) return null;

  const config = LEVEL_CONFIG[level];

  return (
    <div className="group/row relative mb-8 last:mb-0">
      {/* Row Header */}
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`h-8 w-1 shrink-0 rounded-full ${config.color}`} />
          <h3
            className="truncate text-base font-bold text-gray-900"
            title={pathLabel}
          >
            {pathLabel}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {totalCount} video{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid - only first 8 (or all after View more) are in DOM; thumbnails load when in viewport (priority for first 8) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {displayVideos.map((video, i) => (
          <div key={video.youtubeVideoId || i} className="w-full min-w-0">
            <VideoCard
              video={video}
              pathLabel={pathLabel}
              level={level}
              onPlay={onPlay}
              priority={i < INITIAL_VIDEOS_PER_ROW}
            />
          </div>
        ))}
      </div>

      {/* View more / Show less - when this level has more than 8 videos */}
      {hasMore && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {expanded ? (
              <>
                <FaChevronUp className="text-xs" />
                Show less
              </>
            ) : (
              <>
                <FaChevronDown className="text-xs" />
                View more ({moreCount} more video{moreCount !== 1 ? "s" : ""})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function LevelGroup({ level, rows, onPlay }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!rows?.length) return null;

  const config = LEVEL_CONFIG[level];
  const totalVideos = rows.reduce((a, r) => a + (r.videos?.length || 0), 0);

  return (
    <div className="mb-6 rounded-md border border-gray-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md ">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-3 rounded px-1 py-2 text-left transition-colors hover:bg-gray-50 sm:px-4"
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bgLight} ${config.text}`}>
          <FaLayerGroup className="text-sm" />
        </div>

        <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-bold text-gray-900 sm:text-base">
            {config.label} Level
          </span>
          <span className="hidden text-gray-300 sm:block">|</span>
          <span className="text-xs text-gray-500 sm:text-sm">
            {rows.length} Section{rows.length !== 1 ? "s" : ""} • {totalVideos} Video{totalVideos !== 1 ? "s" : ""}
          </span>
        </div>

        <div className={`flex h-6 w-6 transform items-center justify-center rounded-full text-gray-400 transition-transform duration-300 ${collapsed ? "rotate-0" : "rotate-180"}`}>
          <FaChevronDown className="text-xs" />
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-2 pt-4 sm:px-6">
            {rows.map((row, i) => (
              <VideoRow
                key={`${row.pathLabel}-${i}`}
                pathLabel={row.pathLabel}
                videos={row.videos}
                level={row.level}
                onPlay={onPlay}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamContent({ exam, onPlay }) {
  const rows = useMemo(() => collectRows(exam), [exam]);

  const groupedRows = useMemo(() => {
    const groups = {};
    LEVEL_ORDER.forEach(l => groups[l] = []);
    rows.forEach(r => {
      if (LEVEL_ORDER.includes(r.level)) groups[r.level].push(r);
    });
    return groups;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded bg-indigo-50 shadow-sm">
          <FaFilm className="text-2xl text-indigo-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">No videos available</h3>
        <p className="mt-1 max-w-xs text-sm text-gray-500">
          This exam doesn&apos;t have any video content assigned yet.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      {LEVEL_ORDER.map((level) => (
        <LevelGroup
          key={level}
          level={level}
          rows={groupedRows[level]}
          onPlay={onPlay}
        />
      ))}
    </div>
  );
}

function VideoModal({ embedUrl, title, onClose }) {
  const backdropRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-all duration-300 animate-in fade-in"
      onClick={(e) => e.target === backdropRef.current && onClose()}
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
        <div className="absolute right-4 top-4 z-10">
          <button
            onClick={onClose}
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:bg-white hover:text-black"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl + "?autoplay=1&rel=0"}
            title={title || "Video"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

/** Normalize slug for comparison (lowercase, trim). */
function normalizeSlug(s) {
  return (s ?? "").toLowerCase().trim();
}

/**
 * Prime Video client – used only at /[examSlug]/prime-video.
 * Receives exams and currentExamSlug (from URL); dropdown navigates to /{slug}/prime-video.
 */
export default function PrimeVideoClient({ exams, currentExamSlug }) {
  const router = useRouter();
  const [modal, setModal] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const slugFromUrl = normalizeSlug(currentExamSlug);

  const activeExam = useMemo(() => {
    if (!exams?.length) return null;
    if (slugFromUrl) {
      const found = exams.find((e) => normalizeSlug(e.slug) === slugFromUrl);
      if (found) return found;
    }
    return exams[0];
  }, [exams, slugFromUrl]);

  const hasContent = exams?.length > 0 && exams.some((e) => collectRows(e).length > 0);

  const totalStats = useMemo(() => {
    if (!exams) return { videos: 0, exams: 0 };
    const videos = exams.reduce((acc, exam) =>
      acc + collectRows(exam).reduce((a, r) => a + (r.videos?.length || 0), 0), 0
    );
    return { videos, exams: exams.length };
  }, [exams]);

  const onPlay = useCallback(({ embedUrl, title }) => {
    setModal({ embedUrl, title });
  }, []);

  const onExamSelect = useCallback(
    (exam) => {
      setDropdownOpen(false);
      const targetSlug = exam?.slug ?? "";
      if (!targetSlug) return;
      router.push(`/${targetSlug}/prime-video`);
    },
    [router]
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const activeExamVideoCount = activeExam
    ? collectRows(activeExam).reduce((a, r) => a + (r.videos?.length || 0), 0)
    : 0;

  if (!hasContent) {
    return (
      <section className="bg-transparent font-sans">
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <FaFilm className="text-3xl text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Prime Video Library</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Your comprehensive video library across all learning levels. Content will appear here once populated.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 bg-transparent font-sans antialiased">
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">

        {/* Modern Header */}
        <div className="relative border-b border-gray-100 bg-white px-6 py-6 sm:px-8">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/40 via-transparent to-purple-50/40" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-blue-900 tracking-tight">Prime Video</h1>
                <p className="text-sm font-medium text-gray-500">
                  {totalStats.videos} Videos • {totalStats.exams} Exam{totalStats.exams !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Exam dropdown - only when multiple exams */}
            {exams.length > 1 && (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2.5 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-left shadow-sm transition-all duration-200 hover:border-blue-200 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-w-[180px] sm:min-w-[220px]"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Select exam"
                >
                  <span className="truncate text-sm font-medium text-gray-900">
                    {activeExam?.name ?? "Select exam"}
                  </span>
                  <span className="ml-auto shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {activeExamVideoCount} video{activeExamVideoCount !== 1 ? "s" : ""}
                  </span>
                  <FaChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-full z-20 mt-1 w-full min-w-[220px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
                    role="listbox"
                    aria-label="Exam list"
                  >
                    {exams.map((exam, index) => {
                      const count = collectRows(exam).reduce((a, r) => a + (r.videos?.length || 0), 0);
                      const isActive = activeExam && (exam.slug === activeExam.slug || exam.id?.toString() === activeExam.id?.toString());
                      return (
                        <button
                          key={exam.id?.toString() ?? exam.name ?? index}
                          type="button"
                          role="option"
                          aria-selected={!!isActive}
                          onClick={() => onExamSelect(exam)}
                          className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors duration-150 ${isActive
                              ? "bg-blue-50 text-blue-900"
                              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        >
                          <span className="truncate flex-1 font-medium">{exam.name}</span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? "bg-indigo-200 text-indigo-800" : "bg-gray-100 text-gray-600"
                              }`}
                          >
                            {count} video{count !== 1 ? "s" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-gray-50/30 px-4 py-4 sm:px-6 sm:py-6">
          {activeExam && (
            <ExamContent
              key={activeExam.slug ?? activeExam.id}
              exam={activeExam}
              onPlay={onPlay}
            />
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <VideoModal
          embedUrl={modal.embedUrl}
          title={modal.title}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
}
