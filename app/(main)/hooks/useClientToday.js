"use client";

import { useState, useEffect } from "react";

/**
 * Returns the user's current date from their system (client-only).
 * Updates every minute and when the tab becomes visible so day count
 * and time estimates stay correct (e.g. after midnight).
 * @returns {Date | null} Today's date in user's timezone, or null before mount (SSR).
 */
export function useClientToday() {
  const [today, setToday] = useState(null);

  useEffect(() => {
    const update = () => {
      setToday(prev => {
        const now = new Date();
        if (prev && now.toDateString() === prev.toDateString()) return prev;
        return now;
      });
    };

    update();

    const interval = setInterval(update, 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", update);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", update);
    };
  }, []);

  return today;
}

/**
 * Days remaining from today (user's local date) to exam date (local date).
 * Uses calendar days only. Safe for SSR when today is null (returns null).
 */
export function getPrepDaysRemaining(examDate, today) {
  if (!examDate) return null;
  const exam = new Date(examDate);
  if (Number.isNaN(exam.getTime())) return null;
  if (!today) return null;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const examDay = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate());
  const diffMs = examDay - todayStart;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
