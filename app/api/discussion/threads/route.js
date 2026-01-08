
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import Student from "@/models/Student";
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

        const sort = searchParams.get("sort") || "new"; // new, hot
        const search = searchParams.get("search");
        const tag = searchParams.get("tag"); // e.g., Urgent

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

        // Sorting
        let sortOption = { isPinned: -1, createdAt: -1 }; // Default new
        if (sort === "hot") {
            sortOption = { isPinned: -1, views: -1, replyCount: -1 };
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
