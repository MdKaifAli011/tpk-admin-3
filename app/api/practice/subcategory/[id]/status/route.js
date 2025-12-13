import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PracticeSubCategory from "@/models/PracticeSubCategory";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES, STATUS } from "@/constants";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";
import cacheManager from "@/utils/cacheManager";

// ---------- PATCH PRACTICE SUBCATEGORY STATUS ----------
export async function PATCH(request, { params }) {
  try {
    // Check authentication and permissions (users need to be able to update)
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subcategory ID", 400);
    }

    if (!status || ![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
      return errorResponse(
        "Valid status is required (active or inactive)",
        400
      );
    }

    const updated = await PracticeSubCategory.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate("categoryId", "name status examId subjectId")
      .populate("unitId", "name status")
      .populate("chapterId", "name status")
      .populate("topicId", "name status")
      .populate("subTopicId", "name status")
      .lean();

    if (!updated) {
      return notFoundResponse("Practice subcategory not found");
    }

    // Clear cache
    cacheManager.clear("practice-subcategories-");
    logger.info("Cleared practice subcategory query cache");

    return successResponse(
      updated,
      `Practice subcategory ${
        status === STATUS.INACTIVE ? "deactivated" : "activated"
      } successfully`
    );
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}
