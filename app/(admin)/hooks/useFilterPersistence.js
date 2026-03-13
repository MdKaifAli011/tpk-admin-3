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
    const fromUrl = paramsToState(searchParams, defaults);
    const hasUrlParams = Array.from(searchParams.keys()).some((k) =>
      Object.prototype.hasOwnProperty.call(defaults, k)
    );
    if (hasUrlParams) return fromUrl;
    const stored = readStored();
    return stored;
  }, [searchParams, defaults, readStored]);

  const [state, setStateInternal] = useState(getInitialState);

  const isFirstPersist = useRef(true);

  // Sync from URL when searchParams change (e.g. browser back). Use ref for defaults
  // so we don't re-run when caller passes a new object literal each render.
  useEffect(() => {
    const def = defaultsRef.current;
    const fromUrl = paramsToState(searchParams, def);
    const hasUrlParams = Array.from(searchParams.keys()).some((k) =>
      Object.prototype.hasOwnProperty.call(def, k)
    );
    if (hasUrlParams) setStateInternal(fromUrl);
  }, [searchParams]);

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
    // Only replace URL when query would change (avoids sync loop) and pathname has no extra segment (list page)
    const pathSegments = pathname.split("/").filter(Boolean);
    const isListPath = pathSegments.length <= 2; // e.g. ["admin", "unit"] = list; ["admin", "unit", "id"] = detail
    if (newQuery !== currentQuery && isListPath) {
      const url = newQuery ? `${pathname}?${newQuery}` : pathname;
      router.replace(url, { scroll: false });
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
