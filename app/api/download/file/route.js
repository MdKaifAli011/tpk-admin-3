import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DownloadFile from "@/models/DownloadFile";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { STATUS, ERROR_MESSAGES } from "@/constants";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";

// GET: Fetch all download files with optional filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || "all";
    const statusFilter = statusFilterParam.toLowerCase();

    // Allow public access for active files only (main app download pages)
    // Require auth for inactive/all (admin)
    if (statusFilter !== STATUS.ACTIVE) {
      const authCheck = await requireAuth(request);
      if (authCheck.error) {
        return NextResponse.json(authCheck, { status: authCheck.status || 401 });
      }
    }

    await connectDB();

    // Parse pagination (page + limit). Support optional skip for load-more (skip overrides page-based skip).
    const { page, limit, skip: skipFromPage } = parsePagination(searchParams);
    const skipParam = searchParams.get("skip");
    const skip =
      skipParam !== null &&
      skipParam !== "" &&
      !Number.isNaN(parseInt(skipParam, 10))
        ? Math.max(0, parseInt(skipParam, 10))
        : skipFromPage;

    // Get filters
    const folderId = searchParams.get("folderId");
    const fileType = searchParams.get("fileType");

    // Build query
    const query = {};

    // Filter by folder
    if (folderId && mongoose.Types.ObjectId.isValid(folderId)) {
      query.folderId = folderId;
    }

    // Filter by file type
    if (fileType && (fileType === "url" || fileType === "upload")) {
      query.fileType = fileType;
    }

    // Filter by status
    if (statusFilter !== "all") {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }

    // Fetch files with pagination
    const files = await DownloadFile.find(query)
      .populate("folderId", "name slug")
      .sort({ orderNumber: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await DownloadFile.countDocuments(query);
    const effectivePage = skip > 0 ? Math.floor(skip / limit) + 1 : page;

    return NextResponse.json(
      createPaginationResponse(files, total, effectivePage, limit)
    );
  } catch (error) {
    return handleApiError(error, "Failed to fetch download files");
  }
}

// POST: Create new download file
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
      return errorResponse("File name is required", 400);
    }

    if (!body.folderId || !mongoose.Types.ObjectId.isValid(body.folderId)) {
      return errorResponse("Valid folder ID is required", 400);
    }

    if (!body.fileType || !["url", "upload"].includes(body.fileType)) {
      return errorResponse("File type must be 'url' or 'upload'", 400);
    }

    // Check if folder exists
    const DownloadFolder = (await import("@/models/DownloadFolder")).default;
    const folder = await DownloadFolder.findById(body.folderId);
    if (!folder) {
      return errorResponse("Folder not found", 404);
    }

    // Duplicate name not allowed in same folder
    const nameForCheck = (body.name || "").trim();
    const escapedName = nameForCheck.replace(new RegExp("[.*+?^\\${}()|[\\]\\\\]", "g"), "\\$&");
    const existingByName = await DownloadFile.findOne({
      folderId: body.folderId,
      name: { $regex: new RegExp("^" + escapedName + "$", "i") },
    });
    if (existingByName) {
      return errorResponse("A file with this name already exists in this subfolder. Use a different name.", 400);
    }

    // Auto-generate orderNumber if not provided
    let orderNumber = body.orderNumber;
    if (!orderNumber || orderNumber < 1) {
      const maxOrderFile = await DownloadFile.findOne({ folderId: body.folderId })
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      orderNumber = maxOrderFile?.orderNumber ? maxOrderFile.orderNumber + 1 : 1;
    }

    // Create new file
    const newFile = await DownloadFile.create({
      name: body.name.trim(),
      folderId: body.folderId,
      fileType: body.fileType,
      fileUrl: body.fileType === "url" ? body.fileUrl.trim() : undefined,
      uploadedFile: body.fileType === "upload" ? body.uploadedFile.trim() : undefined,
      fileSize: body.fileSize || undefined,
      mimeType: body.mimeType || undefined,
      description: body.description || "",
      orderNumber: orderNumber,
      status: body.status || STATUS.ACTIVE,
    });

    // Populate folder reference
    await newFile.populate("folderId", "name slug");

    return successResponse(newFile, "Download file created successfully", 201);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.SAVE_FAILED);
  }
}

