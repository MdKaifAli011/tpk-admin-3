/**
 * Client-side cache for the subtopic list in SubTopic Management.
 * Persists across navigation (list → subtopic detail → back to list) so we don't refetch on return.
 * Single source of truth keyed by metaFilter; one API call, then reuse until invalidated.
 */

let cache = {
  subTopics: null,
  metaFilter: null,
};

export function getSubTopicListCache(metaFilter) {
  if (cache.subTopics == null) return null;
  if (cache.metaFilter !== metaFilter) return null;
  return cache.subTopics;
}

export function setSubTopicListCache(subTopics, metaFilter) {
  cache = {
    subTopics: Array.isArray(subTopics) ? subTopics : null,
    metaFilter: metaFilter ?? null,
  };
}

export function invalidateSubTopicListCache() {
  cache = { subTopics: null, metaFilter: null };
}
