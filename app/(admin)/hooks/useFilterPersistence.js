"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ADMIN_PAGINATION } from "@/constants";

const STORAGE_PREFIX = "admin-filter:";

/**
 * Serialize filter state to URL search params (only non-default values).
 * @param {Object} state - { page, limit, ...filterFields }
 * @param {Object} defaults - default values for each key
 */
function stateToParams(state, defaults = {}) {
  const params = new URLSearchParams();
  const merged = { ...defaults, ...state };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null) continue;
    const str = typeof value === "string" ? value : String(value);
    if (str === "" && (defaults[key] === "" || defaults[key] === undefined)) continue;
    if (defaults[key] !== undefined && String(defaults[key]) === str) continue;
    params.set(key, str);
  }
  return params;
}

/**
 * Parse URL search params into state object. Only includes keys that exist in defaults.
 */
function paramsToState(searchParams, defaults = {}) {
  const state = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const param = searchParams.get(key);
    if (param === null || param === undefined) continue;
    if (key === "page" || key === "limit") {
      const n = parseInt(param, 10);
      if (!Number.isNaN(n)) state[key] = n;
    } else {
      state[key] = param;
    }
  }
  return state;
}

/**
 * After `history.replaceState`, Next.js `useSearchParams()` can lag behind the real URL.
 * Reading `window.location.search` keeps filters (especially `searchQuery`) in sync and
 * avoids wiping state from stale RSC params.
 * @param {string} pathname — current route from `usePathname()`
 * @param {import("next/navigation").ReadonlyURLSearchParams | URLSearchParams} nextParams
 */
function getLiveUrlSearchParams(pathname, nextParams) {
  if (typeof window === "undefined") {
    return new URLSearchParams(nextParams.toString());
  }
  try {
    if (pathname && window.location.pathname === pathname) {
      return new URLSearchParams(window.location.search || "");
    }
  } catch (_) {}
  return new URLSearchParams(nextParams.toString());
}

/**
 * Persist filter + pagination state so it survives navigation.
 * - Restores from URL first, then sessionStorage, then defaults.
 * - On change: saves to sessionStorage and syncs URL (replace).
 *
 * @param {string} storageKey - e.g. "exam", "unit" -> sessionStorage key "admin-filter:exam"
 * @param {Object} defaultState - e.g. { page: 1, limit: 50, metaFilter: "all", searchQuery: "" }
 * @returns {[Object, Function]} [state, setState] - setState(partial) merges and persists
 */
export function useFilterPersistence(storageKey, defaultState = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const defaults = useMemo(
    () => ({
      page: 1,
      limit: ADMIN_PAGINATION.DEFAULT_PAGE_SIZE,
      ...defaultState,
    }),
    [defaultState]
  );

  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const readStored = useCallback(() => {
    const key = `${STORAGE_PREFIX}${storageKey}`;
    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaults, ...parsed };
      }
    } catch (_) {}
    return { ...defaults };
  }, [storageKey, defaults]);

  const getInitialState = useCallback(() => {
    const live = getLiveUrlSearchParams(pathnameRef.current, searchParams);
    const fromUrl = paramsToState(live, defaults);
    const hasUrlParams = [...live.keys()].some((k) =>
      Object.prototype.hasOwnProperty.call(defaults, k)
    );
    if (hasUrlParams) return fromUrl;
    const stored = readStored();
    return stored;
  }, [searchParams, defaults, readStored]);

  const [state, setStateInternal] = useState(getInitialState);

  const isFirstPersist = useRef(true);

  // Sync from real URL when Next searchParams change or path matches (replaceState-safe).
  useEffect(() => {
    const def = defaultsRef.current;
    const live = getLiveUrlSearchParams(pathname, searchParams);
    const fromUrl = paramsToState(live, def);
    const hasUrlParams = [...live.keys()].some((k) =>
      Object.prototype.hasOwnProperty.call(def, k)
    );
    if (hasUrlParams) setStateInternal(fromUrl);
  }, [searchParams, pathname]);

  // Browser back/forward: `useSearchParams` may not update the same frame as `popstate`.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const def = defaultsRef.current;
      const live = new URLSearchParams(window.location.search || "");
      const fromUrl = paramsToState(live, def);
      const hasUrlParams = [...live.keys()].some((k) =>
        Object.prototype.hasOwnProperty.call(def, k)
      );
      if (hasUrlParams) setStateInternal(fromUrl);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Persist state to storage + URL after commit (never during render).
  // Only call router.replace when the URL would actually change to avoid loops,
  // and only when we're still on the list path (so we don't overwrite a detail URL).
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    if (isFirstPersist.current) {
      isFirstPersist.current = false;
      return;
    }
    const def = defaultsRef.current;
    const newQuery = stateToParams(state, def).toString();
    const currentQuery = searchParamsString;
    // Always save to sessionStorage so filters survive navigation
    const key = `${STORAGE_PREFIX}${storageKey}`;
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(key, JSON.stringify(state));
      }
    } catch (_) {}
    // Only sync URL when query would change (avoids sync loop) and pathname has no extra segment (list page)
    const pathSegments = pathname.split("/").filter(Boolean);
    const isListPath = pathSegments.length <= 2; // e.g. ["admin", "unit"] = list; ["admin", "unit", "id"] = detail
    if (newQuery !== currentQuery && isListPath) {
      const url = newQuery ? `${pathname}?${newQuery}` : pathname;
      // Use history.replaceState to avoid triggering an App Router navigation request (_rsc)
      // on every debounced filter change. This removes noisy "Fetch failed loading ...?_rsc=..."
      // logs while keeping URL in sync.
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", url);
      } else {
        router.replace(url, { scroll: false });
      }
    }
  }, [state, pathname, router, storageKey, searchParamsString]);

  const setState = useCallback((partial) => {
    setStateInternal((prev) => {
      return typeof partial === "function" ? partial(prev) : { ...prev, ...partial };
    });
  }, []);

  return [state, setState];
}

export default useFilterPersistence;
