import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ExamResultPage from "@/models/ExamResultPage";
import Exam from "@/models/Exam";
import { createSlug } from "@/utils/slug";

/**
 * GET - Public: get result page content for an exam by slug.
 * Returns banner, sessions, toppers, targetAchievers, highlights, studentTestimonials, parentTestimonials.
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
    const doc = await ExamResultPage.findOne({ examId: exam._id }).lean().exec();
    const examName = exam.name || examSlug;
    const examSlugForLinks = exam.slug || createSlug(examName);
    const currentYear = new Date().getFullYear();
    const sessions = doc?.sessions?.length
      ? doc.sessions
      : [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
    const payload = {
      examId: String(exam._id),
      examName,
      examSlug: examSlugForLinks,
      bannerImage: doc?.bannerImage ?? "",
      bannerTitle: doc?.bannerTitle ?? "",
      bannerSubtitle:
        doc?.bannerSubtitle ?? "Celebrate our toppers and connect with target achievers. Your success story could be next.",
      sessions: [...sessions].sort((a, b) => b - a),
      toppers: doc?.toppers ?? [],
      targetAchievers: doc?.targetAchievers ?? [],
      highlights: doc?.highlights ?? [],
      studentTestimonials: doc?.studentTestimonials ?? [],
      parentTestimonials: doc?.parentTestimonials ?? [],
    };
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("GET result-page error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load result page" },
      { status: 500 }
    );
  }
}
