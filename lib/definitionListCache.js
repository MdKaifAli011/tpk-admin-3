/**
 * Client-side cache for the definition list in Definition Management.
 * Persists across navigation (list → definition detail → back to list) so we don't refetch on return.
 * Single source of truth keyed by metaFilter; one API call, then reuse until invalidated.
 */

let cache = {
  definitions: null,
  metaFilter: null,
};

export function getDefinitionListCache(metaFilter) {
  if (cache.definitions == null) return null;
  if (cache.metaFilter !== metaFilter) return null;
  return cache.definitions;
}

export function setDefinitionListCache(definitions, metaFilter) {
  cache = {
    definitions: Array.isArray(definitions) ? definitions : null,
    metaFilter: metaFilter ?? null,
  };
}

export function invalidateDefinitionListCache() {
  cache = { definitions: null, metaFilter: null };
}
