"use client";

import React, { lazy, Suspense } from "react";
import Link from "next/link";
import { FaBook, FaChartLine, FaTrophy } from "react-icons/fa";
import RichContent from "./RichContent";
import { createSlug } from "../lib/api";

// Lazy load DownloadButton - only needed for unit pages
const DownloadButton = lazy(() => import("./DownloadButton"));

const OverviewTab = ({
  content,
  entityType,
  entityName,
  unitName,
  unitsCount,
  definitions = [],
  subtopics = [],
  chapters = [],
  topics = [],
  units = [],
  subjectsWithUnits = [],
  examSlug,
  subjectSlug,
  unitSlug,
  chapterSlug,
  topicSlug,
  subTopicSlug,
  activeTab,
}) => {
  return (
    <div className="space-y-2 px-3 sm:px-4 py-3 sm:py-4">
      {/* Download Button - only for unit type */}
      {entityType === "unit" && unitName && (
        <div className="flex justify-end mb-2">
          <Suspense
            fallback={
              <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg" />
            }
          >
            <DownloadButton unitName={unitName} />
          </Suspense>
        </div>
      )}

      <div className="prose prose-sm sm:prose max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-normal prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-indigo-700 prose-pre:bg-gray-50">
        {content ? (
          <RichContent html={content} />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 text-center">
            <p className="text-gray-600 font-medium mb-2">
              No content available for this {entityType}.
            </p>
            <p className="text-sm text-gray-500">
              Content can be added from the admin panel.
            </p>
          </div>
        )}
      </div>

      {/* Subjects and Units Grid - only for exam type */}
      {entityType === "exam" &&
        subjectsWithUnits &&
        subjectsWithUnits.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-linear-to-r from-indigo-600 to-purple-600 rounded-full"></div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                Subjects & Units
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjectsWithUnits
                .filter((subject) => subject.units && subject.units.length > 0)
                .map((subject, subjectIndex) => {
                  const subjectSlugValue =
                    subject.slug || createSlug(subject.name);
                  const subjectUrl = examSlug
                    ? `/${examSlug}/${subjectSlugValue}`
                    : null;

                  return (
                    <div
                      key={subject._id || subjectIndex}
                      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col overflow-hidden"
                    >
                      {/* Subject Header */}
                      <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-3 py-2.5">
                        {subjectUrl ? (
                          <Link href={subjectUrl}>
                            <div className="flex items-center justify-between gap-2">
                              <h4
                                className="text-sm font-semibold text-white line-clamp-1 flex-1"
                                title={subject.name}
                              >
                                {subject.name}
                              </h4>
                              <span className="bg-white/25 text-white text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                {subject.units.length}
                              </span>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <h4
                              className="text-sm font-semibold text-white line-clamp-1 flex-1"
                              title={subject.name}
                            >
                              {subject.name}
                            </h4>
                            <span className="bg-white/25 text-white text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                              {subject.units.length}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Units List */}
                      <div className="flex-1 px-3 py-2 space-y-0.5">
                        {subject.units.map((unit, unitIndex) => {
                          const unitSlugValue =
                            unit.slug || createSlug(unit.name);
                          const unitUrl =
                            examSlug && subjectSlugValue
                              ? `/${examSlug}/${subjectSlugValue}/${unitSlugValue}`
                              : null;

                          return (
                            <div key={unit._id || unitIndex}>
                              {unitUrl ? (
                                <Link href={unitUrl}>
                                  <div className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-gray-50 transition-colors group/unit">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                                    <p
                                      className="text-sm font-medium text-gray-700 group-hover/unit:text-indigo-600 transition-colors line-clamp-1 flex-1"
                                      title={unit.name}
                                    >
                                      {unit.name}
                                    </p>
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-2 py-1.5 px-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"></div>
                                  <p
                                    className="text-sm font-medium text-gray-500 line-clamp-1"
                                    title={unit.name}
                                  >
                                    {unit.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      {/* Units Grid - only for subject type */}
      {entityType === "subject" && units && units.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Units
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {units.map((unit, unitIndex) => {
              const unitSlugValue = unit.slug || createSlug(unit.name);
              const unitUrl =
                examSlug && subjectSlug
                  ? `/${examSlug}/${subjectSlug}/${unitSlugValue}`
                  : null;

              const UnitCard = (
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                        title={unit.name}
                      >
                        {unit.name}
                      </h4>
                    </div>
                    {unitUrl && (
                      <div className="shrink-0">
                        <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                          <svg
                            className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );

              return unitUrl ? (
                <Link
                  key={unit._id || unitIndex}
                  href={unitUrl}
                  className="block"
                >
                  {UnitCard}
                </Link>
              ) : (
                <div key={unit._id || unitIndex}>{UnitCard}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject Stats - only for subject type (fallback if no units) */}
      {entityType === "subject" &&
        unitsCount !== undefined &&
        (!units || units.length === 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
              <FaBook className="text-blue-600 text-lg mb-1.5" />
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Units
              </h4>
              <p className="text-xs text-gray-600 font-medium">
                {unitsCount} Units
              </p>
            </div>
            <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
              <FaChartLine className="text-purple-600 text-lg mb-1.5" />
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Subject Overview
              </h4>
              <p className="text-xs text-gray-600">Explore all units</p>
            </div>
            <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
              <FaTrophy className="text-green-600 text-lg mb-1.5" />
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Study Resources
              </h4>
              <p className="text-xs text-gray-600">Access study materials</p>
            </div>
          </div>
        )}

      {/* SubTopics List - for topic type */}
      {entityType === "topic" && subtopics && subtopics.length > 0 && (
        <>
          <div className="mt-4">
            <div className="space-y-6">
              {subtopics.map((subTopic, index) => {
                const subTopicSlugValue =
                  subTopic.slug || createSlug(subTopic.name);
                const subTopicUrl =
                  examSlug &&
                  subjectSlug &&
                  unitSlug &&
                  chapterSlug &&
                  topicSlug
                    ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlug}/${subTopicSlugValue}`
                    : null;

                return (
                  <div key={subTopic._id || index} className="space-y-2">
                    {subTopicUrl ? (
                      <Link href={subTopicUrl} className="group/link">
                        <h3 className="text-lg sm:text-xl font-bold text-indigo-700 group-hover/link:text-indigo-500 group-hover/link:underline transition-all duration-200 cursor-pointer mb-2 inline-block">
                          {subTopic.name}
                        </h3>
                      </Link>
                    ) : (
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                        {subTopic.name}
                      </h3>
                    )}
                    {subTopic.content && (
                      <div className="prose prose-sm sm:prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-normal">
                        <RichContent
                          key={`subtopic-list-${
                            subTopic._id || index
                          }-${activeTab}`}
                          html={subTopic.content}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SubTopics Grid - for topic type */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Subtopics
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subtopics.map((subTopic, index) => {
                const subTopicSlugValue =
                  subTopic.slug || createSlug(subTopic.name);
                const subTopicUrl =
                  examSlug &&
                  subjectSlug &&
                  unitSlug &&
                  chapterSlug &&
                  topicSlug
                    ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlug}/${subTopicSlugValue}`
                    : null;

                const SubTopicCard = (
                  <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                          title={subTopic.name}
                        >
                          {subTopic.name}
                        </h4>
                      </div>
                      {subTopicUrl && (
                        <div className="shrink-0">
                          <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                            <svg
                              className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );

                return subTopicUrl ? (
                  <Link
                    key={subTopic._id || index}
                    href={subTopicUrl}
                    className="block"
                  >
                    {SubTopicCard}
                  </Link>
                ) : (
                  <div key={subTopic._id || index}>{SubTopicCard}</div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Chapters Grid - for unit type */}
      {entityType === "unit" && chapters && chapters.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Chapters
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {chapters.map((chapter, index) => {
              const chapterSlugValue = chapter.slug || createSlug(chapter.name);
              const chapterUrl =
                examSlug && subjectSlug && unitSlug
                  ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlugValue}`
                  : null;

              const ChapterCard = (
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                        title={chapter.name}
                      >
                        {chapter.name}
                      </h4>
                    </div>
                    {chapterUrl && (
                      <div className="shrink-0">
                        <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                          <svg
                            className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );

              return chapterUrl ? (
                <Link key={chapter._id || index} href={chapterUrl}>
                  {ChapterCard}
                </Link>
              ) : (
                <div key={chapter._id || index}>{ChapterCard}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topics Grid - for chapter type */}
      {entityType === "chapter" && topics && topics.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Topics
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topics.map((topic, index) => {
              const topicSlugValue = topic.slug || createSlug(topic.name);
              const topicUrl =
                examSlug && subjectSlug && unitSlug && chapterSlug
                  ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlugValue}`
                  : null;

              const TopicCard = (
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                        title={topic.name}
                      >
                        {topic.name}
                      </h4>
                    </div>
                    {topicUrl && (
                      <div className="shrink-0">
                        <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                          <svg
                            className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );

              return topicUrl ? (
                <Link
                  key={topic._id || index}
                  href={topicUrl}
                  className="block"
                >
                  {TopicCard}
                </Link>
              ) : (
                <div key={topic._id || index}>{TopicCard}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Definitions List - for subtopic type */}
      {entityType === "subtopic" && definitions && definitions.length > 0 && (
        <>
          <div className="mt-4">
            <div className="space-y-6">
              {definitions.map((definition, index) => {
                const definitionSlug =
                  definition.slug || createSlug(definition.name);
                const definitionUrl =
                  examSlug &&
                  subjectSlug &&
                  unitSlug &&
                  chapterSlug &&
                  topicSlug &&
                  subTopicSlug
                    ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlug}/${subTopicSlug}/${definitionSlug}`
                    : null;

                return (
                  <div key={definition._id || index} className="space-y-2">
                    {definitionUrl ? (
                      <Link href={definitionUrl} className="group/link">
                        <h3 className="text-lg sm:text-xl font-bold text-indigo-700 group-hover/link:text-indigo-500 group-hover/link:underline transition-all duration-200 cursor-pointer mb-2 inline-block">
                          {definition.name}
                        </h3>
                      </Link>
                    ) : (
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                        {definition.name}
                      </h3>
                    )}
                    {definition.content && (
                      <div className="prose prose-sm sm:prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-normal">
                        <RichContent html={definition.content} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Definitions Grid - for subtopic type */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Definitions
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {definitions.map((definition, index) => {
                const definitionSlug =
                  definition.slug || createSlug(definition.name);
                const definitionUrl =
                  examSlug &&
                  subjectSlug &&
                  unitSlug &&
                  chapterSlug &&
                  topicSlug &&
                  subTopicSlug
                    ? `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlug}/${subTopicSlug}/${definitionSlug}`
                    : null;

                const DefinitionCard = (
                  <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-lg border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200 transition-all duration-200 p-3 sm:p-3.5 group cursor-pointer">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-sm sm:text-base font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200"
                          title={definition.name}
                        >
                          {definition.name}
                        </h4>
                      </div>
                      {definitionUrl && (
                        <div className="shrink-0">
                          <div className="w-5 h-5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 flex items-center justify-center transition-colors duration-200">
                            <svg
                              className="w-3 h-3 text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all duration-200"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );

                return definitionUrl ? (
                  <Link
                    key={definition._id || index}
                    href={definitionUrl}
                    className="block"
                  >
                    {DefinitionCard}
                  </Link>
                ) : (
                  <div key={definition._id || index}>{DefinitionCard}</div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OverviewTab;
