import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SubjectProgress from "@/models/SubjectProgress";
import Subject from "@/models/Subject";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";

// GET: Fetch exam progress for a student
// Exam progress = Average of all subject progress for that exam
export async function GET(request) {
  try {
    const authCheck = await verifyStudentToken(request);
    if (authCheck.error) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    if (!examId) {
      return errorResponse("Exam ID is required", 400);
    }

    // Fetch active subjects that count toward progress (exclude practice-disabled subjects)
    const subjects = await Subject.find({
      examId: examId,
      status: "active",
      practiceDisabled: { $ne: true },
    })
      .select("_id")
      .lean();

    if (subjects.length === 0) {
      return successResponse(
        {
          examId,
          examProgress: 0,
          totalSubjects: 0,
        },
        "Exam progress fetched successfully"
      );
    }

    const subjectIds = subjects.map((s) => s._id);

    // Fetch progress for all subjects using optimized query (lean for performance)
    // Uses compound index { studentId: 1, subjectId: 1 } automatically
    const subjectProgresses = await SubjectProgress.find({
      studentId: authCheck.studentId,
      subjectId: { $in: subjectIds },
    })
      .select("subjectId subjectProgress")
      .lean();

    // Create a map for quick lookup
    const progressMap = new Map();
    subjectProgresses.forEach((sp) => {
      progressMap.set(String(sp.subjectId), sp.subjectProgress || 0);
    });

    // Calculate exam progress: Sum of all subject progress / Total number of subjects
    // Includes ALL subjects (even those with 0% progress) for accurate calculation
    const totalProgress = subjects.reduce((sum, subject) => {
      const subjectIdStr = String(subject._id);
      const subjectProgress = progressMap.get(subjectIdStr) || 0;
      return sum + subjectProgress;
    }, 0);

    const examProgress = Math.round(totalProgress / subjects.length);

    return successResponse(
      {
        examId,
        examProgress: Math.min(100, Math.max(0, examProgress)),
        totalSubjects: subjects.length,
        subjectsWithProgress: subjectProgresses.length,
      },
      "Exam progress fetched successfully"
    );
  } catch (error) {
    return handleApiError(error, "Failed to fetch exam progress");
  }
}

