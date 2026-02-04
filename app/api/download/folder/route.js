import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DownloadFolder from "@/models/DownloadFolder";
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

// GET: Fetch all download folders with optional filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || "all";
    const statusFilter = statusFilterParam.toLowerCase();

    // Allow public access for active folders only (main app download pages)
    // Require auth for inactive/all (admin)
    if (statusFilter !== STATUS.ACTIVE) {
      const authCheck = await requireAuth(request);
      if (authCheck.error) {
        return NextResponse.json(authCheck, { status: authCheck.status || 401 });
      }
    }

    await connectDB();

    // Parse pagination
    const { page, limit, skip } = parsePagination(searchParams);
    const includeCounts = searchParams.get("includeCounts") === "1";
    const onlyWithFiles = searchParams.get("onlyWithFiles") === "1";

    // Get filters
    const parentFolderId = searchParams.get("parentFolderId");
    const examId = searchParams.get("examId");

    // Build query
    const query = {};

    // Filter by parent folder (null for root folders)
    if (parentFolderId === "null" || parentFolderId === null || parentFolderId === "undefined") {
      query.parentFolderId = null;
    } else if (parentFolderId && mongoose.Types.ObjectId.isValid(parentFolderId)) {
      query.parentFolderId = new mongoose.Types.ObjectId(parentFolderId);
    }

    // Filter by exam
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      query.examId = new mongoose.Types.ObjectId(examId);
    }

    // Filter by status - Fixed regex issue
    if (statusFilter !== "all") {
      query.status = statusFilter; // Direct match instead of regex
    }

    let folders;
    let total;

    // When fetching subfolders with onlyWithFiles, get full list then filter and paginate
    if (onlyWithFiles && query.parentFolderId) {
      const allSubfolders = await DownloadFolder.find(query)
        .populate("parentFolderId", "name slug")
        .populate("examId", "name slug")
        .sort({ orderNumber: 1, createdAt: -1 })
        .limit(500)
        .lean();
      if (allSubfolders.length === 0) {
        folders = [];
        total = 0;
      } else {
        const subfolderIds = allSubfolders.map((f) => f._id);
        const idsWithFiles = await DownloadFile.distinct("folderId", {
          folderId: { $in: subfolderIds },
          status: { $regex: /^active$/i },
        });
        const idSet = new Set(idsWithFiles.map((id) => id.toString()));
        const filtered = allSubfolders.filter((f) => idSet.has(f._id.toString()));
        total = filtered.length;
        folders = filtered.slice(skip, skip + limit);
      }
    } else {
      [folders, total] = await Promise.all([
        DownloadFolder.find(query)
          .populate("parentFolderId", "name slug")
          .populate("examId", "name slug")
          .sort({ orderNumber: 1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        DownloadFolder.countDocuments(query)
      ]);
    }

    // Optionally add subfolderCount and fileCount for root folders (exam download listing)
    if (includeCounts && folders.length > 0 && query.parentFolderId === null) {
      const folderIds = folders.map((f) => f._id);

      const subfolders = await DownloadFolder.find({
        parentFolderId: { $in: folderIds },
        status: statusFilter !== "all" ? statusFilter : "active",
      })
        .select("_id parentFolderId")
        .lean();

      const allFolderIdsForFiles = [
        ...folderIds,
        ...subfolders.map((s) => s._id),
      ];

      const fileCounts =
        allFolderIdsForFiles.length > 0
          ? await DownloadFile.aggregate([
              {
                $match: {
                  folderId: { $in: allFolderIdsForFiles },
                  status: { $regex: /^active$/i },
                },
              },
              { $group: { _id: "$folderId", count: { $sum: 1 } } },
            ])
          : [];

      const rootMap = {};
      folderIds.forEach((id) => {
        rootMap[id.toString()] = id.toString();
      });
      subfolders.forEach((s) => {
        rootMap[s._id.toString()] = s.parentFolderId?.toString();
      });

      const fileCountByRoot = {};
      fileCounts.forEach((fc) => {
        const rootId = rootMap[fc._id?.toString()];
        if (rootId) {
          fileCountByRoot[rootId] = (fileCountByRoot[rootId] || 0) + fc.count;
        }
      });

      const subfolderCountByRoot = {};
      subfolders.forEach((s) => {
        const rootId = s.parentFolderId?.toString();
        if (rootId) {
          subfolderCountByRoot[rootId] = (subfolderCountByRoot[rootId] || 0) + 1;
        }
      });

      folders = folders.map((f) => ({
        ...f,
        subfolderCount: subfolderCountByRoot[f._id.toString()] || 0,
        fileCount: fileCountByRoot[f._id.toString()] || 0,
      }));
    }

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

    // Sanitize input
    const sanitizedName = body.name.trim();

    // Validate parentFolderId if provided
    let parentFolderId = null;
    if (body.parentFolderId) {
      if (!mongoose.Types.ObjectId.isValid(body.parentFolderId)) {
        return errorResponse("Invalid parent folder ID", 400);
      }
      parentFolderId = new mongoose.Types.ObjectId(body.parentFolderId);
      
      // Check if parent folder exists and is not itself (prevent circular reference)
      const parentFolder = await DownloadFolder.findById(parentFolderId);
      if (!parentFolder) {
        return errorResponse("Parent folder not found", 404);
      }
    }

    // Validate examId if provided
    let examId = null;
    if (body.examId) {
      if (!mongoose.Types.ObjectId.isValid(body.examId)) {
        return errorResponse("Invalid exam ID", 400);
      }
      examId = new mongoose.Types.ObjectId(body.examId);
    }

    // Check for duplicate folder name in same parent
    const duplicateCheck = await DownloadFolder.findOne({
      name: sanitizedName,
      parentFolderId: parentFolderId,
      status: { $ne: 'deleted' } // Exclude soft-deleted folders
    });
    
    if (duplicateCheck) {
      return errorResponse("A folder with this name already exists in this location", 409);
    }

    // Auto-generate orderNumber if not provided
    let orderNumber = body.orderNumber;
    if (!orderNumber || orderNumber < 1) {
      const query = { parentFolderId: parentFolderId };
      const maxOrderFolder = await DownloadFolder.findOne(query)
        .sort({ orderNumber: -1 })
        .select("orderNumber")
        .lean();
      orderNumber = maxOrderFolder?.orderNumber ? maxOrderFolder.orderNumber + 1 : 1;
    }

    // Create new folder
    const newFolder = await DownloadFolder.create({
      name: sanitizedName,
      parentFolderId: parentFolderId,
      examId: examId,
      status: body.status || STATUS.ACTIVE,
      orderNumber: orderNumber,
      description: body.description?.trim() || "",
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
