import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import { requireAction } from "@/middleware/authMiddleware";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { logger } from "@/utils/logger";
import mongoose from "mongoose";

/**
 * POST /api/exam/reorder
 * Body: { exams: [{ id, orderNumber }, ...] }
 * Bulk-updates orderNumber for exams. Uses two-step update to avoid duplicate orderNumber conflicts.
 */
export async function POST(request) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();
    const { exams: examsPayload } = body;

    if (!examsPayload || !Array.isArray(examsPayload) || examsPayload.length === 0) {
      return errorResponse("exams array is required", 400);
    }

    for (const item of examsPayload) {
      if (!item.id || item.orderNumber === undefined || item.orderNumber === null) {
        return errorResponse("Each exam must have id and orderNumber", 400);
      }
      if (!mongoose.Types.ObjectId.isValid(item.id)) {
        return errorResponse(`Invalid exam id: ${item.id}`, 400);
      }
      const num = Number(item.orderNumber);
      if (!Number.isInteger(num) || num < 1) {
        return errorResponse("orderNumber must be a positive integer", 400);
      }
    }

    const ids = examsPayload.map((e) => e.id);
    const totalExams = await Exam.countDocuments({});
    if (examsPayload.length !== totalExams) {
      return errorResponse(
        `Reorder must include all exams. Expected ${totalExams}, got ${examsPayload.length}. Clear search and use Reorder position.`,
        400
      );
    }

    const found = await Exam.find({ _id: { $in: ids } }).select("_id").lean();
    if (found.length !== ids.length) {
      return errorResponse("Some exam ids are invalid or not found", 404);
    }

    // Ensure strict 1..n incremental order (no gaps, no duplicates)
    const normalized = examsPayload.map((item, index) => ({
      id: item.id,
      orderNumber: index + 1,
    }));

    // Two-step update to avoid unique orderNumber conflicts
    const tempUpdates = normalized.map((item, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { orderNumber: 100000 + index } },
      },
    }));
    await Exam.bulkWrite(tempUpdates);

    const finalUpdates = normalized.map((item) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { orderNumber: item.orderNumber } },
      },
    }));
    const result = await Exam.bulkWrite(finalUpdates);

    logger.info(`Exam reorder: ${result.modifiedCount} exams updated`);
    return successResponse(
      { modifiedCount: result.modifiedCount },
      `Successfully reordered ${result.modifiedCount} exams`
    );
  } catch (error) {
    return handleApiError(error, "Failed to reorder exams");
  }
}
