/**
 * Get email settings from DB with fallback to env.
 * Used by mailer and lead send-export. Cached briefly to avoid DB on every send.
 */
import connectDB from "@/lib/mongodb";
import EmailSettings from "@/models/EmailSettings";

const CACHE_MS = 60 * 1000; // 1 minute
let cached = null;
let cachedAt = 0;

export async function getEmailSettings() {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_MS) {
    return cached;
  }
  const fromEnv = {
    mailMailer: process.env.MAIL_MAILER || process.env.EMAIL_SERVICE || "smtp",
    mailHost: process.env.MAIL_HOST || process.env.EMAIL_HOST,
    mailPort: parseInt(process.env.MAIL_PORT || process.env.EMAIL_PORT || "465", 10),
    mailUsername: process.env.MAIL_USERNAME || process.env.EMAIL_USER,
    mailPassword: process.env.MAIL_PASSWORD || process.env.EMAIL_PASS,
    mailEncryption: process.env.MAIL_ENCRYPTION || (process.env.EMAIL_SECURE === "true" ? "ssl" : null),
    mailFromAddress: process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || process.env.EMAIL_USER,
    mailFromName: process.env.MAIL_FROM_NAME || "TestPrepKart",
    leadExportMailTo: process.env.LEAD_EXPORT_MAIL_TO || "",
  };
  try {
    await connectDB();
    const doc = await EmailSettings.findOne({ key: "default" }).lean();
    if (!doc) {
      cached = fromEnv;
      cachedAt = now;
      return cached;
    }
    cached = {
      mailMailer: doc.mailMailer != null && doc.mailMailer !== "" ? doc.mailMailer : fromEnv.mailMailer,
      mailHost: doc.mailHost != null && doc.mailHost !== "" ? doc.mailHost : fromEnv.mailHost,
      mailPort: doc.mailPort != null ? doc.mailPort : fromEnv.mailPort,
      mailUsername: doc.mailUsername != null && doc.mailUsername !== "" ? doc.mailUsername : fromEnv.mailUsername,
      mailPassword: doc.mailPassword != null && doc.mailPassword !== "" ? doc.mailPassword : fromEnv.mailPassword,
      mailEncryption: doc.mailEncryption != null && doc.mailEncryption !== "" ? doc.mailEncryption : fromEnv.mailEncryption,
      mailFromAddress: doc.mailFromAddress != null && doc.mailFromAddress !== "" ? doc.mailFromAddress : fromEnv.mailFromAddress,
      mailFromName: doc.mailFromName != null && doc.mailFromName !== "" ? doc.mailFromName : fromEnv.mailFromName,
      leadExportMailTo: doc.leadExportMailTo != null && doc.leadExportMailTo !== "" ? doc.leadExportMailTo.trim() : fromEnv.leadExportMailTo,
    };
  } catch (err) {
    console.error("getEmailSettings error:", err);
    cached = fromEnv;
  }
  cachedAt = now;
  return cached;
}

/** Clear cache so next call fetches fresh from DB (e.g. after admin saves). */
export function clearEmailSettingsCache() {
  cached = null;
  cachedAt = 0;
}
