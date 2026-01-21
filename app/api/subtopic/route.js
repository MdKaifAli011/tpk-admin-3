import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SubTopic from "@/models/SubTopic";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";

// ---------- GET ALL SUBTOPICS ----------
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
    const topicId = searchParams.get("topicId");
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    const metaStatus = searchParams.get("metaStatus"); // filled, notFilled

    // Build query with case-insensitive status matching
    const filter = {};
    if (topicId) {
      if (!mongoose.Types.ObjectId.isValid(topicId)) {
        return errorResponse("Invalid topicId", 400);
      }
      filter.topicId = topicId;
    }
    if (statusFilter !== "all") {
      filter.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }

    // Handle Metadata filtering
    if (metaStatus === "filled" || metaStatus === "notFilled") {
      const SubTopicDetails = (await import("@/models/SubTopicDetails")).default;
      const detailsWithMeta = await SubTopicDetails.find({
        $or: [
          { title: { $ne: "", $exists: true } },
          { metaDescription: { $ne: "", $exists: true } },
          { keywords: { $ne: "", $exists: true } }
        ]
      }).select("subTopicId").lean();

      const subTopicIdsWithMeta = detailsWithMeta.map(d => d.subTopicId);

      if (metaStatus === "filled") {
        filter._id = { $in: subTopicIdsWithMeta };
      } else {
        filter._id = { $nin: subTopicIdsWithMeta };
      }
    }

    // Get total count
    const total = await SubTopic.countDocuments(filter);

    // Fetch subtopics with pagination
    const subTopics = await SubTopic.find(filter)
      .populate("examId", "name status")
      .populate("subjectId", "name")
      .populate("unitId", "name orderNumber")
      .populate("chapterId", "name orderNumber")
      .populate("topicId", "name orderNumber")
      .sort({ orderNumber: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch content information from SubTopicDetails
    const subTopicIds = subTopics.map((subTopic) => subTopic._id);
    const SubTopicDetails = (await import("@/models/SubTopicDetails")).default;
    const subTopicDetails = await SubTopicDetails.find({
      subTopicId: { $in: subTopicIds },
    })
      .select("subTopicId content title metaDescription keywords createdAt updatedAt")
      .lean();

    // Create a map of subTopicId to content info
    const contentMap = new Map();
    subTopicDetails.forEach((detail) => {
      const hasContent = detail.content && detail.content.trim() !== "";
      const hasMeta = !!(detail.title?.trim() || detail.metaDescription?.trim() || detail.keywords?.trim());
      contentMap.set(detail.subTopicId.toString(), {
        hasContent,
        hasMeta,
        contentDate: hasContent ? (detail.updatedAt || detail.createdAt) : null,
      });
    });

    // Add content info to each subtopic
    const subTopicsWithContent = subTopics.map((subTopic) => {
      const contentInfo = contentMap.get(subTopic._id.toString()) || {
        hasContent: false,
        hasMeta: false,
        contentDate: null,
      };
      return {
        ...subTopic,
        contentInfo,
      };
    });

    return NextResponse.json(
      createPaginationResponse(subTopicsWithContent, total, page, limit)
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE NEW SUBTOPIC ----------
export async function POST(request) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();

    // Normalize to array to support both single and multiple creations
    const items = Array.isArray(body) ? body : [body];

    // Basic shape validation on each item
    for (const item of items) {
      const { name, examId, subjectId, unitId, chapterId, topicId } =
        item || {};
      if (!name || !examId || !subjectId || !unitId || !chapterId || !topicId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Sub topic name, exam, subject, unit, chapter, and topic are required",
          },
          { status: 400 }
        );
      }
      const objectIds = { examId, subjectId, unitId, chapterId, topicId };
      for (const [key, value] of Object.entries(objectIds)) {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return NextResponse.json(
            { success: false, message: `Invalid ${key}` },
            { status: 400 }
          );
        }
      }
    }

    // Verify referenced documents exist (using first item's ids; UI shares the same ids across items)
    const { examId, subjectId, unitId, chapterId } = items[0];
    const [exam, subject, unit, chapter] = await Promise.all([
      Exam.findById(examId),
      Subject.findById(subjectId),
      Unit.findById(unitId),
      Chapter.findById(chapterId),
    ]);
    if (!exam)
      return NextResponse.json(
        { success: false, message: "Exam not found" },
        { status: 404 }
      );
    if (!subject)
      return NextResponse.json(
        { success: false, message: "Subject not found" },
        { status: 404 }
      );
    if (!unit)
      return NextResponse.json(
        { success: false, message: "Unit not found" },
        { status: 404 }
      );
    if (!chapter)
      return NextResponse.json(
        { success: false, message: "Chapter not found" },
        { status: 404 }
      );

    const createdIds = [];
    for (const item of items) {
      const { name, topicId } = item;

      // Ensure topic exists for each item
      const topic = await Topic.findById(topicId);
      if (!topic) {
        return NextResponse.json(
          { success: false, message: "Topic not found" },
          { status: 404 }
        );
      }

      // Capitalize first letter of each word in subtopic name (excluding And, Of, Or, In)
      const { toTitleCase } = await import("@/utils/titleCase");
      const subTopicName = toTitleCase(name);

      // Duplicate name within same topic check
      const existingSubTopic = await SubTopic.findOne({
        name: subTopicName,
        topicId,
      });
      if (existingSubTopic) {
        return NextResponse.json(
          {
            success: false,
            message: "Sub topic name already exists in this topic",
          },
          { status: 409 }
        );
      }

      // Determine order number
      let finalOrderNumber = item.orderNumber;
      if (!finalOrderNumber) {
        const last = await SubTopic.findOne({ topicId })
          .sort({ orderNumber: -1 })
          .select("orderNumber");
        finalOrderNumber = last ? last.orderNumber + 1 : 1;
      }

      // Create new subtopic (content/SEO fields are now in SubTopicDetails)
      const doc = await SubTopic.create({
        name: subTopicName,
        examId: item.examId,
        subjectId: item.subjectId,
        unitId: item.unitId,
        chapterId: item.chapterId,
        topicId,
        orderNumber: finalOrderNumber,
        status: item.status || STATUS.ACTIVE,
      });
      createdIds.push(doc._id);
    }

    const populated = await SubTopic.find({ _id: { $in: createdIds } })
      .populate("examId", "name status")
      .populate("subjectId", "name")
      .populate("unitId", "name orderNumber")
      .populate("chapterId", "name orderNumber")
      .populate("topicId", "name orderNumber")
      .lean();

    return successResponse(
      populated,
      `Sub topic${createdIds.length > 1 ? "s" : ""} created successfully`,
      201
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

