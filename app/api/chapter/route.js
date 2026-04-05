import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Chapter from "@/models/Chapter";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import {
  buildTokenSearchCondition,
  combineQueryWithSearchFilter,
  findWithSearchRelevance,
} from "@/utils/searchTokenHelper";
import { regexExactInsensitive } from "@/utils/escapeRegex.js";

// ---------- GET ALL CHAPTERS ----------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    // Allow public access for active chapters only (for frontend self-study pages)
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
    const unitId = searchParams.get("unitId");
    const subjectId = searchParams.get("subjectId");
    const examId = searchParams.get("examId");

    const metaStatus = searchParams.get("metaStatus"); // filled, notFilled
    const search = searchParams.get("search")?.trim();

    // Build query with case-insensitive status matching
    let query = {};
    if (unitId && mongoose.Types.ObjectId.isValid(unitId)) {
      query.unitId = unitId;
    }
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      query.subjectId = subjectId;
    }
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      query.examId = examId;
    }
    if (statusFilter !== "all") {
      query.status = { $regex: regexExactInsensitive(statusFilter) };
    }
    if (search) {
      const searchCondition = buildTokenSearchCondition(search, "name");
      if (searchCondition) query = combineQueryWithSearchFilter(query, searchCondition);
    }

    // Handle Metadata filtering
    if (metaStatus === "filled" || metaStatus === "notFilled") {
      const ChapterDetails = (await import("@/models/ChapterDetails")).default;
      const detailsWithMeta = await ChapterDetails.find({
        $or: [
          { title: { $ne: "", $exists: true } },
          { metaDescription: { $ne: "", $exists: true } },
          { keywords: { $ne: "", $exists: true } }
        ]
      }).select("chapterId").lean();

      const chapterIdsWithMeta = detailsWithMeta.map(d => d.chapterId);

      if (metaStatus === "filled") {
        query._id = { $in: chapterIdsWithMeta };
      } else {
        query._id = { $nin: chapterIdsWithMeta };
      }
    }

    // Get total count
    const total = await Chapter.countDocuments(query);

    // Fetch chapters with pagination
    const chapters = await findWithSearchRelevance(Chapter, query, search, "name", {
      skip,
      limit,
      sortKeys: { orderNumber: 1, createdAt: -1 },
      configureQuery: (q) =>
        q
          .populate("examId", "name status")
          .populate("subjectId", "name")
          .populate("unitId", "name orderNumber"),
    });

    // Fetch content information from ChapterDetails
    const chapterIds = chapters.map((chapter) => chapter._id);
    const ChapterDetails = (await import("@/models/ChapterDetails")).default;
    const chapterDetails = await ChapterDetails.find({
      chapterId: { $in: chapterIds },
    })
      .select("chapterId content title metaDescription keywords status createdAt updatedAt")
      .lean();

    // Create a map of chapterId to content info
    const contentMap = new Map();
    chapterDetails.forEach((detail) => {
      const hasContent = detail.content && detail.content.trim() !== "";
      const hasMeta = !!(detail.title?.trim() || detail.metaDescription?.trim() || detail.keywords?.trim());
      contentMap.set(detail.chapterId.toString(), {
        hasContent,
        hasMeta,
        contentDate: hasContent ? (detail.updatedAt || detail.createdAt) : null,
        detailsStatus: detail.status || "draft",
      });
    });

    // Add content info to each chapter
    const chaptersWithContent = chapters.map((chapter) => {
      const contentInfo = contentMap.get(chapter._id.toString()) || {
        hasContent: false,
        hasMeta: false,
        contentDate: null,
        detailsStatus: "draft",
      };
      return {
        ...chapter,
        contentInfo,
      };
    });

    const response = createPaginationResponse(chaptersWithContent, total, page, limit);
    if (statusFilter === "all") {
      const countsByUnit = await Chapter.aggregate([
        { $match: query },
        { $group: { _id: "$unitId", count: { $sum: 1 } } },
      ]).exec();
      const map = {};
      countsByUnit.forEach(({ _id, count }) => {
        if (_id) map[_id.toString()] = count;
      });
      response.countsByUnit = map;
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE NEW CHAPTER ----------
export async function POST(request) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    const body = await request.json();
    const { name, examId, subjectId, unitId, orderNumber, weightage, time, questions, status, upsert } = body;

    // Validation
    if (!name || !examId || !subjectId || !unitId) {
      return errorResponse("Chapter name, exam, subject, and unit are required", 400);
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(examId) ||
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !mongoose.Types.ObjectId.isValid(unitId)) {
      return errorResponse("Invalid ID format", 400);
    }

    // Check if exam, subject, and unit exist
    const [exam, subject, unit] = await Promise.all([
      Exam.findById(examId),
      Subject.findById(subjectId),
      Unit.findById(unitId),
    ]);

    if (!exam) return errorResponse(ERROR_MESSAGES.EXAM_NOT_FOUND, 404);
    if (!subject) return errorResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND, 404);
    if (!unit) return errorResponse(ERROR_MESSAGES.UNIT_NOT_FOUND, 404);

    // Capitalize first letter of each word in chapter name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const chapterName = toTitleCase(name);

    // Check if chapter name already exists in the same unit
    const existingChapter = await Chapter.findOne({
      name: chapterName,
      unitId: unitId,
    });

    if (existingChapter) {
      if (upsert === true) {
        const updateData = { name: chapterName };
        if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
        if (weightage !== undefined) updateData.weightage = weightage;
        if (time !== undefined) updateData.time = time;
        if (questions !== undefined) updateData.questions = questions;
        if (status) updateData.status = status;
        const updated = await Chapter.findByIdAndUpdate(
          existingChapter._id,
          { $set: updateData },
          { new: true, runValidators: true }
        )
          .populate("examId", "name status")
          .populate("subjectId", "name")
          .populate("unitId", "name orderNumber")
          .lean();
        return NextResponse.json({
          success: true,
          message: "Chapter updated successfully",
          data: updated,
          updated: true,
          timestamp: new Date().toISOString(),
        }, { status: 200 });
      }
      return errorResponse("Chapter name already exists in this unit", 409);
    }

    // Auto-generate order number if not provided
    let finalOrderNumber = orderNumber;
    if (!finalOrderNumber) {
      const lastChapter = await Chapter.findOne({ unitId })
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      finalOrderNumber = lastChapter ? lastChapter.orderNumber + 1 : 1;
    }

    // Create new chapter (content/SEO fields are now in ChapterDetails)
    const chapter = await Chapter.create({
      name: chapterName,
      examId,
      subjectId,
      unitId,
      orderNumber: finalOrderNumber,
      weightage: weightage || 0,
      time: time || 0,
      questions: questions || 0,
      status: status || STATUS.ACTIVE,
    });

    // Populate the data before returning
    const populatedChapter = await Chapter.findById(chapter._id)
      .populate("examId", "name status")
      .populate("subjectId", "name")
      .populate("unitId", "name orderNumber")
      .lean();

    return successResponse(populatedChapter, "Chapter created successfully", 201);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

