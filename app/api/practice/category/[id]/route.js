import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PracticeCategory from "@/models/PracticeCategory";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES, STATUS } from "@/constants";
import cacheManager from "@/utils/cacheManager";

// ---------- GET SINGLE PRACTICE CATEGORY ----------
export async function GET(_request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    const category = await PracticeCategory.findById(id)
      .populate("examId", "name status")
      .populate("subjectId", "name status")
      .lean();

    if (!category) {
      return notFoundResponse("Practice category not found");
    }

    return successResponse(category);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- UPDATE PRACTICE CATEGORY ----------
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    const { name, examId, subjectId, orderNumber, status, description, noOfTests, mode, duration, language } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return errorResponse("Category name is required", 400);
    }

    // Check if category exists
    const existingCategory = await PracticeCategory.findById(id);
    if (!existingCategory) {
      return notFoundResponse("Practice category not found");
    }

    // Capitalize first letter of each word in category name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const categoryName = toTitleCase(name);

    // Check for duplicate name
    const duplicate = await PracticeCategory.findOne({
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
      noOfTests: noOfTests || 0,
      mode: mode?.trim() || "Online Test",
      duration: duration?.trim() || "",
      language: language?.trim() || "English",
    };

    if (examId) {
      if (!mongoose.Types.ObjectId.isValid(examId)) {
        return errorResponse("Invalid examId format", 400);
      }
      updateData.examId = examId;
    }
    if (subjectId !== undefined) {
      if (subjectId && !mongoose.Types.ObjectId.isValid(subjectId)) {
        return errorResponse("Invalid subjectId format", 400);
      }
      updateData.subjectId = subjectId || null;
    }
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (status) updateData.status = status;

    const updated = await PracticeCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("examId", "name status")
      .populate("subjectId", "name status")
      .lean();

    if (!updated) {
      return notFoundResponse("Practice category not found");
    }

    // Clear cache
    cacheManager.clear("practice-categories");

    return successResponse(updated, "Practice category updated successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- PATCH PRACTICE CATEGORY (Partial Update) ----------
export async function PATCH(request, { params }) {
  try {
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
    if (body.noOfTests !== undefined) updateData.noOfTests = parseInt(body.noOfTests) || 0;
    if (body.mode !== undefined) updateData.mode = body.mode?.trim() || "Online Test";
    if (body.duration !== undefined) updateData.duration = body.duration?.trim() || "";
    if (body.language !== undefined) updateData.language = body.language?.trim() || "English";
    if (body.examId !== undefined) {
      if (body.examId && !mongoose.Types.ObjectId.isValid(body.examId)) {
        return errorResponse("Invalid examId format", 400);
      }
      updateData.examId = body.examId || null;
    }
    if (body.orderNumber !== undefined) updateData.orderNumber = body.orderNumber;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.subjectId !== undefined) {
      if (body.subjectId && !mongoose.Types.ObjectId.isValid(body.subjectId)) {
        return errorResponse("Invalid subjectId format", 400);
      }
      updateData.subjectId = body.subjectId || null;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    const updated = await PracticeCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("examId", "name status")
      .populate("subjectId", "name status")
      .lean();

    if (!updated) {
      return notFoundResponse("Practice category not found");
    }

    // Clear cache
    cacheManager.clear("practice-categories");

    return successResponse(updated, "Practice category updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update practice category");
  }
}

// ---------- DELETE PRACTICE CATEGORY ----------
export async function DELETE(_request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    const deleted = await PracticeCategory.findByIdAndDelete(id);
    if (!deleted) {
      return notFoundResponse("Practice category not found");
    }

    // Clear cache
    cacheManager.clear("practice-categories");

    return successResponse(deleted, "Practice category deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

