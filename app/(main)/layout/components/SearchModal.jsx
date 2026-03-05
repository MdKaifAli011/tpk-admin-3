"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FaSearch,
  FaTimes,
  FaBook,
  FaFolder,
  FaFileAlt,
  FaComments,
} from "react-icons/fa";
import Link from "next/link";
import { useSearchContext } from "../context/SearchContext";
import { tokenizeQuery, textMatchesTokens, getSearchableText } from "../utils/searchTokens";
import api from "@/lib/api";

/** Build path for a discussion thread (hierarchy slugs). Same logic as DiscussionForumTab.getThreadDetailPath. */
function getThreadDetailPath(thread) {
  if (!thread?.slug) return null;
  const segments = [];
  if (thread.examId?.slug) segments.push(thread.examId.slug);
  if (thread.subjectId?.slug) segments.push(thread.subjectId.slug);
  if (thread.unitId?.slug) segments.push(thread.unitId.slug);
  if (thread.chapterId?.slug) segments.push(thread.chapterId.slug);
  if (thread.topicId?.slug) segments.push(thread.topicId.slug);
  if (thread.subTopicId?.slug) segments.push(thread.subTopicId.slug);
  if (thread.definitionId?.slug) segments.push(thread.definitionId.slug);
  if (segments.length === 0) return null;
  const rest = segments.join("/");
  return rest ? `/${rest}` : "/";
}

const SearchModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { tree, treeLoading, activeExamSlug, activeExamId } = useSearchContext();
  const [currentExamSlug, setCurrentExamSlug] = useState("");
  const [discussionResults, setDiscussionResults] = useState([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);

  // Update exam slug when URL changes or context changes
  useEffect(() => {
    const updateExamSlug = () => {
      if (typeof window !== "undefined") {
        const pathname = window.location.pathname;
        const pathSegments = pathname.split('/').filter(Boolean);
        
        // Remove basePath if present
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
        const basePathSegments = basePath.split('/').filter(Boolean);
        
        // Filter out basePath segments
        const filteredSegments = pathSegments.filter(segment => 
          !basePathSegments.includes(segment)
        );
        
        if (filteredSegments.length > 0) {
          // First segment should be the exam slug
          const newExamSlug = filteredSegments[0];
          setCurrentExamSlug(newExamSlug);
        }
      }
    };

    // Initial update
    updateExamSlug();

    // Listen for URL changes
    const handleURLChange = () => {
      setTimeout(updateExamSlug, 100);
    };

    window.addEventListener("popstate", handleURLChange);
    
    // Also listen for custom navigation events
    const handleNavigation = () => {
      setTimeout(updateExamSlug, 100);
    };
    
    window.addEventListener("navigation", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleURLChange);
      window.removeEventListener("navigation", handleNavigation);
    };
  }, [activeExamSlug]); // Re-run when activeExamSlug from context changes

  /* ------------------------------- Debounce ------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ----------------------------- Discussion search API (global: all threads) ----------------------------- */
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setDiscussionResults([]);
      setDiscussionLoading(false);
      return;
    }
    let cancelled = false;
    setDiscussionLoading(true);
    const params = new URLSearchParams({
      search: q,
      limit: "10",
    });
    api
      .get(`/discussion/threads?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data;
        setDiscussionResults(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setDiscussionResults([]);
      })
      .finally(() => {
        if (!cancelled) setDiscussionLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  /* ----------------------------- Escape Close ----------------------------- */
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ----------------------------- Ctrl+K Open ----------------------------- */
  useEffect(() => {
    const handleCtrlK = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // This will be handled by the parent component
          // We'll emit a custom event to notify parent
          window.dispatchEvent(new CustomEvent("openSearchModal"));
        }
      }
    };

    document.addEventListener("keydown", handleCtrlK);
    return () => document.removeEventListener("keydown", handleCtrlK);
  }, [isOpen, onClose]);

  /* ----------------------------- Tree Filter (token-based / bag-of-words) ------------------------------ */
  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const tokens = useMemo(() => tokenizeQuery(normalizedQuery), [normalizedQuery]);

  const filteredTree = useMemo(() => {
    if (!normalizedQuery || !tokens.length) return tree;

    const nodeMatches = (searchableText) =>
      textMatchesTokens(searchableText, tokens);

    return tree
      .map((subject) => {
        const subjectText = getSearchableText(subject);
        const subjectMatch = nodeMatches(subjectText);

        const units = subject.units
          ?.map((unit) => {
            const unitText = getSearchableText(unit, subject.name);
            const unitMatch = subjectMatch || nodeMatches(unitText);

            const chapters = unit.chapters
              ?.map((chapter) => {
                const chapterText = getSearchableText(
                  chapter,
                  subject.name,
                  unit.name
                );
                const chapterMatch =
                  unitMatch || nodeMatches(chapterText);

                const topics = chapter.topics?.filter((topic) => {
                  if (chapterMatch) return true;
                  const topicText = getSearchableText(
                    topic,
                    subject.name,
                    unit.name,
                    chapter.name
                  );
                  return nodeMatches(topicText);
                });

                if (chapterMatch || topics?.length)
                  return { ...chapter, topics };

                return null;
              })
              .filter(Boolean);

            if (unitMatch || chapters?.length)
              return { ...unit, chapters };

            return null;
          })
          .filter(Boolean);

        if (subjectMatch || units?.length)
          return { ...subject, units };

        return null;
      })
      .filter(Boolean);
  }, [tree, normalizedQuery, tokens]);

  /* --------------------------- Search Results (token-based match) ----------------------------- */
  const searchResults = useMemo(() => {
    const results = [];
    if (!tokens.length) return results;

    const nodeMatches = (searchableText) =>
      textMatchesTokens(searchableText, tokens);

    filteredTree.forEach((subject) => {
      const subjectText = getSearchableText(subject);
      if (nodeMatches(subjectText)) {
        results.push({
          type: "subject",
          name: subject.name,
          path: `/${currentExamSlug}/${subject.slug}`,
        });
      }

      subject.units?.forEach((unit) => {
        const unitText = getSearchableText(unit, subject.name);
        if (nodeMatches(unitText)) {
          results.push({
            type: "unit",
            name: unit.name,
            parent: subject.name,
            path: `/${currentExamSlug}/${subject.slug}/${unit.slug}`,
          });
        }

        unit.chapters?.forEach((chapter) => {
          const chapterText = getSearchableText(
            chapter,
            subject.name,
            unit.name
          );
          if (nodeMatches(chapterText)) {
            results.push({
              type: "chapter",
              name: chapter.name,
              parent: `${subject.name} › ${unit.name}`,
              path: `/${currentExamSlug}/${subject.slug}/${unit.slug}/${chapter.slug}`,
            });
          }

          chapter.topics?.forEach((topic) => {
            const topicText = getSearchableText(
              topic,
              subject.name,
              unit.name,
              chapter.name
            );
            if (nodeMatches(topicText)) {
              results.push({
                type: "topic",
                name: topic.name,
                parent: `${subject.name} › ${unit.name} › ${chapter.name}`,
                path: `/${currentExamSlug}/${subject.slug}/${unit.slug}/${chapter.slug}/${topic.slug}`,
              });
            }
          });
        });
      });
    });

    return results;
  }, [filteredTree, tokens, currentExamSlug]);

  const icons = {
    subject: <FaBook className="text-blue-600" />,
    unit: <FaFolder className="text-emerald-600" />,
    chapter: <FaFileAlt className="text-orange-600" />,
    topic: <FaFileAlt className="text-purple-600" />,
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40  z-[9998]"
      />

      {/* Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200">
          
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <FaSearch className="text-blue-600 text-lg" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects, units, chapters, topics, discussions..."
              className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-500 text-lg"
            />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/5"
            >
              <FaTimes />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {treeLoading ? (
              <div className="py-14 text-center">
                <div className="w-8 h-8 mx-auto border-b-2 border-blue-600 rounded-full animate-spin" />
              </div>
            ) : !searchQuery ? (
              <EmptyState />
            ) : !normalizedQuery ? (
              <EmptyState />
            ) : (
              <>
                {searchResults.length === 0 && !discussionLoading && discussionResults.length === 0 ? (
                  <NoResults query={searchQuery} />
                ) : (
                  <div className="p-3 space-y-4">
                    {searchResults.length > 0 && (
                      <section>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
                          Syllabus — {searchResults.length} result(s)
                        </p>
                        <div className="space-y-1">
                          {searchResults.map((r, i) => (
                            <Link
                              key={`syl-${i}`}
                              href={r.path}
                              onClick={onClose}
                              className="group flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition"
                            >
                              <div className="mt-1">{icons[r.type]}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                                  {r.name}
                                </p>
                                {r.parent && (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {r.parent}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {r.type}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </section>
                    )}

                    {(discussionLoading || discussionResults.length > 0) && (
                      <section>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2 flex items-center gap-1.5">
                          <FaComments className="text-indigo-500" />
                          Discussion — {discussionLoading ? "Searching..." : `${discussionResults.length} result(s)`}
                        </p>
                        {discussionLoading && discussionResults.length === 0 ? (
                          <div className="flex items-center gap-2 px-3 py-4 text-gray-500">
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading discussion threads...</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {discussionResults.map((thread) => {
                              const path = getThreadDetailPath(thread);
                              const href = path
                                ? `${path}?tab=discussion&thread=${encodeURIComponent(thread.slug)}`
                                : "#";
                              const snippet = (() => {
                                if (!thread.content) return "";
                                const stripped = String(thread.content).replace(/<[^>]+>/g, " ").trim();
                                return stripped.slice(0, 80) + (stripped.length > 80 ? "…" : "");
                              })();
                              return (
                                <Link
                                  key={thread._id}
                                  href={href}
                                  onClick={onClose}
                                  className="group flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition"
                                >
                                  <div className="mt-1">
                                    <FaComments className="text-indigo-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 truncate">
                                      {thread.title}
                                    </p>
                                    {snippet && (
                                      <p className="text-xs text-gray-500 truncate mt-0.5">
                                        {snippet}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-[10px] uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                                    Thread
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/* ------------------------------ Sub States ------------------------------ */

const EmptyState = () => (
  <div className="py-16 text-center">
    <FaSearch className="mx-auto text-4xl text-gray-300 mb-4" />
    <p className="text-gray-600 font-medium">Start typing to search</p>
    <p className="text-gray-400 text-sm mt-1">
      Subjects, units, chapters & topics
    </p>
  </div>
);

const NoResults = ({ query }) => (
  <div className="py-16 text-center">
    <FaSearch className="mx-auto text-4xl text-gray-300 mb-4" />
    <p className="text-gray-600 font-medium">
      No results for “{query}”
    </p>
    <p className="text-gray-400 text-sm mt-1">
      Try a different keyword
    </p>
  </div>
);

export default SearchModal;
