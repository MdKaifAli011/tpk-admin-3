import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PracticeQuestion from "@/models/PracticeQuestion";
import PracticeSubCategory from "@/models/PracticeSubCategory";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES, STATUS } from "@/constants";
import cacheManager from "@/utils/cacheManager";

// ---------- GET SINGLE PRACTICE QUESTION ----------
export async function GET(_request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid question ID", 400);
    }

    const question = await PracticeQuestion.findById(id)
      .populate("subCategoryId", "name status categoryId")
      .lean();

    if (!question) {
      return notFoundResponse("Practice question not found");
    }

    return successResponse(question);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- UPDATE PRACTICE QUESTION (Full Update) ----------
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const {
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      answer,
      videoLink,
      detailsExplanation,
      subCategoryId,
      orderNumber,
      status,
    } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid question ID", 400);
    }

    // Check if question exists
    const existingQuestion = await PracticeQuestion.findById(id);
    if (!existingQuestion) {
      return notFoundResponse("Practice question not found");
    }

    // Validation
    if (!question || !question.trim()) {
      return errorResponse("Question is required", 400);
    }
    if (!optionA || !optionA.trim()) {
      return errorResponse("Option A is required", 400);
    }
    if (!optionB || !optionB.trim()) {
      return errorResponse("Option B is required", 400);
    }
    if (!optionC || !optionC.trim()) {
      return errorResponse("Option C is required", 400);
    }
    if (!optionD || !optionD.trim()) {
      return errorResponse("Option D is required", 400);
    }
    if (!answer || !["A", "B", "C", "D"].includes(answer.toUpperCase())) {
      return errorResponse("Answer must be A, B, C, or D", 400);
    }

    // Validate subCategoryId if provided
    if (subCategoryId) {
      if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
        return errorResponse("Invalid subCategoryId format", 400);
      }
      const subCategoryExists = await PracticeSubCategory.findById(
        subCategoryId
      );
      if (!subCategoryExists) {
        return errorResponse("Practice subcategory not found", 404);
      }
    }

    // Prepare update data
    const updateData = {
      question: question.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      optionC: optionC.trim(),
      optionD: optionD.trim(),
      answer: answer.toUpperCase(),
      videoLink: videoLink?.trim() || "",
      detailsExplanation: detailsExplanation?.trim() || "",
    };

    if (subCategoryId) updateData.subCategoryId = subCategoryId;
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (status) updateData.status = status;

    const updated = await PracticeQuestion.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("subCategoryId", "name status categoryId")
      .lean();

    if (!updated) {
      return notFoundResponse("Practice question not found");
    }

    // Clear cache
    cacheManager.clear("practice-questions-");

    return successResponse(updated, "Practice question updated successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- PATCH PRACTICE QUESTION (Partial Update) ----------
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid question ID", 400);
    }

    const existingQuestion = await PracticeQuestion.findById(id);
    if (!existingQuestion) {
      return notFoundResponse("Practice question not found");
    }

    const updateData = {};

    // Allow partial updates
    if (body.question !== undefined) {
      if (!body.question.trim()) {
        return errorResponse("Question cannot be empty", 400);
      }
      updateData.question = body.question.trim();
    }
    if (body.optionA !== undefined) {
      if (!body.optionA.trim()) {
        return errorResponse("Option A cannot be empty", 400);
      }
      updateData.optionA = body.optionA.trim();
    }
    if (body.optionB !== undefined) {
      if (!body.optionB.trim()) {
        return errorResponse("Option B cannot be empty", 400);
      }
      updateData.optionB = body.optionB.trim();
    }
    if (body.optionC !== undefined) {
      if (!body.optionC.trim()) {
        return errorResponse("Option C cannot be empty", 400);
      }
      updateData.optionC = body.optionC.trim();
    }
    if (body.optionD !== undefined) {
      if (!body.optionD.trim()) {
        return errorResponse("Option D cannot be empty", 400);
      }
      updateData.optionD = body.optionD.trim();
    }
    if (body.answer !== undefined) {
      if (!["A", "B", "C", "D"].includes(body.answer.toUpperCase())) {
        return errorResponse("Answer must be A, B, C, or D", 400);
      }
      updateData.answer = body.answer.toUpperCase();
    }
    if (body.videoLink !== undefined)
      updateData.videoLink = body.videoLink?.trim() || "";
    if (body.detailsExplanation !== undefined)
      updateData.detailsExplanation = body.detailsExplanation?.trim() || "";
    if (body.subCategoryId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(body.subCategoryId)) {
        return errorResponse("Invalid subCategoryId format", 400);
      }
      const subCategoryExists = await PracticeSubCategory.findById(
        body.subCategoryId
      );
      if (!subCategoryExists) {
        return errorResponse("Practice subcategory not found", 404);
      }
      updateData.subCategoryId = body.subCategoryId;
    }
    if (body.orderNumber !== undefined)
      updateData.orderNumber = body.orderNumber;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    const updated = await PracticeQuestion.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("subCategoryId", "name status categoryId")
      .lean();

    if (!updated) {
      return notFoundResponse("Practice question not found");
    }

    // Clear cache
    cacheManager.clear("practice-questions-");

    return successResponse(updated, "Practice question updated successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- DELETE PRACTICE QUESTION ----------
export async function DELETE(_request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid question ID", 400);
    }

    const deleted = await PracticeQuestion.findByIdAndDelete(id);
    if (!deleted) {
      return notFoundResponse("Practice question not found");
    }

    // Clear cache
    cacheManager.clear("practice-questions-");

    return successResponse(null, "Practice question deleted successfully", 200);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}
