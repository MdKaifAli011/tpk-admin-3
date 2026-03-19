import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import mongoose from "mongoose";
import { successResponse, handleApiError } from "@/utils/apiResponse";

/** Public: list faculties for an exam (by examId). Used by course listing and admin form. */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return successResponse([]);
    }

    await connectDB();
    const list = await Faculty.find({ examId: new mongoose.Types.ObjectId(examId) })
      .sort({ orderNumber: 1, name: 1 })
      .select("name imageUrl orderNumber")
      .lean();

    return successResponse(list);
  } catch (error) {
    return handleApiError(error, "Failed to fetch faculties");
  }
}
