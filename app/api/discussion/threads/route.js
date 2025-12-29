
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import Student from "@/models/Student";
import { verifyToken } from "@/lib/auth"; // For admin
import { verifyStudentToken } from "@/lib/studentAuth"; // For student

// Helper to get user from request (either Student or Admin)
async function getUser(request) {
    // Try student first
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) {
        return { id: studentAuth.studentId, type: "Student" };
    }

    // Try admin
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token); // Verify admin token
        if (decoded) {
            // Since the Auth logic puts ID in decoded.id or similar, adapt as needed.
            // Assuming standard admin auth logic here
            return { id: decoded.userId || decoded.id, type: "User" };
        }
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
        let sortOption = { createdAt: -1 }; // Default new
        if (sort === "hot") {
            sortOption = { views: -1, replyCount: -1 };
        }

        // Pagination
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const threads = await Thread.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .populate("author", "firstName lastName avatar email role") // Populate author details
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
            author: user.id,
            authorType: user.type,
            tags: body.tags || ["General"],
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
