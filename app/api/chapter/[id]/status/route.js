import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";

const notExplicitlyInactive = { $or: [{ explicitlyInactive: { $ne: true } }, { explicitlyInactive: { $exists: false } }] };

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
    const { status } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapter ID" },
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

    const updated = await Chapter.findByIdAndUpdate(id, { $set: updatePayload }, { new: true });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Chapter not found" },
        { status: 404 }
      );
    }

    logger.info(`Cascading status update to ${status} for chapter ${id}`);

    if (status === "inactive") {
      const topics = await Topic.find({ chapterId: id });
      const topicIds = topics.map((t) => t._id);

      await Promise.all([
        SubTopic.updateMany({ topicId: { $in: topicIds } }, { $set: { status: "inactive" } }),
        Topic.updateMany({ chapterId: id }, { $set: { status: "inactive" } }),
        Definition.updateMany({ chapterId: id }, { $set: { status: "inactive" } }),
      ]);
    } else {
      const topics = await Topic.find({ chapterId: id, ...notExplicitlyInactive }).select("_id").lean();
      const topicIds = topics.map((t) => t._id);
      await Topic.updateMany({ chapterId: id, ...notExplicitlyInactive }, { $set: { status: "active" } });

      const subtopics = await SubTopic.find({ topicId: { $in: topicIds }, ...notExplicitlyInactive }).select("_id").lean();
      const subtopicIds = subtopics.map((st) => st._id);
      await SubTopic.updateMany({ topicId: { $in: topicIds }, ...notExplicitlyInactive }, { $set: { status: "active" } });

      await Definition.updateMany({ subTopicId: { $in: subtopicIds }, ...notExplicitlyInactive }, { $set: { status: "active" } });
    }

    return NextResponse.json({
      success: true,
      message: `Chapter and all children ${status === "inactive" ? "deactivated" : "activated"} successfully`,
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating chapter status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update chapter status" },
      { status: 500 }
    );
  }
}
