/**
 * Server-only: fetch ExamInfo by examId directly from DB.
 * Use in server components (e.g. exam page) so dashboard gets exam date without relying on API.
 * If no document exists, returns a default so the dashboard still shows prep days (user can set real date in admin).
 */
import connectDB from "@/lib/mongodb";
import ExamInfo from "@/models/ExamInfo";
import mongoose from "mongoose";

function defaultExamInfo(examId) {
  const id = typeof examId === "string" ? examId : (examId?.toString?.() ?? String(examId));
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  oneYearFromNow.setMonth(4, 5); // May 5
  oneYearFromNow.setHours(0, 0, 0, 0);
  return {
    _id: null,
    examId: id,
    examDate: oneYearFromNow.toISOString(),
    maximumMarks: 720,
    status: "active",
  };
}

export async function getExamInfoByExamId(examId) {
  if (!examId) return null;
  const id = typeof examId === "string" ? examId : (examId?.toString?.() ?? String(examId));
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  try {
    await connectDB();
    const doc = await ExamInfo.findOne({ examId: new mongoose.Types.ObjectId(id) })
      .populate("examId", "name slug")
      .populate("subjects.subjectId", "name")
      .lean();
    if (doc) {
      return doc;
    }
    return defaultExamInfo(examId);
  } catch (err) {
    return defaultExamInfo(examId);
  }
}
