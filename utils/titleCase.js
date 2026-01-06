// ============================================
// Smart Title Case Utility Functions
// ============================================

const LOWERCASE_WORDS = ["and", "of", "or", "in"];

/**
 * Smart title case formatter
 * Rules:
 * 1. ALL CAPS words remain ALL CAPS (SAT, NEET, JEE)
 * 2. Mixed-case words remain unchanged (NEET_Biology)
 * 3. Fully lowercase words are title-cased
 * 4. Connector words stay lowercase unless first word
 */
export function toTitleCase(text) {
  if (!text || typeof text !== "string") return "";

  const trimmed = text.trim();
  if (!trimmed) return "";

  const words = trimmed.split(/\s+/);

  return words
    .map((word, index) => {
      // 🔒 Keep ALL CAPS words unchanged (SAT, NEET)
      if (word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word;
      }

      // 🔒 Keep mixed-case words unchanged (NEET_Biology)
      if (/[A-Z]/.test(word) && /[a-z]/.test(word)) {
        return word;
      }

      const lower = word.toLowerCase();

      // Keep connector words lowercase unless first word
      if (index !== 0 && LOWERCASE_WORDS.includes(lower)) {
        return lower;
      }

      // Capitalize fully lowercase words
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
