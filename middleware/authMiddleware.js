import {
  getUserFromRequest,
  canPerformAction,
  canManageUsers,
} from "@/lib/auth";

/** Plain error object for routes to return as JSON (routes check authCheck.error) */
function authError(message, status = 401) {
  return { error: true, success: false, message, status };
}

/**
 * Middleware to check if user is authenticated
 * @param {Request} request - Next.js request object
 * @returns {object} - User data or { error, success, message, status }
 */
export async function requireAuth(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return authError("Authentication required", 401);
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
    return user;
  }

  const userRole = user.role;

  if (Array.isArray(requiredRoles)) {
    if (!requiredRoles.includes(userRole)) {
      return authError("Insufficient permissions", 403);
    }
  } else {
    if (userRole !== requiredRoles) {
      return authError("Insufficient permissions", 403);
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
    return user;
  }

  if (!canPerformAction(user.role, action)) {
    return authError(
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
    return user;
  }

  if (!canManageUsers(user.role)) {
    return authError("Only administrators can manage users", 403);
  }

  return user;
}


