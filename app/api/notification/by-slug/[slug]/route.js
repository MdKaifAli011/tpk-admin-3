import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { successResponse, handleApiError, notFoundResponse } from "@/utils/apiResponse";

/**
 * GET: Fetch a single notification by slug (public, for /notification/[slug] page).
 */
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, message: "Slug required" }, { status: 400 });
    }

    const notification = await Notification.findOne({
      slug: slug.trim(),
      status: "active",
    }).lean();

    if (!notification) {
      return notFoundResponse("Notification not found");
    }

    return successResponse(notification);
  } catch (error) {
    return handleApiError(error, "Failed to fetch notification");
  }
}
