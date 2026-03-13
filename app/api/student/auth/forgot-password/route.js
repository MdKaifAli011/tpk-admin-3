import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { sendMail } from "@/lib/mailer";
import { getEmailTemplateContent } from "@/lib/getEmailTemplateContent";
import { config } from "@/config/config";

const RESET_EXPIRY_HOURS = 1;

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const email = body.email?.trim()?.toLowerCase();

    if (!email) {
      return errorResponse("Email is required", 400);
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return errorResponse("Please provide a valid email address", 400);
    }

    const student = await Student.findOne({ email }).select("firstName lastName email status");
    if (!student) {
      return successResponse(
        { sent: true },
        "If an account exists with this email, you will receive a password reset link shortly."
      );
    }

    if (student.status !== "active") {
      return successResponse(
        { sent: true },
        "If an account exists with this email, you will receive a password reset link shortly."
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);

    await Student.findByIdAndUpdate(student._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: expires,
    });

    const baseUrl = config.siteUrl || "";
    const resetUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}` : "";

    const studentName = `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student";
    const { subject, text, html } = await getEmailTemplateContent("student_forgot_password", {
      name: studentName,
      reset_url: resetUrl,
    });

    sendMail({ to: student.email, subject, text, html }).catch((err) =>
      console.error("Forgot password email error:", err)
    );

    return successResponse(
      { sent: true },
      "If an account exists with this email, you will receive a password reset link shortly."
    );
  } catch (error) {
    return handleApiError(error, "Failed to process request");
  }
}
