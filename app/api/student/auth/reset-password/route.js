import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return errorResponse("Reset token is required", 400);
    }
    if (!newPassword || newPassword.length < 6) {
      return errorResponse("Password must be at least 6 characters", 400);
    }

    const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const student = await Student.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires +password");

    if (!student) {
      return errorResponse("Invalid or expired reset link. Please request a new password reset.", 400);
    }

    student.password = newPassword;
    student.passwordResetToken = null;
    student.passwordResetExpires = null;
    await student.save();

    return successResponse(
      { success: true },
      "Your password has been reset. You can now sign in with your new password."
    );
  } catch (error) {
    return handleApiError(error, "Failed to reset password");
  }
}
