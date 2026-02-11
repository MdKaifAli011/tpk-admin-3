/**
 * Client-side cache for the topic list in Topic Management.
 * Persists across navigation (list → topic detail → back to list) so we don't refetch on return.
 * Single source of truth keyed by metaFilter; one API call, then reuse until invalidated.
 */

let cache = {
  topics: null,
  metaFilter: null,
};

export function getTopicListCache(metaFilter) {
  if (cache.topics == null) return null;
  if (cache.metaFilter !== metaFilter) return null;
  return cache.topics;
}

export function setTopicListCache(topics, metaFilter) {
  cache = {
    topics: Array.isArray(topics) ? topics : null,
    metaFilter: metaFilter ?? null,
  };
}

export function invalidateTopicListCache() {
  cache = { topics: null, metaFilter: null };
}
