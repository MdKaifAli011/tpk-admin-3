"use client";

import { useState, useEffect, useRef } from "react";

/** Delay (ms) after last keystroke before committing search and triggering API. */
const DEBOUNCE_MS = 500;

/**
 * Debounces search input so we don't update URL/filter state on every keystroke.
 * - Input is controlled by local state (instant typing).
 * - Filter state (and thus URL + API) updates only after user stops typing for DEBOUNCE_MS.
 * Reduces API calls and avoids "instant searching" / flicker.
 *
 * @param {string} committedSearchQuery - current searchQuery from filter state (URL)
 * @param {Function} setFilterState - (partial) => void
 * @returns {[string, Function]} [searchInput, setSearchInput] for the input
 */
export function useDebouncedSearchQuery(committedSearchQuery, setFilterState) {
  const [searchInput, setSearchInput] = useState(() => committedSearchQuery ?? "");
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Sync input when filters are cleared externally (e.g. user clicked Clear)
  useEffect(() => {
    if ((committedSearchQuery ?? "") === "") {
      setSearchInput("");
    }
  }, [committedSearchQuery]);

  // Debounce: commit to filter state only after user stops typing for DEBOUNCE_MS
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (!isMountedRef.current) return;
      const trimmed = (searchInput ?? "").trim();
      setFilterState((prev) => {
        const prevTrimmed = (prev.searchQuery ?? "").trim();
        if (prevTrimmed === trimmed) return prev;
        return { ...prev, searchQuery: trimmed, page: 1 };
      });
    }, DEBOUNCE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [searchInput, setFilterState]);

  return [searchInput, setSearchInput];
}

export { DEBOUNCE_MS };

export default useDebouncedSearchQuery;
