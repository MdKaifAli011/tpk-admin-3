import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";
import cacheManager from "@/utils/cacheManager";

// Not explicitly inactive (user did not deliberately deactivate)
const notExplicitlyInactive = { $or: [{ explicitlyInactive: { $ne: true } }, { explicitlyInactive: { $exists: false } }] };

// ---------- PATCH SUBJECT STATUS (with Cascading) ----------
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
        { success: false, message: "Invalid subject ID" },
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

    const updated = await Subject.findByIdAndUpdate(id, { $set: updatePayload }, { new: true });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Subject not found" },
        { status: 404 }
      );
    }

    logger.info(`Cascading status update to ${status} for subject ${id}`);

    if (status === "inactive") {
      const units = await Unit.find({ subjectId: id });
      const unitIds = units.map((u) => u._id);
      const chapters = await Chapter.find({ unitId: { $in: unitIds } });
      const chapterIds = chapters.map((c) => c._id);
      const topics = await Topic.find({ chapterId: { $in: chapterIds } });
      const topicIds = topics.map((t) => t._id);

      await Promise.all([
        SubTopic.updateMany({ topicId: { $in: topicIds } }, { $set: { status: "inactive" } }),
        Topic.updateMany({ chapterId: { $in: chapterIds } }, { $set: { status: "inactive" } }),
        Chapter.updateMany({ unitId: { $in: unitIds } }, { $set: { status: "inactive" } }),
        Unit.updateMany({ subjectId: id }, { $set: { status: "inactive" } }),
        Definition.updateMany({ subjectId: id }, { $set: { status: "inactive" } }),
      ]);
    } else {
      const units = await Unit.find({ subjectId: id, ...notExplicitlyInactive }).select("_id").lean();
      const unitIds = units.map((u) => u._id);
      await Unit.updateMany({ subjectId: id, ...notExplicitlyInactive }, { $set: { status: "active" } });

      const chapters = await Chapter.find({ unitId: { $in: unitIds }, ...notExplicitlyInactive }).select("_id").lean();
      const chapterIds = chapters.map((c) => c._id);
      await Chapter.updateMany({ unitId: { $in: unitIds }, ...notExplicitlyInactive }, { $set: { status: "active" } });

      const topics = await Topic.find({ chapterId: { $in: chapterIds }, ...notExplicitlyInactive }).select("_id").lean();
      const topicIds = topics.map((t) => t._id);
      await Topic.updateMany({ chapterId: { $in: chapterIds }, ...notExplicitlyInactive }, { $set: { status: "active" } });

      const subtopics = await SubTopic.find({ topicId: { $in: topicIds }, ...notExplicitlyInactive }).select("_id").lean();
      const subtopicIds = subtopics.map((st) => st._id);
      await SubTopic.updateMany({ topicId: { $in: topicIds }, ...notExplicitlyInactive }, { $set: { status: "active" } });

      await Definition.updateMany({ subTopicId: { $in: subtopicIds }, ...notExplicitlyInactive }, { $set: { status: "active" } });
    }

    cacheManager.clear("subject");

    return NextResponse.json({
      success: true,
      message: `Subject and all children ${status === "inactive" ? "deactivated" : "activated"} successfully`,
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating subject status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update subject status" },
      { status: 500 }
    );
  }
}
