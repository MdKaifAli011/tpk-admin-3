/**
 * Returns the form placeholder image URL for the current exam from pathname.
 * - default: jee-form-placeholder.png, neet-form-placeholder.png, ... fallback form-placeholder.png
 * - discussion: jee-Discussion-form-placeholder.png, neet-Discussion-form-placeholder.png, ... fallback form-placeholder.png
 * @param {string} pathname - Current pathname (e.g. from usePathname())
 * @param {string} basePath - Base path (e.g. process.env.NEXT_PUBLIC_BASE_PATH || '/self-study')
 * @param {{ variant?: 'default' | 'discussion' }} options - 'discussion' for Discussion modals
 * @returns {{ src: string, fallbackSrc: string }}
 */
export function getFormPlaceholderImageSrc(pathname, basePath, options = {}) {
  const variant = options.variant === "discussion" ? "discussion" : "default";
  const base = (basePath || "/self-study").replace(/\/$/, "") || "";
  const fallbackSrc = `${base}/images/form-placeholder.png`;

  if (!pathname || typeof pathname !== "string") return { src: fallbackSrc, fallbackSrc };

  let rest = pathname;
  if (base && pathname.startsWith(base)) rest = pathname.slice(base.length).replace(/^\//, "") || "";
  const segments = rest.split("/").filter(Boolean);
  const examSlug = (segments[0] || "").trim().toLowerCase();

  if (!examSlug) return { src: fallbackSrc, fallbackSrc };

  const fileName =
    variant === "discussion"
      ? `${examSlug}-Discussion-form-placeholder.png`
      : `${examSlug}-form-placeholder.png`;
  return {
    src: `${base}/images/${fileName}`,
    fallbackSrc,
  };
}
