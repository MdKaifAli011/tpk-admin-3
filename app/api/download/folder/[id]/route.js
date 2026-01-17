import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DownloadFolder from "@/models/DownloadFolder";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";

// GET: Fetch single download folder by ID
export async function GET(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    
    // 🔥 FIX: Await params before destructuring
    const { id } = await params;

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
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    
    // 🔥 FIX: Await params before destructuring
    const { id } = await params;
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
        // Prevent circular reference
        if (body.parentFolderId === id) {
          return errorResponse("Folder cannot be its own parent", 400);
        }
        // Check if parent folder exists
        const parentFolder = await DownloadFolder.findById(body.parentFolderId);
        if (!parentFolder) {
          return errorResponse("Parent folder not found", 404);
        }
        folder.parentFolderId = new mongoose.Types.ObjectId(body.parentFolderId);
      } else {
        return errorResponse("Invalid parent folder ID", 400);
      }
    }

    // Update other fields safely
    if (body.name !== undefined) {
      const trimmedName = body.name?.trim();
      if (trimmedName) {
        // Check for duplicate name in same parent location
        const duplicate = await DownloadFolder.findOne({
          name: trimmedName,
          parentFolderId: folder.parentFolderId,
          _id: { $ne: id }
        });
        if (duplicate) {
          return errorResponse("A folder with this name already exists in this location", 409);
        }
        folder.name = trimmedName;
      }
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
      folder.description = body.description?.trim() || "";
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

// DELETE: Soft delete download folder
export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    
    // 🔥 FIX: Await params before destructuring
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid folder ID", 400);
    }

    // Use soft delete instead of hard delete for better data integrity
    const folder = await DownloadFolder.findByIdAndUpdate(
      id,
      { 
        status: "deleted", 
        deletedAt: new Date() 
      },
      { new: true }
    );

    if (!folder) {
      return errorResponse("Download folder not found", 404);
    }

    return successResponse(folder, "Download folder deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete download folder");
  }
}
