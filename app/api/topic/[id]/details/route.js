import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import TopicDetails from "@/models/TopicDetails";
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

// ---------- GET TOPIC DETAILS ----------
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
      return errorResponse("Invalid topic ID", 400);
    }

    // Check if topic exists
    const topic = await Topic.findById(id);
    if (!topic) {
      return notFoundResponse(ERROR_MESSAGES.TOPIC_NOT_FOUND);
    }

    // Find or create details
    let details = await TopicDetails.findOne({ topicId: id }).lean();
    
    // If no details exist, return empty defaults
    if (!details) {
      details = {
        topicId: id,
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

// ---------- CREATE OR UPDATE TOPIC DETAILS ----------
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
      return errorResponse("Invalid topic ID", 400);
    }

    // Check if topic exists
    const topic = await Topic.findById(id);
    if (!topic) {
      return notFoundResponse(ERROR_MESSAGES.TOPIC_NOT_FOUND);
    }

    const { content, title, metaDescription, keywords, status } = body;

    // Prepare update data
    const updateData = {
      topicId: id,
      content: content || "",
      title: title || "",
      metaDescription: metaDescription || "",
      keywords: keywords || "",
      status: status || "draft",
    };

    // Use upsert to create or update
    const details = await TopicDetails.findOneAndUpdate(
      { topicId: id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    const [chapter, unit, subject, exam] = await Promise.all([
      Chapter.findById(topic.chapterId).select("name").lean(),
      Unit.findById(topic.unitId).select("name").lean(),
      Subject.findById(topic.subjectId).select("name").lean(),
      Exam.findById(topic.examId).select("name").lean(),
    ]);
    const hierarchy = {
      examId: topic.examId,
      examName: exam?.name ?? "",
      subjectId: topic.subjectId,
      subjectName: subject?.name ?? "",
      unitId: topic.unitId,
      unitName: unit?.name ?? "",
      chapterId: topic.chapterId,
      chapterName: chapter?.name ?? "",
      topicId: id,
      topicName: topic.name ?? "",
    };
    await syncContentVideosForDetails("topic", id, updateData.content || "", hierarchy).catch(() => {});

    return successResponse(details, "Topic details saved successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- DELETE TOPIC DETAILS ----------
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
      return errorResponse("Invalid topic ID", 400);
    }

    const deleted = await TopicDetails.findOneAndDelete({ topicId: id });
    
    if (!deleted) {
      return notFoundResponse("Topic details not found");
    }

    return successResponse(deleted, "Topic details deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

