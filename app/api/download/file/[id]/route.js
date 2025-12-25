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

// GET: Fetch single download file by ID
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid file ID", 400);
    }

    const file = await DownloadFile.findById(id)
      .populate("folderId", "name slug")
      .lean();

    if (!file) {
      return errorResponse("Download file not found", 404);
    }

    return successResponse(file);
  } catch (error) {
    return handleApiError(error, "Failed to fetch download file");
  }
}

// PUT: Update download file
export async function PUT(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid file ID", 400);
    }

    const file = await DownloadFile.findById(id);
    if (!file) {
      return errorResponse("Download file not found", 404);
    }

    // Update fields
    if (body.name !== undefined) {
      file.name = body.name.trim();
    }
    if (body.folderId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(body.folderId)) {
        return errorResponse("Invalid folder ID", 400);
      }
      // Check if folder exists
      const DownloadFolder = (await import("@/models/DownloadFolder")).default;
      const folder = await DownloadFolder.findById(body.folderId);
      if (!folder) {
        return errorResponse("Folder not found", 404);
      }
      file.folderId = body.folderId;
    }
    if (body.fileType !== undefined) {
      if (!["url", "upload"].includes(body.fileType)) {
        return errorResponse("File type must be 'url' or 'upload'", 400);
      }
      file.fileType = body.fileType;
      
      // Clear the opposite field when switching types
      if (body.fileType === "url") {
        file.uploadedFile = undefined;
        if (body.fileUrl !== undefined) {
          file.fileUrl = body.fileUrl.trim();
        }
      } else {
        file.fileUrl = undefined;
        if (body.uploadedFile !== undefined) {
          file.uploadedFile = body.uploadedFile.trim();
        }
      }
    } else {
      // Update fileUrl or uploadedFile based on current fileType
      if (body.fileUrl !== undefined && file.fileType === "url") {
        file.fileUrl = body.fileUrl.trim();
      }
      if (body.uploadedFile !== undefined && file.fileType === "upload") {
        file.uploadedFile = body.uploadedFile.trim();
      }
    }
    if (body.fileSize !== undefined) {
      file.fileSize = body.fileSize;
    }
    if (body.mimeType !== undefined) {
      file.mimeType = body.mimeType;
    }
    if (body.description !== undefined) {
      file.description = body.description || "";
    }
    if (body.orderNumber !== undefined) {
      file.orderNumber = body.orderNumber;
    }
    if (body.status !== undefined) {
      file.status = body.status;
    }

    await file.save();

    // Populate folder reference
    await file.populate("folderId", "name slug");

    return successResponse(file, "Download file updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update download file");
  }
}

// DELETE: Delete download file
export async function DELETE(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid file ID", 400);
    }

    const file = await DownloadFile.findByIdAndDelete(id);

    if (!file) {
      return errorResponse("Download file not found", 404);
    }

    return successResponse(null, "Download file deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete download file");
  }
}

