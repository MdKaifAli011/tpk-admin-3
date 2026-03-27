// ============================================
// API Response Utility Functions
// ============================================

import { NextResponse } from "next/server";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";
import { logger } from "@/utils/logger";

// Avoid log flooding for repeated transient DB connectivity failures.
let lastDbErrorLogAt = 0;
const DB_ERROR_LOG_THROTTLE_MS = 30000;

function isDbConnectionError(error) {
  const name = error?.name || "";
  const message = error?.message || "";
  return (
    name === "MongooseServerSelectionError" ||
    /ECONNREFUSED|MongooseServerSelectionError|Mongo(Network|ServerSelection)Error/i.test(
      message
    )
  );
}

/**
 * Create standardized success response
 */
export function successResponse(data, message = SUCCESS_MESSAGES.FETCHED, status = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create standardized error response
 */
export function errorResponse(
  message = ERROR_MESSAGES.SOMETHING_WENT_WRONG,
  status = 500,
  errors = null
) {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create validation error response
 */
export function validationErrorResponse(errors) {
  return errorResponse(ERROR_MESSAGES.VALIDATION_ERROR, 400, errors);
}

/**
 * Create not found response
 */
export function notFoundResponse(message = ERROR_MESSAGES.NOT_FOUND) {
  return errorResponse(message, 404);
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse() {
  return errorResponse(ERROR_MESSAGES.UNAUTHORIZED, 401);
}

/**
 * Create forbidden response
 */
export function forbiddenResponse() {
  return errorResponse(ERROR_MESSAGES.FORBIDDEN, 403);
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error, customMessage = null) {
  if (isDbConnectionError(error)) {
    const now = Date.now();
    if (now - lastDbErrorLogAt > DB_ERROR_LOG_THROTTLE_MS) {
      lastDbErrorLogAt = now;
      logger.error("API Error: Database unavailable", {
        message: error?.message || "MongoDB connection failed",
      });
    }
    return errorResponse(
      "Database is temporarily unavailable. Please try again shortly.",
      503
    );
  }

  logger.error("API Error:", {
    name: error?.name,
    message: error?.message || String(error),
  });
  
  // Handle Mongoose validation errors
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return validationErrorResponse(errors);
  }
  
  // Handle Mongoose duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return errorResponse(
      `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      409
    );
  }
  
  // Handle Mongoose cast errors (invalid ID)
  if (error.name === "CastError") {
    return errorResponse("Invalid ID format", 400);
  }
  
  // Return custom message or generic error
  return errorResponse(
    customMessage || ERROR_MESSAGES.SOMETHING_WENT_WRONG,
    500
  );
}


