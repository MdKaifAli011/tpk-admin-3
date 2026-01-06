import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StudentTestResult from "@/models/StudentTestResult";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";

// POST: Save test result
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

    const {
      testId,
      examId,
      subjectId,
      unitId,
      chapterId,
      topicId,
      subTopicId,
      totalQuestions,
      correctCount,
      incorrectCount,
      unansweredCount,
      totalMarks,
      maximumMarks,
      percentage,
      timeTaken,
      answers,
      questionResults,
      startedAt,
    } = body;

    // Validate required fields
    if (!testId) {
      return errorResponse("Test ID is required", 400);
    }

    if (
      totalQuestions === undefined ||
      correctCount === undefined ||
      incorrectCount === undefined ||
      unansweredCount === undefined ||
      totalMarks === undefined ||
      maximumMarks === undefined ||
      percentage === undefined ||
      timeTaken === undefined
    ) {
      return errorResponse("All result fields are required", 400);
    }

    // Convert answers object to Map
    const answersMap = new Map();
    if (answers && typeof answers === "object") {
      Object.keys(answers).forEach((questionId) => {
        const answerValue = answers[questionId];
        // Only set non-null answers in the map
        if (answerValue !== null && answerValue !== undefined) {
          answersMap.set(questionId, answerValue);
        }
      });
    }

    // Convert IDs to ObjectId if they're valid MongoDB ObjectId strings
    const mongoose = await import("mongoose");

    // Helper function to convert to ObjectId if valid
    const toObjectId = (id) => {
      if (!id) return null;
      if (mongoose.default.Types.ObjectId.isValid(id)) {
        return new mongoose.default.Types.ObjectId(id);
      }
      return id;
    };

    let testIdObjectId = toObjectId(testId);
    const examIdObjectId = toObjectId(examId);
    const subjectIdObjectId = toObjectId(subjectId);
    const unitIdObjectId = toObjectId(unitId);
    const chapterIdObjectId = toObjectId(chapterId);
    const topicIdObjectId = toObjectId(topicId);
    const subTopicIdObjectId = toObjectId(subTopicId);

    // Process questionResults - convert questionId to ObjectId and validate userAnswer
    const processedQuestionResults = (questionResults || []).map((qr) => {
      const processed = {
        questionId: toObjectId(qr.questionId),
        question: qr.question,
        correctAnswer: qr.correctAnswer,
        isCorrect: qr.isCorrect,
        marks: qr.marks,
      };

      // Handle userAnswer - only set if it's a valid enum value
      if (
        qr.userAnswer &&
        ["A", "B", "C", "D"].includes(qr.userAnswer.toUpperCase())
      ) {
        processed.userAnswer = qr.userAnswer.toUpperCase();
      }

      return processed;
    });

    // Validate all required fields before creating
    if (!testIdObjectId) {
      return errorResponse("Invalid test ID", 400);
    }

    // Filter invalid questionResults
    if (processedQuestionResults && processedQuestionResults.length > 0) {
      const validResults = processedQuestionResults.filter(
        (qr) => qr.questionId && qr.question && qr.correctAnswer
      );
      processedQuestionResults.length = 0;
      processedQuestionResults.push(...validResults);
    }

    // Ensure percentage is within valid range
    const validatedPercentage = Math.max(0, Math.min(100, percentage));
    const validatedTotalMarks = Math.max(0, totalMarks);

    // Always create a new test result record for each attempt
    // This allows tracking all attempts separately (one test = one entry, multiple tests = multiple entries)
    try {
      const testResult = await StudentTestResult.create({
        studentId: authCheck.studentId,
        testId: testIdObjectId,
        examId: examIdObjectId,
        subjectId: subjectIdObjectId,
        unitId: unitIdObjectId,
        chapterId: chapterIdObjectId,
        topicId: topicIdObjectId,
        subTopicId: subTopicIdObjectId,
        totalQuestions,
        correctCount,
        incorrectCount,
        unansweredCount,
        totalMarks: validatedTotalMarks,
        maximumMarks,
        percentage: validatedPercentage,
        timeTaken,
        answers: answersMap,
        questionResults: processedQuestionResults,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        submittedAt: new Date(),
      });

      return successResponse(
        testResult.toObject(),
        "Test result saved successfully"
      );
    } catch (createError) {
      throw createError;
    }
  } catch (error) {
    return handleApiError(error, "Failed to save test result");
  }
}

// GET: Fetch test results for a student
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
    const testId = searchParams.get("testId");
    const examId = searchParams.get("examId");
    const subjectId = searchParams.get("subjectId");
    const unitId = searchParams.get("unitId");
    const chapterId = searchParams.get("chapterId");
    const topicId = searchParams.get("topicId");
    const subTopicId = searchParams.get("subTopicId");
    const limit = parseInt(searchParams.get("limit")) || 100;

    const mongoose = await import("mongoose");
    const query = { studentId: authCheck.studentId };

    // Helper to convert to ObjectId
    const toObjectId = (id) => {
      if (!id) return null;
      if (mongoose.default.Types.ObjectId.isValid(id)) {
        return new mongoose.default.Types.ObjectId(id);
      }
      return id;
    };

    if (testId) {
      // Convert testId to ObjectId if it's a valid MongoDB ObjectId string
      if (mongoose.default.Types.ObjectId.isValid(testId)) {
        query.testId = new mongoose.default.Types.ObjectId(testId);
      } else {
        query.testId = testId;
      }
    }

    // Add entity filters
    if (examId) query.examId = toObjectId(examId);
    if (subjectId) query.subjectId = toObjectId(subjectId);
    if (unitId) query.unitId = toObjectId(unitId);
    if (chapterId) query.chapterId = toObjectId(chapterId);
    if (topicId) query.topicId = toObjectId(topicId);
    if (subTopicId) query.subTopicId = toObjectId(subTopicId);

    // If testId provided, get result for that test only
    let result;
    if (testId) {
      result = await StudentTestResult.findOne(query)
        .select("totalMarks maximumMarks percentage testId submittedAt")
        .populate("testId", "name")
        .lean();
    } else {
      // Get all results with detailed fields for performance analytics
      const results = await StudentTestResult.find(query)
        .select(
          "totalMarks maximumMarks percentage testId examId subjectId unitId chapterId topicId subTopicId totalQuestions correctCount incorrectCount unansweredCount timeTaken submittedAt startedAt"
        )
        .populate("testId", "name")
        .sort({ submittedAt: -1 })
        .limit(limit)
        .lean();

      return successResponse(results, "Test results fetched successfully");
    }

    return successResponse(result || null, "Test result fetched successfully");
  } catch (error) {
    return handleApiError(error, "Failed to fetch test results");
  }
}
