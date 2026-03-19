/**
 * Token-based (bag-of-words) search for Admin Self Study.
 * Converts a user query like "laws of motion class 9" into tokens (stop words removed),
 * then builds a MongoDB condition: match if the field contains ANY of the tokens (OR logic).
 *
 * So "laws of motion class 9" matches documents where name contains:
 *   "laws" OR "motion" OR "class" OR "9"
 * Reordered or partial queries like "motion class 9", "class 9", "laws" all match the same.
 */

const DEFAULT_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "he", "in", "is", "it", "its", "of", "on", "or", "that",
  "the", "to", "was", "were", "will", "with",
]);

/**
 * Escape special regex characters in a string.
 * @param {string} s
 * @returns {string}
 */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract meaningful search tokens from a query string.
 * - Lowercases and trims
 * - Splits on whitespace
 * - Removes stop words
 * - Filters empty and very short tokens (optional: keep single digits/numbers)
 * - Deduplicates
 * @param {string} query - Raw search input (e.g. "laws of motion class 9")
 * @param {{ stopWords?: Set<string> | string[] }} options
 * @returns {{ keywords: string[], tokens: string[] }}
 */
function tokenizeSearchQuery(query, options = {}) {
  if (!query || typeof query !== "string") {
    return { keywords: [], tokens: [] };
  }
  const stopWords = options.stopWords instanceof Set
    ? options.stopWords
    : new Set(options.stopWords || DEFAULT_STOP_WORDS);
  const raw = query.trim().toLowerCase().split(/\s+/);
  const seen = new Set();
  const tokens = [];
  for (const word of raw) {
    const t = word.trim();
    if (!t) continue;
    if (stopWords.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    tokens.push(t);
  }
  return { keywords: tokens, tokens };
}

/**
 * Build a MongoDB query condition so that the given field matches ANY of the tokens
 * (case-insensitive substring match). Use this to merge into your main query.
 *
 * Example:
 *   const search = searchParams.get("search")?.trim();
 *   if (search) {
 *     const condition = buildTokenSearchCondition(search, "name");
 *     Object.assign(query, condition);
 *   }
 *
 * If the query yields no tokens (e.g. only stop words), falls back to matching
 * the original search string as a single phrase.
 *
 * @param {string} search - Raw search string from user
 * @param {string} fieldName - MongoDB field to search (e.g. "name", "title")
 * @param {{ stopWords?: Set<string> | string[] }} options - Optional custom stop words
 * @returns {{ [key: string]: unknown } | null } - Condition to spread into query, or null if search empty
 */
function buildTokenSearchCondition(search, fieldName = "name", options = {}) {
  const trimmed = search?.trim();
  if (!trimmed) return null;

  const { tokens } = tokenizeSearchQuery(trimmed, options);

  if (tokens.length === 0) {
    // Only stop words: match the original phrase
    return {
      [fieldName]: { $regex: new RegExp(escapeRegex(trimmed), "i") },
    };
  }

  if (tokens.length === 1) {
    return {
      [fieldName]: { $regex: new RegExp(escapeRegex(tokens[0]), "i") },
    };
  }

  // Match ANY token (OR logic) — bag-of-words
  const orConditions = tokens.map((t) => ({
    [fieldName]: { $regex: new RegExp(escapeRegex(t), "i") },
  }));

  return { $or: orConditions };
}

export {
  tokenizeSearchQuery,
  buildTokenSearchCondition,
  escapeRegex,
  DEFAULT_STOP_WORDS,
};
