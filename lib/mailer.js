/**
 * Mailer utility for sending emails (SMTP).
 * Uses admin Email Settings (DB) with fallback to MAIL_* env vars. Server-side only.
 */
import nodemailer from "nodemailer";
import { logger } from "@/utils/logger";
import { getEmailSettings } from "@/lib/getEmailSettings";

/**
 * Send an email with optional attachment.
 * @param {Object} options - { to, subject, text, html, attachments }
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendMail(options) {
  const config = await getEmailSettings();
  const host = config.mailHost;
  const port = config.mailPort || 465;
  const user = config.mailUsername;
  const pass = config.mailPassword;
  const secure = port === 465 || config.mailEncryption === "ssl";

  if (!host || !user || !pass) {
    logger.warn("Mail config incomplete (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD). Email will not be sent.");
    return { success: false, error: "Mail not configured" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const from = config.mailFromAddress
    ? `"${config.mailFromName || "TestprepKart"}" <${config.mailFromAddress}>`
    : undefined;

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });
    logger.info(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error("Mail send error:", err);
    return { success: false, error: err?.message || "Failed to send email" };
  }
}
