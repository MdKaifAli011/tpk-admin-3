"use client";

import { useState, useEffect } from "react";

/**
 * Renders children only after mount (client-side only).
 * Use to avoid React hydration error #418 when content depends on client-only
 * values (e.g. date, window) and would differ between server and client.
 */
export default function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return fallback;
  return children;
}
