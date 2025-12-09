import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StudentProgress from "@/models/StudentProgress";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";

// GET: Fetch progress for a student
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
    const unitId = searchParams.get("unitId");

    const query = { studentId: authCheck.studentId };
    if (unitId) {
      query.unitId = unitId;
    }

    const progress = await StudentProgress.find(query);

    // Convert Map to object for JSON serialization
    const formattedProgress = progress.map((doc) => {
      const progressObj = {};
      // Mongoose Map needs to be converted to object
      if (doc.progress) {
        doc.progress.forEach((value, key) => {
          progressObj[key] = {
            progress: value.progress || 0,
            isCompleted: value.isCompleted || false,
            isManualOverride: value.isManualOverride || false,
            manualProgress: value.manualProgress || null,
            autoCalculatedProgress: value.autoCalculatedProgress || 0,
            visitedItems: value.visitedItems || {
              chapter: false,
              topics: [],
              subtopics: [],
              definitions: [],
            },
            congratulationsShown: value.congratulationsShown || false,
          };
        });
      }
      return {
        _id: doc._id,
        studentId: doc.studentId,
        unitId: doc.unitId,
        progress: progressObj,
        unitProgress: doc.unitProgress || 0,
        unitCongratulationsShown: doc.unitCongratulationsShown || false,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    return successResponse(formattedProgress, "Progress fetched successfully");
  } catch (error) {
    return handleApiError(error, "Failed to fetch progress");
  }
}

// POST/PUT: Update progress for a student
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
    const { unitId, chapterId, progress: chapterProgress, unitProgress } = body;

    if (!unitId) {
      return errorResponse("Unit ID is required", 400);
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

    // Update chapter progress if provided
    if (chapterId && chapterProgress !== undefined) {
      studentProgress.progress.set(chapterId, chapterProgress);
    }

    // Update unit progress if provided
    if (unitProgress !== undefined) {
      studentProgress.unitProgress = unitProgress;
    }

    await studentProgress.save();

    return successResponse(
      studentProgress.toObject(),
      "Progress updated successfully"
    );
  } catch (error) {
    return handleApiError(error, "Failed to update progress");
  }
}

// PUT: Bulk update progress
export async function PUT(request) {
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
    const { unitId, progress: allProgress, unitProgress } = body;

    if (!unitId) {
      return errorResponse("Unit ID is required", 400);
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

    // Update all chapter progress
    if (allProgress && typeof allProgress === "object") {
      Object.keys(allProgress).forEach((chapterId) => {
        studentProgress.progress.set(chapterId, allProgress[chapterId]);
      });
    }

    // Update unit progress
    if (unitProgress !== undefined) {
      studentProgress.unitProgress = unitProgress;
    }

    await studentProgress.save();

    return successResponse(
      studentProgress.toObject(),
      "Progress updated successfully"
    );
  } catch (error) {
    return handleApiError(error, "Failed to update progress");
  }
}
