"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { canAccessRoute, normalizeRole } from "../../config/adminRoutes";

/**
 * Route-level permission guard.
 * Token verification is handled by the parent AdminLayout (with 45s cache),
 * so this component only reads the already-verified user from localStorage
 * and enforces per-route role restrictions.
 */
const AuthGuard = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(true);
  const lastCheckedPath = useRef("");

  useEffect(() => {
    if (
      pathname?.endsWith("/admin/login") ||
      pathname?.endsWith("/admin/register")
    ) {
      setAllowed(true);
      return;
    }

    if (lastCheckedPath.current === pathname) return;
    lastCheckedPath.current = pathname;

    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const userData = JSON.parse(raw);
      const role = normalizeRole(userData.role);
      if (!canAccessRoute(pathname, role)) {
        router.replace("/admin");
        setAllowed(false);
        return;
      }
    } catch (_) {
      // ignore parse errors — layout handles full auth
    }
    setAllowed(true);
  }, [pathname, router]);

  if (!allowed) return null;

  return <>{children}</>;
};

export default AuthGuard;
