import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import ExamResultPage from "@/models/ExamResultPage";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

const currentYear = new Date().getFullYear();

/**
 * GET - Admin: get result page content for an exam + year. Query: ?year=2025
 */
export async function GET(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }
    const { examId } = await params;
    if (!examId) return errorResponse("Exam ID required", 400);
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;
    if (year == null || Number.isNaN(year)) {
      return errorResponse("Query parameter year is required (e.g. ?year=2025)", 400);
    }
    await connectDB();
    const exam = await Exam.findById(examId).select("_id name slug").lean();
    if (!exam) return errorResponse("Exam not found", 404);
    let doc = await ExamResultPage.findOne({ examId: exam._id, year }).lean();
    if (!doc && year === currentYear) {
      doc = await ExamResultPage.findOne({ examId: exam._id, year: null }).lean();
    }
    if (!doc) {
      return errorResponse("No result page for this year. Add the year first.", 404);
    }
    const data = {
      examId: String(doc.examId),
      year: doc.year,
      bannerImage: doc.bannerImage ?? "",
      bannerImageLeft: doc.bannerImageLeft ?? "",
      bannerImageRight: doc.bannerImageRight ?? "",
      bannerTitle: doc.bannerTitle ?? "",
      bannerSubtitle: doc.bannerSubtitle ?? "",
      toppers: doc.toppers ?? [],
      targetAchievers: doc.targetAchievers ?? [],
      highlights: doc.highlights ?? [],
      studentTestimonials: doc.studentTestimonials ?? [],
      parentTestimonials: doc.parentTestimonials ?? [],
      updatedAt: doc.updatedAt,
    };
    return successResponse(data, "OK");
  } catch (error) {
    return handleApiError(error, "Failed to fetch result page");
  }
}

/**
 * PATCH - Admin: update result page content for an exam + year. Query: ?year=2025
 */
export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }
    const { examId } = await params;
    if (!examId) return errorResponse("Exam ID required", 400);
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;
    if (year == null || Number.isNaN(year)) {
      return errorResponse("Query parameter year is required (e.g. ?year=2025)", 400);
    }
    await connectDB();
    const exam = await Exam.findById(examId).select("_id").lean();
    if (!exam) return errorResponse("Exam not found", 404);
    const body = await request.json();
    const update = {};
    if (typeof body.bannerImage === "string") update.bannerImage = body.bannerImage.trim();
    if (typeof body.bannerImageLeft === "string") update.bannerImageLeft = body.bannerImageLeft.trim();
    if (typeof body.bannerImageRight === "string")
      update.bannerImageRight = body.bannerImageRight.trim();
    if (typeof body.bannerTitle === "string") update.bannerTitle = body.bannerTitle.trim();
    if (typeof body.bannerSubtitle === "string") update.bannerSubtitle = body.bannerSubtitle.trim();
    if (Array.isArray(body.toppers)) {
      update.toppers = body.toppers.map((t) => ({
        name: String(t?.name ?? "").trim(),
        percentile: String(t?.percentile ?? "").trim(),
        location: String(t?.location ?? "").trim(),
        attempt: String(t?.attempt ?? "").trim(),
        image: String(t?.image ?? "").trim(),
      }));
    }
    if (Array.isArray(body.targetAchievers)) {
      update.targetAchievers = body.targetAchievers.map((a) => ({
        title: String(a?.title ?? "").trim(),
        description: String(a?.description ?? "").trim(),
        image: String(a?.image ?? "").trim(),
      }));
    }
    if (Array.isArray(body.highlights)) {
      update.highlights = body.highlights.map((s) => String(s ?? "").trim()).filter(Boolean);
    }
    if (Array.isArray(body.studentTestimonials)) {
      update.studentTestimonials = body.studentTestimonials.map((t) => ({
        name: String(t?.name ?? "").trim(),
        location: String(t?.location ?? "").trim(),
        text: String(t?.text ?? "").trim(),
      }));
    }
    if (Array.isArray(body.parentTestimonials)) {
      update.parentTestimonials = body.parentTestimonials.map((t) => ({
        name: String(t?.name ?? "").trim(),
        location: String(t?.location ?? "").trim(),
        text: String(t?.text ?? "").trim(),
      }));
    }
    let doc = await ExamResultPage.findOneAndUpdate(
      { examId: exam._id, year },
      { $set: update },
      { new: true }
    ).lean();
    if (!doc && year === currentYear) {
      doc = await ExamResultPage.findOneAndUpdate(
        { examId: exam._id, year: null },
        { $set: update },
        { new: true }
      ).lean();
    }
    if (!doc) return errorResponse("No result page for this year.", 404);
    return successResponse(
      {
        examId: String(doc.examId),
        year: doc.year,
        bannerImage: doc.bannerImage ?? "",
        bannerImageLeft: doc.bannerImageLeft ?? "",
        bannerImageRight: doc.bannerImageRight ?? "",
        bannerTitle: doc.bannerTitle ?? "",
        bannerSubtitle: doc.bannerSubtitle ?? "",
        toppers: doc.toppers ?? [],
        targetAchievers: doc.targetAchievers ?? [],
        highlights: doc.highlights ?? [],
        studentTestimonials: doc.studentTestimonials ?? [],
        parentTestimonials: doc.parentTestimonials ?? [],
        updatedAt: doc.updatedAt,
      },
      "Result page updated"
    );
  } catch (error) {
    return handleApiError(error, "Failed to update result page");
  }
}
