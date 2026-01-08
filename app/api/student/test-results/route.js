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

    // Convert answers object to Map or plain object
    // Mongoose Map works better when initialized as empty Map, then populated
    const answersMap = new Map();
    if (answers && typeof answers === "object") {
      Object.keys(answers).forEach((questionId) => {
        const answerValue = answers[questionId];
        // Only set non-null answers in the map
        if (answerValue !== null && answerValue !== undefined) {
          answersMap.set(String(questionId), String(answerValue));
        }
      });
    }

    // Convert IDs to ObjectId if they're valid MongoDB ObjectId strings
    const mongoose = await import("mongoose");

    // Helper function to convert to ObjectId if valid, returns null if invalid
    const toObjectId = (id) => {
      if (!id) return null;
      if (mongoose.default.Types.ObjectId.isValid(id)) {
        return new mongoose.default.Types.ObjectId(id);
      }
      return null; // Return null if not valid ObjectId
    };

    // Validate testId - it MUST be a valid ObjectId (testId is required and must be ObjectId)
    if (!testId) {
      console.error("testId is missing");
      return errorResponse("Test ID is required", 400);
    }

    // Check if testId is a valid MongoDB ObjectId format
    if (!mongoose.default.Types.ObjectId.isValid(testId)) {
      console.error("Invalid testId format (not a valid ObjectId):", testId);
      return errorResponse(
        `Invalid test ID format. Expected a valid MongoDB ObjectId (24 hex characters), received: ${testId}`,
        400
      );
    }

    // Convert testId to ObjectId (guaranteed to work since we validated above)
    const testIdObjectId = new mongoose.default.Types.ObjectId(testId);
    
    // Convert optional IDs to ObjectId if they're valid
    const examIdObjectId = toObjectId(examId);
    const subjectIdObjectId = toObjectId(subjectId);
    const unitIdObjectId = toObjectId(unitId);
    const chapterIdObjectId = toObjectId(chapterId);
    const topicIdObjectId = toObjectId(topicId);
    const subTopicIdObjectId = toObjectId(subTopicId);

    // Process questionResults - convert questionId to ObjectId and validate userAnswer
    const processedQuestionResults = (questionResults || []).map((qr) => {
      // Validate required fields for each question result
      if (!qr.questionId || !qr.question || !qr.correctAnswer) {
        console.warn("Invalid question result skipped:", qr);
        return null;
      }

      const processed = {
        questionId: toObjectId(qr.questionId),
        question: String(qr.question).trim(),
        correctAnswer: String(qr.correctAnswer).toUpperCase(),
        isCorrect: Boolean(qr.isCorrect),
        marks: Number(qr.marks) || 0,
      };

      // Validate questionId was converted properly
      if (!processed.questionId || !mongoose.default.Types.ObjectId.isValid(processed.questionId)) {
        console.warn("Invalid questionId in question result:", qr.questionId);
        return null;
      }

      // Validate correctAnswer is valid enum
      if (!["A", "B", "C", "D"].includes(processed.correctAnswer)) {
        console.warn("Invalid correctAnswer in question result:", processed.correctAnswer);
        return null;
      }

      // Handle userAnswer - only set if it's a valid enum value
      if (
        qr.userAnswer &&
        ["A", "B", "C", "D"].includes(String(qr.userAnswer).toUpperCase())
      ) {
        processed.userAnswer = String(qr.userAnswer).toUpperCase();
      }

      return processed;
    }).filter(qr => qr !== null); // Remove null entries

    // testId is already validated and converted above, so we can skip this check
    // But we'll keep it for safety
    if (!testIdObjectId) {
      console.error("testIdObjectId is null after conversion");
      return errorResponse("Invalid test ID format", 400);
    }

    // Ensure processedQuestionResults is an array (not undefined) - this shouldn't happen after filter, but just in case
    const finalQuestionResults = Array.isArray(processedQuestionResults) ? processedQuestionResults : [];

    // Ensure percentage is within valid range
    const validatedPercentage = Math.max(0, Math.min(100, percentage));
    const validatedTotalMarks = Math.max(0, totalMarks);

    // Always create a new test result record for each attempt
    // This allows tracking all attempts separately (one test = one entry, multiple tests = multiple entries)
    try {
      // Create the test result document
      const testResultData = {
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
        answers: answersMap.size > 0 ? answersMap : new Map(),
        questionResults: finalQuestionResults.length > 0 ? finalQuestionResults : [],
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        submittedAt: new Date(),
      };

      // Log for debugging (can be removed in production)
      console.log("Creating test result with data:", {
        studentId: testResultData.studentId,
        testId: testResultData.testId,
        totalQuestions: testResultData.totalQuestions,
        percentage: testResultData.percentage,
        questionResultsCount: testResultData.questionResults.length,
        answersCount: testResultData.answers.size,
      });

      const testResult = await StudentTestResult.create(testResultData);

      console.log("Test result saved successfully:", testResult._id);

      return successResponse(
        testResult.toObject(),
        "Test result saved successfully"
      );
    } catch (createError) {
      // Log detailed error for debugging
      console.error("Error creating test result:", {
        message: createError.message,
        name: createError.name,
        errors: createError.errors,
        stack: createError.stack,
      });
      throw createError;
    }
  } catch (error) {
    // Enhanced error logging
    console.error("Error in POST /api/student/test-results:", {
      message: error.message,
      name: error.name,
      validationErrors: error.errors,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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
