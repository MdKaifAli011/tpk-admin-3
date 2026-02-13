
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import Reply from "@/models/Reply";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import { verifyToken } from "@/lib/auth"; // For admin
import { verifyStudentToken } from "@/lib/studentAuth"; // For student

// Helper to get user from request (either Student, Admin, or Guest)
async function getUser(request) {
    // 1. Try Admin first (Crucial for moderation logic)
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
            const decoded = verifyToken(token);
            if (decoded) {
                return { id: decoded.userId || decoded.id, type: "User" };
            }
        } catch (e) { /* ignore admin token error */ }
    }

    // 2. Try student
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) {
        return { id: studentAuth.studentId, type: "Student" };
    }

    // 3. Try Guest
    const guestId = request.headers.get("x-guest-id");
    const guestName = request.headers.get("x-guest-name");
    if (guestId) {
        return { id: guestId, name: guestName || "Guest", type: "Guest" };
    }

    return null;
}

// GET: List threads (filtered)
export async function GET(request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);

        // Filters
        const examId = searchParams.get("examId");
        const subjectId = searchParams.get("subjectId");
        const unitId = searchParams.get("unitId");
        const chapterId = searchParams.get("chapterId");
        const topicId = searchParams.get("topicId");
        const subTopicId = searchParams.get("subTopicId");

        const sort = searchParams.get("sort") || "new"; // new, hot, views, date_asc, date_desc
        const search = searchParams.get("search");
        const tag = searchParams.get("tag"); // e.g., Urgent
        const dateFrom = searchParams.get("dateFrom"); // YYYY-MM-DD
        const dateTo = searchParams.get("dateTo"); // YYYY-MM-DD

        const query = {};

        // Hierarchy filters (sparse logic - if provided, match it)
        if (examId) query.examId = examId;
        if (subjectId) query.subjectId = subjectId;
        if (unitId) query.unitId = unitId;
        if (chapterId) query.chapterId = chapterId;
        if (topicId) query.topicId = topicId;
        if (subTopicId) query.subTopicId = subTopicId;

        // Moderation filter
        const user = await getUser(request);
        const isAdmin = user?.type === "User";
        const status = searchParams.get("status"); // 'all', 'approved', 'pending'

        if (!isAdmin) {
            // For students/guests, show ONLY approved content
            query.isApproved = true;
        } else if (status === "pending") {
            query.isApproved = false;
        } else if (status === "approved") {
            query.isApproved = true;
        } else if (status === "reply_pending") {
            // Threads that have at least one reply pending approval
            const threadIdsWithPendingReplies = await Reply.distinct("threadId", { isApproved: false });
            query._id = { $in: threadIdsWithPendingReplies };
            if (threadIdsWithPendingReplies.length === 0) {
                // No threads have pending replies; return empty result
                return NextResponse.json({
                    success: true,
                    data: [],
                    pagination: { total: 0, page: 1, limit: parseInt(searchParams.get("limit") || "10", 10), pages: 0 }
                });
            }
        } // if status='all' or not provided for admin, show all

        // Text Search
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { content: { $regex: search, $options: "i" } }
            ];
        }

        // Tag Filter
        if (tag && tag !== "All Topics" && tag !== "All") {
            query.tags = tag;
        }

        // Date range filter (createdAt)
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) {
                query.createdAt.$gte = new Date(dateFrom + "T00:00:00.000Z");
            }
            if (dateTo) {
                query.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z");
            }
        }

        // Sorting
        let sortOption = { isPinned: -1, createdAt: -1 }; // Default new
        if (sort === "hot") {
            sortOption = { isPinned: -1, views: -1, replyCount: -1 };
        } else if (sort === "views") {
            sortOption = { isPinned: -1, views: -1, createdAt: -1 };
        } else if (sort === "date_asc") {
            sortOption = { isPinned: -1, createdAt: 1 }; // Oldest first
        } else if (sort === "date_desc") {
            sortOption = { isPinned: -1, createdAt: -1 }; // Newest first
        }

        // Pagination
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const threads = await Thread.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .populate("author", "firstName lastName avatar email role")
            .populate("examId", "name slug")
            .populate("subjectId", "name slug")
            .populate("unitId", "name slug")
            .populate("chapterId", "name slug")
            .populate("topicId", "name slug")
            .populate("subTopicId", "name slug")
            .lean();

        const total = await Thread.countDocuments(query);

        // For admin: attach total reply count and pending reply count per thread
        if (isAdmin && threads.length > 0) {
            const threadIds = threads.map((t) => t._id);
            const counts = await Reply.aggregate([
                { $match: { threadId: { $in: threadIds } } },
                {
                    $group: {
                        _id: "$threadId",
                        totalReplies: { $sum: 1 },
                        pendingReplies: { $sum: { $cond: [{ $eq: ["$isApproved", false] }, 1, 0] } },
                    },
                },
            ]);
            const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), { totalReplies: c.totalReplies, pendingReplies: c.pendingReplies }]));
            threads.forEach((t) => {
                const c = countMap[t._id.toString()];
                t.totalReplies = c ? c.totalReplies : (t.replyCount || 0);
                t.pendingReplies = c ? c.pendingReplies : 0;
            });
        }

        return NextResponse.json({
            success: true,
            data: threads,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching threads:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch threads" },
            { status: 500 }
        );
    }
}

// POST: Create new thread
export async function POST(request) {
    try {
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();
        const body = await request.json();

        // Validate required fields
        if (!body.title || !body.content) {
            return NextResponse.json(
                { success: false, message: "Title and content are required" },
                { status: 400 }
            );
        }

        const newThread = await Thread.create({
            ...body,
            author: user.type === "Guest" ? null : user.id,
            authorType: user.type,
            guestName: user.type === "Guest" ? user.name : undefined,
            contributorDisplayName: user.type === "User" ? "TestPrepKart" : undefined, // Admin-created threads show as TestPrepKart on frontend
            tags: body.tags || ["General"],
            isApproved: user.type === "User", // Only Admin/User posts are auto-approved, Students and Guests need approval
        });

        return NextResponse.json({
            success: true,
            data: newThread,
            message: "Thread created successfully"
        });

    } catch (error) {
        console.error("Error creating thread:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Failed to create thread" },
            { status: 500 }
        );
    }
}
