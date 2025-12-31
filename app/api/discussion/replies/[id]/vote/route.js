
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Reply from "@/models/Reply";
import { verifyToken } from "@/lib/auth";
import { verifyStudentToken } from "@/lib/studentAuth";

async function getUser(request) {
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) return { id: studentAuth.studentId, type: "Student" };

    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (decoded) return { id: decoded.userId || decoded.id, type: "User" };
    }

    const guestId = request.headers.get("x-guest-id");
    if (guestId) return { id: guestId, type: "Guest" };

    return null;
}

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { voteType } = body;

        if (user.type === "Guest" && voteType === "downvote") {
            return NextResponse.json({ success: false, message: "Guests cannot downvote" }, { status: 403 });
        }

        await connectDB();
        const reply = await Reply.findById(id);

        if (!reply) {
            return NextResponse.json({ success: false, message: "Reply not found" }, { status: 404 });
        }

        const userId = user.id;

        reply.upvotes = reply.upvotes.filter(uid => uid.toString() !== userId.toString());
        reply.downvotes = reply.downvotes.filter(uid => uid.toString() !== userId.toString());

        if (voteType === "upvote") {
            reply.upvotes.push(userId);
        } else if (voteType === "downvote") {
            reply.downvotes.push(userId);
        }

        await reply.save();

        return NextResponse.json({
            success: true,
            data: {
                upvotes: reply.upvotes,
                downvotes: reply.downvotes,
                score: reply.upvotes.length - reply.downvotes.length
            }
        });

    } catch (error) {
        console.error("Error voting on reply:", error);
        return NextResponse.json({ success: false, message: "Failed to vote" }, { status: 500 });
    }
}
