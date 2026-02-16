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

// GET: Fetch exam info by ID
export async function GET(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam info ID", 400);
    }

    const examInfo = await ExamInfo.findById(id)
      .populate("examId", "name slug")
      .populate("subjects.subjectId", "name")
      .lean();

    if (!examInfo) {
      return errorResponse("Exam info not found", 404);
    }

    return successResponse(examInfo, "Exam info fetched successfully");
  } catch (error) {
    return handleApiError(error, "Failed to fetch exam info");
  }
}

// PUT: Update exam info
export async function PUT(request, { params }) {
  try {
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam info ID", 400);
    }

    const examInfo = await ExamInfo.findById(id);
    if (!examInfo) {
      return errorResponse("Exam info not found", 404);
    }

    const {
      examDate,
      examCut,
      maximumMarks,
      subjects,
      status,
    } = body;

    // Update fields
    if (examDate !== undefined) {
      examInfo.examDate = new Date(examDate);
    }

    if (examCut !== undefined) {
      examInfo.examCut = { ...examInfo.examCut, ...examCut };
    }

    if (maximumMarks !== undefined) {
      if (maximumMarks === null || maximumMarks < 0) {
        return errorResponse("Maximum marks must be a positive number", 400);
      }
      examInfo.maximumMarks = maximumMarks;
    }

    if (subjects !== undefined) {
      if (!Array.isArray(subjects) || subjects.length === 0) {
        return errorResponse("At least one subject is required", 400);
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

      examInfo.subjects = subjects.map((s) => ({
        subjectId: s.subjectId,
        subjectName: s.subjectName.trim(),
        numberOfQuestions: s.numberOfQuestions,
        maximumMarks: s.maximumMarks,
        weightage: s.weightage,
        studyHours: s.studyHours != null ? s.studyHours : undefined,
        time: s.time != null ? s.time : undefined,
      }));
    }

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status.toLowerCase())) {
        return errorResponse("Invalid status", 400);
      }
      examInfo.status = status.toLowerCase();
    }

    await examInfo.save();

    const updatedExamInfo = await ExamInfo.findById(examInfo._id)
      .populate("examId", "name slug")
      .populate("subjects.subjectId", "name")
      .lean();

    return successResponse(updatedExamInfo, "Exam info updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update exam info");
  }
}

// DELETE: Delete exam info
export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam info ID", 400);
    }

    const examInfo = await ExamInfo.findByIdAndDelete(id);

    if (!examInfo) {
      return errorResponse("Exam info not found", 404);
    }

    return successResponse(null, "Exam info deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete exam info");
  }
}
