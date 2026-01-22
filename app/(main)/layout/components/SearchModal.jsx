"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FaSearch,
  FaTimes,
  FaBook,
  FaFolder,
  FaFileAlt,
} from "react-icons/fa";
import Link from "next/link";
import { useSearchContext } from "../context/SearchContext";

const SearchModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { tree, treeLoading } = useSearchContext();

  /* ------------------------------- Debounce ------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ----------------------------- Escape Close ----------------------------- */
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ----------------------------- Tree Filter ------------------------------ */
  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  const filteredTree = useMemo(() => {
    if (!normalizedQuery) return tree;

    const match = (v) => v?.toLowerCase().includes(normalizedQuery);

    return tree
      .map((subject) => {
        const subjectMatch = match(subject.name);

        const units = subject.units
          ?.map((unit) => {
            const unitMatch = subjectMatch || match(unit.name);

            const chapters = unit.chapters
              ?.map((chapter) => {
                const chapterMatch = unitMatch || match(chapter.name);

                const topics = chapter.topics?.filter((topic) =>
                  chapterMatch ? true : match(topic.name)
                );

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
  }, [tree, normalizedQuery]);

  /* --------------------------- Search Results ----------------------------- */
  const searchResults = useMemo(() => {
    const results = [];

    filteredTree.forEach((subject) => {
      if (subject.name.toLowerCase().includes(normalizedQuery)) {
        results.push({
          type: "subject",
          name: subject.name,
          path: `/${subject.slug}`,
        });
      }

      subject.units?.forEach((unit) => {
        if (unit.name.toLowerCase().includes(normalizedQuery)) {
          results.push({
            type: "unit",
            name: unit.name,
            parent: subject.name,
            path: `/${subject.slug}/${unit.slug}`,
          });
        }

        unit.chapters?.forEach((chapter) => {
          if (chapter.name.toLowerCase().includes(normalizedQuery)) {
            results.push({
              type: "chapter",
              name: chapter.name,
              parent: `${subject.name} › ${unit.name}`,
              path: `/${subject.slug}/${unit.slug}/${chapter.slug}`,
            });
          }

          chapter.topics?.forEach((topic) => {
            if (topic.name.toLowerCase().includes(normalizedQuery)) {
              results.push({
                type: "topic",
                name: topic.name,
                parent: `${subject.name} › ${unit.name} › ${chapter.name}`,
                path: `/${subject.slug}/${unit.slug}/${chapter.slug}/${topic.slug}`,
              });
            }
          });
        });
      });
    });

    return results;
  }, [filteredTree, normalizedQuery]);

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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
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
              placeholder="Search subjects, units, chapters, topics..."
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
            ) : searchResults.length === 0 ? (
              <NoResults query={searchQuery} />
            ) : (
              <div className="p-3">
                <p className="text-xs text-gray-500 mb-2 px-2">
                  {searchResults.length} result(s) found
                </p>

                <div className="space-y-1">
                  {searchResults.map((r, i) => (
                    <Link
                      key={i}
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
              </div>
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
