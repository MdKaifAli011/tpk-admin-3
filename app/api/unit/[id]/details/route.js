import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UnitDetails from "@/models/UnitDetails";
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

// ---------- GET UNIT DETAILS ----------
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid unit ID", 400);
    }

    // Check if unit exists
    const unit = await Unit.findById(id);
    if (!unit) {
      return notFoundResponse(ERROR_MESSAGES.UNIT_NOT_FOUND);
    }

    // Find or create details
    let details = await UnitDetails.findOne({ unitId: id }).lean();
    
    // If no details exist, return empty defaults
    if (!details) {
      details = {
        unitId: id,
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

// ---------- CREATE OR UPDATE UNIT DETAILS ----------
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid unit ID", 400);
    }

    // Check if unit exists
    const unit = await Unit.findById(id);
    if (!unit) {
      return notFoundResponse(ERROR_MESSAGES.UNIT_NOT_FOUND);
    }

    const { content, title, metaDescription, keywords, status } = body;

    // Prepare update data
    const updateData = {
      unitId: id,
      content: content || "",
      title: title || "",
      metaDescription: metaDescription || "",
      keywords: keywords || "",
      status: status || "draft",
    };

    // Use upsert to create or update
    const details = await UnitDetails.findOneAndUpdate(
      { unitId: id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    const [subject, exam] = await Promise.all([
      Subject.findById(unit.subjectId).select("name").lean(),
      Exam.findById(unit.examId).select("name").lean(),
    ]);
    const hierarchy = {
      examId: unit.examId,
      examName: exam?.name ?? "",
      subjectId: unit.subjectId,
      subjectName: subject?.name ?? "",
      unitId: id,
      unitName: unit.name ?? "",
    };
    await syncContentVideosForDetails("unit", id, updateData.content || "", hierarchy).catch(() => {});

    return successResponse(details, "Unit details saved successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- DELETE UNIT DETAILS ----------
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid unit ID", 400);
    }

    const deleted = await UnitDetails.findOneAndDelete({ unitId: id });
    
    if (!deleted) {
      return notFoundResponse("Unit details not found");
    }

    return successResponse(deleted, "Unit details deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

