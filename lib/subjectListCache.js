/**
 * Client-side cache for the subject list in Subject Management.
 * Persists across navigation (list → subject detail → back to list) so we don't refetch on return.
 * Single source of truth keyed by metaFilter; one API call, then reuse until invalidated.
 */

let cache = {
  subjects: null,
  metaFilter: null,
};

export function getSubjectListCache(metaFilter) {
  if (cache.subjects == null) return null;
  if (cache.metaFilter !== metaFilter) return null;
  return cache.subjects;
}

export function setSubjectListCache(subjects, metaFilter) {
  cache = {
    subjects: Array.isArray(subjects) ? subjects : null,
    metaFilter: metaFilter ?? null,
  };
}

export function invalidateSubjectListCache() {
  cache = { subjects: null, metaFilter: null };
}
