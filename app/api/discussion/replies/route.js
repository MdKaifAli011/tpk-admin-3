
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Reply from "@/models/Reply";
import Thread from "@/models/Thread";
import { verifyStudentToken } from "@/lib/studentAuth";

// Helper to get user
async function getUser(request) {
    // 1. Try Admin first
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { verifyToken } = await import("@/lib/auth");
        try {
            const decoded = verifyToken(token);
            if (decoded) return { id: decoded.userId || decoded.id, type: "User" };
        } catch (e) { /* ignore */ }
    }

    // 2. Try student
    const { verifyStudentToken } = await import("@/lib/studentAuth");
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) return { id: studentAuth.studentId, type: "Student" };

    // 3. Try Guest
    const guestId = request.headers.get("x-guest-id");
    const guestName = request.headers.get("x-guest-name");
    if (guestId) return { id: guestId, name: guestName || "Guest", type: "Guest" };

    return null;
}

export async function POST(request) {
    try {
        const user = await getUser(request);
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await request.json();
        const { threadId, content, parentReplyId } = body;

        if (!threadId || !content) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const reply = await Reply.create({
            threadId,
            content,
            parentReplyId: parentReplyId || null,
            author: user.type === "Guest" ? null : user.id,
            authorType: user.type,
            guestName: user.type === "Guest" ? user.name : user.type === "User" ? "TestPrepKart" : undefined,
            isApproved: user.type === "User", // Only Admin/User replies are auto-approved, Students and Guests need approval
        });

        return NextResponse.json({
            success: true,
            data: reply,
            message: "Reply posted successfully"
        });

    } catch (error) {
        console.error("Error posting reply:", error);
        return NextResponse.json(
            { success: false, message: "Failed to post reply" },
            { status: 500 }
        );
    }
}
