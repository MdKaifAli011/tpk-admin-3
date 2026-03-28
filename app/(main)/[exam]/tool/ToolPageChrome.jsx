"use client";

import Link from "next/link";

/**
 * Breadcrumb for exam tool routes. Last segment omits `href` (current page).
 * @param {{ label: string, href?: string }[]} segments
 */
export function ToolBreadcrumb({ segments }) {
  if (!segments?.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-5 sm:mb-6">
      <div className="inline-flex max-w-full flex-wrap items-center gap-y-1.5 rounded-xl border border-indigo-100/90 bg-white/95 px-3 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/90 backdrop-blur-sm sm:px-4 sm:py-2.5">
        {segments.map((seg, i) => (
          <span key={`${seg.label}-${i}`} className="inline-flex items-center">
            {i > 0 && (
              <span
                className="mx-2 text-[11px] font-light text-slate-300 select-none sm:text-xs"
                aria-hidden
              >
                /
              </span>
            )}
            {seg.href ? (
              <Link
                href={seg.href}
                className="text-[11px] font-medium text-slate-600 transition-colors hover:text-indigo-600 sm:text-xs"
              >
                {seg.label}
              </Link>
            ) : (
              <span
                className="max-w-[min(100vw-8rem,28rem)] truncate text-[11px] font-semibold text-indigo-950 sm:max-w-md sm:text-xs"
                aria-current="page"
                title={seg.label}
              >
                {seg.label}
              </span>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}
