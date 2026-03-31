/**
 * Exam-aware form sidebar images under /[exam]/…
 *
 * Variants:
 * - default: {slug}-form-placeholder.png → form-placeholder.png
 * - course:  {slug}-course-form-placeholder.png → {slug}-form-placeholder.png → form-placeholder.png
 * - discussion: {slug}-Discussion-form-placeholder.png → {slug}-form-placeholder.png → form-placeholder.png
 *
 * @param {string} pathname - e.g. from usePathname()
 * @param {string} basePath - NEXT_PUBLIC_BASE_PATH
 * @param {{ variant?: 'default' | 'course' | 'discussion', examSlug?: string }} options
 *   Pass `examSlug` from `useParams().exam` when available (e.g. course page) so filenames like
 *   `sat-course-form-placeholder.png` resolve even if pathname parsing is ambiguous.
 * @returns {string[]} URLs to try in order (last is always the global fallback)
 */
function normalizeExamSlug(raw) {
  if (raw == null) return "";
  const s = Array.isArray(raw) ? raw[0] : raw;
  return String(s || "").trim().toLowerCase();
}

export function getFormPlaceholderCandidates(pathname, basePath, options = {}) {
  const base = String(basePath || "/self-study")
    .trim()
    .replace(/\/$/, "") || "/self-study";
  const ultimate = `${base}/images/form-placeholder.png`;

  const fromOption = normalizeExamSlug(options.examSlug);
  let examSlug = fromOption;

  if (!examSlug && pathname && typeof pathname === "string") {
    let rest = pathname;
    if (base && pathname.startsWith(base)) {
      rest = pathname.slice(base.length).replace(/^\//, "") || "";
    }
    const segments = rest.split("/").filter(Boolean);
    const courseIdx = segments.indexOf("course");
    if (courseIdx > 0) {
      examSlug = (segments[courseIdx - 1] || "").trim().toLowerCase();
    } else if (segments.length > 0 && segments[0] !== "course") {
      examSlug = (segments[0] || "").trim().toLowerCase();
    }
  }

  if (!examSlug) {
    return [ultimate];
  }

  const slugForm = `${base}/images/${examSlug}-form-placeholder.png`;
  const discussion = `${base}/images/${examSlug}-Discussion-form-placeholder.png`;
  const course = `${base}/images/${examSlug}-course-form-placeholder.png`;

  const variant =
    options.variant === "discussion"
      ? "discussion"
      : options.variant === "course"
        ? "course"
        : "default";

  if (variant === "discussion") {
    return [discussion, slugForm, ultimate];
  }
  if (variant === "course") {
    return [course, slugForm, ultimate];
  }
  return [slugForm, ultimate];
}

/**
 * @returns {{ src: string, fallbackSrc: string, candidates: string[] }}
 */
export function getFormPlaceholderImageSrc(pathname, basePath, options = {}) {
  const candidates = getFormPlaceholderCandidates(pathname, basePath, options);
  return {
    src: candidates[0],
    fallbackSrc: candidates[candidates.length - 1],
    candidates,
  };
}
