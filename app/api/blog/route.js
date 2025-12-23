import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Blog from "@/models/Blog";
import {
    successResponse,
    errorResponse,
    handleApiError,
} from "@/utils/apiResponse";
import { requireAction, requireAuth } from "@/middleware/authMiddleware";
import { STATUS } from "@/constants";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get("status") || "all";
        const examId = searchParams.get("examId");

        // Allow public access for active blogs only (for public blog pages)
        // Require authentication for inactive/all blogs (admin access)
        const isPublicRequest = statusFilter === "active" || statusFilter === STATUS.ACTIVE;
        
        if (!isPublicRequest) {
            const authCheck = await requireAuth(request);
            if (authCheck.error) {
                return NextResponse.json(authCheck, { status: authCheck.status || 401 });
            }
        }

        await connectDB();

        let query = {};
        if (statusFilter !== "all") {
            query.status = statusFilter;
        }

        // Filter by examId if provided
        if (examId) {
            query.examId = examId;
        }

        // Sort by newest first and populate Exam and Category
        const blogs = await Blog.find(query)
            .sort({ createdAt: -1 })
            .populate("examId", "name slug")
            .populate("categoryId", "name");

        return successResponse(blogs);
    } catch (error) {
        return handleApiError(error, "Failed to fetch blogs");
    }
}

export async function POST(request) {
    try {
        // Check permissions
        const authCheck = await requireAuth(request);
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 403 });
        }

        // Ensure user has permission to create (admin or specific role)
        // For now, we assume any auth user can create, or restrict to admin:
        if (authCheck.role !== 'admin' && authCheck.role !== 'sub_admin') { // Adjust based on roles
            // access control can be stricter if needed
        }

        await connectDB();
        const body = await request.json();

        if (!body.name || !body.name.trim()) {
            return errorResponse("Blog name is required", 400);
        }

        const newBlog = await Blog.create({
            name: body.name.trim(),
            category: body.category || "", // Legacy field
            categoryId: body.categoryId || null,
            status: body.status || "draft",
            examId: body.examId || null,
            image: body.image || "",
            author: authCheck.name || authCheck.email || "Admin", // Auto-detect author
        });

        return successResponse(newBlog, "Blog created successfully", 201);
    } catch (error) {
        if (error.code === 11000) {
            return errorResponse("A blog with this name already exists", 409);
        }
        return handleApiError(error, "Failed to create blog");
    }
}
