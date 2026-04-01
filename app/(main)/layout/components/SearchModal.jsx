"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FaSearch,
  FaTimes,
  FaBook,
  FaFolder,
  FaFileAlt,
  FaComments,
  FaNewspaper,
} from "react-icons/fa";
import Link from "next/link";
import { useSearchContext } from "../context/SearchContext";
import { tokenizeQuery, textMatchesTokens, getSearchableText } from "../utils/searchTokens";
import api from "@/lib/api";
import { BLOG_PUBLIC_AUTHOR_LABEL } from "@/constants/blogPublic";

function createSlug(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
  const { tree, treeLoading, activeExamId, activeExamSlug, searchScopeExamSlug, searchScopeExamId, exams } = useSearchContext();

  const scopeExamSlug = searchScopeExamSlug || "";
  /** Always send sidebar exam id when slug lookup fails (e.g. SAT) — without examId API returns global NEET/JEE threads. */
  const scopeExamId = searchScopeExamId || activeExamId || null;
  const [discussionResults, setDiscussionResults] = useState([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [blogResults, setBlogResults] = useState([]);
  const [blogLoading, setBlogLoading] = useState(false);

  /* ------------------------------- Debounce ------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ----------------------------- Discussion search API (scoped to current exam when on exam page) ----------------------------- */
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
    if (scopeExamId) params.set("examId", String(scopeExamId));
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
  }, [debouncedQuery, scopeExamId]);

  /* ----------------------------- Blog search API (scoped to current exam when on exam page) ----------------------------- */
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setBlogResults([]);
      setBlogLoading(false);
      return;
    }
    let cancelled = false;
    setBlogLoading(true);
    const params = new URLSearchParams({
      status: "active",
      search: q,
      limit: "10",
    });
    if (scopeExamId) params.set("examId", String(scopeExamId));
    api
      .get(`/blog?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data;
        setBlogResults(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setBlogResults([]);
      })
      .finally(() => {
        if (!cancelled) setBlogLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery, scopeExamId]);

  /** Extra safety: only show threads/blogs for current exam (API can leak if examId missing). */
  const discussionFiltered = useMemo(() => {
    if (!scopeExamId || !discussionResults.length) return discussionResults;
    const id = String(scopeExamId);
    return discussionResults.filter((t) => {
      const eid = t.examId?._id ?? t.examId;
      return eid != null && String(eid) === id;
    });
  }, [discussionResults, scopeExamId]);

  const blogFiltered = useMemo(() => {
    if (!scopeExamId || !blogResults.length) return blogResults;
    const id = String(scopeExamId);
    return blogResults.filter((b) => {
      const eid = b.examId?._id ?? b.examId;
      return eid != null && String(eid) === id;
    });
  }, [blogResults, scopeExamId]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

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

  /* ----------------------------- Tree Filter (token-based; only for current exam's tree) ------------------------------ */
  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const tokens = useMemo(() => tokenizeQuery(normalizedQuery), [normalizedQuery]);

  /** Use tree only when it belongs to the scope exam (URL exam). Stops showing wrong exam's syllabus after switching dropdown. */
  const treeForScope = useMemo(() => {
    if (!scopeExamSlug || activeExamSlug !== scopeExamSlug) return [];
    return tree || [];
  }, [tree, scopeExamSlug, activeExamSlug]);

  const filteredTree = useMemo(() => {
    if (!normalizedQuery || !tokens.length) return treeForScope;

    const nodeMatches = (searchableText) =>
      textMatchesTokens(searchableText, tokens);

    return treeForScope
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
  }, [treeForScope, normalizedQuery, tokens]);

  /* --------------------------- Search Results (token-based match; paths use scope exam slug) ----------------------------- */
  const searchResults = useMemo(() => {
    const results = [];
    if (!tokens.length) return results;

    const nodeMatches = (searchableText) =>
      textMatchesTokens(searchableText, tokens);

    const pathPrefix = scopeExamSlug || "";
    filteredTree.forEach((subject) => {
      const subjectText = getSearchableText(subject);
      if (nodeMatches(subjectText)) {
        results.push({
          type: "subject",
          name: subject.name,
          path: `/${pathPrefix}/${subject.slug}`,
        });
      }

      subject.units?.forEach((unit) => {
        const unitText = getSearchableText(unit, subject.name);
        if (nodeMatches(unitText)) {
          results.push({
            type: "unit",
            name: unit.name,
            parent: subject.name,
            path: `/${pathPrefix}/${subject.slug}/${unit.slug}`,
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
              path: `/${pathPrefix}/${subject.slug}/${unit.slug}/${chapter.slug}`,
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
                path: `/${pathPrefix}/${subject.slug}/${unit.slug}/${chapter.slug}/${topic.slug}`,
              });
            }
          });
        });
      });
    });

    return results;
  }, [filteredTree, tokens, scopeExamSlug]);

  const icons = {
    subject: <FaBook className="text-blue-600" />,
    unit: <FaFolder className="text-emerald-600" />,
    chapter: <FaFileAlt className="text-orange-600" />,
    topic: <FaFileAlt className="text-purple-600" />,
  };

  if (!isOpen || !mounted) return null;

  const modal = (
    <>
      {/* Above sidebar (z-50) + navbar — portal to body so stacking is not trapped inside navbar */}
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-[10050] bg-black/50 backdrop-blur-[1px]"
        aria-hidden="true"
      />

      <div
        className="fixed top-[max(4rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[10051] w-[calc(100%-1.5rem)] max-w-2xl px-2 sm:px-0"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200">

          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <FaSearch className="text-blue-600 text-lg" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={scopeExamSlug
                ? `Search ${scopeExamSlug} subjects, units, chapters, topics, discussions, blogs...`
                : "Search subjects, units, chapters, topics, discussions, blogs..."}
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
                {searchResults.length === 0 && !discussionLoading && discussionFiltered.length === 0 && !blogLoading && blogFiltered.length === 0 ? (
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

                    {(discussionLoading || discussionFiltered.length > 0) && (
                      <section>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2 flex items-center gap-1.5">
                          <FaComments className="text-indigo-500" />
                          Discussion — {discussionLoading ? "Searching..." : `${discussionFiltered.length} result(s)`}
                        </p>
                        {discussionLoading && discussionFiltered.length === 0 ? (
                          <div className="flex items-center gap-2 px-3 py-4 text-gray-500">
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading discussion threads...</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {discussionFiltered.map((thread) => {
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

                    {(blogLoading || blogFiltered.length > 0) && (
                      <section>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2 flex items-center gap-1.5">
                          <FaNewspaper className="text-amber-500" />
                          Blog — {blogLoading ? "Searching..." : `${blogFiltered.length} result(s)`}
                        </p>
                        {blogLoading && blogFiltered.length === 0 ? (
                          <div className="flex items-center gap-2 px-3 py-4 text-gray-500">
                            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading blogs...</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {blogFiltered.map((blog) => {
                              const examSlug = blog.examId?.slug || scopeExamSlug || "";
                              const blogSlug = blog.slug || blog.name?.toLowerCase().replace(/\s+/g, "-") || "";
                              const href = examSlug && blogSlug ? `/${examSlug}/blog/${blogSlug}` : "#";
                              const categoryName = blog.categoryId?.name || blog.category || "Blog";
                              return (
                                <Link
                                  key={blog._id}
                                  href={href}
                                  onClick={onClose}
                                  className="group flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition"
                                >
                                  <div className="mt-1">
                                    <FaNewspaper className="text-amber-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 group-hover:text-amber-600 truncate">
                                      {blog.name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                      {BLOG_PUBLIC_AUTHOR_LABEL} · {categoryName}
                                      {blog.examId?.name && ` · ${blog.examId.name}`}
                                    </p>
                                  </div>
                                  <span className="text-[10px] uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                                    Blog
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

  return createPortal(modal, document.body);
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
