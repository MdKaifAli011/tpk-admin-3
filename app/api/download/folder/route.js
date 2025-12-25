import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DownloadFolder from "@/models/DownloadFolder";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";

// GET: Fetch all download folders with optional filters
export async function GET(request) {
  try {
    // Check authentication
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);

    // Parse pagination
    const { page, limit, skip } = parsePagination(searchParams);

    // Get filters
    const parentFolderId = searchParams.get("parentFolderId");
    const examId = searchParams.get("examId");
    const statusFilterParam = searchParams.get("status") || "all";
    const statusFilter = statusFilterParam.toLowerCase();

    // Build query
    const query = {};
    
    // Filter by parent folder (null for root folders)
    if (parentFolderId === "null" || parentFolderId === null) {
      query.parentFolderId = null;
    } else if (parentFolderId && mongoose.Types.ObjectId.isValid(parentFolderId)) {
      query.parentFolderId = parentFolderId;
    }

    // Filter by exam
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      query.examId = examId;
    }

    // Filter by status
    if (statusFilter !== "all") {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }

    // Fetch folders with pagination
    const folders = await DownloadFolder.find(query)
      .populate("parentFolderId", "name slug")
      .populate("examId", "name slug")
      .sort({ orderNumber: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await DownloadFolder.countDocuments(query);

    return NextResponse.json(
      createPaginationResponse(folders, total, page, limit)
    );
  } catch (error) {
    return handleApiError(error, "Failed to fetch download folders");
  }
}

// POST: Create new download folder
export async function POST(request) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim() === "") {
      return errorResponse("Folder name is required", 400);
    }

    // Validate parentFolderId if provided
    if (body.parentFolderId) {
      if (!mongoose.Types.ObjectId.isValid(body.parentFolderId)) {
        return errorResponse("Invalid parent folder ID", 400);
      }
      // Check if parent folder exists
      const parentFolder = await DownloadFolder.findById(body.parentFolderId);
      if (!parentFolder) {
        return errorResponse("Parent folder not found", 404);
      }
    }

    // Validate examId if provided
    if (body.examId) {
      if (!mongoose.Types.ObjectId.isValid(body.examId)) {
        return errorResponse("Invalid exam ID", 400);
      }
    }

    // Auto-generate orderNumber if not provided
    let orderNumber = body.orderNumber;
    if (!orderNumber || orderNumber < 1) {
      const query = { parentFolderId: body.parentFolderId || null };
      const maxOrderFolder = await DownloadFolder.findOne(query)
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      orderNumber = maxOrderFolder?.orderNumber ? maxOrderFolder.orderNumber + 1 : 1;
    }

    // Create new folder
    const newFolder = await DownloadFolder.create({
      name: body.name.trim(),
      parentFolderId: body.parentFolderId || null,
      examId: body.examId || null,
      status: body.status || STATUS.ACTIVE,
      orderNumber: orderNumber,
      description: body.description || "",
    });

    // Populate references
    await newFolder.populate("parentFolderId", "name slug");
    await newFolder.populate("examId", "name slug");

    return successResponse(newFolder, "Download folder created successfully", 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse("A folder with this name already exists in this location", 409);
    }
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

