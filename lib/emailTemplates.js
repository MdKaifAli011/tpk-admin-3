/**
 * Email content (subject, text, html) for user-facing emails.
 * Uses config.siteUrl for links. Safe to call from API routes.
 */
import { config } from "@/config/config";

const siteUrl = () => (typeof window === "undefined" ? config.siteUrl || "" : "");

function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function leadAutoReply(formIdOrName = "") {
  const form = formIdOrName ? ` (${String(formIdOrName)})` : "";
  const subject = "We received your request";
  const text = `Thank you for getting in touch. We have received your request${form} and will get back to you soon.`;
  const html = `<!DOCTYPE html><html><body><p>Thank you for getting in touch.</p><p>We have received your request${escapeHtml(form)} and will get back to you soon.</p></body></html>`;
  return { subject, text, html };
}

export function studentWelcome(name = "Student") {
  const subject = "Welcome to TestPrepKart";
  const text = `Hi ${name}, welcome! Your account has been created. You can now log in and start learning.`;
  const html = `<!DOCTYPE html><html><body><p>Hi ${escapeHtml(name)},</p><p>Welcome! Your account has been created. You can now log in and start learning.</p></body></html>`;
  return { subject, text, html };
}

export function adminWelcome(name = "User") {
  const subject = "Welcome – Your admin account is ready";
  const text = `Hi ${name}, your admin account has been created. You can log in to the admin panel.`;
  const html = `<!DOCTYPE html><html><body><p>Hi ${escapeHtml(name)},</p><p>Your admin account has been created. You can log in to the admin panel.</p></body></html>`;
  return { subject, text, html };
}

export function threadCreated(threadTitle, isApproved) {
  const status = isApproved ? "is now live" : "is pending moderation";
  const subject = isApproved ? "Your discussion thread is live" : "Your discussion thread was submitted";
  const text = `Your thread "${threadTitle}" ${status}.`;
  const html = `<!DOCTYPE html><html><body><p>Your thread <strong>${escapeHtml(threadTitle)}</strong> ${escapeHtml(status)}.</p></body></html>`;
  return { subject, text, html };
}

export function threadApproved(threadTitle, threadSlug) {
  const base = siteUrl();
  const link = base ? `${base}?tab=discussion&thread=${encodeURIComponent(threadSlug)}` : "";
  const subject = "Your discussion thread is now live";
  const text = link
    ? `Your thread "${threadTitle}" has been approved. View it here: ${link}`
    : `Your thread "${threadTitle}" has been approved.`;
  const html = link
    ? `<!DOCTYPE html><html><body><p>Your thread <strong>${escapeHtml(threadTitle)}</strong> has been approved.</p><p><a href="${escapeHtml(link)}">View thread</a></p></body></html>`
    : `<!DOCTYPE html><html><body><p>Your thread <strong>${escapeHtml(threadTitle)}</strong> has been approved.</p></body></html>`;
  return { subject, text, html };
}

export function newReplyOnThread(threadTitle, threadSlug, isAuthor = false) {
  const base = siteUrl();
  const link = base ? `${base}?tab=discussion&thread=${encodeURIComponent(threadSlug)}` : "";
  const subject = isAuthor ? "Someone replied to your thread" : "New reply on a thread you follow";
  const intro = isAuthor ? "Someone replied to your thread" : "There is a new reply on a thread you follow";
  const text = link ? `${intro}: "${threadTitle}". View: ${link}` : `${intro}: "${threadTitle}".`;
  const html = link
    ? `<!DOCTYPE html><html><body><p>${escapeHtml(intro)}: <strong>${escapeHtml(threadTitle)}</strong>.</p><p><a href="${escapeHtml(link)}">View thread</a></p></body></html>`
    : `<!DOCTYPE html><html><body><p>${escapeHtml(intro)}: <strong>${escapeHtml(threadTitle)}</strong>.</p></body></html>`;
  return { subject, text, html };
}

export function replyApproved(threadTitle) {
  const subject = "Your reply was approved";
  const text = `Your reply on the thread "${threadTitle}" has been approved.`;
  const html = `<!DOCTYPE html><html><body><p>Your reply on the thread <strong>${escapeHtml(threadTitle)}</strong> has been approved.</p></body></html>`;
  return { subject, text, html };
}

export function blogCommentReceived() {
  const subject = "We received your comment";
  const text = "Thank you for your comment. It will be reviewed before being published.";
  const html = `<!DOCTYPE html><html><body><p>Thank you for your comment. It will be reviewed before being published.</p></body></html>`;
  return { subject, text, html };
}

export function overviewCommentReceived() {
  const subject = "Thank you for your comment";
  const text = "We have received your comment. It will be reviewed before being published.";
  const html = `<!DOCTYPE html><html><body><p>We have received your comment. It will be reviewed before being published.</p></body></html>`;
  return { subject, text, html };
}

export function testResultSummary(testName, percentage, correctCount, totalQuestions, link) {
  const subject = "Your test result";
  const text = link
    ? `Test: ${testName}. Score: ${correctCount}/${totalQuestions} (${percentage}%). View details: ${link}`
    : `Test: ${testName}. Score: ${correctCount}/${totalQuestions} (${percentage}%).`;
  const html = `<!DOCTYPE html><html><body><p>Test: <strong>${escapeHtml(testName)}</strong>. Score: ${escapeHtml(String(correctCount))}/${escapeHtml(String(totalQuestions))} (${escapeHtml(String(percentage))}%).</p>${link ? `<p><a href="${escapeHtml(link)}">View details</a></p>` : ""}</body></html>`;
  return { subject, text, html };
}

export function studentForgotPassword(name, resetLink) {
  const subject = "Reset your password";
  const text = resetLink
    ? `Hi ${name}, you requested a password reset. Click the link below to set a new password (valid for 1 hour): ${resetLink}`
    : `Hi ${name}, you requested a password reset. Please use the link we sent in a separate email.`;
  const html = resetLink
    ? `<!DOCTYPE html><html><body><p>Hi ${escapeHtml(name)},</p><p>You requested a password reset. Click the link below to set a new password. This link is valid for 1 hour.</p><p><a href="${escapeHtml(resetLink)}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p></body></html>`
    : `<!DOCTYPE html><html><body><p>Hi ${escapeHtml(name)},</p><p>You requested a password reset. Please use the link we sent in a separate email.</p></body></html>`;
  return { subject, text, html };
}
