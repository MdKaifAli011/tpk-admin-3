import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PracticeCategory from "@/models/PracticeCategory";
import mongoose from "mongoose";
import { logger } from "@/utils/logger";
import cacheManager from "@/utils/cacheManager";

// ---------- PATCH PRACTICE CATEGORY STATUS ----------
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID" },
        { status: 400 }
      );
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid status is required (active or inactive)",
        },
        { status: 400 }
      );
    }

    // Update category status
    const updated = await PracticeCategory.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate("examId", "name status")
      .populate("subjectId", "name status")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Practice category not found" },
        { status: 404 }
      );
    }

    // Clear cache
    cacheManager.clear("practice-categories");

    return NextResponse.json({
      success: true,
      message: `Practice category ${status === "inactive" ? "deactivated" : "activated"} successfully`,
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating practice category status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update practice category status" },
      { status: 500 }
    );
  }
}

