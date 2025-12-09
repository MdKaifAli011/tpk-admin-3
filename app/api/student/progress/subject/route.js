import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SubjectProgress from "@/models/SubjectProgress";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";

// GET: Fetch subject progress for a student
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
    const subjectId = searchParams.get("subjectId");

    if (!subjectId) {
      return errorResponse("Subject ID is required", 400);
    }

    const subjectProgress = await SubjectProgress.findOne({
      studentId: authCheck.studentId,
      subjectId,
    });

    if (!subjectProgress) {
      return successResponse(
        {
          subjectId,
          subjectProgress: 0,
          subjectCongratulationsShown: false,
        },
        "Subject progress fetched successfully"
      );
    }

    return successResponse(
      {
        subjectId: subjectProgress.subjectId,
        subjectProgress: subjectProgress.subjectProgress || 0,
        subjectCongratulationsShown:
          subjectProgress.subjectCongratulationsShown || false,
      },
      "Subject progress fetched successfully"
    );
  } catch (error) {
    return handleApiError(error, "Failed to fetch subject progress");
  }
}
