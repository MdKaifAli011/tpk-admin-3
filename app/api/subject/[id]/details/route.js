import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SubjectDetails from "@/models/SubjectDetails";
import Subject from "@/models/Subject";
import Exam from "@/models/Exam";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES } from "@/constants";
import { syncContentVideosForDetails } from "@/lib/syncContentVideos";

// ---------- GET SUBJECT DETAILS ----------
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subject ID", 400);
    }

    // Check if subject exists
    const subject = await Subject.findById(id);
    if (!subject) {
      return notFoundResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND);
    }

    // Find or create details
    let details = await SubjectDetails.findOne({ subjectId: id }).lean();
    
    // If no details exist, return empty defaults
    if (!details) {
      details = {
        subjectId: id,
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

// ---------- CREATE OR UPDATE SUBJECT DETAILS ----------
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subject ID", 400);
    }

    // Check if subject exists
    const subject = await Subject.findById(id);
    if (!subject) {
      return notFoundResponse(ERROR_MESSAGES.SUBJECT_NOT_FOUND);
    }

    const { content, title, metaDescription, keywords, status } = body;

    // Prepare update data
    const updateData = {
      subjectId: id,
      content: content || "",
      title: title || "",
      metaDescription: metaDescription || "",
      keywords: keywords || "",
      status: status || "draft",
    };

    // Use upsert to create or update
    const details = await SubjectDetails.findOneAndUpdate(
      { subjectId: id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    const exam = await Exam.findById(subject.examId).select("name").lean();
    const hierarchy = {
      examId: subject.examId,
      examName: exam?.name ?? "",
      subjectId: id,
      subjectName: subject.name ?? "",
    };
    await syncContentVideosForDetails("subject", id, updateData.content || "", hierarchy).catch(() => {});

    return successResponse(details, "Subject details saved successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- DELETE SUBJECT DETAILS ----------
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid subject ID", 400);
    }

    const deleted = await SubjectDetails.findOneAndDelete({ subjectId: id });
    
    if (!deleted) {
      return notFoundResponse("Subject details not found");
    }

    return successResponse(deleted, "Subject details deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

