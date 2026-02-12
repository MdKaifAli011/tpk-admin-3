import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import { verifyToken } from "@/lib/auth";

/**
 * GET: Return only the count of pending (unapproved) threads.
 * Admin auth required. Used by admin sidebar to show "Discussion (N)" without loading thread list.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (e) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }
    if (!decoded?.userId && !decoded?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const count = await Thread.countDocuments({ isApproved: false });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("GET /api/discussion/threads/pending-count error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get pending count" },
      { status: 500 }
    );
  }
}
