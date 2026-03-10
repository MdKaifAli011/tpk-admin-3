import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";

const notExplicitlyInactive = { $or: [{ explicitlyInactive: { $ne: true } }, { explicitlyInactive: { $exists: false } }] };

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
    const { status } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid topic ID" },
        { status: 400 }
      );
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Valid status is required (active or inactive)" },
        { status: 400 }
      );
    }

    const updatePayload = {
      status,
      explicitlyInactive: status === "inactive",
    };

    const updated = await Topic.findByIdAndUpdate(id, { $set: updatePayload }, { new: true });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Topic not found" },
        { status: 404 }
      );
    }

    logger.info(`Cascading status update to ${status} for topic ${id}`);

    if (status === "inactive") {
      const subtopics = await SubTopic.find({ topicId: id }).select("_id").lean();
      const subtopicIds = subtopics.map((st) => st._id);

      await Promise.all([
        SubTopic.updateMany({ topicId: id }, { $set: { status: "inactive" } }),
        Definition.updateMany({ topicId: id }, { $set: { status: "inactive" } }),
      ]);
    } else {
      const subtopics = await SubTopic.find({ topicId: id, ...notExplicitlyInactive }).select("_id").lean();
      const subtopicIds = subtopics.map((st) => st._id);
      await SubTopic.updateMany({ topicId: id, ...notExplicitlyInactive }, { $set: { status: "active" } });

      await Definition.updateMany({ subTopicId: { $in: subtopicIds }, ...notExplicitlyInactive }, { $set: { status: "active" } });
    }

    return NextResponse.json({
      success: true,
      message: `Topic and all children ${status === "inactive" ? "deactivated" : "activated"} successfully`,
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating topic status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update topic status" },
      { status: 500 }
    );
  }
}
