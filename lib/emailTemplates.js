/**
 * Email content (subject, text, html) for user-facing emails.
 * Professional layout with company branding, logo, and footer.
 * Uses config.siteUrl for links and logo. Safe to call from API routes.
 */
import { config } from "@/config/config";

const COMPANY_NAME = "TestprepKart";
const siteUrl = () => (typeof window === "undefined" ? config.siteUrl || "" : "");
/** Logo URL used in email header. Uses fixed CDN/optimized logo so it displays reliably in all clients. */
const EMAIL_LOGO_URL = "https://www.testprepkart.com/self-study/_next/image?url=%2Fself-study%2Flogo.png&w=640&q=75";
const logoUrl = () => EMAIL_LOGO_URL;

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Primary CTA button (inline styles for email clients).
 */
function buttonHtml(text, url) {
  if (!url) return escapeHtml(text);
  return `<a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;margin:8px 0;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#ffffff !important;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;border:none;">${escapeHtml(text)}</a>`;
}

/**
 * Build header cell HTML: logo only (no company name text). Fallback to text only when no logo URL.
 */
function emailHeaderHtml() {
  const logo = logoUrl();
  const base = siteUrl();
  const linkWrap = (content) =>
    base ? `<a href="${escapeHtml(base)}" style="text-decoration:none;color:inherit;">${content}</a>` : content;
  if (logo) {
    return `
    <td style="padding:28px 32px 24px 32px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);text-align:center;">
      ${linkWrap(`<img src="${logo}" alt="${escapeHtml(COMPANY_NAME)}" width="180" height="56" style="display:block;max-width:180px;height:56px;width:auto;margin:0 auto;border:0;outline:none;" />`)}
    </td>`;
  }
  return `
    <td style="padding:28px 32px 24px 32px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);text-align:center;">
      ${linkWrap(`<span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${escapeHtml(COMPANY_NAME)}</span>`)}
    </td>`;
}

/**
 * Wrap body content in professional layout: header (logo only), content area, footer.
 * @param {string} bodyContent - HTML fragment for main content
 * @param {object} opts - { preheader?: string }
 */
function wrapEmailHtml(bodyContent, opts = {}) {
  const base = siteUrl();
  const preheader = opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>` : "";
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(COMPANY_NAME)}</title>
  ${preheader}
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#374151;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);overflow:hidden;">
          <!-- Header: logo only -->
          <tr>
            ${emailHeaderHtml()}
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 28px 32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">
                This email was sent by <strong style="color:#374151;">${escapeHtml(COMPANY_NAME)}</strong>.
              </p>
              ${base ? `<p style="margin:0 0 8px 0;font-size:14px;"><a href="${escapeHtml(base)}" style="color:#4f46e5;text-decoration:none;">Visit our website</a></p>` : ""}
              <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;">
                © ${currentYear} ${escapeHtml(COMPANY_NAME)}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function leadAutoReply(formIdOrName = "") {
  const form = formIdOrName ? ` (${String(formIdOrName)})` : "";
  const subject = `We've received your request – ${COMPANY_NAME}`;
  const text = `Thank you for getting in touch. We have received your request${form} and will get back to you soon.\n\nBest regards,\n${COMPANY_NAME} Team`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Thank you for getting in touch.</p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;">We have received your request${escapeHtml(form)} and our team will review it shortly. We typically respond within 1–2 business days.</p>
    <p style="margin:0 0 8px 0;font-size:16px;color:#374151;">Best regards,</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</p>
  `;
  const html = wrapEmailHtml(body, { preheader: "We've received your request and will get back to you soon." });
  return { subject, text, html };
}

export function studentWelcome(name = "Student") {
  const base = siteUrl();
  const loginLink = base ? `${base}/login` : "";
  const subject = `Welcome to ${COMPANY_NAME} – Your account is ready`;
  const text = `Hi ${name}, welcome! Your account has been created. You can now log in and start learning.${loginLink ? ` Log in here: ${loginLink}` : ""}\n\nBest regards,\n${COMPANY_NAME} Team`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Welcome to <strong>${escapeHtml(COMPANY_NAME)}</strong>! Your account has been created successfully.</p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;">You can now sign in to access practice tests, study materials, and track your progress.</p>
    ${loginLink ? `<p style="margin:0 0 24px 0;">${buttonHtml("Sign in to your account", loginLink)}</p>` : ""}
    <p style="margin:0 0 8px 0;font-size:16px;color:#374151;">Best regards,</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</p>
  `;
  const html = wrapEmailHtml(body, { preheader: "Your account is ready. Sign in to start learning." });
  return { subject, text, html };
}

export function adminWelcome(name = "User") {
  const subject = `Welcome – Your ${COMPANY_NAME} admin account is ready`;
  const text = `Hi ${name}, your admin account has been created. You can log in to the admin panel.\n\nBest regards,\n${COMPANY_NAME}`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Your admin account for <strong>${escapeHtml(COMPANY_NAME)}</strong> has been created.</p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;">You can now log in to the admin panel using your credentials.</p>
    <p style="margin:0 0 8px 0;font-size:16px;color:#374151;">Best regards,</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:#4f46e5;">${escapeHtml(COMPANY_NAME)}</p>
  `;
  const html = wrapEmailHtml(body, { preheader: "Your admin account is ready." });
  return { subject, text, html };
}

export function threadCreated(threadTitle, isApproved) {
  const status = isApproved ? "is now live on the community" : "has been submitted and is pending moderation";
  const subject = isApproved ? `Your discussion is live – ${COMPANY_NAME}` : `Discussion submitted – ${COMPANY_NAME}`;
  const text = `Your thread "${threadTitle}" ${status}.`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Your discussion thread <strong>${escapeHtml(threadTitle)}</strong> ${escapeHtml(status)}.</p>
    ${isApproved ? `<p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">Others can now view and reply to your thread.</p>` : "<p style=\"margin:0 0 8px 0;font-size:14px;color:#6b7280;\">You'll receive an email once it's approved.</p>"}
    <p style="margin:24px 0 0 0;font-size:16px;color:#374151;">Best regards,<br/><strong style="color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</strong></p>
  `;
  const html = wrapEmailHtml(body, { preheader: `Your thread "${threadTitle}" ${status}.` });
  return { subject, text, html };
}

export function threadApproved(threadTitle, threadSlug) {
  const base = siteUrl();
  const link = base ? `${base}?tab=discussion&thread=${encodeURIComponent(threadSlug)}` : "";
  const subject = `Your discussion is now live – ${COMPANY_NAME}`;
  const text = link
    ? `Your thread "${threadTitle}" has been approved. View it here: ${link}\n\nBest regards,\n${COMPANY_NAME} Team`
    : `Your thread "${threadTitle}" has been approved.\n\nBest regards,\n${COMPANY_NAME} Team`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Good news! Your discussion thread <strong>${escapeHtml(threadTitle)}</strong> has been approved and is now visible to the community.</p>
    ${link ? `<p style="margin:24px 0;">${buttonHtml("View your thread", link)}</p>` : ""}
    <p style="margin:24px 0 0 0;font-size:16px;color:#374151;">Best regards,<br/><strong style="color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</strong></p>
  `;
  const html = wrapEmailHtml(body, { preheader: `"${threadTitle}" is now live.` });
  return { subject, text, html };
}

export function newReplyOnThread(threadTitle, threadSlug, isAuthor = false) {
  const base = siteUrl();
  const link = base ? `${base}?tab=discussion&thread=${encodeURIComponent(threadSlug)}` : "";
  const subject = isAuthor ? `New reply on your thread – ${COMPANY_NAME}` : `New activity on a thread you follow – ${COMPANY_NAME}`;
  const intro = isAuthor ? "Someone has replied to your discussion thread" : "There's a new reply on a discussion thread you follow";
  const text = link ? `${intro}: "${threadTitle}". View: ${link}` : `${intro}: "${threadTitle}".`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">${escapeHtml(intro)}: <strong>${escapeHtml(threadTitle)}</strong>.</p>
    ${link ? `<p style="margin:24px 0;">${buttonHtml("View reply", link)}</p>` : ""}
    <p style="margin:24px 0 0 0;font-size:16px;color:#374151;">Best regards,<br/><strong style="color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</strong></p>
  `;
  const html = wrapEmailHtml(body, { preheader: `${intro}: "${threadTitle}".` });
  return { subject, text, html };
}

export function replyApproved(threadTitle) {
  const subject = `Your reply was approved – ${COMPANY_NAME}`;
  const text = `Your reply on the thread "${threadTitle}" has been approved and is now visible.\n\nBest regards,\n${COMPANY_NAME} Team`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Your reply on the discussion thread <strong>${escapeHtml(threadTitle)}</strong> has been approved and is now visible to others.</p>
    <p style="margin:24px 0 0 0;font-size:16px;color:#374151;">Best regards,<br/><strong style="color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</strong></p>
  `;
  const html = wrapEmailHtml(body, { preheader: `Your reply on "${threadTitle}" was approved.` });
  return { subject, text, html };
}

export function blogCommentReceived() {
  const subject = `We received your comment – ${COMPANY_NAME}`;
  const text = `Thank you for your comment. It will be reviewed before being published.\n\nBest regards,\n${COMPANY_NAME} Team`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Thank you for leaving a comment.</p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;">We've received your comment and it will be reviewed by our team before being published. You'll see it on the blog once it's approved.</p>
    <p style="margin:0 0 8px 0;font-size:16px;color:#374151;">Best regards,</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</p>
  `;
  const html = wrapEmailHtml(body, { preheader: "Your comment was received and is pending review." });
  return { subject, text, html };
}

export function overviewCommentReceived() {
  const subject = `Thank you for your comment – ${COMPANY_NAME}`;
  const text = `We have received your comment. It will be reviewed before being published.\n\nBest regards,\n${COMPANY_NAME} Team`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Thank you for your comment.</p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;">We've received it and our team will review it before publishing. We appreciate your engagement with our content.</p>
    <p style="margin:0 0 8px 0;font-size:16px;color:#374151;">Best regards,</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</p>
  `;
  const html = wrapEmailHtml(body, { preheader: "Your comment was received and will be reviewed." });
  return { subject, text, html };
}

export function testResultSummary(testName, percentage, correctCount, totalQuestions, link) {
  const subject = `Your test result – ${COMPANY_NAME}`;
  const text = link
    ? `Test: ${testName}. Score: ${correctCount}/${totalQuestions} (${percentage}%). View details: ${link}\n\nBest regards,\n${COMPANY_NAME} Team`
    : `Test: ${testName}. Score: ${correctCount}/${totalQuestions} (${percentage}%).\n\nBest regards,\n${COMPANY_NAME} Team`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Here's a summary of your recent test attempt.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background-color:#f9fafb;font-size:14px;font-weight:600;color:#374151;">Test</td><td style="padding:12px 16px;font-size:14px;color:#374151;">${escapeHtml(testName)}</td></tr>
      <tr><td style="padding:12px 16px;background-color:#f9fafb;font-size:14px;font-weight:600;color:#374151;">Score</td><td style="padding:12px 16px;font-size:14px;color:#374151;">${escapeHtml(String(correctCount))} / ${escapeHtml(String(totalQuestions))} (${escapeHtml(String(percentage))}%)</td></tr>
    </table>
    ${link ? `<p style="margin:0 0 24px 0;">${buttonHtml("View full results", link)}</p>` : ""}
    <p style="margin:0;font-size:16px;color:#374151;">Best regards,<br/><strong style="color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</strong></p>
  `;
  const html = wrapEmailHtml(body, { preheader: `${testName}: ${correctCount}/${totalQuestions} (${percentage}%).` });
  return { subject, text, html };
}

export function studentForgotPassword(name, resetLink) {
  const subject = `Reset your password – ${COMPANY_NAME}`;
  const text = resetLink
    ? `Hi ${name}, you requested a password reset. Click the link below to set a new password (valid for 1 hour): ${resetLink}\n\nIf you didn't request this, you can ignore this email.\n\nBest regards,\n${COMPANY_NAME} Team`
    : `Hi ${name}, you requested a password reset. Please use the link we sent in a separate email.\n\nBest regards,\n${COMPANY_NAME} Team`;
  const body = resetLink
    ? `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">We received a request to reset the password for your ${escapeHtml(COMPANY_NAME)} account.</p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;">Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
    <p style="margin:0 0 24px 0;">${buttonHtml("Reset password", resetLink)}</p>
    <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    <p style="margin:24px 0 0 0;font-size:16px;color:#374151;">Best regards,<br/><strong style="color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</strong></p>
  `
    : `
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">You requested a password reset. Please use the link sent in our previous email, or request a new link from the sign-in page.</p>
    <p style="margin:24px 0 0 0;font-size:16px;color:#374151;">Best regards,<br/><strong style="color:#4f46e5;">The ${escapeHtml(COMPANY_NAME)} Team</strong></p>
  `;
  const html = wrapEmailHtml(body, { preheader: "Reset your password – link valid for 1 hour." });
  return { subject, text, html };
}
