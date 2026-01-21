import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Unit from "@/models/Unit";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";

// ---------- GET ALL UNITS ----------
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
    const subjectId = searchParams.get("subjectId");
    const examId = searchParams.get("examId");
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    const metaStatus = searchParams.get("metaStatus"); // filled, notFilled

    // Build query with case-insensitive status matching
    const query = {};
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      query.subjectId = subjectId;
    }
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      query.examId = examId;
    }
    if (statusFilter !== "all") {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }

    // Handle Metadata filtering
    if (metaStatus === "filled" || metaStatus === "notFilled") {
      const UnitDetails = (await import("@/models/UnitDetails")).default;
      const detailsWithMeta = await UnitDetails.find({
        $or: [
          { title: { $ne: "", $exists: true } },
          { metaDescription: { $ne: "", $exists: true } },
          { keywords: { $ne: "", $exists: true } }
        ]
      }).select("unitId").lean();

      const unitIdsWithMeta = detailsWithMeta.map(d => d.unitId);

      if (metaStatus === "filled") {
        query._id = { $in: unitIdsWithMeta };
      } else {
        query._id = { $nin: unitIdsWithMeta };
      }
    }

    // Create cache key
    const cacheKey = `units-${JSON.stringify(query)}-${page}-${limit}`;

    // Check cache (only for active status queries to avoid stale data)
    if (statusFilter === STATUS.ACTIVE) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Optimize query: only get count if we need pagination info
    const shouldCount = page === 1 || limit < 100;

    // Parallel execution for better performance
    const [total, units] = await Promise.all([
      shouldCount ? Unit.countDocuments(query) : Promise.resolve(0),
      Unit.find(query)
        .populate("subjectId", "name")
        .populate("examId", "name status")
        .sort({ orderNumber: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec()
    ]);

    // Fetch content information from UnitDetails
    const unitIds = units.map((unit) => unit._id);
    const UnitDetails = (await import("@/models/UnitDetails")).default;
    const unitDetails = await UnitDetails.find({
      unitId: { $in: unitIds },
    })
      .select("unitId content title metaDescription keywords createdAt updatedAt")
      .lean();

    // Create a map of unitId to content info
    const contentMap = new Map();
    unitDetails.forEach((detail) => {
      const hasContent = detail.content && detail.content.trim() !== "";
      const hasMeta = !!(detail.title?.trim() || detail.metaDescription?.trim() || detail.keywords?.trim());
      contentMap.set(detail.unitId.toString(), {
        hasContent,
        hasMeta,
        contentDate: hasContent ? (detail.updatedAt || detail.createdAt) : null,
      });
    });

    // Add content info to each unit
    const unitsWithContent = units.map((unit) => {
      const contentInfo = contentMap.get(unit._id.toString()) || {
        hasContent: false,
        hasMeta: false,
        contentDate: null,
      };
      return {
        ...unit,
        contentInfo,
      };
    });

    const response = createPaginationResponse(unitsWithContent, total, page, limit);

    // Cache the response (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      cacheManager.set(cacheKey, response, 5 * 60 * 1000); // 5 minutes TTL
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE UNIT ----------
export async function POST(request) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();
    const { name, orderNumber, subjectId, examId, status } = body;

    // Validate required fields
    if (!name || !subjectId || !examId) {
      return errorResponse("Name, subjectId, and examId are required", 400);
    }

    // Validate ObjectId formats
    if (
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !mongoose.Types.ObjectId.isValid(examId)
    ) {
      return errorResponse("Invalid subjectId or examId format", 400);
    }

    // Check if subject and exam exist
    const Subject = (await import("@/models/Subject")).default;
    const Exam = (await import("@/models/Exam")).default;

    const [subjectExists, examExists] = await Promise.all([
      Subject.findById(subjectId),
      Exam.findById(examId),
    ]);

    if (!subjectExists) {
      return errorResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND, 404);
    }

    if (!examExists) {
      return errorResponse(ERROR_MESSAGES.EXAM_NOT_FOUND, 404);
    }

    // Capitalize first letter of each word in unit name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const unitName = toTitleCase(name);

    // Check for duplicate unit name within the same subject
    const existingUnit = await Unit.findOne({
      name: unitName,
      subjectId,
    });
    if (existingUnit) {
      return errorResponse("Unit with this name already exists in this subject", 409);
    }

    // Auto-generate orderNumber if not provided
    let finalOrderNumber = orderNumber;
    if (!finalOrderNumber) {
      const lastUnit = await Unit.findOne({ subjectId })
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      finalOrderNumber = lastUnit ? lastUnit.orderNumber + 1 : 1;
    }

    // Create new unit (content/SEO fields are now in UnitDetails)
    const unit = await Unit.create({
      name: unitName,
      orderNumber: finalOrderNumber,
      subjectId,
      examId,
      status: status || STATUS.ACTIVE,
    });

    // Populate the data before returning
    const populatedUnit = await Unit.findById(unit._id)
      .populate("subjectId", "name")
      .populate("examId", "name status")
      .lean();

    // Clear cache when new unit is created
    cacheManager.clear("units-");

    return successResponse(populatedUnit, "Unit created successfully", 201);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

