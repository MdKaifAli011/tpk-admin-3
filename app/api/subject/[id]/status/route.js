import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subject from "@/models/Subject";
// Import all child models to ensure they're registered before middleware runs
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import mongoose from "mongoose";
import { logger } from "@/utils/logger";
import cacheManager from "@/utils/cacheManager";

// ---------- PATCH SUBJECT STATUS (with Cascading) ----------
export async function PATCH(request, { params }) {
  try {
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
        {
          success: false,
          message: "Valid status is required (active or inactive)",
        },
        { status: 400 }
      );
    }

    // Update subject status
    const updated = await Subject.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Subject not found" },
        { status: 404 }
      );
    }

    // Cascading: Update all children status
    logger.info(`Cascading status update to ${status} for subject ${id}`);

    // Find all units in this subject
    const units = await Unit.find({ subjectId: id });
    const unitIds = units.map((unit) => unit._id);

    // Find all chapters in these units
    const chapters = await Chapter.find({ unitId: { $in: unitIds } });
    const chapterIds = chapters.map((chapter) => chapter._id);

    // Find all topics in these chapters
    const topics = await Topic.find({ chapterId: { $in: chapterIds } });
    const topicIds = topics.map((topic) => topic._id);

    // Update all subtopics in these topics
    let subTopicsResult = { modifiedCount: 0 };
    if (topicIds.length > 0) {
      subTopicsResult = await SubTopic.updateMany(
        { topicId: { $in: topicIds } },
        { $set: { status } }
      );
    }
    logger.info(`Updated ${subTopicsResult.modifiedCount} SubTopics`);

    // Update all topics in these chapters
    let topicsResult = { modifiedCount: 0 };
    if (chapterIds.length > 0) {
      topicsResult = await Topic.updateMany(
        { chapterId: { $in: chapterIds } },
        { $set: { status } }
      );
    }
    logger.info(`Updated ${topicsResult.modifiedCount} Topics`);

    // Update all chapters in these units
    let chaptersResult = { modifiedCount: 0 };
    if (unitIds.length > 0) {
      chaptersResult = await Chapter.updateMany(
        { unitId: { $in: unitIds } },
        { $set: { status } }
      );
    }
    logger.info(`Updated ${chaptersResult.modifiedCount} Chapters`);

    // Update all units in this subject
    const unitsResult = await Unit.updateMany(
      { subjectId: id },
      { $set: { status } }
    );
    logger.info(`Updated ${unitsResult.modifiedCount} Units`);

    // Clear cache for subject queries
    cacheManager.clear("subject");

    return NextResponse.json({
      success: true,
      message: `Subject and all children ${
        status === "inactive" ? "deactivated" : "activated"
      } successfully`,
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

