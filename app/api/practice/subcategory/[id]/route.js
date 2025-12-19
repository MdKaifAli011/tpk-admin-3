import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PracticeSubCategory from "@/models/PracticeSubCategory";
import PracticeCategory from "@/models/PracticeCategory";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
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
import { updateSubCategoryQuestionCount } from "@/utils/apiRouteHelpers";

// ---------- GET SINGLE PRACTICE SUBCATEGORY ----------
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
      return errorResponse("Invalid subcategory ID", 400);
    }

    const subCategory = await PracticeSubCategory.findById(id)
      .populate("categoryId", "name status examId subjectId")
      .populate("unitId", "name status")
      .populate("chapterId", "name status")
      .populate("topicId", "name status")
      .populate("subTopicId", "name status")
      .lean();

    if (!subCategory) {
      return notFoundResponse("Practice subcategory not found");
    }

    return successResponse(subCategory);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- UPDATE PRACTICE SUBCATEGORY (FULL) ----------
export async function PUT(request, { params }) {
  try {
    // Check authentication and permissions (users need to be able to update)
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      categoryId,
      unitId,
      chapterId,
      topicId,
      subTopicId,
      duration,
      maximumMarks,
      negativeMarks,
      orderNumber,
      status,
      description,
    } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subcategory ID", 400);
    }

    // Validate required fields
    if (!name || name.trim() === "") {
      return errorResponse("SubCategory name is required", 400);
    }

    // Check if subcategory exists
    const existingSubCategory = await PracticeSubCategory.findById(id);
    if (!existingSubCategory) {
      return notFoundResponse("Practice subcategory not found");
    }

    // Capitalize first letter of each word in subcategory name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const subCategoryName = toTitleCase(name);

    // Check for duplicate name within the same category (excluding current subcategory)
    const duplicate = await PracticeSubCategory.findOne({
      name: subCategoryName,
      categoryId: categoryId || existingSubCategory.categoryId,
      _id: { $ne: id },
    });
    if (duplicate) {
      return errorResponse(
        "SubCategory with same name already exists for this category",
        409
      );
    }

    // Validate hierarchical references if provided
    if (unitId && !mongoose.Types.ObjectId.isValid(unitId)) {
      return errorResponse("Invalid unitId format", 400);
    }
    if (chapterId && !mongoose.Types.ObjectId.isValid(chapterId)) {
      return errorResponse("Invalid chapterId format", 400);
    }
    if (topicId && !mongoose.Types.ObjectId.isValid(topicId)) {
      return errorResponse("Invalid topicId format", 400);
    }
    if (subTopicId && !mongoose.Types.ObjectId.isValid(subTopicId)) {
      return errorResponse("Invalid subTopicId format", 400);
    }

    // Validate numeric fields
    if (maximumMarks !== undefined && (isNaN(maximumMarks) || maximumMarks < 0)) {
      return errorResponse("Maximum marks must be a non-negative number", 400);
    }
    if (
      negativeMarks !== undefined &&
      (isNaN(negativeMarks) || negativeMarks < 0)
    ) {
      return errorResponse("Negative marks must be a non-negative number", 400);
    }

    // Prepare update data
    const updateData = {
      name: subCategoryName,
      description: description || "",
    };

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return errorResponse("Invalid categoryId format", 400);
      }
      // Check if category exists
      const categoryExists = await PracticeCategory.findById(categoryId);
      if (!categoryExists) {
        return errorResponse("Practice category not found", 404);
      }
      updateData.categoryId = categoryId;
    }
    if (unitId !== undefined) updateData.unitId = unitId || null;
    if (chapterId !== undefined) updateData.chapterId = chapterId || null;
    if (topicId !== undefined) updateData.topicId = topicId || null;
    if (subTopicId !== undefined) updateData.subTopicId = subTopicId || null;
    if (duration !== undefined) updateData.duration = duration?.trim() || "";
    if (maximumMarks !== undefined) updateData.maximumMarks = maximumMarks || 0;
    // numberOfQuestions is auto-calculated, don't allow manual updates
    if (negativeMarks !== undefined)
      updateData.negativeMarks = negativeMarks || 0;
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (status) updateData.status = status;

    const updated = await PracticeSubCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("categoryId", "name status examId subjectId")
      .populate("unitId", "name status")
      .populate("chapterId", "name status")
      .populate("topicId", "name status")
      .populate("subTopicId", "name status")
      .lean();

    if (!updated) {
      return notFoundResponse("Practice subcategory not found");
    }

    // Auto-calculate numberOfQuestions
    await updateSubCategoryQuestionCount(id);

    // Refresh the updated document to get the latest numberOfQuestions
    const refreshed = await PracticeSubCategory.findById(id)
      .populate("categoryId", "name status examId subjectId")
      .populate("unitId", "name status")
      .populate("chapterId", "name status")
      .populate("topicId", "name status")
      .populate("subTopicId", "name status")
      .lean();

    // Clear cache
    cacheManager.clear("practice-subcategories-");

    return successResponse(
      refreshed,
      "Practice subcategory updated successfully"
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- PATCH PRACTICE SUBCATEGORY (PARTIAL UPDATE) ----------
export async function PATCH(request, { params }) {
  try {
    // Check authentication and permissions (users need to be able to update)
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subcategory ID", 400);
    }

    const existingSubCategory = await PracticeSubCategory.findById(id);
    if (!existingSubCategory) {
      return notFoundResponse("Practice subcategory not found");
    }

    const updateData = {};

    // Allow partial updates
    if (body.name !== undefined) {
      const { toTitleCase } = await import("@/utils/titleCase");
      const subCategoryName = toTitleCase(body.name);
      // Check for duplicate name
      const duplicate = await PracticeSubCategory.findOne({
        name: subCategoryName,
        categoryId: body.categoryId || existingSubCategory.categoryId,
        _id: { $ne: id },
      });
      if (duplicate) {
        return errorResponse(
          "SubCategory with same name already exists for this category",
          409
        );
      }
      updateData.name = subCategoryName;
    }
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.categoryId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(body.categoryId)) {
        return errorResponse("Invalid categoryId format", 400);
      }
      // Check if category exists
      const categoryExists = await PracticeCategory.findById(body.categoryId);
      if (!categoryExists) {
        return errorResponse("Practice category not found", 404);
      }
      updateData.categoryId = body.categoryId;
    }
    if (body.unitId !== undefined) {
      if (body.unitId && !mongoose.Types.ObjectId.isValid(body.unitId)) {
        return errorResponse("Invalid unitId format", 400);
      }
      updateData.unitId = body.unitId || null;
    }
    if (body.chapterId !== undefined) {
      if (body.chapterId && !mongoose.Types.ObjectId.isValid(body.chapterId)) {
        return errorResponse("Invalid chapterId format", 400);
      }
      updateData.chapterId = body.chapterId || null;
    }
    if (body.topicId !== undefined) {
      if (body.topicId && !mongoose.Types.ObjectId.isValid(body.topicId)) {
        return errorResponse("Invalid topicId format", 400);
      }
      updateData.topicId = body.topicId || null;
    }
    if (body.subTopicId !== undefined) {
      if (body.subTopicId && !mongoose.Types.ObjectId.isValid(body.subTopicId)) {
        return errorResponse("Invalid subTopicId format", 400);
      }
      updateData.subTopicId = body.subTopicId || null;
    }
    if (body.duration !== undefined)
      updateData.duration = body.duration?.trim() || "";
    if (body.maximumMarks !== undefined) {
      if (isNaN(body.maximumMarks) || body.maximumMarks < 0) {
        return errorResponse("Maximum marks must be a non-negative number", 400);
      }
      updateData.maximumMarks = body.maximumMarks || 0;
    }
    // numberOfQuestions is auto-calculated, don't allow manual updates
    if (body.negativeMarks !== undefined) {
      if (isNaN(body.negativeMarks) || body.negativeMarks < 0) {
        return errorResponse("Negative marks must be a non-negative number", 400);
      }
      updateData.negativeMarks = body.negativeMarks || 0;
    }
    if (body.orderNumber !== undefined)
      updateData.orderNumber = body.orderNumber;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    const updated = await PracticeSubCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("categoryId", "name status examId subjectId")
      .populate("unitId", "name status")
      .populate("chapterId", "name status")
      .populate("topicId", "name status")
      .populate("subTopicId", "name status")
      .lean();

    if (!updated) {
      return notFoundResponse("Practice subcategory not found");
    }

    // Auto-calculate numberOfQuestions
    await updateSubCategoryQuestionCount(id);

    // Refresh the updated document to get the latest numberOfQuestions
    const refreshed = await PracticeSubCategory.findById(id)
      .populate("categoryId", "name status examId subjectId")
      .populate("unitId", "name status")
      .populate("chapterId", "name status")
      .populate("topicId", "name status")
      .populate("subTopicId", "name status")
      .lean();

    // Clear cache
    cacheManager.clear("practice-subcategories-");

    return successResponse(
      refreshed,
      "Practice subcategory updated successfully"
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- DELETE PRACTICE SUBCATEGORY ----------
export async function DELETE(_request, { params }) {
  try {
    // Check authentication and permissions (users need to be able to delete)
    const authCheck = await requireAction(_request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subcategory ID", 400);
    }

    const deleted = await PracticeSubCategory.findByIdAndDelete(id);
    if (!deleted) {
      return notFoundResponse("Practice subcategory not found");
    }

    // Clear cache
    cacheManager.clear("practice-subcategories-");

    return successResponse(
      deleted,
      "Practice subcategory deleted successfully"
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

