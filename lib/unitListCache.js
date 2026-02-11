/**
 * Client-side cache for the unit list in Unit Management.
 * Persists across navigation (list → unit detail → back to list) so we don't refetch on return.
 * Single source of truth keyed by metaFilter; one API call, then reuse until invalidated.
 */

let cache = {
  units: null,
  metaFilter: null,
};

export function getUnitListCache(metaFilter) {
  if (cache.units == null) return null;
  if (cache.metaFilter !== metaFilter) return null;
  return cache.units;
}

export function setUnitListCache(units, metaFilter) {
  cache = {
    units: Array.isArray(units) ? units : null,
    metaFilter: metaFilter ?? null,
  };
}

export function invalidateUnitListCache() {
  cache = { units: null, metaFilter: null };
}
