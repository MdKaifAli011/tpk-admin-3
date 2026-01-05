import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PracticeQuestion from "@/models/PracticeQuestion";
import PracticeSubCategory from "@/models/PracticeSubCategory";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";
import { updateSubCategoryQuestionCount } from "@/utils/apiRouteHelpers";

// ---------- GET ALL PRACTICE QUESTIONS (optimized) ----------
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    // Parse pagination
    const { page, limit, skip } = parsePagination(searchParams);

    // Get filters
    const subCategoryId = searchParams.get("subCategoryId");
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    // Build query
    const query = {};
    if (statusFilter !== "all") {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }
    if (subCategoryId) {
      if (mongoose.Types.ObjectId.isValid(subCategoryId)) {
        query.subCategoryId = subCategoryId;
      } else {
        // If subCategoryId is provided but not a valid ObjectId, 
        // return zero results instead of ignoring the filter.
        return NextResponse.json(createPaginationResponse([], 0, page, limit));
      }
    }

    // Create cache key
    const cacheKey = `practice-questions-${JSON.stringify(
      query
    )}-${page}-${limit}`;

    // Check cache (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Optimize query execution
    const shouldCount = page === 1 || limit < 100;
    const [total, questions] = await Promise.all([
      shouldCount ? PracticeQuestion.countDocuments(query) : Promise.resolve(0),
      PracticeQuestion.find(query)
        .populate("subCategoryId", "name status categoryId")
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const response = createPaginationResponse(questions, total, page, limit);

    // Cache the response (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      cacheManager.set(cacheKey, response, 5 * 60 * 1000); // 5 minutes TTL
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE PRACTICE QUESTION ----------
export async function POST(request) {
  try {
    // Check authentication - all authenticated users with create permission can create questions
    // Import functionality is protected at the frontend level (only admin/super_moderator can access import UI)
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    // Check if user has permission to create (moderator, super_moderator, admin)
    const userRole = authCheck.role;
    const allowedRoles = ["admin", "super_moderator", "moderator"];
    if (!allowedRoles.includes(userRole)) {
      return errorResponse(
        "You don't have permission to create practice questions",
        403
      );
    }

    await connectDB();
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
    if (!subCategoryId) {
      return errorResponse("SubCategory ID is required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return errorResponse("Invalid subCategoryId format", 400);
    }

    // Check if subcategory exists
    const subCategoryExists = await PracticeSubCategory.findById(subCategoryId);
    if (!subCategoryExists) {
      return errorResponse("Practice subcategory not found", 404);
    }

    // Determine order number if not provided
    let finalOrderNumber = orderNumber;
    if (finalOrderNumber === undefined || finalOrderNumber === null) {
      const maxOrderDoc = await PracticeQuestion.findOne({ subCategoryId })
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      finalOrderNumber = maxOrderDoc ? (maxOrderDoc.orderNumber || 0) + 1 : 1;
    }

    // Create question
    const newQuestion = await PracticeQuestion.create({
      question: question.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      optionC: optionC.trim(),
      optionD: optionD.trim(),
      answer: answer.toUpperCase(),
      videoLink: videoLink?.trim() || "",
      detailsExplanation: detailsExplanation?.trim() || "",
      subCategoryId,
      orderNumber: finalOrderNumber,
      status: status || STATUS.ACTIVE,
    });

    // Populate and return
    const populatedQuestion = await PracticeQuestion.findById(newQuestion._id)
      .populate("subCategoryId", "name status categoryId")
      .lean();

    // Auto-update numberOfQuestions count for the subcategory
    await updateSubCategoryQuestionCount(subCategoryId);

    // Clear cache
    cacheManager.clear("practice-questions-");

    return successResponse(
      populatedQuestion,
      "Practice question created successfully",
      201
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}
