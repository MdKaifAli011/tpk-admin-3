import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DownloadFile from "@/models/DownloadFile";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAction } from "@/middleware/authMiddleware";

// PUT: Toggle file status
export async function PUT(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid file ID", 400);
    }

    const file = await DownloadFile.findById(id);
    if (!file) {
      return errorResponse("Download file not found", 404);
    }

    // Toggle status
    file.status = file.status === "active" ? "inactive" : "active";
    await file.save();

    // Populate folder reference
    await file.populate("folderId", "name slug");

    return successResponse(
      file,
      `File status updated to ${file.status}`
    );
  } catch (error) {
    return handleApiError(error, "Failed to update file status");
  }
}

