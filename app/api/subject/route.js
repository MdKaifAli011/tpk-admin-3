import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subject from "@/models/Subject";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";
import { buildTokenSearchCondition } from "@/utils/searchTokenHelper";

// ---------- GET ALL SUBJECTS (optimized) ----------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    // Allow public access for active subjects only (for frontend self-study pages)
    if (statusFilter !== STATUS.ACTIVE) {
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

    const metaStatus = searchParams.get("metaStatus"); // filled, notFilled
    const search = searchParams.get("search")?.trim();

    // Build query with case-insensitive status matching
    const query = {};
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      query.examId = examId;
    }
    if (statusFilter !== "all") {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }
    if (search) {
      const searchCondition = buildTokenSearchCondition(search, "name");
      if (searchCondition) Object.assign(query, searchCondition);
    }

    // Handle Metadata filtering
    if (metaStatus === "filled" || metaStatus === "notFilled") {
      const SubjectDetails = (await import("@/models/SubjectDetails")).default;
      const detailsWithMeta = await SubjectDetails.find({
        $or: [
          { title: { $ne: "", $exists: true } },
          { metaDescription: { $ne: "", $exists: true } },
          { keywords: { $ne: "", $exists: true } }
        ]
      }).select("subjectId").lean();

      const subjectIdsWithMeta = detailsWithMeta.map(d => d.subjectId);

      if (metaStatus === "filled") {
        query._id = { $in: subjectIdsWithMeta };
      } else {
        query._id = { $nin: subjectIdsWithMeta };
      }
    }

    // Create cache key (skip cache when search is active)
    const cacheKey = `subjects-${JSON.stringify(query)}-${page}-${limit}`;

    if (statusFilter === STATUS.ACTIVE && !search) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Optimize query execution
    const shouldCount = page === 1 || limit < 100;
    const [total, subjects] = await Promise.all([
      shouldCount ? Subject.countDocuments(query) : Promise.resolve(0),
      Subject.find(query)
        .populate("examId", "name status")
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    // Fetch content information from SubjectDetails
    const subjectIds = subjects.map((subject) => subject._id);
    const SubjectDetails = (await import("@/models/SubjectDetails")).default;
    const subjectDetails = await SubjectDetails.find({
      subjectId: { $in: subjectIds },
    })
      .select("subjectId content title metaDescription keywords status createdAt updatedAt")
      .lean();

    // Create a map of subjectId to content info
    const contentMap = new Map();
    subjectDetails.forEach((detail) => {
      const hasContent = detail.content && detail.content.trim() !== "";
      const hasMeta = !!(detail.title?.trim() || detail.metaDescription?.trim() || detail.keywords?.trim());
      contentMap.set(detail.subjectId.toString(), {
        hasContent,
        hasMeta,
        contentDate: hasContent ? (detail.updatedAt || detail.createdAt) : null,
        detailsStatus: detail.status || "draft",
      });
    });

    // Add content info to each subject
    const subjectsWithContent = subjects.map((subject) => {
      const contentInfo = contentMap.get(subject._id.toString()) || {
        hasContent: false,
        hasMeta: false,
        contentDate: null,
        detailsStatus: "draft",
      };
      return {
        ...subject,
        contentInfo,
      };
    });

    const response = createPaginationResponse(subjectsWithContent, total, page, limit);

    if (statusFilter === "all") {
      const countsByExam = await Subject.aggregate([
        { $match: query },
        { $group: { _id: "$examId", count: { $sum: 1 } } },
      ]).exec();
      const map = {};
      countsByExam.forEach(({ _id, count }) => {
        const key = _id ? _id.toString() : "unassigned";
        map[key] = count;
      });
      response.countsByExam = map;
    }

    // Cache the response (only for active status)
    if (statusFilter === STATUS.ACTIVE) {
      cacheManager.set(cacheKey, response, 5 * 60 * 1000); // 5 minutes TTL
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE SUBJECT ----------
export async function POST(request) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();
    const { name, examId, orderNumber, status } = body;

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

    // Capitalize first letter of each word in subject name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const subjectName = toTitleCase(name);

    // Check for duplicate subject name within the same exam
    const existingSubject = await Subject.findOne({
      name: subjectName,
      examId,
    });
    if (existingSubject) {
      return errorResponse("Subject with this name already exists for this exam", 409);
    }

    // Determine orderNumber
    let finalOrderNumber = orderNumber;
    if (finalOrderNumber === undefined || finalOrderNumber === null) {
      const maxOrderDoc = await Subject.findOne({ examId })
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      finalOrderNumber = maxOrderDoc ? (maxOrderDoc.orderNumber || 0) + 1 : 1;
    }

    // Create new subject (content/SEO fields are now in SubjectDetails)
    const subject = await Subject.create({
      name: subjectName,
      examId,
      orderNumber: finalOrderNumber,
      status: status || STATUS.ACTIVE,
    });

    // Populate the exam data before returning
    const populatedSubject = await Subject.findById(subject._id)
      .populate("examId", "name status")
      .lean();

    // Clear cache when new subject is created
    cacheManager.clear("subjects-");

    return successResponse(populatedSubject, "Subject created successfully", 201);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

