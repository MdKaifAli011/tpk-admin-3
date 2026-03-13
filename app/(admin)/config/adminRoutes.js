/**
 * Admin route permission config.
 * Each path prefix maps to the minimum role required to access it.
 * Longer paths are matched first (e.g. /admin/user-role before /admin).
 */

export const ROLE_ORDER = [
  "viewer",
  "editor",
  "moderator",
  "super_moderator",
  "admin",
];

/**
 * Route path prefix -> minimum role required.
 * Sorted by path length descending so longest match wins.
 */
const ROUTE_PERMISSIONS = [
  { path: "/admin/user-role", minRole: "admin" },
  { path: "/admin/overview-comments", minRole: "moderator" },
  { path: "/admin/notification", minRole: "moderator" },
  { path: "/admin/store", minRole: "moderator" },
  { path: "/admin/seo-import", minRole: "super_moderator" },
  { path: "/admin/bulk-import", minRole: "super_moderator" },
  { path: "/admin/book-import", minRole: "super_moderator" },
  { path: "/admin/url-export", minRole: "moderator" },
  { path: "/admin/analytics", minRole: "super_moderator" },
  { path: "/admin/lead", minRole: "admin" },
  { path: "/admin/student", minRole: "admin" },
  { path: "/admin/form", minRole: "admin" },
  { path: "/admin/profile", minRole: "viewer" },
  { path: "/admin/pages", minRole: "viewer" },
  { path: "/admin/discussion-import", minRole: "moderator" },
  { path: "/admin/discussion", minRole: "viewer" },
  { path: "/admin/download", minRole: "viewer" },
  { path: "/admin/course", minRole: "viewer" },
  { path: "/admin/media", minRole: "viewer" },
  { path: "/admin/blog-category", minRole: "viewer" },
  { path: "/admin/blog-comment", minRole: "viewer" },
  { path: "/admin/blog", minRole: "viewer" },
  { path: "/admin/practice", minRole: "viewer" },
  { path: "/admin/definitions", minRole: "viewer" },
  { path: "/admin/sub-topic", minRole: "viewer" },
  { path: "/admin/topic", minRole: "viewer" },
  { path: "/admin/chapter", minRole: "viewer" },
  { path: "/admin/unit", minRole: "viewer" },
  { path: "/admin/subject", minRole: "viewer" },
  { path: "/admin/exam-info", minRole: "viewer" },
  { path: "/admin/exam", minRole: "viewer" },
  { path: "/admin/site-settings", minRole: "admin" },
  { path: "/admin/email-settings", minRole: "admin" },
  { path: "/admin", minRole: "viewer" },
].sort((a, b) => b.path.length - a.path.length);

/**
 * Normalize role string to canonical key (lowercase, no spaces).
 */
export function normalizeRole(role) {
  if (!role) return "viewer";
  return (
    String(role)
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "") || "viewer"
  );
}

/**
 * Get numeric level for role (higher = more power).
 */
export function getRoleLevel(role) {
  const normalized = normalizeRole(role);
  const index = ROLE_ORDER.indexOf(normalized);
  return index === -1 ? 0 : index;
}

/**
 * Check if userRole has at least the same level as requiredRole.
 */
export function hasMinimumRole(userRole, requiredRole) {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Get minimum role required for a path (pathname).
 * Uses longest matching prefix.
 */
export function getMinRoleForPath(pathname) {
  if (!pathname) return "admin"; // unknown path = restrict
  const normalized = pathname.replace(/\/$/, "") || "/";
  const entry = ROUTE_PERMISSIONS.find(
    (r) => normalized === r.path || normalized.startsWith(r.path + "/"),
  );
  return entry ? entry.minRole : "admin";
}

/**
 * Check if a user with userRole can access the given pathname.
 */
export function canAccessRoute(pathname, userRole) {
  if (
    !pathname ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/register")
  ) {
    return true;
  }
  const minRole = getMinRoleForPath(pathname);
  return hasMinimumRole(userRole, minRole);
}
