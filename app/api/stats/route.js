import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import { requireAuth } from "@/middleware/authMiddleware";
import { errorResponse, handleApiError } from "@/utils/apiResponse";

/**
 * GET /api/stats
 * Returns dashboard statistics (counts only, not full documents)
 * Optimized for performance - uses count queries instead of fetching all documents
 */
export async function GET(request) {
  try {
    // Require authentication
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();

    // ✅ Parallel count queries (much faster than fetching all documents)
    // Each count query is independent and can run in parallel
    const [
      examsActive,
      examsInactive,
      subjectsActive,
      subjectsInactive,
      unitsActive,
      unitsInactive,
      chaptersActive,
      chaptersInactive,
      topicsActive,
      topicsInactive,
      subtopicsActive,
      subtopicsInactive,
    ] = await Promise.all([
      Exam.countDocuments({ status: "active" }),
      Exam.countDocuments({ status: "inactive" }),
      Subject.countDocuments({ status: "active" }),
      Subject.countDocuments({ status: "inactive" }),
      Unit.countDocuments({ status: "active" }),
      Unit.countDocuments({ status: "inactive" }),
      Chapter.countDocuments({ status: "active" }),
      Chapter.countDocuments({ status: "inactive" }),
      Topic.countDocuments({ status: "active" }),
      Topic.countDocuments({ status: "inactive" }),
      SubTopic.countDocuments({ status: "active" }),
      SubTopic.countDocuments({ status: "inactive" }),
    ]);

    // Calculate totals
    const stats = {
      exams: {
        active: examsActive,
        inactive: examsInactive,
        total: examsActive + examsInactive,
      },
      subjects: {
        active: subjectsActive,
        inactive: subjectsInactive,
        total: subjectsActive + subjectsInactive,
      },
      units: {
        active: unitsActive,
        inactive: unitsInactive,
        total: unitsActive + unitsInactive,
      },
      chapters: {
        active: chaptersActive,
        inactive: chaptersInactive,
        total: chaptersActive + chaptersInactive,
      },
      topics: {
        active: topicsActive,
        inactive: topicsInactive,
        total: topicsActive + topicsInactive,
      },
      subtopics: {
        active: subtopicsActive,
        inactive: subtopicsInactive,
        total: subtopicsActive + subtopicsInactive,
      },
      summary: {
        totalActive:
          examsActive +
          subjectsActive +
          unitsActive +
          chaptersActive +
          topicsActive +
          subtopicsActive,
        totalInactive:
          examsInactive +
          subjectsInactive +
          unitsInactive +
          chaptersInactive +
          topicsInactive +
          subtopicsInactive,
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch stats");
  }
}







