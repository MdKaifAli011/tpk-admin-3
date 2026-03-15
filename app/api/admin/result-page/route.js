import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import ExamResultPage from "@/models/ExamResultPage";
import { successResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { STATUS } from "@/constants";

/**
 * GET - Admin: list active exams with result page info (examId, name, slug, hasResultPage).
 */
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }
    await connectDB();
    const exams = await Exam.find({ status: STATUS.ACTIVE })
      .sort({ orderNumber: 1 })
      .select("_id name slug")
      .lean();
    const resultPageExamIds = await ExamResultPage.distinct("examId");
    const resultPageSet = new Set(resultPageExamIds.map((id) => String(id)));
    const list = exams.map((e) => ({
      _id: String(e._id),
      name: e.name,
      slug: e.slug || e.name?.toLowerCase().replace(/\s+/g, "-"),
      hasResultPage: resultPageSet.has(String(e._id)),
    }));
    return successResponse(list, "OK");
  } catch (error) {
    return handleApiError(error, "Failed to list exams for result page");
  }
}
