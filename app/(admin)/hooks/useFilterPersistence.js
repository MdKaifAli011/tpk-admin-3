"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { ADMIN_PAGINATION } from "@/constants";

const STORAGE_PREFIX = "admin-filter:";

/** basePath from next.config — usePathname() excludes it; window.location includes it. */
const APP_BASE_PATH =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_BASE_PATH &&
    String(process.env.NEXT_PUBLIC_BASE_PATH).trim().replace(/\/$/, "")) ||
  "/self-study";

/** Full browser path (with basePath) for history.replaceState. */
function toFullPathname(routerPathname) {
  const p = routerPathname.startsWith("/") ? routerPathname : `/${routerPathname}`;
  if (!APP_BASE_PATH) return p;
  if (typeof window !== "undefined") {
    const loc = window.location.pathname || "";
    if (loc !== APP_BASE_PATH && !loc.startsWith(`${APP_BASE_PATH}/`)) return p;
  }
  return `${APP_BASE_PATH}${p}`;
}

function stateToParams(state, defaults = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...defaults, ...state })) {
    if (value === undefined || value === null) continue;
    const str = typeof value === "string" ? value : String(value);
    if (str === "" && (defaults[key] === "" || defaults[key] === undefined)) continue;
    if (defaults[key] !== undefined && String(defaults[key]) === str) continue;
    params.set(key, str);
  }
  return params;
}

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

function shallowEqual(a, b) {
  const ka = Object.keys(a || {});
  const kb = Object.keys(b || {});
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

/**
 * Persist filter + pagination state via URL + sessionStorage.
 *
 * `searchQuery` is intentionally ephemeral — it is restored from the URL
 * (including browser back/forward) but NEVER from sessionStorage.
 * This prevents a search performed on one management page from leaking into another.
 *
 * @param {string} storageKey  e.g. "exam", "subject", "topic"
 * @param {Object} defaultState  e.g. { metaFilter: "all", searchQuery: "" }
 */
export function useFilterPersistence(storageKey, defaultState = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaults = useMemo(
    () => ({ page: 1, limit: ADMIN_PAGINATION.DEFAULT_PAGE_SIZE, ...defaultState }),
    [storageKey]
  );

  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  /* ---------- initial state ---------- */
  const [state, setStateInternal] = useState(() => {
    const fromUrl = paramsToState(searchParams, defaults);
    const hasUrlParams = [...searchParams.keys()].some((k) =>
      Object.prototype.hasOwnProperty.call(defaults, k)
    );
    if (hasUrlParams) return fromUrl;

    const sKey = `${STORAGE_PREFIX}${storageKey}`;
    try {
      const raw =
        typeof window !== "undefined" ? sessionStorage.getItem(sKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaults, ...parsed, searchQuery: defaults.searchQuery ?? "" };
      }
    } catch (_) {}

    return { ...defaults };
  });

  /* ---------- persist state → storage + URL ---------- */
  const isFirstSync = useRef(true);

  useEffect(() => {
    const def = defaultsRef.current;
    const pathSegments = pathname.split("/").filter(Boolean);
    const isListPath = pathSegments.length <= 2;

    if (isFirstSync.current) {
      isFirstSync.current = false;
      if (isListPath && typeof window !== "undefined") {
        const newQ = stateToParams(state, def).toString();
        const curQ = new URLSearchParams(window.location.search || "").toString();
        if (newQ !== curQ) {
          const base = toFullPathname(pathname);
          window.history.replaceState(null, "", newQ ? `${base}?${newQ}` : base);
        }
      }
      return;
    }

    const sKey = `${STORAGE_PREFIX}${storageKey}`;
    try {
      if (typeof window !== "undefined") {
        const toStore = { ...state };
        delete toStore.searchQuery;
        sessionStorage.setItem(sKey, JSON.stringify(toStore));
      }
    } catch (_) {}

    if (!isListPath || typeof window === "undefined") return;

    const newQ = stateToParams(state, def).toString();
    const curQ = new URLSearchParams(window.location.search || "").toString();
    if (newQ !== curQ) {
      const base = toFullPathname(pathname);
      window.history.replaceState(null, "", newQ ? `${base}?${newQ}` : base);
    }
  }, [state, pathname, storageKey]);

  /* ---------- browser back / forward ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const def = defaultsRef.current;
      const live = new URLSearchParams(window.location.search || "");
      const fromUrl = paramsToState(live, def);
      setStateInternal((prev) => (shallowEqual(prev, fromUrl) ? prev : fromUrl));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ---------- public setter ---------- */
  const setState = useCallback((partial) => {
    setStateInternal((prev) =>
      typeof partial === "function" ? partial(prev) : { ...prev, ...partial }
    );
  }, []);

  return [state, setState];
}

export default useFilterPersistence;
