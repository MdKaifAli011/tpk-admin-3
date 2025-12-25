import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DownloadFolder from "@/models/DownloadFolder";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAction } from "@/middleware/authMiddleware";

// PUT: Toggle folder status
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
      return errorResponse("Invalid folder ID", 400);
    }

    const folder = await DownloadFolder.findById(id);
    if (!folder) {
      return errorResponse("Download folder not found", 404);
    }

    // Toggle status
    folder.status = folder.status === "active" ? "inactive" : "active";
    await folder.save();

    // Populate references
    await folder.populate("parentFolderId", "name slug");
    await folder.populate("examId", "name slug");

    return successResponse(
      folder,
      `Folder status updated to ${folder.status}`
    );
  } catch (error) {
    return handleApiError(error, "Failed to update folder status");
  }
}

