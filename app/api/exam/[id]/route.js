import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES } from "@/constants";
import { requireAction, requireAuth } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";
import { cascadeExamStatus } from "@/lib/cascadeStatus";

// ---------- GET SINGLE EXAM ----------
// Public access so frontend self-study pages can server-render without auth
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam ID", 400);
    }

    const exam = await Exam.findById(id).lean();

    if (!exam) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    return successResponse(exam);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- UPDATE EXAM ----------
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
      return errorResponse("Invalid exam ID", 400);
    }

    const { name, status, orderNumber } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return errorResponse("Exam name is required", 400);
    }

    // Check if exam exists
    const existingExam = await Exam.findById(id);
    if (!existingExam) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    // Capitalize exam name
    const examName = name.trim().toUpperCase();

    // Check for duplicate name
    const duplicate = await Exam.findOne({
      name: examName,
      _id: { $ne: id },
    });
    if (duplicate) {
      return errorResponse("Exam with same name already exists", 409);
    }

    // Prepare update data (content/SEO fields are now in ExamDetails)
    const updateData = {
      name: examName,
    };

    if (status) updateData.status = status;
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.description !== undefined)
      updateData.description = body.description;

    // Debug logging
    console.log("Updating Exam with data:", updateData);

    const updated = await Exam.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    );

    console.log("Exam updated in DB:", updated);

    // Clear cache when exam is updated
    cacheManager.clear("exam"); // Clear specific exam cache
    cacheManager.clear("exams-"); // Clear list cache (important for Homepage)

    return successResponse(updated, "Exam updated successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- PATCH EXAM (Status Update with Cascading) ----------
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
      return errorResponse("Invalid exam ID", 400);
    }

    const { status, orderNumber, cascadeMode } = body;
    const mode = ["respect_manual", "force_all", "direct_only"].includes(cascadeMode)
      ? cascadeMode
      : "respect_manual";

    if (status && !["active", "inactive"].includes(status)) {
      return errorResponse(
        "Valid status is required (active or inactive)",
        400,
      );
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
      updateData.manualInactive = status === "inactive";
    }
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    const updated = await Exam.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );
    if (!updated) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    if (status) {
      await cascadeExamStatus(id, status, mode);
    }

    cacheManager.clear("exam");

    return successResponse(
      updated,
      `Exam and all children ${status === "inactive" ? "deactivated" : "activated"} successfully`,
    );
  } catch (error) {
    return handleApiError(error, "Failed to update exam");
  }
}

// ---------- DELETE EXAM ----------
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
      return errorResponse("Invalid exam ID", 400);
    }

    const deleted = await Exam.findByIdAndDelete(id);
    if (!deleted) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    // Re-sequence orderNumber to 1, 2, 3, ... (unique, no gaps)
    const remaining = await Exam.find({})
      .sort({ orderNumber: 1, createdAt: 1 })
      .select("_id")
      .lean();
    if (remaining.length > 0) {
      const tempUpdates = remaining.map((exam, index) => ({
        updateOne: {
          filter: { _id: exam._id },
          update: { $set: { orderNumber: 100000 + index } },
        },
      }));
      await Exam.bulkWrite(tempUpdates);
      const finalUpdates = remaining.map((exam, index) => ({
        updateOne: {
          filter: { _id: exam._id },
          update: { $set: { orderNumber: index + 1 } },
        },
      }));
      await Exam.bulkWrite(finalUpdates);
    }

    // Clear cache when exam is deleted
    cacheManager.clear("exam");

    return successResponse(deleted, "Exam deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}
