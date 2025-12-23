import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import BlogComment from "@/models/BlogComment";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { requireAction } from "@/middleware/authMiddleware";

// PUT: Update comment status (approve/reject) - Admin only
export async function PUT(request, { params }) {
  try {
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { commentId } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponse("Invalid comment ID", 400);
    }

    const { status, adminNotes } = body;

    // Validate status
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return errorResponse(
        "Invalid status. Must be: pending, approved, or rejected",
        400
      );
    }

    // Build update object
    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes.trim();

    // Update comment
    const updatedComment = await BlogComment.findByIdAndUpdate(
      commentId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("studentId", "firstName lastName email")
      .populate("blogId", "name slug");

    if (!updatedComment) {
      return notFoundResponse("Comment not found");
    }

    return successResponse(updatedComment, "Comment updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update comment");
  }
}

// DELETE: Delete a comment - Admin only
export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { commentId } = await params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponse("Invalid comment ID", 400);
    }

    const deletedComment = await BlogComment.findByIdAndDelete(commentId);

    if (!deletedComment) {
      return notFoundResponse("Comment not found");
    }

    return successResponse(deletedComment, "Comment deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete comment");
  }
}
