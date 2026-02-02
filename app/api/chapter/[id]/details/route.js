import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChapterDetails from "@/models/ChapterDetails";
import Chapter from "@/models/Chapter";
import Unit from "@/models/Unit";
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

// ---------- GET CHAPTER DETAILS ----------
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid chapter ID", 400);
    }

    // Check if chapter exists
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return notFoundResponse(ERROR_MESSAGES.CHAPTER_NOT_FOUND);
    }

    // Find or create details
    let details = await ChapterDetails.findOne({ chapterId: id }).lean();
    
    // If no details exist, return empty defaults
    if (!details) {
      details = {
        chapterId: id,
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

// ---------- CREATE OR UPDATE CHAPTER DETAILS ----------
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid chapter ID", 400);
    }

    // Check if chapter exists
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return notFoundResponse(ERROR_MESSAGES.CHAPTER_NOT_FOUND);
    }

    const { content, title, metaDescription, keywords, status } = body;

    // Prepare update data
    const updateData = {
      chapterId: id,
      content: content || "",
      title: title || "",
      metaDescription: metaDescription || "",
      keywords: keywords || "",
      status: status || "draft",
    };

    // Use upsert to create or update
    const details = await ChapterDetails.findOneAndUpdate(
      { chapterId: id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    const [unit, subject, exam] = await Promise.all([
      Unit.findById(chapter.unitId).select("name").lean(),
      Subject.findById(chapter.subjectId).select("name").lean(),
      Exam.findById(chapter.examId).select("name").lean(),
    ]);
    const hierarchy = {
      examId: chapter.examId,
      examName: exam?.name ?? "",
      subjectId: chapter.subjectId,
      subjectName: subject?.name ?? "",
      unitId: chapter.unitId,
      unitName: unit?.name ?? "",
      chapterId: id,
      chapterName: chapter.name ?? "",
    };
    await syncContentVideosForDetails("chapter", id, updateData.content || "", hierarchy).catch(() => {});

    return successResponse(details, "Chapter details saved successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- DELETE CHAPTER DETAILS ----------
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid chapter ID", 400);
    }

    const deleted = await ChapterDetails.findOneAndDelete({ chapterId: id });
    
    if (!deleted) {
      return notFoundResponse("Chapter details not found");
    }

    return successResponse(deleted, "Chapter details deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

