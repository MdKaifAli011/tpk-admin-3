import { getUserFromRequest, canPerformAction, canManageUsers } from "@/lib/auth";
import { errorResponse } from "@/utils/apiResponse";

/**
 * Middleware to check if user is authenticated
 * @param {Request} request - Next.js request object
 * @returns {object|null} - User data or null
 */
export async function requireAuth(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  return user;
}

/**
 * Middleware to check if user has required role
 * @param {Request} request - Next.js request object
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {object|null} - User data or null
 */
export async function requireRole(request, requiredRoles) {
  const user = await requireAuth(request);

  if (user.error) {
    return user; // Return error response
  }

  const userRole = user.role;

  if (Array.isArray(requiredRoles)) {
    if (!requiredRoles.includes(userRole)) {
      return errorResponse("Insufficient permissions", 403);
    }
  } else {
    if (userRole !== requiredRoles) {
      return errorResponse("Insufficient permissions", 403);
    }
  }

  return user;
}

/**
 * Middleware to check if user can perform action
 * @param {Request} request - Next.js request object
 * @param {string} action - Action to perform (GET, POST, PUT, PATCH, DELETE)
 * @returns {object|null} - User data or null
 */
export async function requireAction(request, action) {
  const user = await requireAuth(request);

  if (user.error) {
    return user; // Return error response
  }

  if (!canPerformAction(user.role, action)) {
    return errorResponse(
      `You don't have permission to ${action.toLowerCase()} this resource`,
      403
    );
  }

  return user;
}

/**
 * Middleware to check if user can manage users (only admin)
 * @param {Request} request - Next.js request object
 * @returns {object|null} - User data or null
 */
export async function requireUserManagement(request) {
  const user = await requireAuth(request);

  if (user.error) {
    return user; // Return error response
  }

  if (!canManageUsers(user.role)) {
    return errorResponse("Only administrators can manage users", 403);
  }

  return user;
}


