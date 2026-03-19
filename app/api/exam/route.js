import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import {
  buildQueryFromParams,
  getCachedOrExecute,
  optimizedFind,
} from "@/utils/apiRouteHelpers";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAction, requireAuth } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";
import { buildTokenSearchCondition } from "@/utils/searchTokenHelper";

// ✅ GET: Fetch all exams with pagination (optimized)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    // Allow public access for active exams only (for student registration)
    // Require authentication for inactive/all exams (admin access)
    if (statusFilter !== STATUS.ACTIVE) {
      const authCheck = await requireAuth(request);
      if (authCheck.error) {
        return NextResponse.json(authCheck, { status: authCheck.status || 401 });
      }
    }

    await connectDB();

    // Parse pagination
    const { page, limit, skip } = parsePagination(searchParams);

    const metaStatus = searchParams.get("metaStatus"); // filled, notFilled
    const search = searchParams.get("search")?.trim();

    // Build query with case-insensitive status matching
    let query = {};
    if (statusFilter !== "all") {
      // Include active OR missing/null status so newly created or cloned docs without status still show
      if (statusFilter === STATUS.ACTIVE) {
        query.$or = [
          { status: { $regex: new RegExp(`^${statusFilter}$`, "i") } },
          { status: { $exists: false } },
          { status: null },
          { status: "" },
        ];
      } else {
        query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
      }
    }

    // Handle Metadata filtering
    if (metaStatus === "filled" || metaStatus === "notFilled") {
      const ExamDetails = (await import("@/models/ExamDetails")).default;
      const detailsWithMeta = await ExamDetails.find({
        $or: [
          { title: { $ne: "", $exists: true } },
          { metaDescription: { $ne: "", $exists: true } },
          { keywords: { $ne: "", $exists: true } }
        ]
      }).select("examId").lean();

      const examIdsWithMeta = detailsWithMeta.map(d => d.examId);

      if (metaStatus === "filled") {
        query._id = { $in: examIdsWithMeta };
      } else {
        query._id = { $nin: examIdsWithMeta };
      }
    }

    // Token-based search: match ANY keyword (stop words removed, OR logic)
    if (search) {
      const searchCondition = buildTokenSearchCondition(search, "name");
      if (searchCondition) Object.assign(query, searchCondition);
    }

    // Create cache key (skip cache when search is active)
    const cacheKey = `exams-${statusFilter}-${page}-${limit}${search ? `-${search}` : ""}`;

    // Check cache (only for active status, skip when search or no-cache header)
    const noCache = request.headers.get("cache-control") === "no-cache";
    if (!noCache && statusFilter === STATUS.ACTIVE && !search) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Optimize query execution
    const shouldCount = page === 1 || limit < 100;
    const [total, exams] = await Promise.all([
      shouldCount ? Exam.countDocuments(query) : Promise.resolve(0),
      Exam.find(query)
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("name slug status orderNumber image description createdAt visitStats")
        .lean()
        .exec(),
    ]);

    // Ensure all returned exams are valid (have name and match status)
    const validExams = exams.filter((exam) => {
      if (!exam || !exam.name) return false;
      // Double-check status match (case-insensitive); treat missing status as "active" for public list
      if (statusFilter !== "all") {
        const s = (exam.status || "active").toLowerCase();
        return s === statusFilter;
      }
      return true;
    });

    // Fetch content information from ExamDetails
    const examIds = validExams.map((exam) => exam._id);
    const ExamDetails = (await import("@/models/ExamDetails")).default;
    const examDetails = await ExamDetails.find({
      examId: { $in: examIds },
    })
      .select("examId content title metaDescription keywords status createdAt updatedAt")
      .lean();

    // Create a map of examId to content info
    const contentMap = new Map();
    examDetails.forEach((detail) => {
      const hasContent = detail.content && detail.content.trim() !== "";
      const hasMeta = !!(detail.title?.trim() || detail.metaDescription?.trim() || detail.keywords?.trim());
      contentMap.set(detail.examId.toString(), {
        hasContent,
        hasMeta,
        contentDate: hasContent ? (detail.updatedAt || detail.createdAt) : null,
        detailsStatus: detail.status || "draft",
      });
    });

    // Add content info to each exam
    const examsWithContent = validExams.map((exam) => {
      const contentInfo = contentMap.get(exam._id.toString()) || {
        hasContent: false,
        hasMeta: false,
        contentDate: null,
        detailsStatus: "draft",
      };
      return {
        ...exam,
        contentInfo,
      };
    });

    // Update total count based on valid exams if needed
    const actualTotal = shouldCount ? total : validExams.length;
    const response = createPaginationResponse(
      examsWithContent,
      actualTotal,
      page,
      limit
    );

    // Cache the response (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      cacheManager.set(cacheKey, response, 30 * 1000); // 30 seconds TTL
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ✅ POST: Create new exam
export async function POST(request) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim() === "") {
      return errorResponse("Exam name is required", 400);
    }

    // Capitalize exam name
    const examName = body.name.trim().toUpperCase();

    // Check for duplicate exam name
    const existingExam = await Exam.findOne({ name: examName });
    if (existingExam) {
      return errorResponse("Exam with this name already exists", 409);
    }

    // Auto-generate orderNumber: unique, incremental (max + 1)
    let orderNumber = body.orderNumber;
    if (!orderNumber || orderNumber < 1 || !Number.isInteger(Number(orderNumber))) {
      const maxOrderExam = await Exam.findOne()
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      orderNumber = maxOrderExam?.orderNumber != null ? maxOrderExam.orderNumber + 1 : 1;
    }
    orderNumber = Math.max(1, Number(orderNumber));

    // Debug logging
    console.log("Creating Exam with payload:", {
      name: examName,
      status: body.status,
      image: body.image,
      description: body.description
    });

    // Create new exam
    const newExam = await Exam.create({
      name: examName,
      status: body.status || STATUS.ACTIVE,
      orderNumber: orderNumber,
      image: body.image || "",
      description: body.description || [],
    });

    console.log("Exam created in DB:", newExam);

    // Clear cache when new exam is created
    cacheManager.clear("exams-");

    return successResponse(newExam, "Exam created successfully", 201);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}
