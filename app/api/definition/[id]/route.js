import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Definition from "@/models/Definition";
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
      return errorResponse("Invalid definition ID", 400);
    }

    let definition = await Definition.findById(id)
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

    if (!definition) {
      return notFoundResponse(ERROR_MESSAGES.DEFINITION_NOT_FOUND);
    }

    // If chapterId is missing but topicId has chapterId, use it (for backward compatibility)
    if (!definition.chapterId && definition.topicId?.chapterId) {
      definition.chapterId = definition.topicId.chapterId;
    }

    return successResponse(definition);
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
      return errorResponse("Invalid definition ID", 400);
    }

    const {
      name,
      examId,
      subjectId,
      unitId,
      chapterId,
      topicId,
      subTopicId,
      orderNumber,
      status,
      time,
      weightage,
    } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return errorResponse("Definition name is required", 400);
    }

    // Check if definition exists
    const existingDefinition = await Definition.findById(id);
    if (!existingDefinition) {
      return notFoundResponse(ERROR_MESSAGES.DEFINITION_NOT_FOUND);
    }

    // Capitalize first letter of each word in definition name (excluding And, Of, Or, In)
    const { toTitleCase } = await import("@/utils/titleCase");
    const definitionName = toTitleCase(name);

    // Prepare update data (content/SEO fields are now in DefinitionDetails)
    const updateData = {
      name: definitionName,
    };
    if (examId) updateData.examId = examId;
    if (subjectId) updateData.subjectId = subjectId;
    if (unitId) updateData.unitId = unitId;
    if (chapterId) updateData.chapterId = chapterId;
    if (topicId) updateData.topicId = topicId;
    if (subTopicId) updateData.subTopicId = subTopicId;
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (status) updateData.status = status;
    if (time !== undefined) updateData.time = time;
    if (weightage !== undefined) updateData.weightage = weightage;

    let updatedDefinition = await Definition.findByIdAndUpdate(
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
    if (!updatedDefinition.chapterId && updatedDefinition.topicId?.chapterId) {
      updatedDefinition.chapterId = updatedDefinition.topicId.chapterId;
    }

    if (!updatedDefinition) {
      return notFoundResponse(ERROR_MESSAGES.DEFINITION_NOT_FOUND);
    }

    return successResponse(updatedDefinition, "Definition updated successfully");
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
      return errorResponse("Invalid definition ID", 400);
    }

    const deletedDefinition = await Definition.findByIdAndDelete(id);
    if (!deletedDefinition) {
      return notFoundResponse(ERROR_MESSAGES.DEFINITION_NOT_FOUND);
    }

    return successResponse(deletedDefinition, "Definition deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

