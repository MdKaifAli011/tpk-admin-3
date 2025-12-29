
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Reply from "@/models/Reply";
import { verifyStudentToken } from "@/lib/studentAuth";
import { verifyToken } from "@/lib/auth";

async function getUser(request) {
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) return { id: studentAuth.studentId, type: "Student" };

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
        const { id } = await params;
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const reply = await Reply.findById(id);
        if (!reply) {
            return NextResponse.json({ success: false, message: "Reply not found" }, { status: 404 });
        }

        // Toggle Like
        const userIdStr = user.id.toString();
        const index = reply.upvotes.indexOf(userIdStr);

        if (index === -1) {
            reply.upvotes.push(userIdStr);
        } else {
            reply.upvotes.splice(index, 1);
        }

        await reply.save();

        return NextResponse.json({
            success: true,
            data: reply.upvotes,
            message: index === -1 ? "Liked" : "Unliked"
        });

    } catch (error) {
        console.error("Like reply error:", error);
        return NextResponse.json({ success: false, message: "Failed to like reply" }, { status: 500 });
    }
}
