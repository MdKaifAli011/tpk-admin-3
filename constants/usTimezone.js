/**
 * Optional US timezone bucket for leads (API + DB).
 * Labels: EST NY/NJ · CST TX/IL · PST CA/WA · MST AZ/CO · HST Hawaii · Other
 * Use timezoneTellUs for free-text when "Other" or extra detail.
 */
export const US_TIMEZONE_VALUES = Object.freeze([
  "EST",
  "CST",
  "PST",
  "MST",
  "HST",
  "Other",
]);

export const TIMEZONE_TELL_US_MAX_LENGTH = 2000;

/**
 * @param {unknown} raw
 * @returns {{ ok: true, skip: true } | { ok: true, value: string | null } | { ok: false, message: string }}
 */
export function parseUsTimezoneFromBody(raw) {
  if (raw === undefined) return { ok: true, skip: true };
  if (raw === null || (typeof raw === "string" && raw.trim() === "")) {
    return { ok: true, value: null };
  }
  const s = String(raw).trim();
  const match = US_TIMEZONE_VALUES.find(
    (v) => v.toLowerCase() === s.toLowerCase()
  );
  if (!match) {
    return {
      ok: false,
      message: `usTimezone must be one of: ${US_TIMEZONE_VALUES.join(", ")}`,
    };
  }
  return { ok: true, value: match };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, skip: true } | { ok: true, value: string | null } | { ok: false, message: string }}
 */
export function parseTimezoneTellUsFromBody(raw) {
  if (raw === undefined) return { ok: true, skip: true };
  if (raw === null || (typeof raw === "string" && raw.trim() === "")) {
    return { ok: true, value: null };
  }
  const s = String(raw).trim();
  if (s.length > TIMEZONE_TELL_US_MAX_LENGTH) {
    return {
      ok: false,
      message: `timezoneTellUs must be at most ${TIMEZONE_TELL_US_MAX_LENGTH} characters`,
    };
  }
  return { ok: true, value: s };
}
