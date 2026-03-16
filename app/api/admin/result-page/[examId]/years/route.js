import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import ExamResultPage from "@/models/ExamResultPage";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

const currentYear = new Date().getFullYear();

/**
 * GET - Admin: list years for an exam (result pages that exist).
 */
export async function GET(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }
    const { examId } = await params;
    if (!examId) return errorResponse("Exam ID required", 400);
    await connectDB();
    const exam = await Exam.findById(examId).select("_id name slug").lean();
    if (!exam) return errorResponse("Exam not found", 404);
    const allYears = await ExamResultPage.find({ examId: exam._id })
      .distinct("year")
      .then((arr) => arr.filter((y) => y != null));
    const hasLegacy = await ExamResultPage.exists({ examId: exam._id, year: null });
    const years = [...new Set([...(hasLegacy ? [currentYear] : []), ...allYears])].sort((a, b) => b - a);
    return successResponse({ years, examId: String(exam._id), examName: exam.name, examSlug: exam.slug }, "OK");
  } catch (error) {
    return handleApiError(error, "Failed to list years");
  }
}

/**
 * POST - Admin: add a result year for an exam (creates doc with defaults).
 */
export async function POST(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }
    const { examId } = await params;
    if (!examId) return errorResponse("Exam ID required", 400);
    await connectDB();
    const exam = await Exam.findById(examId).select("_id").lean();
    if (!exam) return errorResponse("Exam not found", 404);
    const body = await request.json();
    const year = typeof body.year === "number" ? body.year : parseInt(String(body.year || currentYear), 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) {
      return errorResponse("Valid year (2000-2100) required", 400);
    }
    const existing = await ExamResultPage.findOne({ examId: exam._id, year }).lean();
    if (existing) {
      return successResponse(
        { examId: String(exam._id), year, message: "Year already exists" },
        "Year already exists"
      );
    }
    const doc = await ExamResultPage.create({
      examId: exam._id,
      year,
      bannerImage: "",
      bannerTitle: "",
      bannerSubtitle: "",
      toppers: [],
      targetAchievers: [],
      highlights: [],
      studentTestimonials: [],
      parentTestimonials: [],
    });
    return successResponse(
      { examId: String(doc.examId), year: doc.year, id: String(doc._id) },
      "Year created"
    );
  } catch (error) {
    return handleApiError(error, "Failed to add year");
  }
}
