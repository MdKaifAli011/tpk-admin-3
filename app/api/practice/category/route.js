import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PracticeCategory from "@/models/PracticeCategory";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";

// ---------- GET ALL PRACTICE CATEGORIES (optimized) ----------
export async function GET(request) {
  try {
    // Check authentication (all authenticated users can view)
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    
    // Parse pagination
    const { page, limit, skip } = parsePagination(searchParams);
    
    // Get filters (normalize status to lowercase for case-insensitive matching)
    const examId = searchParams.get("examId");
    const subjectId = searchParams.get("subjectId");
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();
    
    // Build query with case-insensitive status matching
    const query = {};
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      query.examId = examId;
    }
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      query.subjectId = subjectId;
    }
    if (statusFilter !== "all") {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }
    
    // Create cache key
    const cacheKey = `practice-categories-${JSON.stringify(query)}-${page}-${limit}`;
    const now = Date.now();

    // Check cache (only for active status)
    const cached = queryCache.get(cacheKey);
    if (cached && statusFilter === STATUS.ACTIVE && (now - cached.timestamp < CACHE_TTL)) {
      return NextResponse.json(cached.data);
    }

    // Optimize query execution
    const shouldCount = page === 1 || limit < 100;
    const [total, categories] = await Promise.all([
      shouldCount ? PracticeCategory.countDocuments(query) : Promise.resolve(0),
      PracticeCategory.find(query)
        .populate("examId", "name status")
        .populate("subjectId", "name status")
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const response = createPaginationResponse(categories, total, page, limit);

    // Cache the response (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      queryCache.set(cacheKey, { data: response, timestamp: now });
      cleanupCache();
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE PRACTICE CATEGORY ----------
export async function POST(request) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();
    const { name, examId, subjectId, orderNumber, status, description, noOfTests, mode, duration, language } = body;

    // Validate required fields
    if (!name || !examId) {
      return errorResponse("Name and examId are required", 400);
    }

    // Validate examId format
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return errorResponse("Invalid examId format", 400);
    }

    // Validate subjectId format if provided
    if (subjectId && !mongoose.Types.ObjectId.isValid(subjectId)) {
      return errorResponse("Invalid subjectId format", 400);
    }

    // Check if exam exists
    const Exam = (await import("@/models/Exam")).default;
    const examExists = await Exam.findById(examId);
    if (!examExists) {
      return errorResponse(ERROR_MESSAGES.EXAM_NOT_FOUND, 404);
    }

    // Check if subject exists (if provided)
    if (subjectId) {
      const Subject = (await import("@/models/Subject")).default;
      const subjectExists = await Subject.findById(subjectId);
      if (!subjectExists) {
        return errorResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND, 404);
      }
    }

    // Capitalize first letter of each word in category name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const categoryName = toTitleCase(name);

    // Check for duplicate category name within the same exam
    const existingCategory = await PracticeCategory.findOne({
      name: categoryName,
      examId,
    });
    if (existingCategory) {
      return errorResponse("Category with this name already exists for this exam", 409);
    }

    // Determine orderNumber
    let finalOrderNumber = orderNumber;
    if (finalOrderNumber === undefined || finalOrderNumber === null) {
      const maxOrderDoc = await PracticeCategory.findOne({ examId })
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      finalOrderNumber = maxOrderDoc ? (maxOrderDoc.orderNumber || 0) + 1 : 1;
    }

    // Create new category
    const category = await PracticeCategory.create({
      name: categoryName,
      examId,
      subjectId: subjectId || null,
      orderNumber: finalOrderNumber,
      status: status || STATUS.ACTIVE,
      description: description || "",
      noOfTests: noOfTests || 0,
      mode: mode?.trim() || "Online Test",
      duration: duration?.trim() || "",
      language: language?.trim() || "English",
    });

    // Populate the exam and subject data before returning
    const populatedCategory = await PracticeCategory.findById(category._id)
      .populate("examId", "name status")
      .populate("subjectId", "name status")
      .lean();

    // Clear cache
    queryCache.clear();

    return successResponse(
      populatedCategory,
      "Practice category created successfully",
      201
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

