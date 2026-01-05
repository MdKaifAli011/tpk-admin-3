import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PracticeSubCategory from "@/models/PracticeSubCategory";
import PracticeCategory from "@/models/PracticeCategory";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Chapter from "@/models/Chapter";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";
import { updateSubCategoryQuestionCount } from "@/utils/apiRouteHelpers";
import { createSlug } from "@/utils/slug";

// ---------- GET ALL PRACTICE SUBCATEGORIES (optimized) ----------
export async function GET(request) {
  try {
    // Connect to database
    await connectDB();
    const { searchParams } = new URL(request.url);

    // Parse pagination
    const { page, limit, skip } = parsePagination(searchParams);

    // Get filters
    const categoryId = searchParams.get("categoryId");
    const examId = searchParams.get("examId");
    const subjectId = searchParams.get("subjectId");
    const unitId = searchParams.get("unitId");
    const chapterId = searchParams.get("chapterId");
    const topicId = searchParams.get("topicId");
    const subTopicId = searchParams.get("subTopicId");
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    // Build query - show tests ONLY at the exact hierarchy level they're linked to
    // Tests linked to a topic should ONLY appear on that topic page, not on parent chapter/unit pages
    const query = {};
    if (statusFilter !== "all") {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }

    // Filter by categoryId, examId, or subjectId
    // Priority: categoryId > examId > subjectId
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      query.categoryId = categoryId;
    } else if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      // Find categories for this exam
      const categories = await PracticeCategory.find({
        examId,
        status: { $regex: new RegExp(`^${STATUS.ACTIVE}$`, "i") },
      })
        .select("_id")
        .lean();
      const categoryIds = categories.map((c) => c._id);
      if (categoryIds.length > 0) {
        query.categoryId = { $in: categoryIds };
      } else {
        // No categories found, return empty result
        query.categoryId = { $in: [] };
      }
    } else if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      // Find categories for this subject
      const categories = await PracticeCategory.find({
        subjectId,
        status: { $regex: new RegExp(`^${STATUS.ACTIVE}$`, "i") },
      })
        .select("_id")
        .lean();
      const categoryIds = categories.map((c) => c._id);
      if (categoryIds.length > 0) {
        query.categoryId = { $in: categoryIds };
      } else {
        // No categories found, return empty result
        query.categoryId = { $in: [] };
      }
    }

    // Match tests ONLY at the exact level being viewed
    // Priority: subtopic > topic > chapter > unit > subject > exam (most specific first)
    const hierarchicalConditions = [];

    if (subTopicId && mongoose.Types.ObjectId.isValid(subTopicId)) {
      // If viewing a subtopic, show only tests linked directly to that subtopic
      query.subTopicId = subTopicId;
    } else if (topicId && mongoose.Types.ObjectId.isValid(topicId)) {
      // If viewing a topic, show tests linked to that topic (subTopicId must be null/not set)
      hierarchicalConditions.push({ topicId });
      hierarchicalConditions.push({
        $or: [{ subTopicId: null }, { subTopicId: { $exists: false } }],
      });
    } else if (chapterId && mongoose.Types.ObjectId.isValid(chapterId)) {
      // If viewing a chapter, show tests linked directly to that chapter (topicId and subTopicId must be null/not set)
      hierarchicalConditions.push({ chapterId });
      hierarchicalConditions.push({
        $or: [{ topicId: null }, { topicId: { $exists: false } }],
      });
      hierarchicalConditions.push({
        $or: [{ subTopicId: null }, { subTopicId: { $exists: false } }],
      });
    } else if (unitId && mongoose.Types.ObjectId.isValid(unitId)) {
      // If viewing a unit, show tests linked directly to that unit (chapterId, topicId, subTopicId must be null/not set)
      hierarchicalConditions.push({ unitId });
      hierarchicalConditions.push({
        $or: [{ chapterId: null }, { chapterId: { $exists: false } }],
      });
      hierarchicalConditions.push({
        $or: [{ topicId: null }, { topicId: { $exists: false } }],
      });
      hierarchicalConditions.push({
        $or: [{ subTopicId: null }, { subTopicId: { $exists: false } }],
      });
    } else if (
      subjectId &&
      mongoose.Types.ObjectId.isValid(subjectId) &&
      !unitId &&
      !chapterId &&
      !topicId &&
      !subTopicId
    ) {
      // If viewing a subject (and no lower level IDs), show tests linked directly to that subject (unitId, chapterId, topicId, subTopicId must be null/not set)
      hierarchicalConditions.push({
        $or: [{ unitId: null }, { unitId: { $exists: false } }],
      });
      hierarchicalConditions.push({
        $or: [{ chapterId: null }, { chapterId: { $exists: false } }],
      });
      hierarchicalConditions.push({
        $or: [{ topicId: null }, { topicId: { $exists: false } }],
      });
      hierarchicalConditions.push({
        $or: [{ subTopicId: null }, { subTopicId: { $exists: false } }],
      });
    } else if (
      examId &&
      mongoose.Types.ObjectId.isValid(examId) &&
      !subjectId &&
      !unitId &&
      !chapterId &&
      !topicId &&
      !subTopicId
    ) {
      // If viewing an exam (and no lower level IDs), show tests linked directly to that exam (unitId, chapterId, topicId, subTopicId must be null/not set)
      hierarchicalConditions.push({
        $or: [{ unitId: null }, { unitId: { $exists: false } }],
      });
      hierarchicalConditions.push({
        $or: [{ chapterId: null }, { chapterId: { $exists: false } }],
      });
      hierarchicalConditions.push({
        $or: [{ topicId: null }, { topicId: { $exists: false } }],
      });
      hierarchicalConditions.push({
        $or: [{ subTopicId: null }, { subTopicId: { $exists: false } }],
      });
    }

    // Add hierarchical conditions to query if any exist
    if (hierarchicalConditions.length > 0) {
      if (query.$and) {
        query.$and = [...query.$and, ...hierarchicalConditions];
      } else {
        query.$and = hierarchicalConditions;
      }
    }

    // Create cache key (include all query parameters)
    const cacheKey = `practiceSubCategories-${JSON.stringify({
      ...query,
      page,
      limit,
    })}`;

    // Check cache (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Optimize query execution
    const shouldCount = page === 1 || limit < 100;
    const [total, subCategories] = await Promise.all([
      shouldCount
        ? PracticeSubCategory.countDocuments(query)
        : Promise.resolve(0),
      PracticeSubCategory.find(query)
        .populate("categoryId", "name status examId subjectId")
        .populate("unitId", "name status")
        .populate("chapterId", "name status")
        .populate("topicId", "name status")
        .populate("subTopicId", "name status")
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const response = createPaginationResponse(
      subCategories,
      total,
      page,
      limit
    );

    // Cache the response (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      cacheManager.set(cacheKey, response);
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE PRACTICE SUBCATEGORY ----------
export async function POST(request) {
  try {
    // Check authentication and permissions (users need to be able to create)
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
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
      seoData,
      slug,
    } = body;

    // Validate required fields
    if (!name || !categoryId) {
      return errorResponse("Name and categoryId are required", 400);
    }

    // Validate categoryId format
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return errorResponse("Invalid categoryId format", 400);
    }

    // Check if category exists
    const categoryExists = await PracticeCategory.findById(categoryId);
    if (!categoryExists) {
      return errorResponse("Practice category not found", 404);
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
    if (
      maximumMarks !== undefined &&
      (isNaN(maximumMarks) || maximumMarks < 0)
    ) {
      return errorResponse("Maximum marks must be a non-negative number", 400);
    }
    if (
      negativeMarks !== undefined &&
      (isNaN(negativeMarks) || negativeMarks < 0)
    ) {
      return errorResponse("Negative marks must be a non-negative number", 400);
    }

    // Capitalize first letter of each word in subcategory name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const subCategoryName = toTitleCase(name);

    // Check for duplicate subcategory name within the same category
    const existingSubCategory = await PracticeSubCategory.findOne({
      name: subCategoryName,
      categoryId,
    });
    if (existingSubCategory) {
      return errorResponse(
        "SubCategory with this name already exists for this category",
        409
      );
    }

    // Determine orderNumber
    let finalOrderNumber = orderNumber;
    if (finalOrderNumber === undefined || finalOrderNumber === null) {
      const maxOrderDoc = await PracticeSubCategory.findOne({ categoryId })
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      finalOrderNumber = maxOrderDoc ? (maxOrderDoc.orderNumber || 0) + 1 : 1;
    }

    // Generate Slug
    let finalSlug = slug || createSlug(subCategoryName);

    // Check if slug is unique, if not append random string
    const slugExists = await PracticeSubCategory.findOne({ slug: finalSlug });
    if (slugExists) {
      finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // Create new subcategory (numberOfQuestions will be auto-calculated)
    const subCategory = await PracticeSubCategory.create({
      name: subCategoryName,
      slug: finalSlug,
      categoryId,
      unitId: unitId || null,
      chapterId: chapterId || null,
      topicId: topicId || null,
      subTopicId: subTopicId || null,
      duration: duration?.trim() || "",
      maximumMarks: maximumMarks || 0,
      numberOfQuestions: 0, // Will be auto-calculated when questions are added
      negativeMarks: negativeMarks || 0,
      orderNumber: finalOrderNumber,
      status: status || STATUS.ACTIVE,
      description: description || "",
      seoData: seoData || {
        metaTitle: "",
        metaDescription: "",
        metaKeywords: "",
      },
    });

    // Auto-calculate numberOfQuestions (should be 0 for new subcategory)
    await updateSubCategoryQuestionCount(subCategory._id);

    // Populate the category data before returning
    const populatedSubCategory = await PracticeSubCategory.findById(
      subCategory._id
    )
      .populate("categoryId", "name status examId subjectId")
      .populate("unitId", "name status")
      .populate("chapterId", "name status")
      .populate("topicId", "name status")
      .populate("subTopicId", "name status")
      .lean();

    // Clear cache
    cacheManager.clear("practiceSubCategories");

    return successResponse(
      populatedSubCategory,
      "Practice subcategory created successfully",
      201
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}
