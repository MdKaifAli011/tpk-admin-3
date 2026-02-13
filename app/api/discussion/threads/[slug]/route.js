import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { buildThreadQuery } from "@/lib/discussionThreadQuery";
import Thread from "@/models/Thread";
import Reply from "@/models/Reply";
import Student from "@/models/Student";
// Import models needed for populate
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";

export async function GET(request, { params }) {
    try {
        await connectDB();
        const { slug } = await params;
        const { searchParams } = new URL(request.url);

        if (!slug) {
            return NextResponse.json(
                { success: false, message: "Thread slug is required" },
                { status: 400 }
            );
        }

        const user = await getUser(request);
        const isAdmin = user?.type === "User";

        // Slug is unique per hierarchy: same slug can exist under different exam/subject/unit/...
        const threadQuery = buildThreadQuery(slug, searchParams);
        
        if (!isAdmin) {
            const threadCheck = await Thread.findOne(threadQuery)
                .select("author authorType guestName isApproved")
                .lean();
            
            if (threadCheck) {
                const isAuthor = 
                    (threadCheck.author && user?.id && threadCheck.author.toString() === user.id.toString()) ||
                    (threadCheck.authorType === "Guest" && user?.type === "Guest" && threadCheck.guestName === user.name);
                
                // If user is the author, they can see their own thread even if unapproved
                // Otherwise, only show approved threads
                if (!isAuthor) {
                    threadQuery.isApproved = true;
                }
                // If isAuthor is true, don't add isApproved filter - allow unapproved threads for authors
            } else {
                // Thread doesn't exist, but we'll let the query below handle the 404
                threadQuery.isApproved = true;
            }
        }

        // 1. Fetch Thread
        const thread = await Thread.findOne(threadQuery)
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
                { success: false, message: "Thread not found or pending approval" },
                { status: 404 }
            );
        }

        // Increment views (Non-blocking)
        Thread.updateOne({ _id: thread._id }, { $inc: { views: 1 } }).exec();

        const sort = searchParams.get("sort") || "top";
        const replyPage = parseInt(searchParams.get("replyPage") || "1");
        const replyLimit = parseInt(searchParams.get("replyLimit") || "10");
        const replySearch = searchParams.get("replySearch");

        let replySort = { isAccepted: -1, upvotes: -1, createdAt: 1 };
        if (sort === "new") {
            replySort = { createdAt: -1 };
        }

        const replyQuery = { threadId: thread._id };
        if (!isAdmin) {
            replyQuery.isApproved = true;
        }

        let replies = [];
        let totalReplies = 0;
        let totalPages = 0;

        if (replySearch) {
            // Flattened search view
            replyQuery.content = { $regex: replySearch, $options: "i" };
            totalReplies = await Reply.countDocuments(replyQuery);
            totalPages = Math.ceil(totalReplies / replyLimit);

            replies = await Reply.find(replyQuery)
                .sort(replySort)
                .skip((replyPage - 1) * replyLimit)
                .limit(replyLimit)
                .populate("author", "firstName lastName avatar role")
                .lean();
        } else {
            // Paginated roots view (Nested)
            const rootQuery = { ...replyQuery, parentReplyId: null };
            const totalRoots = await Reply.countDocuments(rootQuery);
            totalPages = Math.ceil(totalRoots / replyLimit);

            const roots = await Reply.find(rootQuery)
                .sort(replySort)
                .skip((replyPage - 1) * replyLimit)
                .limit(replyLimit)
                .populate("author", "firstName lastName avatar role")
                .lean();

            // Fetch ALL other replies for this thread to find children
            // (In large scale, use rootId in schema)
            const children = await Reply.find({ ...replyQuery, parentReplyId: { $ne: null } })
                .sort({ createdAt: 1 })
                .populate("author", "firstName lastName avatar role")
                .lean();

            replies = [...roots, ...children];
            totalReplies = totalRoots;
        }

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
                replies,
                pagination: {
                    total: totalReplies,
                    page: replyPage,
                    limit: replyLimit,
                    pages: totalPages
                }
            }
        });

    } catch (error) {
        const { slug: errorSlug } = await params;
        console.error("Error fetching thread detail:", {
            message: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
            slug: errorSlug,
        });
        return NextResponse.json(
            { success: false, message: error.message || "Failed to fetch thread" },
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
