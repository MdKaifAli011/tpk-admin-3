/**
 * Escape regex metacharacters so arbitrary strings can be used safely inside RegExp.
 * @param {string} s
 * @returns {string}
 */
export function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Case-insensitive full-string match for MongoDB `$regex` (avoids ReDoS / injection from user text).
 * @param {string} value
 * @returns {RegExp}
 */
export function regexExactInsensitive(value) {
  return new RegExp(`^${escapeRegex(value)}$`, "i");
}

/**
 * Match a URL slug segment against a stored name that uses spaces instead of hyphens.
 * @param {string} slugSegment
 * @returns {RegExp}
 */
export function regexExactFromSlugSegment(slugSegment) {
  const spaced = String(slugSegment || "").replace(/-/g, " ");
  return regexExactInsensitive(spaced);
}
