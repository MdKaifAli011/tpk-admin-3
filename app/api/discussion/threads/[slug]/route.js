
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import Reply from "@/models/Reply";
import Student from "@/models/Student"; // Populate 

export async function GET(request, { params }) {
    try {
        await connectDB();
        const { slug } = await params;

        // 1. Fetch Thread
        const thread = await Thread.findOne({ slug })
            .populate("author", "firstName lastName avatar role")
            .populate("examId", "name slug")
            .populate("subjectId", "name slug")
            .populate("unitId", "name slug")
            .populate("chapterId", "name slug")
            .populate("topicId", "name slug")
            .populate("subTopicId", "name slug")
            .lean();

        if (!thread) {
            return NextResponse.json(
                { success: false, message: "Thread not found" },
                { status: 404 }
            );
        }

        // Increment views (Non-blocking)
        // We don't await this to speed up response, or use findOneAndUpdate
        Thread.updateOne({ _id: thread._id }, { $inc: { views: 1 } }).exec();

        // 2. Fetch Replies (Hierarchy)
        const { searchParams } = new URL(request.url);
        const sort = searchParams.get("sort") || "top";

        let replySort = { isAccepted: -1, upvotes: -1, createdAt: 1 };
        if (sort === "new") {
            replySort = { createdAt: -1 };
        }

        const user = await getUser(request);
        const isAdmin = user?.type === "User";

        const replyQuery = { threadId: thread._id };
        if (!isAdmin) {
            replyQuery.isApproved = { $ne: false };
        }

        const replies = await Reply.find(replyQuery)
            .sort(replySort)
            .populate("author", "firstName lastName avatar role")
            .lean();

        // 3. User Context (for isLiked/isDisliked/isSubscribed)
        const upvotes = thread.upvotes || [];
        const downvotes = thread.downvotes || [];
        const subscribers = thread.subscribers || [];
        const userId = user?.id?.toString();

        thread.score = upvotes.length - downvotes.length;
        thread.isLiked = userId ? upvotes.includes(userId) : false;
        thread.isDisliked = userId ? downvotes.includes(userId) : false;
        thread.isSubscribed = userId ? subscribers.includes(userId) : false;

        // Add metadata to replies
        replies.forEach(reply => {
            const rUp = reply.upvotes || [];
            const rDown = reply.downvotes || [];
            reply.score = rUp.length - rDown.length;
            reply.isLiked = userId ? rUp.includes(userId) : false;
            reply.isDisliked = userId ? rDown.includes(userId) : false;
        });

        return NextResponse.json({
            success: true,
            data: {
                thread,
                replies
            }
        });

    } catch (error) {
        console.error("Error fetching thread detail:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch thread" },
            { status: 500 }
        );
    }
}

// Helper to get user from request
async function getUser(request) {
    // 1. Try admin first (Crucial for moderation)
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
            const token = authHeader.substring(7);
            const { verifyToken } = await import("@/lib/auth");
            const decoded = verifyToken(token);
            if (decoded) return { id: decoded.userId || decoded.id, role: decoded.role, type: "User" };
        } catch (e) { /* ignore */ }
    }

    // 2. Try student
    const { verifyStudentToken } = await import("@/lib/studentAuth");
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) {
        return { id: studentAuth.studentId, type: "Student" };
    }

    // 3. Try Guest
    const guestId = request.headers.get("x-guest-id");
    const guestName = request.headers.get("x-guest-name");
    if (guestId) return { id: guestId, name: guestName, type: "Guest" };

    return null;
}

export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const { slug } = await params;
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const thread = await Thread.findOne({ slug });
        if (!thread) {
            return NextResponse.json({ success: false, message: "Thread not found" }, { status: 404 });
        }

        // Allow deletion if Admin or Author
        const isAdmin = user.type === "User";
        const isAuthor = (thread.author && thread.author.toString() === user.id) ||
            (thread.authorType === "Guest" && user.type === "Guest" && thread.guestName === user.name);

        if (!isAdmin && !isAuthor) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        // Delete thread and replies
        await Thread.deleteOne({ _id: thread._id });
        await Reply.deleteMany({ threadId: thread._id });

        return NextResponse.json({ success: true, message: "Thread deleted successfully" });
    } catch (error) {
        console.error("Delete thread error:", error);
        return NextResponse.json({ success: false, message: "Failed to delete thread" }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        await connectDB();
        const { slug } = await params;
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const thread = await Thread.findOne({ slug });
        if (!thread) {
            return NextResponse.json({ success: false, message: "Thread not found" }, { status: 404 });
        }

        const body = await request.json();
        const isAdmin = user.type === "User";
        const isAuthor = (thread.author && thread.author.toString() === user.id) ||
            (thread.authorType === "Guest" && user.type === "Guest" && thread.guestName === user.name);

        // Admin actions: Pin
        if (body.isPinned !== undefined) {
            if (!isAdmin) return NextResponse.json({ success: false, message: "Only admins can pin threads" }, { status: 403 });
            thread.isPinned = body.isPinned;
        }

        if (body.isApproved !== undefined) {
            if (!isAdmin) return NextResponse.json({ success: false, message: "Only admins can approve threads" }, { status: 403 });
            thread.isApproved = body.isApproved;
        }

        // Author/Admin actions: Edit Content, Mark Solved
        if (body.title && (isAuthor || isAdmin)) thread.title = body.title;
        if (body.content && (isAuthor || isAdmin)) thread.content = body.content;
        if (body.isSolved !== undefined && (isAuthor || isAdmin)) thread.isSolved = body.isSolved;

        await thread.save();

        return NextResponse.json({ success: true, data: thread, message: "Thread updated" });

    } catch (error) {
        console.error("Update thread error:", error);
        return NextResponse.json({ success: false, message: "Failed to update thread" }, { status: 500 });
    }
}
