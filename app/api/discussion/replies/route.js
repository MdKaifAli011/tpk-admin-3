
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Reply from "@/models/Reply";
import Thread from "@/models/Thread";
import { verifyStudentToken } from "@/lib/studentAuth";

// Helper to get user
async function getUser(request) {
    // Try student first (Primary users)
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) {
        return { id: studentAuth.studentId, type: "Student" };
    }
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
            author: user.id,
            authorType: user.type,
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
