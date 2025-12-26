import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Definition from "@/models/Definition";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import mongoose from "mongoose";
import OrderCounter from "@/models/OrderCounter";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";

// ---------- GET ALL DEFINITIONS ----------
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
    const subTopicId = searchParams.get("subTopicId");
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    // Build query with case-insensitive status matching
    const filter = {};
    if (topicId) {
      if (!mongoose.Types.ObjectId.isValid(topicId)) {
        return errorResponse("Invalid topicId", 400);
      }
      filter.topicId = topicId;
    }
    if (subTopicId) {
      if (!mongoose.Types.ObjectId.isValid(subTopicId)) {
        return errorResponse("Invalid subTopicId", 400);
      }
      filter.subTopicId = subTopicId;
    }
    if (statusFilter !== "all") {
      filter.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }

    // Get total count
    const total = await Definition.countDocuments(filter);

    // Fetch definitions with pagination
    let definitions = await Definition.find(filter)
      .populate("examId", "name status")
      .populate("subjectId", "name")
      .populate("unitId", "name orderNumber")
      .populate("chapterId", "name orderNumber")
      .populate({
        path: "topicId",
        select: "name orderNumber chapterId",
        populate: {
          path: "chapterId",
          select: "name orderNumber"
        }
      })
      .populate("subTopicId", "name orderNumber")
      .sort({ orderNumber: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // If chapterId is missing but topicId has chapterId, use it (for backward compatibility)
    definitions = definitions.map(def => {
      if (!def.chapterId && def.topicId?.chapterId) {
        def.chapterId = def.topicId.chapterId;
      }
      return def;
    });

    // Fetch content information from DefinitionDetails
    const definitionIds = definitions.map((def) => def._id);
    const DefinitionDetails = (await import("@/models/DefinitionDetails")).default;
    const definitionDetails = await DefinitionDetails.find({
      definitionId: { $in: definitionIds },
    })
      .select("definitionId content createdAt updatedAt")
      .lean();

    // Create a map of definitionId to content info
    const contentMap = new Map();
    definitionDetails.forEach((detail) => {
      const hasContent = detail.content && detail.content.trim() !== "";
      contentMap.set(detail.definitionId.toString(), {
        hasContent,
        contentDate: hasContent ? (detail.updatedAt || detail.createdAt) : null,
      });
    });

    // Add content info to each definition
    const definitionsWithContent = definitions.map((def) => {
      const contentInfo = contentMap.get(def._id.toString()) || {
        hasContent: false,
        contentDate: null,
      };
      return {
        ...def,
        contentInfo,
      };
    });

    return NextResponse.json(
      createPaginationResponse(definitionsWithContent, total, page, limit)
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE NEW DEFINITION ----------
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

    // Basic shape validation
    for (const item of items) {
      const { name, examId, subjectId, unitId, chapterId, topicId, subTopicId } = item || {};
      // chapterId is optional - will be auto-populated from topicId if missing
      if (!name || !examId || !subjectId || !unitId || !topicId || !subTopicId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Definition name, exam, subject, unit, topic, and subtopic are required",
          },
          { status: 400 }
        );
      }

      // Validate required ObjectIds (chapterId is optional)
      const requiredObjectIds = { examId, subjectId, unitId, topicId, subTopicId };
      for (const [key, value] of Object.entries(requiredObjectIds)) {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return NextResponse.json(
            { success: false, message: `Invalid ${key}` },
            { status: 400 }
          );
        }
      }
      
      // Validate chapterId if provided
      if (chapterId && !mongoose.Types.ObjectId.isValid(chapterId)) {
        return NextResponse.json(
          { success: false, message: "Invalid chapterId" },
          { status: 400 }
        );
      }
    }

    // Verify referenced documents exist (using first item's ids; all items use same ids from UI)
    const { examId, subjectId, unitId, chapterId, topicId, subTopicId } = items[0];
    const Chapter = (await import("@/models/Chapter")).default;
    
    // Fetch topic first to get chapterId if not provided
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return NextResponse.json(
        { success: false, message: "Topic not found" },
        { status: 404 }
      );
    }
    
    // Use provided chapterId or get it from topic
    const finalChapterId = chapterId || topic.chapterId;
    
    const [exam, subject, unit, chapter, subTopic] = await Promise.all([
      Exam.findById(examId),
      Subject.findById(subjectId),
      Unit.findById(unitId),
      finalChapterId ? Chapter.findById(finalChapterId) : Promise.resolve(null),
      SubTopic.findById(subTopicId),
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
    if (finalChapterId && !chapter)
      return NextResponse.json(
        { success: false, message: "Chapter not found" },
        { status: 404 }
      );
    if (!subTopic)
      return NextResponse.json(
        { success: false, message: "SubTopic not found" },
        { status: 404 }
      );

    // Process creations sequentially to compute per-subtopic order and check duplicates
    const createdDefinitions = [];
    for (const item of items) {
      const { name, subTopicId, topicId, chapterId } = item;

      // Capitalize first letter of each word in definition name (excluding And, Of, Or, In)
      const { toTitleCase } = await import("@/utils/titleCase");
      const definitionName = toTitleCase(name);

      // Auto-populate chapterId from topicId if missing (for backward compatibility)
      let finalChapterId = item.chapterId || chapterId;
      if (!finalChapterId && item.topicId) {
        try {
          const topicDoc = await Topic.findById(item.topicId).select("chapterId").lean();
          if (topicDoc?.chapterId) {
            finalChapterId = topicDoc.chapterId;
            console.log(`✅ Auto-populated chapterId ${finalChapterId} from topicId ${item.topicId} for definition "${definitionName}"`);
          }
        } catch (error) {
          console.error("Error fetching chapterId from topic:", error);
        }
      }
      
      // Ensure chapterId is set - if still missing, this is an error
      if (!finalChapterId) {
        return NextResponse.json(
          {
            success: false,
            message: "Chapter is required. Please select a chapter or ensure the topic has a chapter assigned.",
          },
          { status: 400 }
        );
      }

      // Duplicate name within same subtopic check
      const existingDefinition = await Definition.findOne({
        name: definitionName,
        subTopicId,
      });
      if (existingDefinition) {
        return NextResponse.json(
          {
            success: false,
            message: "Definition name already exists in this subtopic",
          },
          { status: 409 }
        );
      }

      // Determine order number. Prefer atomic per-subTopic counter to avoid races.
      let finalOrderNumber = item.orderNumber;
      if (!finalOrderNumber) {
        try {
          const key = `definition:${subTopicId}`;
          const counter = await OrderCounter.findOneAndUpdate(
            { key },
            { $inc: { last: 1 } },
            { upsert: true, new: true }
          ).lean();
          if (counter && typeof counter.last === "number") {
            finalOrderNumber = counter.last;
          }
        } catch (counterErr) {
          // Fallback to legacy computation if counter fails
          const lastDefinition = await Definition.findOne({ subTopicId })
            .sort({ orderNumber: -1 })
            .select("orderNumber");
          finalOrderNumber = lastDefinition ? lastDefinition.orderNumber + 1 : 1;
        }
      }

      // Create new definition (content/SEO fields are now in DefinitionDetails)
      // Attempt create and retry once on duplicate-key error by recomputing order using chapter scope.
      try {
        const doc = await Definition.create({
          name: definitionName,
          examId: item.examId,
          subjectId: item.subjectId,
          unitId: item.unitId,
          chapterId: finalChapterId, // Use auto-populated chapterId if original was missing
          topicId: item.topicId,
          subTopicId,
          orderNumber: finalOrderNumber,
          status: item.status || STATUS.ACTIVE,
        });
        createdDefinitions.push(doc._id);
      } catch (err) {
        // If duplicate key error (possible index on chapterId+orderNumber exists),
        // recompute orderNumber scoped to chapterId and retry once.
        if (err?.code === 11000) {
          try {
            const lastByChapter = await Definition.findOne({ chapterId: finalChapterId })
              .sort({ orderNumber: -1 })
              .select("orderNumber");
            const altOrder = lastByChapter ? lastByChapter.orderNumber + 1 : 1;
            const doc2 = await Definition.create({
              name: definitionName,
              examId: item.examId,
              subjectId: item.subjectId,
              unitId: item.unitId,
              chapterId: finalChapterId,
              topicId: item.topicId,
              subTopicId,
              orderNumber: altOrder,
              status: item.status || STATUS.ACTIVE,
            });
            createdDefinitions.push(doc2._id);
          } catch (err2) {
            // If still failing, bubble up original error for consistent handling
            throw err2;
          }
        } else {
          throw err;
        }
      }
    }

    // Populate and return
    let populated = await Definition.find({ _id: { $in: createdDefinitions } })
      .populate("examId", "name status")
      .populate("subjectId", "name")
      .populate("unitId", "name orderNumber")
      .populate("chapterId", "name orderNumber")
      .populate({
        path: "topicId",
        select: "name orderNumber chapterId",
        populate: {
          path: "chapterId",
          select: "name orderNumber"
        }
      })
      .populate("subTopicId", "name orderNumber")
      .lean();

    // If chapterId is missing but topicId has chapterId, use it (for backward compatibility)
    populated = populated.map(def => {
      if (!def.chapterId && def.topicId?.chapterId) {
        def.chapterId = def.topicId.chapterId;
      }
      return def;
    });

    return successResponse(
      populated,
      `Definition${createdDefinitions.length > 1 ? "s" : ""} created successfully`,
      201
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

