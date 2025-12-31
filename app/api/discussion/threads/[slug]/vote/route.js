
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
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

    // fallback to IP for guest voting tracking if needed, 
    // but for now let's use a header provided by the client if they are a guest
    const guestId = request.headers.get("x-guest-id");
    if (guestId) return { id: guestId, type: "Guest" };

    return null;
}

export async function POST(request, { params }) {
    try {
        const { slug } = await params;
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { voteType } = body; // 'upvote' or 'downvote'

        if (user.type === "Guest" && voteType === "downvote") {
            return NextResponse.json({ success: false, message: "Guests cannot downvote" }, { status: 403 });
        }

        await connectDB();
        const thread = await Thread.findOne({ slug });

        if (!thread) {
            return NextResponse.json({ success: false, message: "Thread not found" }, { status: 404 });
        }

        const userId = user.id;

        // Remove from both first to toggle
        thread.upvotes = thread.upvotes.filter(id => id.toString() !== userId.toString());
        thread.downvotes = thread.downvotes.filter(id => id.toString() !== userId.toString());

        if (voteType === "upvote") {
            thread.upvotes.push(userId);
        } else if (voteType === "downvote") {
            thread.downvotes.push(userId);
        }

        await thread.save();

        return NextResponse.json({
            success: true,
            data: {
                upvotes: thread.upvotes,
                downvotes: thread.downvotes,
                score: thread.upvotes.length - thread.downvotes.length
            }
        });

    } catch (error) {
        console.error("Error voting on thread:", error);
        return NextResponse.json({ success: false, message: "Failed to vote" }, { status: 500 });
    }
}
