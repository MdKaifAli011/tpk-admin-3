import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireUserManagement } from "@/middleware/authMiddleware";

// DELETE: Delete student account and all related data (admin only)
export async function DELETE(request, { params }) {
  try {
    // Check authentication and permissions (only admin can delete students)
    const authCheck = await requireUserManagement(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid student ID", 400);
    }

    // Find student before deletion (for logging and verification)
    const student = await Student.findById(id).select(
      "_id email firstName lastName"
    );

    if (!student) {
      return errorResponse("Student not found", 404);
    }

    // Delete student (cascading delete hook will automatically delete related data)
    // The pre("findOneAndDelete") hook will:
    // 1. Delete all StudentTestResult documents
    // 2. Delete all SubjectProgress documents
    // 3. Delete all StudentProgress documents
    // 4. Keep Lead data (not deleted)
    const deletedStudent = await Student.findOneAndDelete({ _id: id });

    if (!deletedStudent) {
      return errorResponse("Failed to delete student", 500);
    }

    // Log deletion for audit trail
    console.log(
      `✅ Student deleted: ID=${id}, Email=${student.email}, Name=${student.firstName} ${student.lastName}, Deleted by admin=${authCheck.userId || authCheck.email}`
    );

    return successResponse(
      {
        studentId: id,
        email: student.email,
        deletedAt: new Date().toISOString(),
      },
      "Student and all related data deleted successfully"
    );
  } catch (error) {
    console.error("❌ Error deleting student:", error);
    return handleApiError(error, "Failed to delete student");
  }
}

