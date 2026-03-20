import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import ExamResultPage from "@/models/ExamResultPage";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

const currentYear = new Date().getFullYear();

/**
 * GET - Admin: list years for an exam with status. Returns { years: [{ year, status }, ...] }.
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
    const docs = await ExamResultPage.find({ examId: exam._id })
      .select("year status")
      .lean();
    const yearMap = new Map();
    for (const d of docs) {
      const y = d.year != null ? d.year : currentYear;
      yearMap.set(y, d.status === "inactive" ? "inactive" : "active");
    }
    const years = [...yearMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, status]) => ({ year, status }));
    return successResponse(
      { years, examId: String(exam._id), examName: exam.name, examSlug: exam.slug },
      "OK"
    );
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
      status: "active",
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

/**
 * PATCH - Admin: update status for a result year. Body: { year, status: "active" | "inactive" }.
 */
export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }
    const { examId } = await params;
    if (!examId) return errorResponse("Exam ID required", 400);
    const body = await request.json();
    const year = typeof body.year === "number" ? body.year : parseInt(String(body.year), 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) {
      return errorResponse("Valid year (2000-2100) required", 400);
    }
    const status = body.status === "inactive" ? "inactive" : "active";
    await connectDB();
    const exam = await Exam.findById(examId).select("_id").lean();
    if (!exam) return errorResponse("Exam not found", 404);
    let doc = await ExamResultPage.findOneAndUpdate(
      { examId: exam._id, year },
      { $set: { status } },
      { new: true }
    ).lean();
    if (!doc && year === currentYear) {
      doc = await ExamResultPage.findOneAndUpdate(
        { examId: exam._id, year: null },
        { $set: { status } },
        { new: true }
      ).lean();
    }
    if (!doc) return errorResponse("No result page for this year.", 404);
    return successResponse(
      { year: doc.year != null ? doc.year : currentYear, status: doc.status || "active" },
      "Status updated"
    );
  } catch (error) {
    return handleApiError(error, "Failed to update status");
  }
}

/**
 * DELETE - Admin: delete a result year. Body: { year }.
 */
export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }
    const { examId } = await params;
    if (!examId) return errorResponse("Exam ID required", 400);
    const body = await request.json().catch(() => ({}));
    const year = typeof body.year === "number" ? body.year : parseInt(String(body.year), 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) {
      return errorResponse("Valid year (2000-2100) required", 400);
    }
    await connectDB();
    const exam = await Exam.findById(examId).select("_id").lean();
    if (!exam) return errorResponse("Exam not found", 404);
    const deleted = await ExamResultPage.findOneAndDelete({ examId: exam._id, year });
    const deletedLegacy =
      !deleted && year === currentYear
        ? await ExamResultPage.findOneAndDelete({ examId: exam._id, year: null })
        : null;
    if (!deleted && !deletedLegacy) {
      return errorResponse("No result page for this year.", 404);
    }
    return successResponse({ deleted: true, year }, "Year deleted");
  } catch (error) {
    return handleApiError(error, "Failed to delete year");
  }
}
