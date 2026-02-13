
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { buildThreadQuery } from "@/lib/discussionThreadQuery";
import Thread from "@/models/Thread";
import { verifyStudentToken } from "@/lib/studentAuth";
import { verifyToken } from "@/lib/auth";

// Helper to get user
async function getUser(request) {
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) return { id: studentAuth.studentId, type: "Student" };

    // Admin/User fallback
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            if (decoded) return { id: decoded.userId || decoded.id, type: "User" };
        } catch (e) { /* ignore */ }
    }
    return null;
}

export async function POST(request, { params }) {
    try {
        await connectDB();
        const { slug } = await params;
        const { searchParams } = new URL(request.url);
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const threadQuery = buildThreadQuery(slug, searchParams);
        const thread = await Thread.findOne(threadQuery);
        if (!thread) {
            return NextResponse.json({ success: false, message: "Thread not found" }, { status: 404 });
        }

        // Toggle Like
        const userIdStr = user.id.toString();
        const index = thread.upvotes.indexOf(userIdStr);

        if (index === -1) {
            // Like
            thread.upvotes.push(userIdStr);
        } else {
            // Unlike
            thread.upvotes.splice(index, 1);
        }

        await thread.save();

        return NextResponse.json({
            success: true,
            data: thread.upvotes,
            message: index === -1 ? "Liked" : "Unliked"
        });

    } catch (error) {
        console.error("Like error:", error);
        return NextResponse.json({ success: false, message: "Failed to like thread" }, { status: 500 });
    }
}
