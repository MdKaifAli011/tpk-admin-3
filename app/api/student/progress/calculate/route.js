import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StudentProgress from "@/models/StudentProgress";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";

// Helper function to get total items count for a chapter
// NOTE: This matches track-visit route - chapter visit counts as 1 item
async function getChapterItemCounts(chapterId) {
  try {
    // Chapter itself counts as 1 item (consistent with track-visit route)
    const chapterCount = 1;

    // Get all topics in this chapter
    const topics = await Topic.find({ chapterId, status: "active" }).lean();
    const topicIds = topics.map((t) => t._id);

    // Get all subtopics for these topics
    const subtopics = await SubTopic.find({
      topicId: { $in: topicIds },
      status: "active",
    }).lean();
    const subtopicIds = subtopics.map((st) => st._id);

    // Get all definitions for these subtopics
    const definitions = await Definition.find({
      subTopicId: { $in: subtopicIds },
      status: "active",
    }).lean();

    return {
      totalChapter: chapterCount,
      totalTopics: topics.length,
      totalSubtopics: subtopics.length,
      totalDefinitions: definitions.length,
      totalItems: chapterCount + topics.length + subtopics.length + definitions.length,
    };
  } catch (error) {
    console.error("Error getting chapter item counts:", error);
    return {
      totalChapter: 1,
      totalTopics: 0,
      totalSubtopics: 0,
      totalDefinitions: 0,
      totalItems: 1,
    };
  }
}

// Helper function to calculate chapter progress from visited items
// NOTE: This matches track-visit route - includes chapter visit in calculation
function calculateChapterProgress(chapterProgress, itemCounts) {
  if (!chapterProgress || !chapterProgress.visitedItems) {
    return 0;
  }

  const { visitedItems } = chapterProgress;
  const visitedChapter = visitedItems.chapter ? 1 : 0;
  const visitedTopics = visitedItems.topics?.length || 0;
  const visitedSubtopics = visitedItems.subtopics?.length || 0;
  const visitedDefinitions = visitedItems.definitions?.length || 0;

  const totalVisited = visitedChapter + visitedTopics + visitedSubtopics + visitedDefinitions;
  const totalItems = itemCounts.totalItems;

  if (totalItems === 0) return 0;

  const progress = Math.round((totalVisited / totalItems) * 100);
  return Math.min(100, Math.max(0, progress));
}

// POST: Calculate and update progress for a chapter
export async function POST(request) {
  try {
    const authCheck = await verifyStudentToken(request);
    if (authCheck.error) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    await connectDB();
    const body = await request.json();
    const { unitId, chapterId } = body;

    if (!unitId || !chapterId) {
      return errorResponse("unitId and chapterId are required", 400);
    }

    // Find progress document
    let studentProgress = await StudentProgress.findOne({
      studentId: authCheck.studentId,
      unitId,
    });

    if (!studentProgress) {
      return errorResponse("Progress not found", 404);
    }

    // Get chapter progress
    let chapterProgress = studentProgress.progress.get(chapterId);
    if (!chapterProgress) {
      return errorResponse("Chapter progress not found", 404);
    }

    // Get total item counts for this chapter
    const itemCounts = await getChapterItemCounts(chapterId);

    // Calculate progress based on visited items
    const autoCalculatedProgress = calculateChapterProgress(
      chapterProgress,
      itemCounts
    );

    // Update chapter progress
    // If manual override exists, use it; otherwise use auto-calculated
    const finalProgress = chapterProgress.isManualOverride
      ? chapterProgress.manualProgress || 0
      : autoCalculatedProgress;

    chapterProgress.autoCalculatedProgress = autoCalculatedProgress;
    chapterProgress.progress = finalProgress;
    chapterProgress.isCompleted = finalProgress === 100;

    // Update chapter progress in the Map
    studentProgress.progress.set(chapterId, chapterProgress);

    // Calculate unit progress from ALL chapters in the unit (not just those with progress data)
    // This ensures accurate calculation: (sum of all chapter progress) / (total chapters)
    // This matches the calculation in track-visit route for consistency
    try {
      const allChapters = await Chapter.find({
        unitId,
        status: "active",
      }).lean();
      const totalChapters = allChapters.length;

      if (totalChapters > 0) {
        // Sum progress for all chapters (0% for chapters without progress data)
        const totalChapterProgress = allChapters.reduce((sum, chapter) => {
          // Convert chapter._id to string for Map lookup
          const chapterIdStr = String(chapter._id);
          const chapterProgressData = studentProgress.progress.get(chapterIdStr);
          const chapterProgress = chapterProgressData?.progress || 0;
          return sum + chapterProgress;
        }, 0);

        const unitProgress = Math.round(totalChapterProgress / totalChapters);
        studentProgress.unitProgress = unitProgress;
      } else {
        studentProgress.unitProgress = 0;
      }
    } catch (error) {
      console.error("Error calculating unit progress:", error);
      // Fallback: calculate from chapters with progress data
      const chapters = Array.from(studentProgress.progress.values());
      const totalChapterProgress = chapters.reduce(
        (sum, ch) => sum + (ch.progress || 0),
        0
      );
      const unitProgress =
        chapters.length > 0
          ? Math.round(totalChapterProgress / chapters.length)
          : 0;
      studentProgress.unitProgress = unitProgress;
    }

    await studentProgress.save();

    return successResponse(
      {
        chapterId,
        chapterProgress: finalProgress,
        autoCalculatedProgress,
        unitProgress,
        itemCounts,
      },
      "Progress calculated successfully"
    );
  } catch (error) {
    return handleApiError(error, "Failed to calculate progress");
  }
}
