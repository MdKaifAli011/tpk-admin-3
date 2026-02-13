import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Reply from "@/models/Reply";
import { verifyToken } from "@/lib/auth";

/**
 * GET: Return count of threads that have at least one reply pending approval.
 * Admin auth required. Used by admin Discussion tab for "Reply pending (N)" badge.
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
        const threadIds = await Reply.distinct("threadId", { isApproved: false });
        const count = threadIds.length;

        return NextResponse.json({ success: true, count });
    } catch (error) {
        console.error("GET /api/discussion/threads/reply-pending-count error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to get reply-pending count" },
            { status: 500 }
        );
    }
}
