import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Blog from "@/models/Blog";
import mongoose from "mongoose";
import { successResponse, errorResponse, handleApiError, notFoundResponse } from "@/utils/apiResponse";
import { requireAction, requireAuth } from "@/middleware/authMiddleware";

export async function GET(request, { params }) {
    try {
        // Allow public access for reading blog (for public blog pages)
        // No auth required for GET requests

        await connectDB();
        const { id } = await params;

        // Try to find by ID first, then by slug
        let blog = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            blog = await Blog.findById(id);
        }
        
        // If not found by ID, try to find by slug
        if (!blog) {
            blog = await Blog.findOne({ slug: id, status: "active" });
        }

        if (!blog) {
            return notFoundResponse("Blog not found");
        }

        // Populate exam and category info
        await blog.populate("examId", "name slug");
        await blog.populate("categoryId", "name");

        return successResponse(blog);
    } catch (error) {
        return handleApiError(error, "Failed to fetch blog");
    }
}

export async function PUT(request, { params }) {
    try {
        const authCheck = await requireAction(request, "PUT");
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 403 });
        }

        await connectDB();
        const { id } = await params;
        const body = await request.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse("Invalid blog ID", 400);
        }

        const updateData = {
            name: body.name,
            status: body.status,
            examId: body.examId,
            image: body.image,
        };
        
        // Handle category - support both legacy and new field
        if (body.categoryId !== undefined) {
            updateData.categoryId = body.categoryId || null;
        }
        if (body.category !== undefined) {
            updateData.category = body.category || "";
        }
        
        const updatedBlog = await Blog.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate("categoryId", "name");

        if (!updatedBlog) {
            return notFoundResponse("Blog not found");
        }

        return successResponse(updatedBlog, "Blog updated successfully");
    } catch (error) {
        return handleApiError(error, "Failed to update blog");
    }
}

export async function DELETE(request, { params }) {
    try {
        const authCheck = await requireAction(request, "DELETE");
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 403 });
        }

        await connectDB();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse("Invalid blog ID", 400);
        }

        // This will trigger the cascade delete middleware defined in Blog model
        const deletedBlog = await Blog.findByIdAndDelete(id);

        if (!deletedBlog) {
            return notFoundResponse("Blog not found");
        }

        return successResponse(deletedBlog, "Blog deleted successfully");
    } catch (error) {
        return handleApiError(error, "Failed to delete blog");
    }
}
