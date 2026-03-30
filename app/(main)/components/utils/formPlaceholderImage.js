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
 * @param {{ variant?: 'default' | 'course' | 'discussion' }} options
 * @returns {string[]} URLs to try in order (last is always the global fallback)
 */
export function getFormPlaceholderCandidates(pathname, basePath, options = {}) {
  const base = (basePath || "/self-study").replace(/\/$/, "") || "";
  const ultimate = `${base}/images/form-placeholder.png`;

  if (!pathname || typeof pathname !== "string") {
    return [ultimate];
  }

  let rest = pathname;
  if (base && pathname.startsWith(base)) {
    rest = pathname.slice(base.length).replace(/^\//, "") || "";
  }
  const segments = rest.split("/").filter(Boolean);
  const examSlug = (segments[0] || "").trim().toLowerCase();

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
