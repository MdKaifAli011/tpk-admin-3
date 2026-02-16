import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SubjectProgress from "@/models/SubjectProgress";
import Subject from "@/models/Subject";
import StudentTestResult from "@/models/StudentTestResult";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";

/** Compute practice % for student+exam: latest attempt per test, then average. 0 if no attempts. */
async function getPracticeProgressPercent(studentId, examId) {
  const examIdObj = mongoose.Types.ObjectId.isValid(examId) ? new mongoose.Types.ObjectId(examId) : null;
  if (!examIdObj) return 0;

  const latestPerTest = await StudentTestResult.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId), examId: examIdObj } },
    { $sort: { submittedAt: -1 } },
    {
      $group: {
        _id: "$testId",
        percentage: { $first: "$percentage" },
      },
    },
    {
      $group: {
        _id: null,
        avgPercentage: { $avg: "$percentage" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (!latestPerTest.length || latestPerTest[0].count === 0) return 0;
  return Math.min(100, Math.max(0, Math.round(latestPerTest[0].avgPercentage)));
}

// GET: Fetch exam progress for a student (theory + practice + combined 70/30)
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

    let examProgress = 0;
    let subjectsWithProgressCount = 0;
    if (subjects.length > 0) {
      const subjectIds = subjects.map((s) => s._id);
      const subjectProgresses = await SubjectProgress.find({
        studentId: authCheck.studentId,
        subjectId: { $in: subjectIds },
      })
        .select("subjectId subjectProgress")
        .lean();
      subjectsWithProgressCount = subjectProgresses.length;

      const progressMap = new Map();
      subjectProgresses.forEach((sp) => {
        progressMap.set(String(sp.subjectId), sp.subjectProgress || 0);
      });

      const totalProgress = subjects.reduce((sum, subject) => {
        const subjectIdStr = String(subject._id);
        return sum + (progressMap.get(subjectIdStr) || 0);
      }, 0);
      examProgress = Math.min(100, Math.max(0, Math.round(totalProgress / subjects.length)));
    }

    const practiceProgress = await getPracticeProgressPercent(authCheck.studentId, examId);
    const combinedProgress = Math.min(
      100,
      Math.max(0, Math.round(examProgress * 0.7 + practiceProgress * 0.3))
    );

    return successResponse(
      {
        examId,
        examProgress,
        practiceProgress,
        combinedProgress,
        totalSubjects: subjects.length,
        subjectsWithProgress: subjectsWithProgressCount,
      },
      "Exam progress fetched successfully"
    );
  } catch (error) {
    return handleApiError(error, "Failed to fetch exam progress");
  }
}

