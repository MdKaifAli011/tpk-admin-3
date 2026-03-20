import dotenv from "dotenv";
import { logger } from "@/utils/logger";

// Only run dotenv and server-only validation in Node (not in browser).
// This file can be imported by client components for config.leadAccessPassword etc.
if (typeof window === "undefined") {
  dotenv.config();

  // Validate critical environment variables (server only)
  const requiredVars = ["MONGODB_URI", "JWT_SECRET", "SESSION_SECRET"];
  requiredVars.forEach((key) => {
    if (!process.env[key]) {
      logger.error(`❌ CRITICAL: Missing required environment variable: ${key}`);
      if (process.env.NODE_ENV === "production") {
        logger.error(
          "Application cannot start without required environment variables. Exiting..."
        );
        process.exit(1); // Exit in production
      }
    }
  });
}

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "*",

  leadAccessPassword: process.env.NEXT_PUBLIC_LEAD_ACCESS_PASSWORD,
  // Database
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGO_DB_NAME,

  // API
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/self-study/api",
  // Public (main) site URL for links from admin (e.g. View notification). Set in production: NEXT_PUBLIC_SITE_URL=https://yourdomain.com/self-study
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL,

  // JWT / Session
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  sessionSecret: process.env.SESSION_SECRET,

  // Email (MAIL_* preferred, fallback to EMAIL_*)
  mailMailer: process.env.MAIL_MAILER || process.env.EMAIL_SERVICE || "smtp",
  mailHost: process.env.MAIL_HOST || process.env.EMAIL_HOST,
  mailPort: parseInt(process.env.MAIL_PORT || process.env.EMAIL_PORT || "465", 10),
  mailUsername: process.env.MAIL_USERNAME || process.env.EMAIL_USER,
  mailPassword: process.env.MAIL_PASSWORD || process.env.EMAIL_PASS,
  mailEncryption: process.env.MAIL_ENCRYPTION || (process.env.EMAIL_SECURE === "true" ? "ssl" : null),
  mailFromAddress: process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || process.env.EMAIL_USER,
  mailFromName: process.env.MAIL_FROM_NAME || "Testprepkart",
  // Lead export: email to send CSV when leads are exported
  leadExportMailTo: process.env.LEAD_EXPORT_MAIL_TO || "hellomdkaifali@gmail.com",

  // Legacy email (kept for backward compatibility)
  emailService: process.env.EMAIL_SERVICE,
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailSecure: process.env.EMAIL_SECURE === "true",
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
};
