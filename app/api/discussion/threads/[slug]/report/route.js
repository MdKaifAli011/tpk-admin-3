
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { buildThreadQuery } from "@/lib/discussionThreadQuery";
import Thread from "@/models/Thread";
import { verifyToken } from "@/lib/auth";
import { verifyStudentToken } from "@/lib/studentAuth";

async function getUser(request) {
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) return { id: studentAuth.studentId, type: "Student" };

    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { verifyToken } = await import("@/lib/auth");
        const decoded = verifyToken(token);
        if (decoded) return { id: decoded.userId || decoded.id, type: "User" };
    }

    const guestId = request.headers.get("x-guest-id");
    if (guestId) return { id: guestId, type: "Guest" };

    return null;
}

export async function POST(request, { params }) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(request.url);
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { reason } = body;

        await connectDB();
        const threadQuery = buildThreadQuery(slug, searchParams);
        const thread = await Thread.findOne(threadQuery);

        if (!thread) {
            return NextResponse.json({ success: false, message: "Thread not found" }, { status: 404 });
        }

        const userId = user.id.toString();

        // Check if already reported by this user
        const alreadyReported = thread.reports.some(r => r.reporterId === userId);
        if (alreadyReported) {
            return NextResponse.json({ success: false, message: "You have already reported this post" }, { status: 400 });
        }

        thread.reports.push({
            reporterId: userId,
            reason: reason || "Inappropriate content"
        });

        await thread.save();

        return NextResponse.json({
            success: true,
            message: "Report submitted successfully"
        });

    } catch (error) {
        console.error("Error reporting thread:", error);
        return NextResponse.json({ success: false, message: "Failed to submit report" }, { status: 500 });
    }
}
