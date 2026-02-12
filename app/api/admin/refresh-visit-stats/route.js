import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/authMiddleware";

/**
 * POST /api/admin/refresh-visit-stats
 * Admin-only. Triggers the visit-stats cron (with test=1) using CRON_SECRET from env.
 * Does not expose the secret to the client.
 */
export async function POST(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck && typeof authCheck.json === "function") {
      return authCheck;
    }
    if (!authCheck?.role) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, message: "CRON_SECRET is not configured" },
        { status: 500 }
      );
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const port = process.env.PORT || 3000;
    // Call cron on local HTTP to avoid SSL errors (VPS: Nginx terminates SSL; Node is HTTP only)
    const cronUrl = `http://127.0.0.1:${port}${basePath}/api/cron/update-visit-stats?secret=${encodeURIComponent(secret)}&test=1`;

    const res = await fetch(cronUrl, { method: "GET" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || data?.error || "Cron request failed", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data?.message || "Visit stats refresh started",
      data: { ok: data.ok, results: data.results, durationMs: data.durationMs },
    });
  } catch (error) {
    console.error("admin refresh-visit-stats error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to refresh visit stats" },
      { status: 500 }
    );
  }
}
