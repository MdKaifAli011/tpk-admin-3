import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StudentProgress from "@/models/StudentProgress";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";

// POST: Mark congratulations as shown for chapter, unit, or subject
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
    const { type, unitId, chapterId, subjectId } = body;

    if (!type || !["chapter", "unit", "subject"].includes(type)) {
      return errorResponse(
        "Invalid type. Must be 'chapter', 'unit', or 'subject'",
        400
      );
    }

    if (type === "chapter") {
      if (!unitId || !chapterId) {
        return errorResponse(
          "Unit ID and Chapter ID are required for chapter type",
          400
        );
      }

      // Find or create progress document
      let studentProgress = await StudentProgress.findOne({
        studentId: authCheck.studentId,
        unitId,
      });

      if (!studentProgress) {
        studentProgress = await StudentProgress.create({
          studentId: authCheck.studentId,
          unitId,
          progress: {},
          unitProgress: 0,
        });
      }

      // Get existing chapter progress or create new
      const chapterData = studentProgress.progress.get(chapterId) || {
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
        congratulationsShown: false,
      };

      // Mark congratulations as shown
      chapterData.congratulationsShown = true;
      studentProgress.progress.set(chapterId, chapterData);
      await studentProgress.save();

      return successResponse(
        { chapterId, congratulationsShown: true },
        "Chapter congratulations marked as shown"
      );
    } else if (type === "unit") {
      if (!unitId) {
        return errorResponse("Unit ID is required for unit type", 400);
      }

      // Find or create progress document
      let studentProgress = await StudentProgress.findOne({
        studentId: authCheck.studentId,
        unitId,
      });

      if (!studentProgress) {
        studentProgress = await StudentProgress.create({
          studentId: authCheck.studentId,
          unitId,
          progress: {},
          unitProgress: 0,
          unitCongratulationsShown: false,
        });
      }

      // Mark unit congratulations as shown
      studentProgress.unitCongratulationsShown = true;
      await studentProgress.save();

      return successResponse(
        { unitId, congratulationsShown: true },
        "Unit congratulations marked as shown"
      );
    } else if (type === "subject") {
      if (!subjectId) {
        return errorResponse("Subject ID is required for subject type", 400);
      }

      // Import SubjectProgress model
      const SubjectProgress = (await import("@/models/SubjectProgress"))
        .default;

      // Find or create subject progress document
      let subjectProgress = await SubjectProgress.findOne({
        studentId: authCheck.studentId,
        subjectId,
      });

      if (!subjectProgress) {
        subjectProgress = await SubjectProgress.create({
          studentId: authCheck.studentId,
          subjectId,
          subjectProgress: 0,
          subjectCongratulationsShown: false,
        });
      }

      // Mark subject congratulations as shown
      subjectProgress.subjectCongratulationsShown = true;
      await subjectProgress.save();

      return successResponse(
        { subjectId, congratulationsShown: true },
        "Subject congratulations marked as shown"
      );
    }

    return errorResponse("Invalid type", 400);
  } catch (error) {
    return handleApiError(error, "Failed to mark congratulations as shown");
  }
}
