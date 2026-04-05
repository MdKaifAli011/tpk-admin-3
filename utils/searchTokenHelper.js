/**
 * Token-based search for Admin Self Study.
 * Converts a query like "laws of motion class 9" or "sat preparation" into tokens (stop words removed).
 *
 * - **Multiple tokens:** each token must appear in the field (`$and`). So "sat preparation" only
 *   matches rows that contain both "sat" and "preparation", not every row that contains either.
 * - **Single token:** plain case-insensitive substring match on that token.
 * - **Relevance:** when `search` is non-empty, use `findWithSearchRelevance` so stronger matches
 *   (full phrase, prefix phrase, two-word proximity) sort above unrelated `orderNumber` noise.
 */

import { escapeRegex } from "@/utils/escapeRegex.js";

const DEFAULT_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "he", "in", "is", "it", "its", "of", "on", "or", "that",
  "the", "to", "was", "were", "will", "with", "this", "these", "those",
  "you", "your", "we", "our", "they", "them", "their", "i", "me", "my",
  "do", "does", "did", "done", "can", "could", "should", "would", "may",
  "might", "must", "not", "if", "then", "else", "than", "very", "also",
]);

const MAX_TOKENS = 12;
const MAX_RAW_SEARCH_INPUT = 4000;

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
  const s = String(raw || "").trim().slice(0, MAX_RAW_SEARCH_INPUT);
  if (!s) return "";

  // Prefer explicit Input/Query line if present (line-based to avoid ReDoS on long inputs).
  const lines = s.split(/\r?\n/);
  for (const line of lines) {
    const labeled = line.match(
      /^\s*(?:input|query)\s*:\s*["“”']([^"“”']+)["“”']/i
    );
    if (labeled?.[1]) return labeled[1].trim().slice(0, 500);
  }

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

  const { tokens } = tokenizeSearchQuery(trimmed, options);

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

  // All tokens must appear (order-independent). Avoids "sat preparation" matching only "SAT" rows.
  const andConditions = tokens.map((t) => ({
    [fieldName]: { $regex: new RegExp(escapeRegex(t), "i") },
  }));

  return { $and: andConditions };
}

/**
 * Merge a token/phrase search condition with an existing Mongo filter without clobbering `$or` / `$and`.
 * @param {Record<string, unknown>} baseQuery
 * @param {Record<string, unknown>} searchCondition - from buildTokenSearchCondition
 * @returns {Record<string, unknown>}
 */
function combineQueryWithSearchFilter(baseQuery, searchCondition) {
  if (!searchCondition) return baseQuery;
  const parts = [];
  for (const [key, val] of Object.entries(baseQuery)) {
    if (key === "$and" && Array.isArray(val)) {
      parts.push(...val);
    } else if (key === "$or" && Array.isArray(val)) {
      parts.push({ $or: val });
    } else {
      parts.push({ [key]: val });
    }
  }
  parts.push(searchCondition);
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

/**
 * Normalized phrase for ranking (lowercase, punctuation → spaces).
 * @param {string} trimmed
 * @returns {string}
 */
function normalizedSearchPhrase(trimmed) {
  return extractPrimarySearchText(trimmed)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * $addFields stage(s) to score name/title matches (higher = better). Used in aggregation only.
 * @param {string} fieldName
 * @param {string} trimmed
 * @returns {object[]}
 */
function buildSearchRankStages(fieldName, trimmed) {
  const phrase = normalizedSearchPhrase(trimmed);
  const { tokens } = tokenizeSearchQuery(trimmed);
  const fieldRef = `$${fieldName}`;
  const inputLower = { $toLower: fieldRef };
  /** @type {object[]} */
  const addends = [];

  if (phrase) {
    const esc = escapeRegex(phrase);
    addends.push(
      { $cond: [{ $regexMatch: { input: fieldRef, regex: `^${esc}`, options: "i" } }, 10000, 0] },
      { $cond: [{ $regexMatch: { input: fieldRef, regex: esc, options: "i" } }, 5000, 0] },
    );
  }

  if (tokens.length === 2) {
    const a = escapeRegex(tokens[0]);
    const b = escapeRegex(tokens[1]);
    const flex = `${a}[\\s\\S]*${b}|${b}[\\s\\S]*${a}`;
    addends.push({
      $cond: [{ $regexMatch: { input: fieldRef, regex: flex, options: "i" } }, 3000, 0],
    });
  }

  if (tokens.length > 0 && tokens[0]) {
    const first = tokens[0];
    addends.push({
      $let: {
        vars: {
          ix: { $indexOfCP: [inputLower, first] },
        },
        in: {
          $cond: [
            { $gte: ["$$ix", 0] },
            { $max: [0, { $subtract: [150, { $min: [150, "$$ix"] }] }] },
            0,
          ],
        },
      },
    });
  }

  if (addends.length === 0) return [];

  return [
    {
      $addFields: {
        __searchRank: { $add: addends },
      },
    },
  ];
}

/**
 * When `search` is set, runs a relevance-sorted aggregation (then re-fetches with populate/ select).
 * When empty, behaves like a normal Model.find with sortKeys.
 *
 * @template T
 * @param {import("mongoose").Model} Model
 * @param {Record<string, unknown>} matchQuery
 * @param {string | undefined} search
 * @param {string} fieldName
 * @param {{ skip: number, limit: number, select?: string, sortKeys?: Record<string, 1 | -1>, configureQuery?: (q: import("mongoose").Query) => import("mongoose").Query }} opts
 * @returns {Promise<T[]>}
 */
async function findWithSearchRelevance(Model, matchQuery, search, fieldName, opts) {
  const {
    skip,
    limit,
    select,
    sortKeys = { orderNumber: 1, createdAt: -1 },
    configureQuery,
  } = opts;
  const trimmed = search?.trim();

  if (!trimmed) {
    let q = Model.find(matchQuery).sort(sortKeys).skip(skip).limit(limit);
    if (select) q = q.select(select);
    if (configureQuery) q = configureQuery(q);
    return q.lean().exec();
  }

  const rankStages = buildSearchRankStages(fieldName, trimmed);
  const sortSpec = rankStages.length
    ? { __searchRank: -1, ...sortKeys }
    : sortKeys;

  /** @type {object[]} */
  const pipeline = [{ $match: matchQuery }, ...rankStages, { $sort: sortSpec }, { $skip: skip }, { $limit: limit }];

  const raw = await Model.aggregate(pipeline);
  const idOrder = raw.map((d) => d._id);
  if (idOrder.length === 0) return [];

  let q2 = Model.find({ _id: { $in: idOrder } });
  if (select) q2 = q2.select(select);
  if (configureQuery) q2 = configureQuery(q2);
  const hydrated = await q2.lean().exec();
  const idx = new Map(idOrder.map((id, i) => [String(id), i]));
  hydrated.sort((a, b) => idx.get(String(a._id)) - idx.get(String(b._id)));
  return hydrated;
}

export {
  tokenizeSearchQuery,
  buildTokenSearchCondition,
  combineQueryWithSearchFilter,
  findWithSearchRelevance,
  DEFAULT_STOP_WORDS,
};
export { escapeRegex } from "@/utils/escapeRegex.js";
