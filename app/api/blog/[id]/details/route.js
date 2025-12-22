import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import BlogDetails from "@/models/BlogDetails";
import mongoose from "mongoose";
import { successResponse, errorResponse, handleApiError, notFoundResponse } from "@/utils/apiResponse";
import { requireAction, requireAuth } from "@/middleware/authMiddleware";

export async function GET(request, { params }) {
    try {
        // Allow public access for reading blog details (for public blog pages)
        // No auth required for GET requests

        await connectDB();
        const { id } = await params; // blogId
        const { searchParams } = new URL(request.url);
        const excludeContent = searchParams.get("excludeContent") === "true";

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse("Invalid blog ID", 400);
        }

        // Build query - exclude content field if requested (for card listings)
        let query = BlogDetails.findOne({ blogId: id });
        
        if (excludeContent) {
            // Select all fields except content
            query = query.select("-content");
        }

        const details = await query;
        // It's acceptable if details don't exist yet (returns null)

        return successResponse(details);
    } catch (error) {
        return handleApiError(error, "Failed to fetch blog details");
    }
}

export async function PUT(request, { params }) {
    try {
        const authCheck = await requireAction(request, "PUT");
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 403 });
        }

        await connectDB();
        const { id } = await params; // blogId
        const body = await request.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse("Invalid blog ID", 400);
        }

        // Upsert: update if exists, insert if not
        const updatedDetails = await BlogDetails.findOneAndUpdate(
            { blogId: id },
            { ...body, blogId: id },
            { new: true, upsert: true, runValidators: true }
        );

        return successResponse(updatedDetails, "Blog details saved successfully");
    } catch (error) {
        return handleApiError(error, "Failed to save blog details");
    }
}
