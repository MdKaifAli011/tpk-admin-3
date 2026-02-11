/**
 * Client-side cache for the chapter list in Chapter Management.
 * Persists across navigation (list → chapter detail → back to list) so we don't refetch on return.
 * Single source of truth keyed by metaFilter; one API call, then reuse until invalidated.
 */

let cache = {
  chapters: null,
  metaFilter: null,
};

export function getChapterListCache(metaFilter) {
  if (cache.chapters == null) return null;
  if (cache.metaFilter !== metaFilter) return null;
  return cache.chapters;
}

export function setChapterListCache(chapters, metaFilter) {
  cache = {
    chapters: Array.isArray(chapters) ? chapters : null,
    metaFilter: metaFilter ?? null,
  };
}

export function invalidateChapterListCache() {
  cache = { chapters: null, metaFilter: null };
}
