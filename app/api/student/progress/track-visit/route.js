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

// POST: Track visit to topic, subtopic, or definition
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
    const { unitId, chapterId, itemType, itemId } = body;

    if (!unitId || !chapterId || !itemType) {
      return errorResponse("unitId, chapterId, and itemType are required", 400);
    }

    // Convert IDs to strings to ensure consistent format
    const unitIdStr = String(unitId);
    const chapterIdStr = String(chapterId);

    // For chapter visits, itemId is optional (use chapterId)
    const finalItemId = itemId ? String(itemId) : chapterIdStr;

    if (!["chapter", "topic", "subtopic", "definition"].includes(itemType)) {
      return errorResponse(
        "itemType must be 'chapter', 'topic', 'subtopic', or 'definition'",
        400
      );
    }

    // Find or create progress document
    let studentProgress = await StudentProgress.findOne({
      studentId: authCheck.studentId,
      unitId: unitIdStr,
    });

    if (!studentProgress) {
      studentProgress = await StudentProgress.create({
        studentId: authCheck.studentId,
        unitId: unitIdStr,
        progress: new Map(),
        unitProgress: 0,
      });
    }

    // Get or create chapter progress
    let chapterProgress = studentProgress.progress.get(chapterIdStr);
    if (!chapterProgress) {
      chapterProgress = {
        progress: 0,
        isCompleted: false,
        isManualOverride: false,
        manualProgress: null,
        autoCalculatedProgress: 0,
        visitedItems: {
          chapter: false,
          topics: [],
          subtopics: [],
          definitions: [],
        },
      };
    }

    // Ensure visitedItems exists
    if (!chapterProgress.visitedItems) {
      chapterProgress.visitedItems = {
        chapter: false,
        topics: [],
        subtopics: [],
        definitions: [],
      };
    }

    // Add item to visited items if not already present
    if (itemType === "chapter") {
      // Mark chapter as visited
      chapterProgress.visitedItems.chapter = true;
    } else {
      const visitedArray = chapterProgress.visitedItems[`${itemType}s`] || [];
      if (!visitedArray.includes(finalItemId)) {
        visitedArray.push(finalItemId);
        chapterProgress.visitedItems[`${itemType}s`] = visitedArray;
      }
    }

    // Get total item counts for this chapter to calculate progress
    const getChapterItemCounts = async (chapterId) => {
      try {
        // Chapter itself counts as 1 item
        const chapterCount = 1;

        const topics = await Topic.find({ chapterId, status: "active" }).lean();
        const topicIds = topics.map((t) => t._id);
        const subtopics = await SubTopic.find({
          topicId: { $in: topicIds },
          status: "active",
        }).lean();
        const subtopicIds = subtopics.map((st) => st._id);
        const definitions = await Definition.find({
          subTopicId: { $in: subtopicIds },
          status: "active",
        }).lean();

        return {
          totalChapter: chapterCount,
          totalTopics: topics.length,
          totalSubtopics: subtopics.length,
          totalDefinitions: definitions.length,
          totalItems:
            chapterCount +
            topics.length +
            subtopics.length +
            definitions.length,
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
    };

    // Calculate progress based on visited items
    const itemCounts = await getChapterItemCounts(chapterIdStr);
    const visitedChapter = chapterProgress.visitedItems.chapter ? 1 : 0;
    const visitedTopics = chapterProgress.visitedItems.topics?.length || 0;
    const visitedSubtopics =
      chapterProgress.visitedItems.subtopics?.length || 0;
    const visitedDefinitions =
      chapterProgress.visitedItems.definitions?.length || 0;
    const totalVisited =
      visitedChapter + visitedTopics + visitedSubtopics + visitedDefinitions;

    // Calculate auto progress (only if not manually overridden)
    let autoCalculatedProgress = 0;
    if (itemCounts.totalItems > 0) {
      autoCalculatedProgress = Math.round(
        (totalVisited / itemCounts.totalItems) * 100
      );
      autoCalculatedProgress = Math.min(
        100,
        Math.max(0, autoCalculatedProgress)
      );
    }

    // Update chapter progress
    chapterProgress.autoCalculatedProgress = autoCalculatedProgress;

    // If manual override exists, use it; otherwise use auto-calculated
    if (!chapterProgress.isManualOverride) {
      chapterProgress.progress = autoCalculatedProgress;
      chapterProgress.isCompleted = autoCalculatedProgress === 100;
    }

    // Update chapter progress in the Map
    studentProgress.progress.set(chapterIdStr, chapterProgress);

    // Calculate unit progress from ALL chapters in the unit (not just those with progress data)
    // This ensures accurate calculation: (sum of all chapter progress) / (total chapters)
    try {
      const allChapters = await Chapter.find({
        unitId: unitIdStr,
        status: "active",
      }).lean();
      const totalChapters = allChapters.length;

      if (totalChapters > 0) {
        // Sum progress for all chapters (0% for chapters without progress data)
        const totalChapterProgress = allChapters.reduce((sum, chapter) => {
          // Convert chapter._id to string for Map lookup
          const chapterIdStr = String(chapter._id);
          const chapterProgressData =
            studentProgress.progress.get(chapterIdStr);
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
        chapterId: chapterIdStr,
        itemType,
        itemId: finalItemId,
        visited: true,
        chapterProgress: chapterProgress.progress,
        autoCalculatedProgress,
        unitProgress: studentProgress.unitProgress,
      },
      "Visit tracked and progress updated successfully"
    );
  } catch (error) {
    return handleApiError(error, "Failed to track visit");
  }
}
