import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";

export async function GET(request, { params }) {
  try {
    // Check authentication (all authenticated users can view)
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid topic ID", 400);
    }

    const topic = await Topic.findById(id)
      .populate("examId", "name status")
      .populate("subjectId", "name")
      .populate("unitId", "name orderNumber")
      .populate("chapterId", "name orderNumber")
      .lean();

    if (!topic) {
      return notFoundResponse(ERROR_MESSAGES.TOPIC_NOT_FOUND);
    }

    return successResponse(topic);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

export async function PUT(request, { params }) {
  try {
    // Check authentication and permissions (users need to be able to update)
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid topic ID", 400);
    }

    const {
      name,
      examId,
      subjectId,
      unitId,
      chapterId,
      orderNumber,
      status,
      time,
      weightage,
    } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return errorResponse("Topic name is required", 400);
    }

    // Check if topic exists
    const existingTopic = await Topic.findById(id);
    if (!existingTopic) {
      return notFoundResponse(ERROR_MESSAGES.TOPIC_NOT_FOUND);
    }

    // Capitalize first letter of each word in topic name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const topicName = toTitleCase(name);

    // Prepare update data (content/SEO fields are now in TopicDetails)
    const updateData = {
      name: topicName,
    };
    if (examId) updateData.examId = examId;
    if (subjectId) updateData.subjectId = subjectId;
    if (unitId) updateData.unitId = unitId;
    if (chapterId) updateData.chapterId = chapterId;
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (status) updateData.status = status;
    if (time !== undefined) updateData.time = time;
    if (weightage !== undefined) updateData.weightage = weightage;

    const updatedTopic = await Topic.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("examId", "name status")
      .populate("subjectId", "name")
      .populate("unitId", "name orderNumber")
      .populate("chapterId", "name orderNumber")
      .lean();

    if (!updatedTopic) {
      return notFoundResponse(ERROR_MESSAGES.TOPIC_NOT_FOUND);
    }

    return successResponse(updatedTopic, "Topic updated successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

export async function DELETE(request, { params }) {
  try {
    // Check authentication and permissions (users need to be able to delete)
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid topic ID", 400);
    }

    const deletedTopic = await Topic.findByIdAndDelete(id);
    if (!deletedTopic) {
      return notFoundResponse(ERROR_MESSAGES.TOPIC_NOT_FOUND);
    }

    return successResponse(deletedTopic, "Topic deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}
