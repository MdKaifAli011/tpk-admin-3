import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Topic from "@/models/Topic";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import { buildTokenSearchCondition } from "@/utils/searchTokenHelper";

// ---------- GET ALL TOPICS ----------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    // Allow public access for active topics only (for frontend self-study pages)
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
    const chapterId = searchParams.get("chapterId");
    const examId = searchParams.get("examId");
    const subjectId = searchParams.get("subjectId");
    const unitId = searchParams.get("unitId");

    const metaStatus = searchParams.get("metaStatus"); // filled, notFilled
    const search = searchParams.get("search")?.trim();

    // Build query with case-insensitive status matching
    const filter = {};
    if (chapterId) {
      if (!mongoose.Types.ObjectId.isValid(chapterId)) {
        return errorResponse("Invalid chapterId", 400);
      }
      filter.chapterId = chapterId;
    }
    if (examId) {
      if (!mongoose.Types.ObjectId.isValid(examId)) {
        return errorResponse("Invalid examId", 400);
      }
      filter.examId = examId;
    }
    if (subjectId) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return errorResponse("Invalid subjectId", 400);
      }
      filter.subjectId = subjectId;
    }
    if (unitId) {
      if (!mongoose.Types.ObjectId.isValid(unitId)) {
        return errorResponse("Invalid unitId", 400);
      }
      filter.unitId = unitId;
    }
    if (statusFilter !== "all") {
      filter.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }
    if (search) {
      const searchCondition = buildTokenSearchCondition(search, "name");
      if (searchCondition) Object.assign(filter, searchCondition);
    }

    // Handle Metadata filtering
    if (metaStatus === "filled" || metaStatus === "notFilled") {
      const TopicDetails = (await import("@/models/TopicDetails")).default;
      const detailsWithMeta = await TopicDetails.find({
        $or: [
          { title: { $ne: "", $exists: true } },
          { metaDescription: { $ne: "", $exists: true } },
          { keywords: { $ne: "", $exists: true } }
        ]
      }).select("topicId").lean();

      const topicIdsWithMeta = detailsWithMeta.map(d => d.topicId);

      if (metaStatus === "filled") {
        filter._id = { $in: topicIdsWithMeta };
      } else {
        filter._id = { $nin: topicIdsWithMeta };
      }
    }

    // Get total count
    const total = await Topic.countDocuments(filter);

    // Fetch topics with pagination
    const topics = await Topic.find(filter)
      .populate("examId", "name status")
      .populate("subjectId", "name")
      .populate("unitId", "name orderNumber")
      .populate("chapterId", "name orderNumber")
      .sort({ orderNumber: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch content information from TopicDetails
    const topicIds = topics.map((topic) => topic._id);
    const TopicDetails = (await import("@/models/TopicDetails")).default;
    const topicDetails = await TopicDetails.find({
      topicId: { $in: topicIds },
    })
      .select("topicId content title metaDescription keywords status createdAt updatedAt")
      .lean();

    // Create a map of topicId to content info
    const contentMap = new Map();
    topicDetails.forEach((detail) => {
      const hasContent = detail.content && detail.content.trim() !== "";
      const hasMeta = !!(detail.title?.trim() || detail.metaDescription?.trim() || detail.keywords?.trim());
      contentMap.set(detail.topicId.toString(), {
        hasContent,
        hasMeta,
        contentDate: hasContent ? (detail.updatedAt || detail.createdAt) : null,
        detailsStatus: detail.status || "draft",
      });
    });

    // Add content info to each topic
    const topicsWithContent = topics.map((topic) => {
      const contentInfo = contentMap.get(topic._id.toString()) || {
        hasContent: false,
        hasMeta: false,
        contentDate: null,
        detailsStatus: "draft",
      };
      return {
        ...topic,
        contentInfo,
      };
    });

    const response = createPaginationResponse(topicsWithContent, total, page, limit);
    if (statusFilter === "all") {
      const countsByChapter = await Topic.aggregate([
        { $match: filter },
        { $group: { _id: "$chapterId", count: { $sum: 1 } } },
      ]).exec();
      const map = {};
      countsByChapter.forEach(({ _id, count }) => {
        if (_id) map[_id.toString()] = count;
      });
      response.countsByChapter = map;
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE NEW TOPIC ----------
export async function POST(request) {
  try {
    // Check authentication and permissions (users need to be able to create)
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const body = await request.json();

    // Normalize to array to support both single and multiple creations
    const items = Array.isArray(body) ? body : [body];
    const upsertFlag = items[0]?.upsert === true;

    // Basic shape validation
    for (const item of items) {
      const { name, examId, subjectId, unitId, chapterId } = item || {};
      if (!name || !examId || !subjectId || !unitId || !chapterId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Topic name, exam, subject, unit, and chapter are required",
          },
          { status: 400 }
        );
      }

      const objectIds = { examId, subjectId, unitId, chapterId };
      for (const [key, value] of Object.entries(objectIds)) {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return NextResponse.json(
            { success: false, message: `Invalid ${key}` },
            { status: 400 }
          );
        }
      }
    }

    // Verify referenced documents exist (using first item's ids; all items use same ids from UI)
    const { examId, subjectId, unitId } = items[0];
    const [exam, subject, unit] = await Promise.all([
      Exam.findById(examId),
      Subject.findById(subjectId),
      Unit.findById(unitId),
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

    // Process creations sequentially to compute per-chapter order and check duplicates
    const createdTopics = [];
    for (const item of items) {
      const { name, chapterId } = item;

      // Ensure chapter exists
      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return NextResponse.json(
          { success: false, message: "Chapter not found" },
          { status: 404 }
        );
      }

      // Capitalize first letter of each word in topic name (excluding And, Of, Or, In)
      const { toTitleCase } = await import("@/utils/titleCase");
      const topicName = toTitleCase(name);

      // Duplicate name within same chapter check
      const existingTopic = await Topic.findOne({
        name: topicName,
        chapterId,
      });
      if (existingTopic) {
        if (upsertFlag) {
          const updateData = { name: topicName };
          if (item.orderNumber !== undefined) updateData.orderNumber = item.orderNumber;
          if (item.status) updateData.status = item.status;
          const updated = await Topic.findByIdAndUpdate(
            existingTopic._id,
            { $set: updateData },
            { new: true, runValidators: true }
          )
            .populate("examId", "name status")
            .populate("subjectId", "name")
            .populate("unitId", "name orderNumber")
            .populate("chapterId", "name orderNumber")
            .lean();
          return NextResponse.json({
            success: true,
            message: "Topic updated successfully",
            data: updated,
            updated: true,
            timestamp: new Date().toISOString(),
          }, { status: 200 });
        }
        return NextResponse.json(
          {
            success: false,
            message: "Topic name already exists in this chapter",
          },
          { status: 409 }
        );
      }

      // Determine order number
      let finalOrderNumber = item.orderNumber;
      if (!finalOrderNumber) {
        const lastTopic = await Topic.findOne({ chapterId })
          .sort({ orderNumber: -1 })
          .select("orderNumber");
        finalOrderNumber = lastTopic ? lastTopic.orderNumber + 1 : 1;
      }

      // Create new topic (content/SEO fields are now in TopicDetails)
      const doc = await Topic.create({
        name: topicName,
        examId: item.examId,
        subjectId: item.subjectId,
        unitId: item.unitId,
        chapterId,
        orderNumber: finalOrderNumber,
        status: item.status || STATUS.ACTIVE,
      });
      createdTopics.push(doc._id);
    }

    // Populate and return
    const populated = await Topic.find({ _id: { $in: createdTopics } })
      .populate("examId", "name status")
      .populate("subjectId", "name")
      .populate("unitId", "name orderNumber")
      .populate("chapterId", "name orderNumber")
      .lean();

    return successResponse(
      populated,
      `Topic${createdTopics.length > 1 ? "s" : ""} created successfully`,
      201
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

