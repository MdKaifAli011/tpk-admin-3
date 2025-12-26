import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";

// ---------- GET SINGLE SUBJECT ----------
export async function GET(_request, { params }) {
  try {
    // Check authentication (all authenticated users can view)
    const authCheck = await requireAuth(_request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subject ID", 400);
    }

    const subject = await Subject.findById(id)
      .populate("examId", "name status")
      .lean();

    if (!subject) {
      return notFoundResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND);
    }

    return successResponse(subject);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- UPDATE SUBJECT ----------
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
      return errorResponse("Invalid subject ID", 400);
    }

    const {
      name,
      examId,
      orderNumber,
      status,
    } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return errorResponse("Subject name is required", 400);
    }

    // Check if subject exists
    const existingSubject = await Subject.findById(id);
    if (!existingSubject) {
      return notFoundResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND);
    }

    // Capitalize first letter of each word in subject name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const subjectName = toTitleCase(name);

    // Check for duplicate name within the same exam.
    // If `examId` is not provided in the request body, use the existing subject's examId
    // so the duplicate check is always scoped to an exam and doesn't block same names across different exams.
    const targetExamId = examId || existingSubject.examId;
    const duplicate = await Subject.findOne({
      name: subjectName,
      _id: { $ne: id },
      examId: targetExamId,
    });
    if (duplicate) {
      return errorResponse("Subject with same name already exists", 409);
    }

    // Prepare update data (content/SEO fields are now in SubjectDetails)
    const updateData = {
      name: subjectName,
    };

    if (examId) updateData.examId = examId;
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (status) updateData.status = status;

    const updated = await Subject.findByIdAndUpdate(
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
      return notFoundResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND);
    }

    // Clear cache when subject is updated
    cacheManager.clear("subject");

    return successResponse(updated, "Subject updated successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- PATCH SUBJECT (Reorder/Status) ----------
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
    const { orderNumber, status } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subject ID", 400);
    }

    const updateData = {};
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    const updated = await Subject.findByIdAndUpdate(
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
      return notFoundResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND);
    }

    // Clear cache when subject is updated
    cacheManager.clear("subject");

    return successResponse(updated, "Subject updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update subject");
  }
}

// ---------- DELETE SUBJECT ----------
export async function DELETE(_request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(_request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subject ID", 400);
    }

    const deleted = await Subject.findByIdAndDelete(id);
    if (!deleted) {
      return notFoundResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND);
    }

    // Clear cache when subject is deleted
    try {
      const subjectRouteModule = await import("../route");
      if (subjectRouteModule?.queryCache) {
        subjectRouteModule.queryCache.clear();
      }
    } catch (cacheError) {
      // Ignore cache errors
    }

    return successResponse(deleted, "Subject deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}
