import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import { verifyToken } from "@/lib/auth";
import { logger } from "@/utils/logger";

/**
 * Verify student token AND check if student exists in database
 * This prevents deleted students from accessing the system
 * @param {Request} request - Next.js request object
 * @returns {object} - { studentId: string, error: null } or { error: string, status: number }
 */
export async function verifyStudentToken(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "No token provided", status: 401 };
  }

  try {
    await connectDB();
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || decoded.type !== "student") {
      return { error: "Invalid token", status: 401 };
    }

    // CRITICAL: Verify student still exists in database
    // This prevents deleted students from accessing the system
    const student = await Student.findById(decoded.studentId).select(
      "_id email status"
    );

    if (!student) {
      // Student account has been deleted
      return { error: "Account not found", status: 401 };
    }

    // Check if account is active
    if (student.status !== "active") {
      return { error: "Account is inactive", status: 403 };
    }

    return { studentId: decoded.studentId, error: null };
  } catch (error) {
    logger.error("Error verifying student token:", error);
    return { error: "Invalid or expired token", status: 401 };
  }
}
