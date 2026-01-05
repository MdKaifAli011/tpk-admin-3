// ============================================
// Title Case Utility Functions
// ============================================

/**
 * Words that should remain lowercase in title case (unless they're the first word)
 */
const LOWERCASE_WORDS = ["and", "of", "or", "in"];

/**
 * Convert string to title case, excluding certain words
 * First word is always capitalized, but "And", "Of", "Or", "In" remain lowercase elsewhere
 * @param {String} text - Text to convert to title case
 * @returns {String} Title cased string
 */
export function toTitleCase(text) {
  if (!text || typeof text !== "string") return "";

  const trimmed = text.trim();
  if (!trimmed) return "";

  // Split by spaces and process each word
  const words = trimmed.split(/\s+/);

  return words
    .map((word, index) => {
      // Always capitalize first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }

      // Check if word (case-insensitive) is in the lowercase words list
      const wordLower = word.toLowerCase();
      if (LOWERCASE_WORDS.includes(wordLower)) {
        return wordLower; // Keep it lowercase
      }

      // Capitalize other words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

