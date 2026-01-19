import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subject from "@/models/Subject";
import mongoose from "mongoose";
import { logger } from "@/utils/logger";
import cacheManager from "@/utils/cacheManager";
import { requireAction } from "@/middleware/authMiddleware";

// ---------- PATCH SUBJECT PRACTICE DISABLED (Toggle) ----------
export async function PATCH(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { practiceDisabled } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid subject ID" },
        { status: 400 }
      );
    }

    if (typeof practiceDisabled !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "practiceDisabled must be a boolean value",
        },
        { status: 400 }
      );
    }

    // Update subject practiceDisabled
    const updated = await Subject.findByIdAndUpdate(
      id,
      { practiceDisabled },
      { new: true }
    )
      .populate("examId", "name status")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Subject not found" },
        { status: 404 }
      );
    }

    // Clear cache for subject queries
    cacheManager.clear("subject");

    logger.info(
      `Subject ${id} practice ${practiceDisabled ? "disabled" : "enabled"}`
    );

    return NextResponse.json({
      success: true,
      message: `Practice ${practiceDisabled ? "disabled" : "enabled"} successfully`,
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating subject practice disabled:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update subject practice setting" },
      { status: 500 }
    );
  }
}
