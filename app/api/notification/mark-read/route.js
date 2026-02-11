import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import NotificationRead from "@/models/NotificationRead";
import Notification from "@/models/Notification";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";
import mongoose from "mongoose";

/**
 * POST: Mark notification(s) as read for the current student.
 * Body: { notificationIds: [id, ...] } or { all: true }.
 */
export async function POST(request) {
  try {
    const student = await verifyStudentToken(request);
    if (!student?.id) {
      return errorResponse("Authentication required", 401);
    }

    await connectDB();
    const body = await request.json().catch(() => ({}));
    const studentId = new mongoose.Types.ObjectId(student.id);

    if (body.all === true) {
      const activeIds = await Notification.find({ status: "active" }).select("_id").lean();
      const ops = activeIds.map((n) => ({
        updateOne: {
          filter: { studentId, notificationId: n._id },
          update: { $set: { readAt: new Date() } },
          upsert: true,
        },
      }));
      if (ops.length) await NotificationRead.bulkWrite(ops);
      return successResponse({ marked: "all" }, "All notifications marked as read");
    }

    const ids = Array.isArray(body.notificationIds) ? body.notificationIds : [];
    if (ids.length === 0) {
      return errorResponse("notificationIds array or all: true required", 400);
    }

    const validIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const ops = validIds.map((notificationId) => ({
      updateOne: {
        filter: { studentId, notificationId },
        update: { $set: { readAt: new Date() } },
        upsert: true,
      },
    }));

    if (ops.length) {
      await NotificationRead.bulkWrite(ops);
    }

    return successResponse({ marked: validIds.length }, "Marked as read");
  } catch (error) {
    return handleApiError(error, "Failed to mark as read");
  }
}
