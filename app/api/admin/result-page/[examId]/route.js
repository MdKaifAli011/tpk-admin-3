import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import ExamResultPage from "@/models/ExamResultPage";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

const currentYear = new Date().getFullYear();
const defaultSessions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

/**
 * GET - Admin: get result page content for an exam. Creates default doc if not exists.
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
    let doc = await ExamResultPage.findOne({ examId: exam._id }).lean();
    if (!doc) {
      const created = await ExamResultPage.create({
        examId: exam._id,
        sessions: defaultSessions,
        toppers: [],
        targetAchievers: [],
        highlights: [],
        studentTestimonials: [],
        parentTestimonials: [],
      });
      doc = created.toObject();
    }
    const data = {
      examId: String(doc.examId),
      bannerImage: doc.bannerImage ?? "",
      bannerTitle: doc.bannerTitle ?? "",
      bannerSubtitle: doc.bannerSubtitle ?? "",
      sessions: Array.isArray(doc.sessions) && doc.sessions.length ? doc.sessions : defaultSessions,
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
 * PATCH - Admin: update result page content for an exam.
 */
export async function PATCH(request, { params }) {
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
    const update = {};
    if (typeof body.bannerImage === "string") update.bannerImage = body.bannerImage.trim();
    if (typeof body.bannerTitle === "string") update.bannerTitle = body.bannerTitle.trim();
    if (typeof body.bannerSubtitle === "string") update.bannerSubtitle = body.bannerSubtitle.trim();
    if (Array.isArray(body.sessions)) update.sessions = body.sessions.filter((n) => typeof n === "number");
    if (Array.isArray(body.toppers)) {
      update.toppers = body.toppers.map((t) => ({
        name: String(t?.name ?? "").trim(),
        percentile: String(t?.percentile ?? "").trim(),
        location: String(t?.location ?? "").trim(),
        attempt: String(t?.attempt ?? "").trim(),
        image: String(t?.image ?? "").trim(),
        year: typeof t?.year === "number" ? t.year : null,
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
    const doc = await ExamResultPage.findOneAndUpdate(
      { examId: exam._id },
      { $set: update },
      { new: true, upsert: true }
    ).lean();
    return successResponse(
      {
        examId: String(doc.examId),
        bannerImage: doc.bannerImage ?? "",
        bannerTitle: doc.bannerTitle ?? "",
        bannerSubtitle: doc.bannerSubtitle ?? "",
        sessions: doc.sessions ?? [],
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
