/**
 * Server-side check for spam/fake/virtual phone numbers.
 * Mirrors client-side rules in app/(main)/components/utils/formValidation.js
 */

/**
 * @param {string} phone - Full phone (may include country code, e.g. +919876543210)
 * @returns {boolean} true if the number looks like spam/fake
 */
function isSpamOrFakePhone(phone) {
  if (!phone || typeof phone !== "string") return false;
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 6) return false;

  // All same digit
  if (/^(\d)\1+$/.test(cleanPhone)) return true;

  // Sequential ascending (e.g. 1234567890)
  let ascending = true;
  for (let i = 1; i < cleanPhone.length; i++) {
    const curr = parseInt(cleanPhone[i], 10);
    const prev = parseInt(cleanPhone[i - 1], 10);
    if (curr !== (prev + 1) % 10) {
      ascending = false;
      break;
    }
  }
  if (ascending) return true;

  // Sequential descending (e.g. 9876543210)
  let descending = true;
  for (let i = 1; i < cleanPhone.length; i++) {
    const curr = parseInt(cleanPhone[i], 10);
    const prev = parseInt(cleanPhone[i - 1], 10);
    if (curr !== (prev - 1 + 10) % 10) {
      descending = false;
      break;
    }
  }
  if (descending) return true;

  // US/Canada fake 555 (prefix or last-10 starts with 555)
  if (cleanPhone.length >= 3 && cleanPhone.slice(0, 3) === "555") return true;
  if (cleanPhone.length >= 10 && cleanPhone.slice(-10).slice(0, 3) === "555") return true;

  // Repeated 2-digit pattern
  if (cleanPhone.length >= 6) {
    const two = cleanPhone.slice(0, 2);
    if (two[0] !== two[1]) {
      const repeated = two.repeat(Math.ceil(cleanPhone.length / 2)).slice(0, cleanPhone.length);
      if (cleanPhone === repeated) return true;
    }
    const four = cleanPhone.slice(0, 4);
    if (cleanPhone.length >= 8 && cleanPhone === four.repeat(Math.ceil(cleanPhone.length / 4)).slice(0, cleanPhone.length)) return true;
  }

  // Too many consecutive repeated digits (5+ same digit in a row)
  if (/(\d)\1{4,}/.test(cleanPhone)) return true;

  return false;
}

module.exports = { isSpamOrFakePhone };
