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

    // Build query with case-insensitive status matching
    let query = {};
    if (statusFilter !== "all") {
      // Use regex for case-insensitive matching
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }

    // Create cache key
    const cacheKey = `exams-${statusFilter}-${page}-${limit}`;

    // Check cache (only for active status, and skip cache for admin requests)
    // Skip cache if request has no-cache header (for immediate updates)
    const noCache = request.headers.get("cache-control") === "no-cache";
    if (!noCache && statusFilter === STATUS.ACTIVE) {
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
        .select("name slug status orderNumber createdAt")
        .lean()
        .exec(),
    ]);

    // Ensure all returned exams are valid (have name and match status)
    const validExams = exams.filter((exam) => {
      if (!exam || !exam.name) return false;
      // Double-check status match (case-insensitive)
      if (statusFilter !== "all") {
        return exam.status && exam.status.toLowerCase() === statusFilter;
      }
      return true;
    });

    // Fetch content information from ExamDetails
    const examIds = validExams.map((exam) => exam._id);
    const ExamDetails = (await import("@/models/ExamDetails")).default;
    const examDetails = await ExamDetails.find({
      examId: { $in: examIds },
    })
      .select("examId content createdAt updatedAt")
      .lean();

    // Create a map of examId to content info
    const contentMap = new Map();
    examDetails.forEach((detail) => {
      const hasContent = detail.content && detail.content.trim() !== "";
      contentMap.set(detail.examId.toString(), {
        hasContent,
        contentDate: hasContent ? (detail.updatedAt || detail.createdAt) : null,
      });
    });

    // Add content info to each exam
    const examsWithContent = validExams.map((exam) => {
      const contentInfo = contentMap.get(exam._id.toString()) || {
        hasContent: false,
        contentDate: null,
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

    // Auto-generate orderNumber if not provided
    let orderNumber = body.orderNumber;
    if (!orderNumber || orderNumber < 1) {
      // Find the maximum orderNumber and add 1
      const maxOrderExam = await Exam.findOne()
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      orderNumber = maxOrderExam?.orderNumber ? maxOrderExam.orderNumber + 1 : 1;
    }

    // Create new exam
    const newExam = await Exam.create({
      name: examName,
      status: body.status || STATUS.ACTIVE,
      orderNumber: orderNumber,
    });

    // Clear cache when new exam is created
    cacheManager.clear("exams-");

    return successResponse(newExam, "Exam created successfully", 201);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}
