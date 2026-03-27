import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Blog from "@/models/Blog";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
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

    // If not found by ID, try to find by slug.
    // Public frontend should allow active + draft preview URLs.
    if (!blog) {
      blog = await Blog.findOne({ slug: id, status: { $in: ["active", "draft"] } });
    }

    if (!blog) {
      return notFoundResponse("Blog not found");
    }

    // Populate exam and category info
    await blog.populate("examId", "name slug");
    await blog.populate("categoryId", "name");
    // Populate assignment hierarchy for display
    await blog.populate("assignmentSubjectId", "name slug");
    await blog.populate("assignmentUnitId", "name slug");
    await blog.populate("assignmentChapterId", "name slug");
    await blog.populate("assignmentTopicId", "name slug");
    await blog.populate("assignmentSubTopicId", "name slug");
    await blog.populate("assignmentDefinitionId", "name slug");

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

    // Assignment to level (7-level hierarchy)
    if (body.assignmentLevel !== undefined) {
      updateData.assignmentLevel = body.assignmentLevel || "";
    }
    const level = updateData.assignmentLevel ?? body.assignmentLevel ?? "";
    // Always set assignment refs when level is being updated so clear-below persists
    if (body.assignmentLevel !== undefined) {
      updateData.assignmentSubjectId = body.assignmentSubjectId || null;
      updateData.assignmentUnitId = body.assignmentUnitId || null;
      updateData.assignmentChapterId = body.assignmentChapterId || null;
      updateData.assignmentTopicId = body.assignmentTopicId || null;
      updateData.assignmentSubTopicId = body.assignmentSubTopicId || null;
      updateData.assignmentDefinitionId = body.assignmentDefinitionId || null;
    } else {
      if (body.assignmentSubjectId !== undefined)
        updateData.assignmentSubjectId = body.assignmentSubjectId || null;
      if (body.assignmentUnitId !== undefined)
        updateData.assignmentUnitId = body.assignmentUnitId || null;
      if (body.assignmentChapterId !== undefined)
        updateData.assignmentChapterId = body.assignmentChapterId || null;
      if (body.assignmentTopicId !== undefined)
        updateData.assignmentTopicId = body.assignmentTopicId || null;
      if (body.assignmentSubTopicId !== undefined)
        updateData.assignmentSubTopicId = body.assignmentSubTopicId || null;
      if (body.assignmentDefinitionId !== undefined)
        updateData.assignmentDefinitionId = body.assignmentDefinitionId || null;
    }

    // Clear assignment IDs below selected level
    const levels = [
      "exam",
      "subject",
      "unit",
      "chapter",
      "topic",
      "subtopic",
      "definition",
    ];
    const levelIndex = levels.indexOf(level);
    if (levelIndex < 1) {
      updateData.assignmentSubjectId = null;
      updateData.assignmentUnitId = null;
      updateData.assignmentChapterId = null;
      updateData.assignmentTopicId = null;
      updateData.assignmentSubTopicId = null;
      updateData.assignmentDefinitionId = null;
    } else {
      if (levelIndex < 2) updateData.assignmentUnitId = null;
      if (levelIndex < 3) updateData.assignmentChapterId = null;
      if (levelIndex < 4) updateData.assignmentTopicId = null;
      if (levelIndex < 5) updateData.assignmentSubTopicId = null;
      if (levelIndex < 6) updateData.assignmentDefinitionId = null;
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    )
      .populate("categoryId", "name")
      .populate("assignmentSubjectId", "name slug")
      .populate("assignmentUnitId", "name slug")
      .populate("assignmentChapterId", "name slug")
      .populate("assignmentTopicId", "name slug")
      .populate("assignmentSubTopicId", "name slug")
      .populate("assignmentDefinitionId", "name slug");

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
