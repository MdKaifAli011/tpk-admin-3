import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
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

    // Count-only queries (no documents loaded – fast, no limit)
    const [
      examsTotal,
      examsActive,
      examsInactive,
      subjectsTotal,
      subjectsActive,
      subjectsInactive,
      unitsTotal,
      unitsActive,
      unitsInactive,
      chaptersTotal,
      chaptersActive,
      chaptersInactive,
      topicsTotal,
      topicsActive,
      topicsInactive,
      subtopicsTotal,
      subtopicsActive,
      subtopicsInactive,
      definitionsTotal,
      definitionsActive,
      definitionsInactive,
    ] = await Promise.all([
      Exam.countDocuments({}),
      Exam.countDocuments({ status: "active" }),
      Exam.countDocuments({ status: "inactive" }),
      Subject.countDocuments({}),
      Subject.countDocuments({ status: "active" }),
      Subject.countDocuments({ status: "inactive" }),
      Unit.countDocuments({}),
      Unit.countDocuments({ status: "active" }),
      Unit.countDocuments({ status: "inactive" }),
      Chapter.countDocuments({}),
      Chapter.countDocuments({ status: "active" }),
      Chapter.countDocuments({ status: "inactive" }),
      Topic.countDocuments({}),
      Topic.countDocuments({ status: "active" }),
      Topic.countDocuments({ status: "inactive" }),
      SubTopic.countDocuments({}),
      SubTopic.countDocuments({ status: "active" }),
      SubTopic.countDocuments({ status: "inactive" }),
      Definition.countDocuments({}),
      Definition.countDocuments({ status: "active" }),
      Definition.countDocuments({ status: "inactive" }),
    ]);

    const stats = {
      exams: { active: examsActive, inactive: examsInactive, total: examsTotal },
      subjects: { active: subjectsActive, inactive: subjectsInactive, total: subjectsTotal },
      units: { active: unitsActive, inactive: unitsInactive, total: unitsTotal },
      chapters: { active: chaptersActive, inactive: chaptersInactive, total: chaptersTotal },
      topics: { active: topicsActive, inactive: topicsInactive, total: topicsTotal },
      subtopics: { active: subtopicsActive, inactive: subtopicsInactive, total: subtopicsTotal },
      definitions: { active: definitionsActive, inactive: definitionsInactive, total: definitionsTotal },
      summary: {
        totalActive:
          examsActive + subjectsActive + unitsActive + chaptersActive + topicsActive + subtopicsActive + definitionsActive,
        totalInactive:
          examsInactive + subjectsInactive + unitsInactive + chaptersInactive + topicsInactive + subtopicsInactive + definitionsInactive,
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












