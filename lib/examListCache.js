/**
 * Client-side cache for the exam list in Exam Management.
 * Persists across navigation (list → exam detail → back to list) so we don't refetch on return.
 * Single source of truth keyed by metaFilter; one API call, then reuse until invalidated.
 */

let cache = {
  exams: null,
  metaFilter: null,
};

export function getExamListCache(metaFilter) {
  if (cache.exams == null) return null;
  if (cache.metaFilter !== metaFilter) return null;
  return cache.exams;
}

export function setExamListCache(exams, metaFilter) {
  cache = {
    exams: Array.isArray(exams) ? exams : null,
    metaFilter: metaFilter ?? null,
  };
}

export function invalidateExamListCache() {
  cache = { exams: null, metaFilter: null };
}
