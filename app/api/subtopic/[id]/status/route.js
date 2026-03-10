import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";

const notExplicitlyInactive = { $or: [{ explicitlyInactive: { $ne: true } }, { explicitlyInactive: { $exists: false } }] };

// ---------- PATCH SUBTOPIC STATUS (with cascade to Definitions) ----------
export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid subtopic ID" },
        { status: 400 }
      );
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Valid status is required (active or inactive)" },
        { status: 400 }
      );
    }

    const updated = await SubTopic.findByIdAndUpdate(
      id,
      { $set: { status, explicitlyInactive: status === "inactive" } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "SubTopic not found" },
        { status: 404 }
      );
    }

    if (status === "inactive") {
      await Definition.updateMany({ subTopicId: id }, { $set: { status: "inactive" } });
    } else {
      await Definition.updateMany({ subTopicId: id, ...notExplicitlyInactive }, { $set: { status: "active" } });
    }

    return NextResponse.json({
      success: true,
      message: `SubTopic ${status === "inactive" ? "deactivated" : "activated"} successfully`,
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating subtopic status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update subtopic status" },
      { status: 500 }
    );
  }
}

