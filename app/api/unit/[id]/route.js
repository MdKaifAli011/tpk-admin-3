import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import mongoose from "mongoose";
import { successResponse, errorResponse, handleApiError, notFoundResponse } from "@/utils/apiResponse";
import { ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";

// ---------- GET SINGLE UNIT ----------
export async function GET(request, { params }) {
  try {
    // Check authentication (all authenticated users can view)
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid unit ID", 400);
    }

    const unit = await Unit.findById(id)
      .populate("subjectId", "name")
      .populate("examId", "name status")
      .lean();

    if (!unit) {
      return notFoundResponse(ERROR_MESSAGES.UNIT_NOT_FOUND);
    }

    return successResponse(unit);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- UPDATE UNIT ----------
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
      return errorResponse("Invalid unit ID", 400);
    }

    const { name, orderNumber, subjectId, examId, status } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return errorResponse("Unit name is required", 400);
    }

    // Check if unit exists
    const existingUnit = await Unit.findById(id);
    if (!existingUnit) {
      return notFoundResponse(ERROR_MESSAGES.UNIT_NOT_FOUND);
    }

    // Capitalize first letter of each word in unit name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const unitName = toTitleCase(name);

    // Prepare update data (content/SEO fields are now in UnitDetails)
    const updateData = {
      name: unitName,
    };

    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (subjectId) updateData.subjectId = subjectId;
    if (examId) updateData.examId = examId;
    if (status) updateData.status = status;

    const updated = await Unit.findByIdAndUpdate(id, { $set: updateData }, {
      new: true,
      runValidators: true,
    })
      .populate("subjectId", "name")
      .populate("examId", "name status")
      .lean();

    if (!updated) {
      return notFoundResponse(ERROR_MESSAGES.UNIT_NOT_FOUND);
    }

    // Clear cache when unit is updated
    cacheManager.clear("unit");

    return successResponse(updated, "Unit updated successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- PATCH UNIT (Partial Update) ----------
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
      return errorResponse("Invalid unit ID", 400);
    }

    const { orderNumber, name, subjectId, examId, status } = body;

    const updateData = {};
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (name !== undefined) {
      const { toTitleCase } = await import("@/utils/titleCase");
      updateData.name = toTitleCase(name);
    }
    if (subjectId !== undefined) updateData.subjectId = subjectId;
    if (examId !== undefined) updateData.examId = examId;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    const updated = await Unit.findByIdAndUpdate(id, { $set: updateData }, {
      new: true,
      runValidators: true,
    })
      .populate("subjectId", "name")
      .populate("examId", "name status")
      .lean();

    if (!updated) {
      return notFoundResponse(ERROR_MESSAGES.UNIT_NOT_FOUND);
    }

    // Clear cache when unit is updated
    cacheManager.clear("unit");

    return successResponse(updated, "Unit updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update unit");
  }
}

// ---------- DELETE UNIT ----------
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
      return errorResponse("Invalid unit ID", 400);
    }

    const deleted = await Unit.findByIdAndDelete(id);
    if (!deleted) {
      return notFoundResponse(ERROR_MESSAGES.UNIT_NOT_FOUND);
    }

    // Clear cache when unit is deleted
    try {
      const unitRouteModule = await import("../route");
      if (unitRouteModule?.queryCache) {
        unitRouteModule.queryCache.clear();
      }
    } catch (cacheError) {
      // Ignore cache errors
    }

    return successResponse(deleted, "Unit deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

