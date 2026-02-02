import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ExamDetails from "@/models/ExamDetails";
import Exam from "@/models/Exam";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import { syncContentVideosForDetails } from "@/lib/syncContentVideos";

// ---------- GET EXAM DETAILS ----------
export async function GET(request, { params }) {
  try {
    // Check authentication (all authenticated users can view)
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam ID", 400);
    }

    // Check if exam exists
    const exam = await Exam.findById(id);
    if (!exam) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    // Find or create details
    let details = await ExamDetails.findOne({ examId: id }).lean();
    
    // If no details exist, return empty defaults
    if (!details) {
      details = {
        examId: id,
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
        status: "draft",
      };
    }

    return successResponse(details);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- CREATE OR UPDATE EXAM DETAILS ----------
export async function PUT(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam ID", 400);
    }

    // Check if exam exists
    const exam = await Exam.findById(id);
    if (!exam) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    const { content, title, metaDescription, keywords, status } = body;

    // Prepare update data
    const updateData = {
      examId: id,
      content: content || "",
      title: title || "",
      metaDescription: metaDescription || "",
      keywords: keywords || "",
      status: status || "draft",
    };

    // Use upsert to create or update
    const details = await ExamDetails.findOneAndUpdate(
      { examId: id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    const hierarchy = { examId: id, examName: exam.name || "" };
    await syncContentVideosForDetails("exam", id, updateData.content || "", hierarchy).catch(() => {});

    return successResponse(details, "Exam details saved successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- DELETE EXAM DETAILS ----------
export async function DELETE(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam ID", 400);
    }

    const deleted = await ExamDetails.findOneAndDelete({ examId: id });
    
    if (!deleted) {
      return notFoundResponse("Exam details not found");
    }

    return successResponse(deleted, "Exam details deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

