/**
 * Resolve email content for a template key: use DB template if present and active,
 * otherwise fall back to default from emailTemplates.js.
 * Server-side only.
 */
import connectDB from "@/lib/mongodb";
import EmailTemplate from "@/models/EmailTemplate";
import * as defaults from "@/lib/emailTemplates";
import { config } from "@/config/config";

const siteUrl = () => (typeof window === "undefined" ? config.siteUrl || "" : "");

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Replace {{placeholder}} in str with values from vars. Keys can use underscores (e.g. thread_title).
 * For HTML body we escape variable values; for text we use raw.
 */
function replacePlaceholders(str, vars, forHtml = false) {
  if (!str || typeof str !== "string") return str;
  let out = str;
  const v = vars || {};
  const re = /\{\{(\w+)\}\}/g;
  out = out.replace(re, (_, key) => {
    const val = v[key];
    if (forHtml && val != null) return escapeHtml(String(val));
    return val != null ? String(val) : "";
  });
  return out;
}

/**
 * Get default content from code for a key. vars shape depends on key.
 */
function getDefaultContent(key, vars = {}) {
  switch (key) {
    case "lead_auto_reply":
      return defaults.leadAutoReply(vars.form_name || "");
    case "student_welcome":
      return defaults.studentWelcome(vars.name || "Student");
    case "student_forgot_password":
      return defaults.studentForgotPassword(vars.name || "Student", vars.reset_url || "");
    case "thread_created":
      return defaults.threadCreated(
        vars.thread_title || "",
        !!vars.is_approved
      );
    case "thread_approved": {
      const slug = vars.thread_slug || "";
      const base = siteUrl();
      const url = base ? `${base}?tab=discussion&thread=${encodeURIComponent(slug)}` : "";
      return defaults.threadApproved(vars.thread_title || "", slug);
    }
    case "new_reply_author":
      return defaults.newReplyOnThread(
        vars.thread_title || "",
        vars.thread_slug || "",
        true
      );
    case "new_reply_subscriber":
      return defaults.newReplyOnThread(
        vars.thread_title || "",
        vars.thread_slug || "",
        false
      );
    case "reply_approved":
      return defaults.replyApproved(vars.thread_title || "");
    case "blog_comment_received":
      return defaults.blogCommentReceived();
    case "overview_comment_received":
      return defaults.overviewCommentReceived();
    case "test_result_summary":
      return defaults.testResultSummary(
        vars.test_name || "Test",
        vars.percentage ?? 0,
        vars.correct_count ?? 0,
        vars.total_questions ?? 0,
        vars.view_url || ""
      );
    default:
      return { subject: "", text: "", html: "" };
  }
}

/**
 * Get email content for template key. Uses DB if template exists and has content and isActive; else default.
 * @param {string} key - Template key (e.g. lead_auto_reply, student_welcome)
 * @param {Object} vars - Placeholder values (e.g. { name: "John", thread_title: "My thread" })
 * @returns {Promise<{ subject: string, text: string, html: string }>}
 */
export async function getEmailTemplateContent(key, vars = {}) {
  const v = { ...vars };
  // So custom templates can use {{thread_url}} when {{thread_slug}} is provided
  if (v.thread_slug != null && v.thread_slug !== "" && v.thread_url == null) {
    const base = siteUrl();
    v.thread_url = base ? `${base}?tab=discussion&thread=${encodeURIComponent(String(v.thread_slug))}` : "";
  }
  try {
    await connectDB();
    const doc = await EmailTemplate.findOne({ key, isActive: true }).lean();
    const hasCustom =
      doc &&
      (doc.subject?.trim() || doc.bodyText?.trim() || doc.bodyHtml?.trim());
    if (hasCustom) {
      const subject = replacePlaceholders(doc.subject || "", v, false);
      const text = replacePlaceholders(doc.bodyText || "", v, false);
      const html = replacePlaceholders(doc.bodyHtml || "", v, true);
      return {
        subject: subject || "Notification",
        text: text || subject,
        html: html || `<p>${escapeHtml(text || subject)}</p>`,
      };
    }
  } catch (e) {
    console.error("getEmailTemplateContent DB error:", e);
  }
  return getDefaultContent(key, vars);
}
