import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import BlogCategory from "@/models/BlogCategory";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";

// ---------- GET ALL BLOG CATEGORIES (optimized) ----------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();
    
    // Allow public access for active categories only (for public blog pages)
    // Require authentication for inactive/all categories (admin access)
    const isPublicRequest = statusFilter === "active" || statusFilter === STATUS.ACTIVE;
    
    if (!isPublicRequest) {
      const authCheck = await requireAuth(request);
      if (authCheck.error) {
        return NextResponse.json(authCheck, { status: authCheck.status || 401 });
      }
    }

    await connectDB();
    
    // Parse pagination
    const { page, limit, skip } = parsePagination(searchParams);
    
    // Get filters (normalize status to lowercase for case-insensitive matching)
    const examId = searchParams.get("examId");
    
    // Build query with case-insensitive status matching
    const query = {};
    if (examId) {
      if (mongoose.Types.ObjectId.isValid(examId)) {
        query.examId = new mongoose.Types.ObjectId(examId);
      } else {
        // If invalid ObjectId, return empty array
        return NextResponse.json(createPaginationResponse([], 0, page, limit));
      }
    }
    if (statusFilter !== "all") {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }
    
    // Create cache key
    const cacheKey = `blog-categories-${JSON.stringify(query)}-${page}-${limit}`;

    // Check cache (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Optimize query execution
    const shouldCount = page === 1 || limit < 100;
    const [total, categories] = await Promise.all([
      shouldCount ? BlogCategory.countDocuments(query) : Promise.resolve(0),
      BlogCategory.find(query)
        .populate("examId", "name status")
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const response = createPaginationResponse(categories, total, page, limit);

    // Cache the response (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      cacheManager.set(cacheKey, response);
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE BLOG CATEGORY ----------
export async function POST(request) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();
    const { name, examId, orderNumber, status, description } = body;

    // Validate required fields
    if (!name || !examId) {
      return errorResponse("Name and examId are required", 400);
    }

    // Validate examId format
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return errorResponse("Invalid examId format", 400);
    }

    // Check if exam exists
    const Exam = (await import("@/models/Exam")).default;
    const examExists = await Exam.findById(examId);
    if (!examExists) {
      return errorResponse(ERROR_MESSAGES.EXAM_NOT_FOUND, 404);
    }

    // Capitalize first letter of each word in category name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const categoryName = toTitleCase(name);

    // Check for duplicate category name within the same exam
    const existingCategory = await BlogCategory.findOne({
      name: categoryName,
      examId,
    });
    if (existingCategory) {
      return errorResponse("Category with this name already exists for this exam", 409);
    }

    // Determine orderNumber
    let finalOrderNumber = orderNumber;
    if (finalOrderNumber === undefined || finalOrderNumber === null) {
      const maxOrderDoc = await BlogCategory.findOne({ examId })
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      finalOrderNumber = maxOrderDoc ? (maxOrderDoc.orderNumber || 0) + 1 : 1;
    }

    // Create new category
    const category = await BlogCategory.create({
      name: categoryName,
      examId,
      orderNumber: finalOrderNumber,
      status: status || STATUS.ACTIVE,
      description: description || "",
    });

    // Populate the exam data before returning
    const populatedCategory = await BlogCategory.findById(category._id)
      .populate("examId", "name status")
      .lean();

    // Clear cache
    cacheManager.clear("blog-categories");

    return successResponse(
      populatedCategory,
      "Blog category created successfully",
      201
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

