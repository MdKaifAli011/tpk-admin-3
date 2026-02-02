"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  FaPlay,
  FaFilm,
  FaGraduationCap,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaYoutube,
  FaLayerGroup
} from "react-icons/fa";

// --- Configuration ---

const YOUTUBE_THUMB = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
const YOUTUBE_THUMB_HD = (id) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;

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

function VideoCard({ video, pathLabel, level, onPlay }) {
  const id = video.youtubeVideoId;
  const embedUrl = video.embedUrl || `https://www.youtube.com/embed/${id}`;
  const [imgLoaded, setImgLoaded] = useState(false);
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.topic;
  const displayName = getLevelName(pathLabel);

  const handlePlay = useCallback(() => {
    onPlay?.({ embedUrl, title: pathLabel });
  }, [onPlay, embedUrl, pathLabel]);

  return (
    <div
      className="group relative flex flex-col w-[260px] shrink-0 cursor-pointer"
      onClick={handlePlay}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100 shadow-sm transition-all duration-300 group-hover:shadow-md ring-1 ring-black/5">

        {/* Image */}
        <img
          src={YOUTUBE_THUMB_HD(id)}
          alt={displayName}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = YOUTUBE_THUMB(id);
          }}
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-105 ${!imgLoaded ? "opacity-0" : "opacity-100"
            }`}
        />

        {/* Skeleton Loader */}
        {!imgLoaded && (
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
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        ref.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [checkScroll]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 600;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

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
          {videos.length}
        </span>
      </div>

      {/* Scroll Controls */}
      <div className="relative -mx-4 sm:mx-0">
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-[35%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white/90 text-gray-700 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:-left-5"
          >
            <FaChevronLeft className="text-sm" />
          </button>
        )}

        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-[35%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white/90 text-gray-700 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:-right-5"
          >
            <FaChevronRight className="text-sm" />
          </button>
        )}

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-4 pb-4 pt-1 sm:px-1 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {videos.map((video, i) => (
            <VideoCard
              key={video.youtubeVideoId || i}
              video={video}
              pathLabel={pathLabel}
              level={level}
              onPlay={onPlay}
            />
          ))}
          {/* Spacer for right padding */}
          <div className="w-1 shrink-0 sm:w-0" />
        </div>
      </div>
    </div>
  );
}

function LevelGroup({ level, rows, onPlay }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!rows?.length) return null;

  const config = LEVEL_CONFIG[level];
  const totalVideos = rows.reduce((a, r) => a + (r.videos?.length || 0), 0);

  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-1 shadow-sm transition-shadow duration-300 hover:shadow-md sm:mb-8">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-50 sm:px-4"
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
            {rows.length} Section{rows.length !== 1 ? 's' : ''} • {totalVideos} Video{totalVideos !== 1 ? 's' : ''}
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

  // Memoize grouped rows
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 shadow-sm">
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

export default function PrimeVideoClient({ exams }) {
  const [modal, setModal] = useState(null);
  const [activeExamIndex, setActiveExamIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const hasContent = exams?.length > 0 && exams.some((e) => collectRows(e).length > 0);

  // Calculate stats
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

  // Close dropdown on outside click
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

  const activeExam = exams?.[activeExamIndex];
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
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">

        {/* Modern Header */}
        <div className="relative border-b border-gray-100 bg-white px-6 py-6 sm:px-8">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/40 via-transparent to-purple-50/40" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <FaFilm className="text-xl" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Prime Video</h1>
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
                  className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 min-w-[180px] sm:min-w-[220px]"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Select exam"
                >
                  <FaGraduationCap className="h-4 w-4 shrink-0 text-indigo-600" />
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
                    className="absolute right-0 top-full z-20 mt-2 w-full min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
                    role="listbox"
                    aria-label="Exam list"
                  >
                    {exams.map((exam, index) => {
                      const count = collectRows(exam).reduce((a, r) => a + (r.videos?.length || 0), 0);
                      const isActive = index === activeExamIndex;
                      return (
                        <button
                          key={exam.id?.toString() ?? exam.name ?? index}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => {
                            setActiveExamIndex(index);
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors duration-150 ${isActive
                              ? "bg-indigo-50 text-indigo-900"
                              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        >
                          <FaGraduationCap
                            className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-600" : "text-gray-400"}`}
                          />
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
        <div className="bg-gray-50/30 px-4 py-6 sm:px-6 sm:py-8">
          <ExamContent
            key={activeExamIndex}
            exam={exams[activeExamIndex]}
            onPlay={onPlay}
          />
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