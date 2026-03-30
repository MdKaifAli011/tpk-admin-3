/**
 * Lead API fields for SAT Readiness Analyzer.
 * Profile + scores live in Lead.className, source, form_id, etc.; `prepared` stays minimal for admin UI.
 */

/** Lead.prepared — single placeholder so the admin “Prepared” column stays clean. */
export const SAT_LEAD_PREPARED = "sat";

/**
 * Lead.form_id — stable Pascal-Case id for filters, badges, and reporting.
 * (Matches product convention: SAT-Readiness-Analyzer.)
 */
export const SAT_LEAD_FORM_ID = "SAT-Readiness-Analyzer";
