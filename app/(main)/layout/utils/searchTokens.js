/**
 * Token-based (bag-of-words) search for subjects, units, chapters, topics.
 * Query "laws of motion class 9" matches content containing any combination of those words
 * (e.g. "laws", "motion", "class 9" in any order) without requiring the exact phrase.
 */

const STOP_WORDS = new Set([
  "of", "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "is", "it",
]);

/**
 * Split query into lowercase tokens, optionally filtering stop words.
 * @param {string} query - Raw search query
 * @param {boolean} removeStopWords - If true, drop common words (of, the, a, ...)
 * @returns {string[]} Tokens (e.g. ["laws", "motion", "class", "9"])
 */
export function tokenizeQuery(query, removeStopWords = true) {
  if (!query || typeof query !== "string") return [];
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!removeStopWords) return tokens;
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

/**
 * Check if a searchable text contains every token (AND of tokens).
 * Used so "laws of motion class 9" matches "Class 9: Laws of Motion" (all words present).
 * @param {string} searchableText - One string to search in (e.g. name + parent path)
 * @param {string[]} tokens - From tokenizeQuery()
 * @returns {boolean}
 */
export function textMatchesTokens(searchableText, tokens) {
  if (!tokens.length) return true;
  if (!searchableText || typeof searchableText !== "string") return false;
  const haystack = searchableText.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Build searchable text for a tree node so parent context (e.g. "class 9") is included.
 * @param {object} node - { name, slug } and optional parents
 * @param {string} [subjectName]
 * @param {string} [unitName]
 * @param {string} [chapterName]
 * @returns {string}
 */
export function getSearchableText(node, subjectName = "", unitName = "", chapterName = "") {
  const parts = [
    node?.name || "",
    node?.slug || "",
    subjectName,
    unitName,
    chapterName,
  ].filter(Boolean);
  return parts.join(" ");
}
