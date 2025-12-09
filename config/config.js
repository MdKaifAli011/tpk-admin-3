import dotenv from "dotenv";
import { logger } from "@/utils/logger";

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "*",

  // Database
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGO_DB_NAME,

  // API
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",

  // JWT / Session
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  sessionSecret: process.env.SESSION_SECRET,

  // Email
  emailService: process.env.EMAIL_SERVICE,
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailSecure: process.env.EMAIL_SECURE === "true",
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
};

// Validate critical environment variables
const requiredVars = ["MONGODB_URI", "JWT_SECRET", "SESSION_SECRET"];
requiredVars.forEach((key) => {
  if (!process.env[key]) {
    logger.error(`❌ CRITICAL: Missing required environment variable: ${key}`);
    if (process.env.NODE_ENV === "production") {
      logger.error("Application cannot start without required environment variables. Exiting...");
      process.exit(1); // Exit in production
    }
  }
});

