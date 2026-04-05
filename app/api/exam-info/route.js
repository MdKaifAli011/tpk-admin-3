import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ExamInfo from "@/models/ExamInfo";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import { STATUS } from "@/constants";
import { regexExactInsensitive } from "@/utils/escapeRegex.js";

// GET: Fetch all exam info or filter by examId
// Public read when only examId is provided (so dashboard can show exam date / prep days without login)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");
    const status = searchParams.get("status");

    const singleExamQuery = examId && mongoose.Types.ObjectId.isValid(examId) && !status;
    if (!singleExamQuery) {
      const authCheck = await requireAuth(request);
      if (authCheck.error) {
        return NextResponse.json(authCheck, { status: authCheck.status || 401 });
      }
    }

    await connectDB();

    const query = {};
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      query.examId = new mongoose.Types.ObjectId(examId);
    }
    if (status && status !== "all") {
      query.status = { $regex: regexExactInsensitive(status) };
    }

    const examInfos = await ExamInfo.find(query)
      .populate("examId", "name slug")
      .populate("subjects.subjectId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(examInfos, "Exam info fetched successfully");
  } catch (error) {
    return handleApiError(error, "Failed to fetch exam info");
  }
}

// POST: Create new exam info
export async function POST(request) {
  try {
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const body = await request.json();

    const {
      examId,
      examDate,
      examCut,
      maximumMarks,
      subjects,
      status = STATUS.ACTIVE,
    } = body;

    // Validation
    if (!examId) {
      return errorResponse("Exam ID is required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return errorResponse("Invalid exam ID", 400);
    }

    if (!examDate) {
      return errorResponse("Exam date is required", 400);
    }

    if (maximumMarks === undefined || maximumMarks === null) {
      return errorResponse("Maximum marks is required", 400);
    }

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return errorResponse("At least one subject is required", 400);
    }

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return errorResponse("Exam not found", 404);
    }

    // Check if exam info already exists
    const existingExamInfo = await ExamInfo.findOne({ examId });
    if (existingExamInfo) {
      return errorResponse("Exam info already exists for this exam", 409);
    }

    // Validate subjects
    const subjectIds = [];
    for (const subject of subjects) {
      if (!subject.subjectId) {
        return errorResponse("Subject ID is required for all subjects", 400);
      }

      if (!mongoose.Types.ObjectId.isValid(subject.subjectId)) {
        return errorResponse(`Invalid subject ID: ${subject.subjectId}`, 400);
      }

      if (subjectIds.includes(subject.subjectId)) {
        return errorResponse("Duplicate subjects are not allowed", 400);
      }

      subjectIds.push(subject.subjectId);

      if (!subject.subjectName || !subject.subjectName.trim()) {
        return errorResponse("Subject name is required", 400);
      }

      if (
        subject.numberOfQuestions === undefined ||
        subject.numberOfQuestions === null ||
        subject.numberOfQuestions < 0
      ) {
        return errorResponse(
          "Valid number of questions is required for all subjects",
          400
        );
      }

      if (
        subject.maximumMarks === undefined ||
        subject.maximumMarks === null ||
        subject.maximumMarks < 0
      ) {
        return errorResponse(
          "Valid maximum marks is required for all subjects",
          400
        );
      }

      if (
        subject.weightage === undefined ||
        subject.weightage === null ||
        subject.weightage < 0 ||
        subject.weightage > 100
      ) {
        return errorResponse(
          "Valid weightage (0-100) is required for all subjects",
          400
        );
      }

      // Verify subject exists
      const subjectExists = await Subject.findById(subject.subjectId);
      if (!subjectExists) {
        return errorResponse(
          `Subject not found: ${subject.subjectId}`,
          404
        );
      }
    }

    // Create exam info
    const examInfo = await ExamInfo.create({
      examId,
      examDate: new Date(examDate),
      examCut: examCut || {},
      maximumMarks,
      subjects: subjects.map((s) => ({
        subjectId: s.subjectId,
        subjectName: s.subjectName.trim(),
        numberOfQuestions: s.numberOfQuestions,
        maximumMarks: s.maximumMarks,
        weightage: s.weightage,
      })),
      status,
    });

    const populatedExamInfo = await ExamInfo.findById(examInfo._id)
      .populate("examId", "name slug")
      .populate("subjects.subjectId", "name")
      .lean();

    return successResponse(
      populatedExamInfo,
      "Exam info created successfully",
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse("Exam info already exists for this exam", 409);
    }
    return handleApiError(error, "Failed to create exam info");
  }
}
