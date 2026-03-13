
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import { buildThreadQuery } from "@/lib/discussionThreadQuery";
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

        await connectDB();
        const threadQuery = buildThreadQuery(slug, searchParams);
        const thread = await Thread.findOne(threadQuery);

        if (!thread) {
            return NextResponse.json({ success: false, message: "Thread not found" }, { status: 404 });
        }

        const userId = user.id.toString();
        const isSubscribed = thread.subscribers.includes(userId);

        if (isSubscribed) {
            thread.subscribers = thread.subscribers.filter(id => id !== userId);
        } else {
            thread.subscribers.push(userId);
        }

        await thread.save();

        return NextResponse.json({
            success: true,
            isSubscribed: !isSubscribed,
            message: !isSubscribed ? "Subscribed to thread" : "Unsubscribed from thread"
        });

    } catch (error) {
        console.error("Error subscribing to thread:", error);
        return NextResponse.json({ success: false, message: "Failed to toggle subscription" }, { status: 500 });
    }
}
