import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";

/**
 * POST /api/unit/[id]/activate-children
 * Body: { clearExplicitlyInactive: true | false }
 */
export async function POST(request, { params }) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const clearExplicit = body.clearExplicitlyInactive === true;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid unit ID" },
        { status: 400 }
      );
    }

    const unit = await Unit.findById(id);
    if (!unit) {
      return NextResponse.json(
        { success: false, message: "Unit not found" },
        { status: 404 }
      );
    }

    const setActive = clearExplicit
      ? { status: "active", explicitlyInactive: false }
      : { status: "active" };

    await Unit.updateOne({ _id: id }, { $set: setActive });

    const chapters = await Chapter.find({ unitId: id }).select("_id").lean();
    const chapterIds = chapters.map((c) => c._id);
    await Chapter.updateMany({ unitId: id }, { $set: setActive });

    const topics = await Topic.find({ chapterId: { $in: chapterIds } }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);
    await Topic.updateMany({ chapterId: { $in: chapterIds } }, { $set: setActive });

    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).select("_id").lean();
    const subtopicIds = subtopics.map((st) => st._id);
    await SubTopic.updateMany({ topicId: { $in: topicIds } }, { $set: setActive });

    await Definition.updateMany(
      { subTopicId: { $in: subtopicIds } },
      { $set: setActive }
    );

    logger.info(`Unit ${id} activate-children (clearExplicitlyInactive=${clearExplicit})`);

    return NextResponse.json({
      success: true,
      message: `Unit and all children activated${clearExplicit ? " (explicit flag cleared)" : ""}.`,
      data: { _id: id },
    });
  } catch (error) {
    logger.error("Error activating unit children:", error);
    return NextResponse.json(
      { success: false, message: "Failed to activate children" },
      { status: 500 }
    );
  }
}
