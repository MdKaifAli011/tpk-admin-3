import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ExamResultPage from "@/models/ExamResultPage";
import Exam from "@/models/Exam";
import { createSlug } from "@/utils/slug";
import { regexExactInsensitive } from "@/utils/escapeRegex.js";

const currentYear = new Date().getFullYear();

/**
 * GET - Public: get result page content for an exam + year.
 */
export async function GET(request, { params }) {
  try {
    const { examSlug, year: yearParam } = await params;
    if (!examSlug || yearParam == null) {
      return NextResponse.json(
        { success: false, message: "Exam slug and year required" },
        { status: 400 }
      );
    }
    const year = parseInt(yearParam, 10);
    if (Number.isNaN(year)) {
      return NextResponse.json(
        { success: false, message: "Invalid year" },
        { status: 400 }
      );
    }
    await connectDB();
    const slugLower = examSlug.toLowerCase();
    const exam = await Exam.findOne({
      $or: [
        { slug: slugLower },
        { name: { $regex: regexExactInsensitive(examSlug) } },
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
    const statusFilter = { $or: [{ status: "active" }, { status: { $exists: false } }] };
    let doc = await ExamResultPage.findOne({ examId: exam._id, year, ...statusFilter }).lean().exec();
    if (!doc && year === currentYear) {
      doc = await ExamResultPage.findOne({ examId: exam._id, year: null, ...statusFilter }).lean().exec();
    }
    const examName = exam.name || examSlug;
    const examSlugForLinks = exam.slug || createSlug(examName);
    const allYears = await ExamResultPage.find({ examId: exam._id })
      .distinct("year")
      .then((arr) => arr.filter((y) => y != null));
    const hasLegacy = await ExamResultPage.exists({ examId: exam._id, year: null });
    const years = [...new Set([...(hasLegacy ? [currentYear] : []), ...allYears])].sort((a, b) => b - a);
    const payload = {
      examId: String(exam._id),
      examName,
      examSlug: examSlugForLinks,
      year,
      years,
      bannerImage: doc?.bannerImage ?? "",
      bannerImageLeft: doc?.bannerImageLeft ?? "",
      bannerImageRight: doc?.bannerImageRight ?? "",
      bannerTitle: doc?.bannerTitle ?? "",
      bannerSubtitle:
        doc?.bannerSubtitle ?? "Celebrate our toppers and connect with target achievers. Your success story could be next.",
      toppers: doc?.toppers ?? [],
      targetAchievers: doc?.targetAchievers ?? [],
      highlights: doc?.highlights ?? [],
      studentTestimonials: doc?.studentTestimonials ?? [],
      parentTestimonials: doc?.parentTestimonials ?? [],
    };
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("GET result-page year error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load result page" },
      { status: 500 }
    );
  }
}
