/**
 * Mailer utility for sending emails (SMTP).
 * Uses MAIL_* env vars via config. Only for server-side use.
 */
import nodemailer from "nodemailer";
import { config } from "@/config/config";
import { logger } from "@/utils/logger";

function getTransporter() {
  const host = config.mailHost;
  const port = config.mailPort || 465;
  const user = config.mailUsername;
  const pass = config.mailPassword;
  const secure = port === 465 || config.mailEncryption === "ssl";

  if (!host || !user || !pass) {
    logger.warn("Mail config incomplete (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD). Email will not be sent.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Send an email with optional attachment.
 * @param {Object} options - { to, subject, text, html, attachments }
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendMail(options) {
  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, error: "Mail not configured" };
  }

  const from = config.mailFromAddress
    ? `"${config.mailFromName || "TestPrepKart"}" <${config.mailFromAddress}>`
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
