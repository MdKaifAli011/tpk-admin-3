"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getFormPlaceholderCandidates } from "../utils/formPlaceholderImage";

/**
 * Progressive img onError: tries each candidate URL in order (exam-specific → defaults).
 * @param {string} pathname - from usePathname()
 * @param {string} basePath
 * @param {{ variant?: 'default' | 'course' | 'discussion', examSlug?: string }} options
 */
export function useFormPlaceholderImage(pathname, basePath, options = {}) {
  const variant = options.variant ?? "default";
  const examSlug = options.examSlug;

  const candidates = useMemo(
    () => getFormPlaceholderCandidates(pathname, basePath, { variant, examSlug }),
    [pathname, basePath, variant, examSlug]
  );

  const chainKey = candidates.join("|");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [chainKey]);

  const src = candidates[Math.min(index, Math.max(0, candidates.length - 1))];

  const onError = useCallback(() => {
    setIndex((i) => Math.min(i + 1, candidates.length - 1));
  }, [candidates.length]);

  return { src, onError, candidates };
}
