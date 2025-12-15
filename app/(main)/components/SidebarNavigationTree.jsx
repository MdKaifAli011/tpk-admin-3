"use client";

import React from "react";
import { FaChevronDown } from "react-icons/fa";
import TextEllipsis from "./TextEllipsis";
import Collapsible from "./Collapsible";

const SidebarNavigationTree = ({
  tree,
  navigateTo,
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
}) => {
  return (
    <div className="space-y-1">
      {tree.map((subject) => {
        const isActive = subject.slug === subjectSlugFromPath;
        const isOpen = openSubjectId === subject.id;

        return (
          <div key={subject.id} ref={isActive ? activeItemRef : null}>
            {/* SUBJECT */}
            <div
              className={`
              flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer 
              transition-all duration-200 group
              ${isActive
                ? "bg-indigo-100/60 shadow-sm text-indigo-900 font-semibold"
                : isOpen
                ? "bg-indigo-50/40 text-indigo-800 font-medium"
                : "text-slate-800 hover:bg-slate-50 font-medium"
              }
            `}
            >
              <button
                onClick={() => navigateTo([subject.slug])}
                className="flex-1 overflow-hidden text-left cursor-pointer hover:opacity-80 transition-opacity"
              >
                <TextEllipsis
                  maxW="max-w-full"
                  fontSize="text-[15px]"
                >
                  {subject.name}
                </TextEllipsis>
              </button>

              {subject.units?.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSubject(subject.id);
                  }}
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <FaChevronDown
                    className={`
                      h-3 w-3 transition-transform duration-200
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
                          flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer
                          transition-all duration-200
                          ${isUnitActive
                            ? "bg-emerald-100/50 text-emerald-800 font-medium shadow-sm"
                            : isUnitOpen
                            ? "bg-emerald-50/40 text-emerald-700 font-medium"
                            : "text-emerald-700 hover:bg-emerald-50 font-normal"
                          }
                        `}
                      >
                        <button
                          onClick={() =>
                            navigateTo([subject.slug, unit.slug])
                          }
                          className="flex-1 overflow-hidden text-left cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <TextEllipsis
                            maxW="max-w-full"
                            fontSize="text-sm"
                          >
                            {unit.name}
                          </TextEllipsis>
                        </button>

                        {unit.chapters?.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleUnit(unit.id, subject.id);
                            }}
                            className="cursor-pointer hover:opacity-70 transition-opacity"
                          >
                            <FaChevronDown
                              className={`
                                h-3 w-3 transition-transform duration-200
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
                                flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer
                                transition-all duration-200
                                ${isChapterActive
                                  ? "bg-indigo-100/50 text-indigo-800 font-medium shadow-sm"
                                  : isChapterOpen
                                  ? "bg-indigo-50/40 text-indigo-700 font-medium"
                                  : "text-indigo-700 hover:bg-indigo-50 font-normal"
                                }
                              `}
                                >
                                  <button
                                    onClick={() =>
                                      navigateTo([
                                        subject.slug,
                                        unit.slug,
                                        chapter.slug,
                                      ])
                                    }
                                    className="flex-1 overflow-hidden text-left cursor-pointer hover:opacity-80 transition-opacity"
                                  >
                                    <TextEllipsis
                                      maxW="max-w-full"
                                      fontSize="text-sm"
                                    >
                                      {chapter.name}
                                    </TextEllipsis>
                                  </button>

                                  {chapter.topics?.length > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleChapter(
                                          chapter.id,
                                          subject.id,
                                          unit.id
                                        );
                                      }}
                                      className="cursor-pointer hover:opacity-70 transition-opacity"
                                    >
                                      <FaChevronDown
                                        className={`
                                      h-3 w-3 transition-transform duration-200
                                      ${isChapterOpen ? "rotate-180" : ""}
                                      ${
                                        isChapterActive
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

                                      return (
                                        <button
                                          key={topic.id}
                                          ref={
                                            isTopicActive ? activeItemRef : null
                                          }
                                          onClick={() =>
                                            navigateTo([
                                              subject.slug,
                                              unit.slug,
                                              chapter.slug,
                                              topic.slug,
                                            ])
                                          }
                                          className={`
                                        w-full text-left px-2 py-1.5 rounded-md
                                        transition-all duration-200 truncate cursor-pointer
                                        hover:opacity-80
                                        ${
                                          isTopicActive
                                            ? "bg-rose-100/60 text-rose-700 font-medium shadow-sm"
                                            : "text-rose-700 hover:bg-rose-50 font-normal"
                                        }
                                      `}
                                        >
                                          <TextEllipsis maxW="max-w-full">
                                            {topic.name}
                                          </TextEllipsis>
                                        </button>
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
};

export default SidebarNavigationTree;
