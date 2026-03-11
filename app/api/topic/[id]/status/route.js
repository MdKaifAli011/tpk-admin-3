import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Topic from "@/models/Topic";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";
import { cascadeTopicStatus } from "@/lib/cascadeStatus";

// ---------- PATCH TOPIC STATUS (with Cascading) ----------
export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
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
        { success: false, message: "Invalid topic ID" },
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

    const updated = await Topic.findByIdAndUpdate(
      id,
      {
        status,
        manualInactive: status === "inactive",
      },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Topic not found" },
        { status: 404 },
      );
    }

    await cascadeTopicStatus(id, status, mode);

    return NextResponse.json({
      success: true,
      message: `Topic and all children ${
        status === "inactive" ? "deactivated" : "activated"
      } successfully`,
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating topic status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update topic status" },
      { status: 500 },
    );
  }
}
