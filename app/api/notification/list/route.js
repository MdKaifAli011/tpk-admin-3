import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import NotificationRead from "@/models/NotificationRead";
import { successResponse, handleApiError } from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";

/**
 * GET: List active notifications for "View all" page.
 * Optional: limit, skip. If student token provided, includes read status.
 * Query param forHeader=1: exclude notifications whose endDate has passed (for header dropdown).
 * Without forHeader: show all active (landing page shows everything including past endDate).
 */
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));
    const forHeader = searchParams.get("forHeader") === "1";
    const now = new Date();

    const baseQuery = { status: "active" };
    if (forHeader) {
      baseQuery.$or = [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: now } },
      ];
    }

    const [list, total] = await Promise.all([
      Notification.find(baseQuery)
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(baseQuery),
    ]);

    let readSet = new Set();
    try {
      const student = await verifyStudentToken(request);
      if (student?.id) {
        const readDocs = await NotificationRead.find({
          studentId: student.id,
          notificationId: { $in: list.map((n) => n._id) },
        })
          .select("notificationId")
          .lean();
        readDocs.forEach((r) => readSet.add(r.notificationId.toString()));
      }
    } catch (_) {}

    const data = list.map((n) => ({
      ...n,
      read: readSet.has(n._id.toString()),
    }));

    return successResponse({ data, total });
  } catch (error) {
    return handleApiError(error, "Failed to list notifications");
  }
}
