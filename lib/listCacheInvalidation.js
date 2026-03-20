/**
 * Central list cache invalidation for admin hierarchy.
 * Call after any mutation so lists refetch and show fresh data.
 */

import { invalidateExamListCache } from "@/lib/examListCache";
import { invalidateSubjectListCache } from "@/lib/subjectListCache";
import { invalidateUnitListCache } from "@/lib/unitListCache";
import { invalidateChapterListCache } from "@/lib/chapterListCache";
import { invalidateTopicListCache } from "@/lib/topicListCache";
import { invalidateSubTopicListCache } from "@/lib/subTopicListCache";
import { invalidateDefinitionListCache } from "@/lib/definitionListCache";

/**
 * Invalidate all hierarchy list caches (exam → subject → … → definition).
 * Use after bulk or cross-level changes so every list refetches when opened.
 */
export function invalidateAllListCaches() {
  invalidateExamListCache();
  invalidateSubjectListCache();
  invalidateUnitListCache();
  invalidateChapterListCache();
  invalidateTopicListCache();
  invalidateSubTopicListCache();
  invalidateDefinitionListCache();
}

/**
 * Invalidate list cache for this level and all child levels.
 * e.g. "exam" invalidates exam, subject, unit, chapter, topic, subtopic, definition.
 */
export function invalidateListCachesFrom(level) {
  const levels = [
    "exam",
    "subject",
    "unit",
    "chapter",
    "topic",
    "subtopic",
    "definition",
  ];
  const start = levels.indexOf(level);
  if (start === -1) {
    invalidateAllListCaches();
    return;
  }
  if (start <= 0) invalidateExamListCache();
  if (start <= 1) invalidateSubjectListCache();
  if (start <= 2) invalidateUnitListCache();
  if (start <= 3) invalidateChapterListCache();
  if (start <= 4) invalidateTopicListCache();
  if (start <= 5) invalidateSubTopicListCache();
  if (start <= 6) invalidateDefinitionListCache();
}

export {
  invalidateExamListCache,
  invalidateSubjectListCache,
  invalidateUnitListCache,
  invalidateChapterListCache,
  invalidateTopicListCache,
  invalidateSubTopicListCache,
  invalidateDefinitionListCache,
};
