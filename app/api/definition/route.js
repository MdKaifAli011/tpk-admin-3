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
import {
  buildTokenSearchCondition,
  combineQueryWithSearchFilter,
  findWithSearchRelevance,
} from "@/utils/searchTokenHelper";
import { regexExactInsensitive } from "@/utils/escapeRegex.js";

// ---------- GET ALL DEFINITIONS ----------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const statusFilter = statusFilterParam.toLowerCase();

    // Allow public access for active definitions only (for frontend self-study pages)
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
    const topicId = searchParams.get("topicId");
    const subTopicId = searchParams.get("subTopicId");
    const examId = searchParams.get("examId");
    const subjectId = searchParams.get("subjectId");
    const unitId = searchParams.get("unitId");
    const chapterId = searchParams.get("chapterId");

    const metaStatus = searchParams.get("metaStatus"); // filled, notFilled
    const search = searchParams.get("search")?.trim();

    // Build query with case-insensitive status matching
    let filter = {};
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
    if (chapterId) {
      if (!mongoose.Types.ObjectId.isValid(chapterId)) {
        return errorResponse("Invalid chapterId", 400);
      }
      filter.chapterId = chapterId;
    }
    if (statusFilter !== "all") {
      filter.status = { $regex: regexExactInsensitive(statusFilter) };
    }
    if (search) {
      const searchCondition = buildTokenSearchCondition(search, "name");
      if (searchCondition) filter = combineQueryWithSearchFilter(filter, searchCondition);
    }

    // Handle Metadata filtering
    if (metaStatus === "filled" || metaStatus === "notFilled") {
      const DefinitionDetails = (await import("@/models/DefinitionDetails")).default;
      const detailsWithMeta = await DefinitionDetails.find({
        $or: [
          { title: { $ne: "", $exists: true } },
          { metaDescription: { $ne: "", $exists: true } },
          { keywords: { $ne: "", $exists: true } }
        ]
      }).select("definitionId").lean();

      const definitionIdsWithMeta = detailsWithMeta.map(d => d.definitionId);

      if (metaStatus === "filled") {
        filter._id = { $in: definitionIdsWithMeta };
      } else {
        filter._id = { $nin: definitionIdsWithMeta };
      }
    }

    // Get total count
    const total = await Definition.countDocuments(filter);

    // Fetch definitions with pagination
    let definitions = await findWithSearchRelevance(Definition, filter, search, "name", {
      skip,
      limit,
      sortKeys: { orderNumber: 1, createdAt: -1 },
      configureQuery: (q) =>
        q
          .populate("examId", "name status")
          .populate("subjectId", "name")
          .populate("unitId", "name orderNumber")
          .populate("chapterId", "name orderNumber")
          .populate({
            path: "topicId",
            select: "name orderNumber chapterId",
            populate: {
              path: "chapterId",
              select: "name orderNumber",
            },
          })
          .populate("subTopicId", "name orderNumber"),
    });

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
      .select("definitionId content title metaDescription keywords status createdAt updatedAt")
      .lean();

    // Create a map of definitionId to content info
    const contentMap = new Map();
    definitionDetails.forEach((detail) => {
      const hasContent = detail.content && detail.content.trim() !== "";
      const hasMeta = !!(detail.title?.trim() || detail.metaDescription?.trim() || detail.keywords?.trim());
      contentMap.set(detail.definitionId.toString(), {
        hasContent,
        hasMeta,
        contentDate: hasContent ? (detail.updatedAt || detail.createdAt) : null,
        detailsStatus: detail.status || "draft",
      });
    });

    // Add content info to each definition
    const definitionsWithContent = definitions.map((def) => {
      const contentInfo = contentMap.get(def._id.toString()) || {
        hasContent: false,
        hasMeta: false,
        contentDate: null,
        detailsStatus: "draft",
      };
      return {
        ...def,
        contentInfo,
      };
    });

    const response = createPaginationResponse(definitionsWithContent, total, page, limit);
    if (statusFilter === "all") {
      const countsBySubTopic = await Definition.aggregate([
        { $match: filter },
        { $group: { _id: "$subTopicId", count: { $sum: 1 } } },
      ]).exec();
      const map = {};
      countsBySubTopic.forEach(({ _id, count }) => {
        if (_id) map[_id.toString()] = count;
      });
      response.countsBySubTopic = map;
    }

    return NextResponse.json(response);
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

      // Check for duplicate name within the same subtopic (case-insensitive)
      // Duplicate names are NOT allowed - each definition name must be unique per subtopic
      const existingDefinition = await Definition.findOne({
        name: { $regex: regexExactInsensitive(definitionName) },
        subTopicId,
      });
      if (existingDefinition) {
        return NextResponse.json(
          {
            success: false,
            message: `Definition name "${definitionName}" already exists in this subtopic. Please use a unique name.`,
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
      // Attempt create and retry on duplicate-key error (slug or orderNumber conflicts)
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
        // Handle duplicate key errors (E11000) - could be slug, orderNumber, or name conflict
        if (err?.code === 11000) {
          const errorKeyPattern = err?.keyPattern || {};
          const isSlugConflict = errorKeyPattern.slug !== undefined;
          // Order conflict can be from old index (chapterId_1_orderNumber_1) or new index (subTopicId_1_orderNumber_1)
          const isOrderConflict = errorKeyPattern.orderNumber !== undefined;
          const isOldChapterIndexConflict = errorKeyPattern.chapterId !== undefined && errorKeyPattern.orderNumber !== undefined;

          try {
            let retryDoc;

            if (isSlugConflict) {
              // Slug conflict: This should not happen if scoped to subtopic correctly
              // But old database index (chapterId_1_slug_1) might cause conflicts
              // Generate unique slug scoped to subtopic (definitions depend on subtopic, not chapter)
              const { createSlug, generateUniqueSlug } = await import("@/utils/serverSlug");
              const baseSlug = createSlug(definitionName);

              // Check for existing slugs in the same subtopic (correct scope)
              const checkSlugExists = async (slug, excludeId) => {
                const query = { subTopicId, slug };
                if (excludeId) {
                  query._id = { $ne: excludeId };
                }
                const existing = await Definition.findOne(query);
                return !!existing;
              };

              // Generate unique slug per subtopic (definitions are scoped to subtopic)
              let uniqueSlug = await generateUniqueSlug(
                baseSlug,
                checkSlugExists,
                null
              );

              // If old chapterId_1_slug_1 index still exists, add subtopic suffix to ensure uniqueness
              // Check if slug exists in same chapter (for old index compatibility)
              const checkChapterSlug = await Definition.findOne({
                chapterId: finalChapterId,
                slug: uniqueSlug
              });

              if (checkChapterSlug && checkChapterSlug.subTopicId.toString() !== subTopicId.toString()) {
                // Old index conflict: Add subtopic-specific suffix to make it unique
                const subTopicSuffix = subTopicId.toString().slice(-6); // Last 6 chars of ObjectId
                uniqueSlug = `${uniqueSlug}-st${subTopicSuffix}`;
              }

              // Create with temporary unique name, then update with correct name and slug
              // This bypasses pre-save hook slug generation
              const tempName = `${definitionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const tempDoc = await Definition.create({
                name: tempName,
                examId: item.examId,
                subjectId: item.subjectId,
                unitId: item.unitId,
                chapterId: finalChapterId,
                topicId: item.topicId,
                subTopicId,
                orderNumber: finalOrderNumber,
                status: item.status || STATUS.ACTIVE,
              });

              // Update with correct name and unique slug (findByIdAndUpdate bypasses pre-save hook)
              retryDoc = await Definition.findByIdAndUpdate(
                tempDoc._id,
                {
                  name: definitionName,
                  slug: uniqueSlug
                },
                { new: true, runValidators: false }
              );
            } else if (isOrderConflict || isOldChapterIndexConflict) {
              // Order conflict: Could be from old index (chapterId_1_orderNumber_1) or new index (subTopicId_1_orderNumber_1)
              // Always recompute orderNumber scoped to subTopicId (definitions depend on subtopic, not chapter)
              const lastBySubTopic = await Definition.findOne({ subTopicId })
                .sort({ orderNumber: -1 })
                .select("orderNumber");
              const altOrder = lastBySubTopic ? lastBySubTopic.orderNumber + 1 : 1;

              console.log(`⚠️ Order conflict detected (old index: ${isOldChapterIndexConflict ? 'chapterId' : 'subTopicId'}). Recalculating order number for subTopic ${subTopicId}: ${altOrder}`);

              // Try creating with recalculated order number
              try {
                retryDoc = await Definition.create({
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
              } catch (retryErr) {
                // If still failing due to old chapter index, try with a different order number
                // Find max order number in the chapter and use that + 1, but ensure it's unique per subtopic
                if (retryErr?.code === 11000 && retryErr?.keyPattern?.chapterId) {
                  console.log(`⚠️ Still conflicting with old chapter index. Finding unique order number...`);
                  // Get all order numbers used in this subtopic
                  const existingOrders = await Definition.find({ subTopicId })
                    .select("orderNumber")
                    .lean();
                  const usedOrders = new Set(existingOrders.map(d => d.orderNumber));

                  // Find first available order number starting from 1
                  let uniqueOrder = 1;
                  while (usedOrders.has(uniqueOrder)) {
                    uniqueOrder++;
                  }

                  console.log(`✅ Using order number ${uniqueOrder} for subTopic ${subTopicId}`);

                  retryDoc = await Definition.create({
                    name: definitionName,
                    examId: item.examId,
                    subjectId: item.subjectId,
                    unitId: item.unitId,
                    chapterId: finalChapterId,
                    topicId: item.topicId,
                    subTopicId,
                    orderNumber: uniqueOrder,
                    status: item.status || STATUS.ACTIVE,
                  });
                } else {
                  throw retryErr;
                }
              }
            } else {
              // Unknown duplicate key error - log details and throw
              console.error(`❌ Unknown duplicate key error:`, {
                keyPattern: errorKeyPattern,
                keyValue: err?.keyValue,
                message: err?.message
              });
              throw err;
            }

            createdDefinitions.push(retryDoc._id);
            console.log(`✅ Retried creation after duplicate key error for definition "${definitionName}"`);
          } catch (err2) {
            // If retry still fails, return detailed error
            console.error("Failed to create definition after retry:", err2);
            return NextResponse.json(
              {
                success: false,
                message: "Failed to create definition after retry",
                error: err2.keyPattern || err2.keyValue || err2.message,
              },
              { status: 409 }
            );
          }
        } else {
          // Non-duplicate-key error - throw as-is
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

