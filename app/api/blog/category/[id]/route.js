import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import BlogCategory from "@/models/BlogCategory";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES, STATUS } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";

// ---------- GET SINGLE BLOG CATEGORY ----------
export async function GET(_request, { params }) {
  try {
    // Check authentication
    const authCheck = await requireAuth(_request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    const category = await BlogCategory.findById(id)
      .populate("examId", "name status")
      .lean();

    if (!category) {
      return notFoundResponse("Blog category not found");
    }

    return successResponse(category);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- UPDATE BLOG CATEGORY ----------
export async function PUT(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    const { name, examId, orderNumber, status, description } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return errorResponse("Category name is required", 400);
    }

    // Check if category exists
    const existingCategory = await BlogCategory.findById(id);
    if (!existingCategory) {
      return notFoundResponse("Blog category not found");
    }

    // Capitalize first letter of each word in category name
    const { toTitleCase } = await import("@/utils/titleCase");
    const categoryName = toTitleCase(name);

    // Check for duplicate name
    const duplicate = await BlogCategory.findOne({
      name: categoryName,
      _id: { $ne: id },
      ...(examId && { examId }),
    });
    if (duplicate) {
      return errorResponse("Category with same name already exists", 409);
    }

    // Prepare update data
    const updateData = {
      name: categoryName,
      description: description || "",
    };

    if (examId) {
      if (!mongoose.Types.ObjectId.isValid(examId)) {
        return errorResponse("Invalid examId format", 400);
      }
      updateData.examId = examId;
    }
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (status) updateData.status = status;

    const updated = await BlogCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("examId", "name status")
      .lean();

    if (!updated) {
      return notFoundResponse("Blog category not found");
    }

    // Clear cache
    cacheManager.clear("blog-categories");

    return successResponse(updated, "Blog category updated successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- PATCH BLOG CATEGORY (Partial Update) ----------
export async function PATCH(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    const updateData = {};

    // Allow partial updates
    if (body.name !== undefined) {
      const { toTitleCase } = await import("@/utils/titleCase");
      const categoryName = toTitleCase(body.name);
      updateData.name = categoryName;
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.examId !== undefined) {
      if (body.examId && !mongoose.Types.ObjectId.isValid(body.examId)) {
        return errorResponse("Invalid examId format", 400);
      }
      updateData.examId = body.examId || null;
    }
    if (body.orderNumber !== undefined) updateData.orderNumber = body.orderNumber;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    const updated = await BlogCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("examId", "name status")
      .lean();

    if (!updated) {
      return notFoundResponse("Blog category not found");
    }

    // Clear cache
    cacheManager.clear("blog-categories");

    return successResponse(updated, "Blog category updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update blog category");
  }
}

// ---------- DELETE BLOG CATEGORY ----------
export async function DELETE(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    const deleted = await BlogCategory.findByIdAndDelete(id);
    if (!deleted) {
      return notFoundResponse("Blog category not found");
    }

    // Clear cache
    cacheManager.clear("blog-categories");

    return successResponse(deleted, "Blog category deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

