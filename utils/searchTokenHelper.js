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
  "the", "to", "was", "were", "will", "with", "this", "these", "those",
  "you", "your", "we", "our", "they", "them", "their", "i", "me", "my",
  "do", "does", "did", "done", "can", "could", "should", "would", "may",
  "might", "must", "not", "if", "then", "else", "than", "very", "also",
]);

const MAX_TOKENS = 12;

/**
 * Tries to extract the "actual user query" from noisy prompt-like text.
 * Supports patterns like:
 *   Input: "laws of motion class 9"
 *   Query: "..."
 * Falls back to first non-empty line or full text.
 * @param {string} raw
 * @returns {string}
 */
function extractPrimarySearchText(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";

  // Prefer explicit Input/Query line if present.
  const labeled = s.match(
    /(?:^|\n)\s*(?:input|query)\s*:\s*["“”']([^"“”'\n]{1,200})["“”']/i
  );
  if (labeled?.[1]) return labeled[1].trim();

  // Next, any short quoted phrase (often the intended search string in prompts).
  const quoted = [...s.matchAll(/["“”']([^"“”'\n]{2,160})["“”']/g)]
    .map((m) => m[1].trim())
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);
  if (quoted.length > 0 && quoted[0].split(/\s+/).length <= 10) {
    return quoted[0];
  }

  // Otherwise use first meaningful line.
  const firstLine = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean);
  return firstLine || s;
}

/**
 * Generate adjacent keyword phrases for better phrase matching.
 * Example tokens: ["laws","motion","class","9"]
 * => ["laws motion","motion class","class 9","laws motion class","motion class 9"]
 * @param {string[]} tokens
 * @returns {string[]}
 */
function buildAdjacentPhrases(tokens) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const two = tokens.slice(i, i + 2).join(" ").trim();
    const three = tokens.slice(i, i + 3).join(" ").trim();
    if (two && two.includes(" ") && !seen.has(two)) {
      seen.add(two);
      out.push(two);
    }
    if (three && three.split(" ").length === 3 && !seen.has(three)) {
      seen.add(three);
      out.push(three);
    }
  }
  return out;
}

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
    return { keywords: [], tokens: [], combinations: [], phrases: [] };
  }
  const stopWords = options.stopWords instanceof Set
    ? options.stopWords
    : new Set(options.stopWords || DEFAULT_STOP_WORDS);

  const primary = extractPrimarySearchText(query);
  // Keep alphanumeric words, normalize separators/punctuation.
  const raw = primary
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  const seen = new Set();
  const tokens = [];
  for (const word of raw) {
    const t = word.trim();
    if (!t) continue;
    if (stopWords.has(t)) continue;
    // Ignore single-letter tokens unless numeric (e.g. class 9).
    if (t.length < 2 && !/^\d+$/.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    tokens.push(t);
    if (tokens.length >= MAX_TOKENS) break;
  }

  const combinations = buildAdjacentPhrases(tokens);
  const phrases = combinations.slice();
  return { keywords: tokens, tokens, combinations, phrases };
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

  const { tokens, combinations } = tokenizeSearchQuery(trimmed, options);

  if (tokens.length === 0) {
    // Only stop words: match the original phrase
    return {
      [fieldName]: {
        $regex: new RegExp(escapeRegex(extractPrimarySearchText(trimmed)), "i"),
      },
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

  // Add phrase-level matching for adjacent keywords (still OR logic).
  combinations.forEach((phrase) => {
    orConditions.push({
      [fieldName]: { $regex: new RegExp(escapeRegex(phrase), "i") },
    });
  });

  return { $or: orConditions };
}

export {
  tokenizeSearchQuery,
  buildTokenSearchCondition,
  escapeRegex,
  DEFAULT_STOP_WORDS,
};
