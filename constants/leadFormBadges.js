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

export function isLeadFormIdBlackBadge(formId, highlightedFromApi) {
  const id = String(formId ?? "").trim();
  if (!id) return false;
  if (LEAD_FORM_IDS_BLACK_BADGE.has(id)) return true;
  if (highlightedFromApi instanceof Set) return highlightedFromApi.has(id);
  if (Array.isArray(highlightedFromApi)) return highlightedFromApi.includes(id);
  return false;
}
