import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ExamResultPage from "@/models/ExamResultPage";
import Exam from "@/models/Exam";
import { createSlug } from "@/utils/slug";

const currentYear = new Date().getFullYear();

/**
 * GET - Public: list result years for an exam (for result index page).
 * Returns { years, examName, examSlug }.
 */
export async function GET(request, { params }) {
  try {
    const { examSlug } = await params;
    if (!examSlug) {
      return NextResponse.json(
        { success: false, message: "Exam slug required" },
        { status: 400 }
      );
    }
    await connectDB();
    const slugLower = examSlug.toLowerCase();
    const exam = await Exam.findOne({
      $or: [
        { slug: slugLower },
        { name: new RegExp(`^${examSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      ],
      status: "active",
    })
      .lean()
      .exec();
    if (!exam) {
      return NextResponse.json(
        { success: false, message: "Exam not found" },
        { status: 404 }
      );
    }
    const allYears = await ExamResultPage.find({ examId: exam._id })
      .distinct("year")
      .then((arr) => arr.filter((y) => y != null));
    const hasLegacy = await ExamResultPage.exists({ examId: exam._id, year: null });
    const years = [...new Set([...(hasLegacy ? [currentYear] : []), ...allYears])].sort((a, b) => b - a);
    const examName = exam.name || examSlug;
    const examSlugForLinks = exam.slug || createSlug(examName);
    return NextResponse.json({
      success: true,
      data: {
        examId: String(exam._id),
        examName,
        examSlug: examSlugForLinks,
        years,
      },
    });
  } catch (error) {
    console.error("GET result-page years error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load result years" },
      { status: 500 }
    );
  }
}
