/**
 * Form IDs that always use the black badge in the lead table (same visual as Admin → Form → highlight in leads).
 */
export const LEAD_FORM_IDS_BLACK_BADGE = new Set([
  "neet-coaching-page",
  /** SAT tool — current id */
  "SAT-Readiness-Analyzer",
  /** legacy submissions */
  "sat-readiness-analyzer",
]);

/** POST /api/lead verifies reCAPTCHA when RECAPTCHA_SECRET_KEY is set */
export const LEAD_FORM_IDS_RECAPTCHA = new Set([
  "SAT-Readiness-Analyzer",
  "sat-readiness-analyzer",
]);

export function isLeadFormIdBlackBadge(formId, highlightedFromApi) {
  const id = String(formId ?? "").trim();
  if (!id) return false;
  if (LEAD_FORM_IDS_BLACK_BADGE.has(id)) return true;
  if (highlightedFromApi instanceof Set) return highlightedFromApi.has(id);
  if (Array.isArray(highlightedFromApi)) return highlightedFromApi.includes(id);
  return false;
}
