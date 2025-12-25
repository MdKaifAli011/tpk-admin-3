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

// GET: Fetch single download folder by ID
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid folder ID", 400);
    }

    const folder = await DownloadFolder.findById(id)
      .populate("parentFolderId", "name slug")
      .populate("examId", "name slug")
      .lean();

    if (!folder) {
      return errorResponse("Download folder not found", 404);
    }

    return successResponse(folder);
  } catch (error) {
    return handleApiError(error, "Failed to fetch download folder");
  }
}

// PUT: Update download folder
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
      return errorResponse("Invalid folder ID", 400);
    }

    const folder = await DownloadFolder.findById(id);
    if (!folder) {
      return errorResponse("Download folder not found", 404);
    }

    // Validate parentFolderId if provided and changed
    if (body.parentFolderId !== undefined) {
      if (body.parentFolderId === null || body.parentFolderId === "null") {
        folder.parentFolderId = null;
      } else if (mongoose.Types.ObjectId.isValid(body.parentFolderId)) {
        // Prevent circular reference (folder cannot be its own parent)
        if (body.parentFolderId === id) {
          return errorResponse("Folder cannot be its own parent", 400);
        }
        // Check if parent folder exists
        const parentFolder = await DownloadFolder.findById(body.parentFolderId);
        if (!parentFolder) {
          return errorResponse("Parent folder not found", 404);
        }
        folder.parentFolderId = body.parentFolderId;
      } else {
        return errorResponse("Invalid parent folder ID", 400);
      }
    }

    // Update fields
    if (body.name !== undefined) {
      folder.name = body.name.trim();
    }
    if (body.examId !== undefined) {
      folder.examId = body.examId || null;
    }
    if (body.status !== undefined) {
      folder.status = body.status;
    }
    if (body.orderNumber !== undefined) {
      folder.orderNumber = body.orderNumber;
    }
    if (body.description !== undefined) {
      folder.description = body.description || "";
    }

    await folder.save();

    // Populate references
    await folder.populate("parentFolderId", "name slug");
    await folder.populate("examId", "name slug");

    return successResponse(folder, "Download folder updated successfully");
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse("A folder with this name already exists in this location", 409);
    }
    return handleApiError(error, "Failed to update download folder");
  }
}

// DELETE: Delete download folder (cascading delete handled by model)
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
      return errorResponse("Invalid folder ID", 400);
    }

    const folder = await DownloadFolder.findByIdAndDelete(id);

    if (!folder) {
      return errorResponse("Download folder not found", 404);
    }

    return successResponse(null, "Download folder deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete download folder");
  }
}

