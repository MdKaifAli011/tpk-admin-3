import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subject from "@/models/Subject";
import { requireAction } from "@/middleware/authMiddleware";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { logger } from "@/utils/logger";
import cacheManager from "@/utils/cacheManager";
import mongoose from "mongoose";

/**
 * POST /api/subject/reorder
 * Body: { examId, subjects: [{ id, orderNumber }, ...] }
 * Reorder subjects within one exam. orderNumber is per-exam (1, 2, 3, ...).
 * All subject ids must belong to the given examId.
 */
export async function POST(request) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();
    const { examId, subjects: subjectsPayload } = body;

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return errorResponse("Valid examId is required", 400);
    }

    if (!subjectsPayload || !Array.isArray(subjectsPayload) || subjectsPayload.length === 0) {
      return errorResponse("subjects array is required", 400);
    }

    for (const item of subjectsPayload) {
      if (!item.id || item.orderNumber === undefined || item.orderNumber === null) {
        return errorResponse("Each subject must have id and orderNumber", 400);
      }
      if (!mongoose.Types.ObjectId.isValid(item.id)) {
        return errorResponse(`Invalid subject id: ${item.id}`, 400);
      }
      const num = Number(item.orderNumber);
      if (!Number.isInteger(num) || num < 1) {
        return errorResponse("orderNumber must be a positive integer", 400);
      }
    }

    const ids = subjectsPayload.map((s) => s.id);
    const found = await Subject.find({
      _id: { $in: ids },
      examId: new mongoose.Types.ObjectId(examId),
    })
      .select("_id")
      .lean();

    if (found.length !== ids.length) {
      return errorResponse("Some subjects not found or do not belong to this exam", 404);
    }

    // Normalize to strict 1..n per exam
    const normalized = subjectsPayload.map((item, index) => ({
      id: item.id,
      orderNumber: index + 1,
    }));

    const tempUpdates = normalized.map((item, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { orderNumber: 100000 + index } },
      },
    }));
    await Subject.bulkWrite(tempUpdates);

    const finalUpdates = normalized.map((item) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { orderNumber: item.orderNumber } },
      },
    }));
    const result = await Subject.bulkWrite(finalUpdates);

    logger.info(`Subject reorder: examId=${examId}, modifiedCount=${result.modifiedCount}`);
    cacheManager?.clear?.("subjects-");

    return successResponse(
      { modifiedCount: result.modifiedCount },
      `Successfully reordered ${result.modifiedCount} subjects`
    );
  } catch (error) {
    return handleApiError(error, "Failed to reorder subjects");
  }
}
