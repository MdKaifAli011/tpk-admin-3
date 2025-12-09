import jwt from "jsonwebtoken";
import connectDB from "./mongodb.js";
import { logger } from "../utils/logger.js";

/**
 * Get JWT secret with validation
 * @returns {string} JWT secret
 * @throws {Error} If JWT_SECRET is not set
 */
export function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET environment variable is required. Please set it in your .env file."
    );
  }
  return jwtSecret;
}

/**
 * Verify JWT token and return decoded user data
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded token data or null if invalid
 */
export function verifyToken(token) {
  try {
    if (!token) {
      return null;
    }

    const jwtSecret = getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret);

    return decoded;
  } catch (error) {
    // Re-throw if it's a JWT_SECRET error
    if (error.message && error.message.includes("JWT_SECRET")) {
      throw error;
    }
    // Don't log expired token errors - it's expected behavior
    // Only log unexpected errors
    if (
      error.name !== "TokenExpiredError" &&
      error.name !== "JsonWebTokenError"
    ) {
      logger.error("Token verification error:", error);
    }
    return null;
  }
}

/**
 * Get user from request headers (for API routes)
 * Validates token AND verifies user exists in database
 * @param {Request} request - Next.js request object
 * @returns {object|null} - User data or null
 */
export async function getUserFromRequest(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      return null;
    }

    // CRITICAL: Verify user still exists in database
    // This prevents deleted users from accessing the system
    await connectDB();

    // Check if it's a student token or admin token
    if (decoded.type === "student" && decoded.studentId) {
      const Student = (await import("../models/Student.js")).default;
      const student = await Student.findById(decoded.studentId).select(
        "_id email status"
      );

      if (!student) {
        // User account has been deleted
        return null;
      }

      // Check if account is active
      if (student.status !== "active") {
        return null;
      }

      // Return decoded token with verified existence
      return decoded;
    } else if (decoded.userId) {
      // Admin user token
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(decoded.userId).select(
        "_id email role status"
      );

      if (!user) {
        // User account has been deleted
        return null;
      }

      // Check if account is active
      if (user.status !== "active") {
        return null;
      }

      // Return decoded token with verified existence
      return decoded;
    }

    // Invalid token format
    return null;
  } catch (error) {
    logger.error("Error getting user from request:", error);
    return null;
  }
}

/**
 * Check if user has required role
 * @param {string} userRole - User's role
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {boolean} - True if user has required role
 */
export function hasRole(userRole, requiredRoles) {
  if (!userRole) {
    return false;
  }

  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(userRole);
  }

  return userRole === requiredRoles;
}

/**
 * Check if user can perform action based on role
 * @param {string} userRole - User's role
 * @param {string} action - Action to perform (GET, POST, PUT, PATCH, DELETE)
 * @returns {boolean} - True if user can perform action
 */
export function canPerformAction(userRole, action) {
  if (!userRole) {
    return false;
  }

  const rolePermissions = {
    viewer: ["GET"],
    editor: ["GET", "PUT", "PATCH"],
    moderator: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    super_moderator: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    admin: ["GET", "POST", "PUT", "PATCH", "DELETE", "MANAGE_USERS"],
  };

  const allowedActions = rolePermissions[userRole] || [];
  return allowedActions.includes(action);
}

/**
 * Check if user can manage users (only admin)
 * @param {string} userRole - User's role
 * @returns {boolean} - True if user can manage users
 */
export function canManageUsers(userRole) {
  return userRole === "admin";
}
