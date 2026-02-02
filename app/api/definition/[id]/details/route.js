import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DefinitionDetails from "@/models/DefinitionDetails";
import Definition from "@/models/Definition";
import SubTopic from "@/models/SubTopic";
import Topic from "@/models/Topic";
import Chapter from "@/models/Chapter";
import Unit from "@/models/Unit";
import Subject from "@/models/Subject";
import Exam from "@/models/Exam";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import { syncContentVideosForDetails } from "@/lib/syncContentVideos";

// ---------- GET DEFINITION DETAILS ----------
export async function GET(request, { params }) {
  try {
    // Check authentication (all authenticated users can view)
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid definition ID", 400);
    }

    // Check if definition exists
    const definition = await Definition.findById(id);
    if (!definition) {
      return notFoundResponse(ERROR_MESSAGES.DEFINITION_NOT_FOUND);
    }

    // Find or create details
    let details = await DefinitionDetails.findOne({ definitionId: id }).lean();
    
    // If no details exist, return empty defaults
    if (!details) {
      details = {
        definitionId: id,
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
        status: "draft",
      };
    }

    return successResponse(details);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE OR UPDATE DEFINITION DETAILS ----------
export async function PUT(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid definition ID", 400);
    }

    // Check if definition exists
    const definition = await Definition.findById(id);
    if (!definition) {
      return notFoundResponse(ERROR_MESSAGES.DEFINITION_NOT_FOUND);
    }

    const { content, title, metaDescription, keywords, status } = body;

    // Prepare update data
    const updateData = {
      definitionId: id,
      content: content || "",
      title: title || "",
      metaDescription: metaDescription || "",
      keywords: keywords || "",
      status: status || "draft",
    };

    // Use upsert to create or update
    const details = await DefinitionDetails.findOneAndUpdate(
      { definitionId: id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    const [subTopic, topic, chapter, unit, subject, exam] = await Promise.all([
      SubTopic.findById(definition.subTopicId).select("name").lean(),
      Topic.findById(definition.topicId).select("name").lean(),
      Chapter.findById(definition.chapterId).select("name").lean(),
      Unit.findById(definition.unitId).select("name").lean(),
      Subject.findById(definition.subjectId).select("name").lean(),
      Exam.findById(definition.examId).select("name").lean(),
    ]);
    const hierarchy = {
      examId: definition.examId,
      examName: exam?.name ?? "",
      subjectId: definition.subjectId,
      subjectName: subject?.name ?? "",
      unitId: definition.unitId,
      unitName: unit?.name ?? "",
      chapterId: definition.chapterId,
      chapterName: chapter?.name ?? "",
      topicId: definition.topicId,
      topicName: topic?.name ?? "",
      subTopicId: definition.subTopicId,
      subTopicName: subTopic?.name ?? "",
      definitionId: id,
      definitionName: definition.name ?? "",
    };
    await syncContentVideosForDetails("definition", id, updateData.content || "", hierarchy).catch(() => {});

    return successResponse(details, "Definition details saved successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- DELETE DEFINITION DETAILS ----------
export async function DELETE(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid definition ID", 400);
    }

    const deleted = await DefinitionDetails.findOneAndDelete({ definitionId: id });
    
    if (!deleted) {
      return notFoundResponse("Definition details not found");
    }

    return successResponse(deleted, "Definition details deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

