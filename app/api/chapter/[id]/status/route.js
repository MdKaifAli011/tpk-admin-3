import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Chapter from "@/models/Chapter";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";
import { cascadeChapterStatus } from "@/lib/cascadeStatus";

// ---------- PATCH CHAPTER STATUS (with Cascading) ----------
export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status, cascadeMode } = body;
    const mode = ["respect_manual", "force_all", "direct_only"].includes(cascadeMode)
      ? cascadeMode
      : "respect_manual";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapter ID" },
        { status: 400 },
      );
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid status is required (active or inactive)",
        },
        { status: 400 },
      );
    }

    const updated = await Chapter.findByIdAndUpdate(
      id,
      {
        status,
        manualInactive: status === "inactive",
      },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Chapter not found" },
        { status: 404 },
      );
    }

    await cascadeChapterStatus(id, status, mode);

    return NextResponse.json({
      success: true,
      message: `Chapter and all children ${
        status === "inactive" ? "deactivated" : "activated"
      } successfully`,
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating chapter status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update chapter status" },
      { status: 500 },
    );
  }
}
