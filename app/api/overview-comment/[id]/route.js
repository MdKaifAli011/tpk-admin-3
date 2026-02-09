import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import OverviewComment from "@/models/OverviewComment";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { requireAction } from "@/middleware/authMiddleware";

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
      return errorResponse("Invalid comment ID", 400);
    }

    const { status } = body;
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return errorResponse("Invalid status. Use: pending, approved, or rejected", 400);
    }

    const updated = await OverviewComment.findByIdAndUpdate(
      id,
      { $set: { status: status || "pending" } },
      { new: true, runValidators: true }
    )
      .populate("studentId", "firstName lastName email")
      .lean();

    if (!updated) {
      return notFoundResponse("Comment not found");
    }

    return successResponse(updated, "Comment updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update comment");
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
      return errorResponse("Invalid comment ID", 400);
    }

    const deleted = await OverviewComment.findByIdAndDelete(id);

    if (!deleted) {
      return notFoundResponse("Comment not found");
    }

    return successResponse(deleted, "Comment deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete comment");
  }
}
