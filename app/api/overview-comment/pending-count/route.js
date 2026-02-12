import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import OverviewComment from "@/models/OverviewComment";
import { requireAuth } from "@/middleware/authMiddleware";

/**
 * GET: Return count of overview comments with status "pending".
 * Admin auth required. Used by admin sidebar to show "Overview Comments (N)".
 */
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck && typeof authCheck.json === "function") {
      return authCheck;
    }
    if (!authCheck?.role) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const count = await OverviewComment.countDocuments({ status: "pending" });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("GET /api/overview-comment/pending-count error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get pending count" },
      { status: 500 }
    );
  }
}
