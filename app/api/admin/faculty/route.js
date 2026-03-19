import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import mongoose from "mongoose";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return successResponse([]);
    }

    await connectDB();
    const list = await Faculty.find({ examId: new mongoose.Types.ObjectId(examId) })
      .sort({ orderNumber: 1, name: 1 })
      .lean();

    return successResponse(list);
  } catch (error) {
    return handleApiError(error, "Failed to fetch faculties");
  }
}

export async function POST(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const body = await request.json();
    const examId = body.examId;
    const name = body.name != null ? String(body.name).trim() : "";
    const imageUrl = body.imageUrl != null ? String(body.imageUrl).trim() : "";
    const orderNumber = body.orderNumber != null ? Number(body.orderNumber) : 0;

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return errorResponse("Valid examId is required", 400);
    }
    if (!name) {
      return errorResponse("Faculty name is required", 400);
    }

    await connectDB();
    const faculty = await Faculty.create({
      examId: new mongoose.Types.ObjectId(examId),
      name,
      imageUrl,
      orderNumber,
    });

    return successResponse(faculty, "Faculty added", 201);
  } catch (error) {
    return handleApiError(error, "Failed to create faculty");
  }
}
