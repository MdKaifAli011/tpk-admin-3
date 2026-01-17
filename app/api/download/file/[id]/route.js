import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DownloadFile from "@/models/DownloadFile";
import DownloadFolder from "@/models/DownloadFolder";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";

// GET: Fetch single download file by ID
export async function GET(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    
    // 🔥 FIXED: Await params
    const { id } = await params;

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
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    
    // 🔥 FIXED: Await params (line 46 issue)
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid file ID", 400);
    }

    const file = await DownloadFile.findById(id);
    if (!file) {
      return errorResponse("Download file not found", 404);
    }

    // Update name
    if (body.name !== undefined) {
      const trimmedName = body.name?.trim();
      if (!trimmedName) {
        return errorResponse("File name cannot be empty", 400);
      }
      file.name = trimmedName;
    }

    // Update folderId
    if (body.folderId !== undefined) {
      if (body.folderId === null || body.folderId === "null") {
        file.folderId = null;
      } else if (mongoose.Types.ObjectId.isValid(body.folderId)) {
        const folder = await DownloadFolder.findById(body.folderId);
        if (!folder) {
          return errorResponse("Folder not found", 404);
        }
        file.folderId = new mongoose.Types.ObjectId(body.folderId);
      } else {
        return errorResponse("Invalid folder ID", 400);
      }
    }

    // Update fileType and related fields
    if (body.fileType !== undefined) {
      if (!["url", "upload"].includes(body.fileType)) {
        return errorResponse("File type must be 'url' or 'upload'", 400);
      }
      file.fileType = body.fileType;
      
      // Clear opposite field when switching types
      if (body.fileType === "url") {
        file.uploadedFile = undefined;
        if (body.fileUrl !== undefined) {
          file.fileUrl = body.fileUrl?.trim();
        }
      } else {
        file.fileUrl = undefined;
        if (body.uploadedFile !== undefined) {
          file.uploadedFile = body.uploadedFile?.trim();
        }
      }
    } else {
      // Update fileUrl or uploadedFile based on current fileType
      if (body.fileUrl !== undefined && file.fileType === "url") {
        file.fileUrl = body.fileUrl?.trim();
      }
      if (body.uploadedFile !== undefined && file.fileType === "upload") {
        file.uploadedFile = body.uploadedFile?.trim();
      }
    }

    // Update other fields
    if (body.fileSize !== undefined) {
      file.fileSize = body.fileSize;
    }
    if (body.mimeType !== undefined) {
      file.mimeType = body.mimeType;
    }
    if (body.description !== undefined) {
      file.description = body.description?.trim() || "";
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

// DELETE: Soft delete download file
export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    
    // 🔥 FIXED: Await params
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid file ID", 400);
    }

    // Soft delete instead of hard delete
    const file = await DownloadFile.findByIdAndUpdate(
      id,
      { 
        status: "deleted",
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!file) {
      return errorResponse("Download file not found", 404);
    }

    return successResponse(file, "Download file deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete download file");
  }
}
