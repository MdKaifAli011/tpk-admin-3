"use client";

import React, { memo, useRef, useEffect } from "react";
import Link from "next/link";
import { FaChevronDown } from "react-icons/fa";
import TextEllipsis from "./TextEllipsis";
import Collapsible from "./Collapsible";
import loadMathJax from "@/app/(main)/lib/utils/mathJaxLoader";

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Decode HTML entities so &#178; &sup2; etc. render as ² ³ */
function decodeHtmlEntities(str) {
  if (!str || typeof str !== "string") return str;
  return str
    .replace(/&sup2;/gi, "²")
    .replace(/&sup3;/gi, "³")
    .replace(/&#178;/g, "²")
    .replace(/&#179;/g, "³")
    .replace(/&#8308;/g, "⁴")
    .replace(/&#8309;/g, "⁵")
    .replace(/&#8310;/g, "⁶")
    .replace(/&#8311;/g, "⁷")
    .replace(/&#8312;/g, "⁸")
    .replace(/&#8313;/g, "⁹")
    .replace(/&#(\d+);/g, (_, num) => {
      const n = parseInt(num, 10);
      return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = parseInt(hex, 16);
      return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    });
}

/** Convert LaTeX-style ^2 ^3 to Unicode superscripts so "Sp^2" shows as "Sp²" */
function latexSuperscriptToUnicode(str) {
  if (!str || typeof str !== "string") return str;
  return str.replace(/\^([0-9])/g, (_, d) => SUPERSCRIPT_DIGITS[parseInt(d, 10)] ?? `^${d}`);
}

/** Force sidebar labels to use inline math and render special chars (entities, ^n). */
function labelForSidebar(name) {
  if (name == null) return "";
  let s = String(name);
  s = decodeHtmlEntities(s);
  s = latexSuperscriptToUnicode(s);
  return s.replace(/\\\[/g, "\\(").replace(/\\\]/g, "\\)");
}

const SidebarNavigationTree = memo(function SidebarNavigationTree({
  tree,
  activeExamSlug,
  closeOnMobile,
  openSubjectId,
  openUnitId,
  openChapterId,
  toggleSubject,
  toggleUnit,
  toggleChapter,
  subjectSlugFromPath,
  unitSlugFromPath,
  chapterSlugFromPath,
  topicSlugFromPath,
  activeItemRef,
}) {
  const containerRef = useRef(null);

  // Typeset math/LaTeX in sidebar labels when tree or path changes
  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;
    const el = containerRef.current;
    const id = requestAnimationFrame(() => {
      loadMathJax()
        .then((MathJaxInstance) => {
          if (MathJaxInstance?.Hub && el) {
            MathJaxInstance.Hub.Queue(["Typeset", MathJaxInstance.Hub, el]);
          }
        })
        .catch((err) => {
          if (process.env.NODE_ENV === "development") {
            console.warn("Sidebar MathJax load error:", err);
          }
        });
    });
    return () => cancelAnimationFrame(id);
  }, [tree, subjectSlugFromPath, unitSlugFromPath, chapterSlugFromPath, topicSlugFromPath]);

  return (
    <div ref={containerRef} className="space-y-1">
      {tree.map((subject) => {
        const isActive = subject.slug === subjectSlugFromPath;
        const isOpen = openSubjectId === subject.id;
        const subjectHref = activeExamSlug ? `/${activeExamSlug}/${subject.slug}` : "#";

        return (
          <div key={subject.id} ref={isActive ? activeItemRef : null}>
            {/* SUBJECT */}
            <div
              className={`
                flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer 
                transition-all duration-200 group
                ${isActive
                  ? "bg-indigo-100/60 shadow-sm text-indigo-900 font-semibold"
                  : isOpen
                    ? "bg-indigo-50/40 text-indigo-800 font-medium"
                    : "text-slate-800 hover:bg-slate-50 font-medium"
                }
              `}
            >
              <Link
                href={subjectHref}
                onClick={closeOnMobile}
                title={typeof subject.name === "string" ? subject.name : undefined}
                className="flex-1 overflow-hidden text-left cursor-pointer hover:opacity-80 transition-opacity pr-2 min-w-0"
              >
                <TextEllipsis
                  maxW="max-w-full"
                  fontSize="text-[15px]"
                >
                  <span className="sidebar-label-text">{labelForSidebar(subject.name)}</span>
                </TextEllipsis>
              </Link>

              {subject.units?.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSubject(subject.id);
                  }}
                  className="flex-shrink-0 p-1 ml-1 cursor-pointer hover:opacity-70 transition-opacity"
                  aria-label={isOpen ? "Collapse subject" : "Expand subject"}
                >
                  <FaChevronDown
                    className={`
                      h-3.5 w-3.5 transition-transform duration-200 flex-shrink-0
                      ${isOpen ? "rotate-180" : ""}
                      ${isActive ? "text-indigo-600" : "text-slate-400"}
                    `}
                  />
                </button>
              )}
            </div>

            {/* SUBJECT → UNITS */}
            <Collapsible isOpen={isOpen}>
              <div className="pl-3 pt-1 space-y-1">
                {subject.units?.map((unit) => {
                  const isUnitActive =
                    isActive && unit.slug === unitSlugFromPath;
                  const isUnitOpen = openUnitId === unit.id;

                  return (
                    <div
                      key={unit.id}
                      ref={isUnitActive ? activeItemRef : null}
                    >
                      {/* UNIT */}
                      <div
                        className={`
                          flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer
                          transition-all duration-200
                          ${isUnitActive
                            ? "bg-emerald-100/50 text-emerald-800 font-medium shadow-sm"
                            : isUnitOpen
                              ? "bg-emerald-50/40 text-emerald-700 font-medium"
                              : "text-emerald-700 hover:bg-emerald-50 font-normal"
                          }
                        `}
                      >
                        <Link
                          href={activeExamSlug ? `/${activeExamSlug}/${subject.slug}/${unit.slug}` : "#"}
                          onClick={closeOnMobile}
                          title={typeof unit.name === "string" ? unit.name : undefined}
                          className="flex-1 overflow-hidden text-left cursor-pointer hover:opacity-80 transition-opacity pr-2 min-w-0"
                        >
                          <TextEllipsis
                            maxW="max-w-full"
                            fontSize="text-sm"
                          >
                            <span className="sidebar-label-text">{labelForSidebar(unit.name)}</span>
                          </TextEllipsis>
                        </Link>

                        {unit.chapters?.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleUnit(unit.id, subject.id);
                            }}
                            className="flex-shrink-0 p-1 ml-1 cursor-pointer hover:opacity-70 transition-opacity"
                            aria-label={isUnitOpen ? "Collapse unit" : "Expand unit"}
                          >
                            <FaChevronDown
                              className={`
                                h-3 w-3 transition-transform duration-200 flex-shrink-0
                                ${isUnitOpen ? "rotate-180" : ""}
                                ${isUnitActive ? "text-emerald-700" : "text-emerald-400"}
                              `}
                            />
                          </button>
                        )}
                      </div>

                      {/* UNIT → CHAPTERS */}
                      <Collapsible isOpen={isUnitOpen}>
                        <div className="pl-3 pt-1 space-y-1">
                          {unit.chapters?.map((chapter) => {
                            const isChapterActive =
                              isUnitActive &&
                              chapter.slug === chapterSlugFromPath;
                            const isChapterOpen =
                              openChapterId === chapter.id;

                            return (
                              <div
                                key={chapter.id}
                                ref={isChapterActive ? activeItemRef : null}
                              >
                                {/* CHAPTER */}
                                <div
                                  className={`
                                    flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer
                                    transition-all duration-200
                                    ${isChapterActive
                                      ? "bg-indigo-100/50 text-indigo-800 font-medium shadow-sm"
                                      : isChapterOpen
                                        ? "bg-indigo-50/40 text-indigo-700 font-medium"
                                        : "text-indigo-700 hover:bg-indigo-50 font-normal"
                                    }
                                  `}
                                >
                                  <Link
                                    href={activeExamSlug ? `/${activeExamSlug}/${subject.slug}/${unit.slug}/${chapter.slug}` : "#"}
                                    onClick={closeOnMobile}
                                    title={typeof chapter.name === "string" ? chapter.name : undefined}
                                    className="flex-1 overflow-hidden text-left cursor-pointer hover:opacity-80 transition-opacity pr-2 min-w-0"
                                  >
                                    <TextEllipsis
                                      maxW="max-w-full"
                                      fontSize="text-sm"
                                    >
                                      <span className="sidebar-label-text">{labelForSidebar(chapter.name)}</span>
                                    </TextEllipsis>
                                  </Link>

                                  {chapter.topics?.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleChapter(
                                          chapter.id,
                                          subject.id,
                                          unit.id
                                        );
                                      }}
                                      className="flex-shrink-0 p-1 ml-1 cursor-pointer hover:opacity-70 transition-opacity"
                                      aria-label={isChapterOpen ? "Collapse chapter" : "Expand chapter"}
                                    >
                                      <FaChevronDown
                                        className={`
                                          h-3 w-3 transition-transform duration-200 flex-shrink-0
                                          ${isChapterOpen ? "rotate-180" : ""}
                                          ${isChapterActive
                                            ? "text-indigo-700"
                                            : "text-indigo-400"
                                          }
                                        `}
                                      />
                                    </button>
                                  )}
                                </div>

                                {/* CHAPTER → TOPICS */}
                                <Collapsible isOpen={isChapterOpen}>
                                  <div className="pl-3 pt-1 space-y-0.5">
                                    {chapter.topics?.map((topic) => {
                                      const isTopicActive =
                                        isChapterActive &&
                                        topic.slug === topicSlugFromPath;
                                      const topicHref = activeExamSlug
                                        ? `/${activeExamSlug}/${subject.slug}/${unit.slug}/${chapter.slug}/${topic.slug}`
                                        : "#";

                                      return (
                                        <Link
                                          key={topic.id}
                                          ref={
                                            isTopicActive ? activeItemRef : null
                                          }
                                          href={topicHref}
                                          onClick={closeOnMobile}
                                          title={typeof topic.name === "string" ? topic.name : undefined}
                                          className={`
                                            block w-full text-left px-2 py-1.5 rounded-md
                                            transition-all duration-200 truncate cursor-pointer
                                            hover:opacity-80
                                            ${isTopicActive
                                              ? "bg-rose-100/60 text-rose-700 font-medium shadow-sm"
                                              : "text-rose-700 hover:bg-rose-50 font-normal"
                                            }
                                          `}
                                        >
                                          <TextEllipsis maxW="max-w-full">
                                            <span className="sidebar-label-text">{labelForSidebar(topic.name)}</span>
                                          </TextEllipsis>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                </Collapsible>
                              </div>
                            );
                          })}
                        </div>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
});

SidebarNavigationTree.displayName = "SidebarNavigationTree";

export default SidebarNavigationTree;
