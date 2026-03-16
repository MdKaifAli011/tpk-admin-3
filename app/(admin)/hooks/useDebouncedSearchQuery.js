"use client";

import { useState, useEffect, useRef } from "react";

const DEBOUNCE_MS = 400;

/**
 * Debounces search input so we don't update URL/filter state on every keystroke.
 * - Input is controlled by local state (instant typing).
 * - Filter state (and thus URL + API) updates after user stops typing.
 * Reduces RSC/page fetches when search is in the URL.
 *
 * @param {string} committedSearchQuery - current searchQuery from filter state (URL)
 * @param {Function} setFilterState - (partial) => void
 * @returns {[string, Function]} [searchInput, setSearchInput] for the input
 */
export function useDebouncedSearchQuery(committedSearchQuery, setFilterState) {
  const [searchInput, setSearchInput] = useState(() => committedSearchQuery ?? "");
  const timeoutRef = useRef(null);

  // Only sync when filters are cleared (e.g. user clicked Clear). Do NOT sync on every
  // committedSearchQuery change, or we'd overwrite the input with trimmed/stale value while typing.
  useEffect(() => {
    if ((committedSearchQuery ?? "") === "") {
      setSearchInput("");
    }
  }, [committedSearchQuery]);

  // Debounce: when user stops typing, commit trimmed value to filter state (URL + API)
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
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

export default useDebouncedSearchQuery;
