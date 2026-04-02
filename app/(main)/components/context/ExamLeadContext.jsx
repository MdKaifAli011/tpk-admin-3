"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { fetchExamById } from "@/app/(main)/lib/api";

const ExamLeadContext = createContext(null);

const examCache = new Map();

function formatSlugAsLabel(slug) {
  if (!slug || typeof slug !== "string") return "";
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Wraps all `[exam]/*` routes. Resolves canonical exam name for Lead.prepared (and similar).
 */
export function ExamLeadProvider({ children }) {
  const params = useParams();
  const examSlug = params?.exam != null ? String(params.exam).trim() : "";
  const [resolvedName, setResolvedName] = useState("");

  useEffect(() => {
    if (!examSlug) {
      setResolvedName("");
      return;
    }
    if (examCache.has(examSlug)) {
      const cached = examCache.get(examSlug);
      const name = cached?.name != null ? String(cached.name).trim() : "";
      setResolvedName(name);
      return;
    }
    let cancelled = false;
    fetchExamById(examSlug)
      .then((exam) => {
        if (cancelled) return;
        if (exam) examCache.set(examSlug, exam);
        const name = exam?.name != null ? String(exam.name).trim() : "";
        setResolvedName(name);
      })
      .catch(() => {
        if (!cancelled) setResolvedName("");
      });
    return () => {
      cancelled = true;
    };
  }, [examSlug]);

  const value = useMemo(() => {
    const fallback = examSlug ? formatSlugAsLabel(examSlug) : "";
    const examName = resolvedName || fallback;
    return {
      examSlug,
      examName,
      /** Prefer for `prepared` on leads / registrations under this exam tree */
      preparedDefault: examName,
    };
  }, [examSlug, resolvedName]);

  return (
    <ExamLeadContext.Provider value={value}>{children}</ExamLeadContext.Provider>
  );
}

export function useExamLeadContext() {
  return useContext(ExamLeadContext);
}

/** Safe on non-exam routes (e.g. /contact): returns `""`. */
export function useExamPreparedDefault() {
  const ctx = useContext(ExamLeadContext);
  return ctx?.preparedDefault ?? "";
}
