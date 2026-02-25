export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Media from "@/models/Media";
import MediaFolder, { normalizePath } from "@/models/MediaFolder";
import { requireAuth } from "@/middleware/authMiddleware";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";

/** GET: Return { files, subfolders } count for folder at ?path= */
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    let folderPath = searchParams.get("path");
    if (typeof folderPath !== "string") {
      return errorResponse("Query 'path' is required", 400);
    }
    if (folderPath.includes("..")) return errorResponse("Invalid path", 400);
    folderPath = normalizePath(folderPath);
    if (!folderPath) return errorResponse("Invalid path", 400);

    await connectDB();

    const prefix = folderPath + "/";
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const [files, subfolders] = await Promise.all([
      Media.countDocuments({
        $and: [
          { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
          { $or: [{ folder: folderPath }, { folder: { $regex: `^${escapedPrefix}` } }] },
        ],
      }),
      MediaFolder.countDocuments({ $or: [{ parentPath: folderPath }, { path: { $regex: `^${escapedPrefix}` } }] }),
    ]);

    return successResponse({ files, subfolders });
  } catch (error) {
    console.error("Folders count error:", error);
    return handleApiError(error, "Failed to get folder count");
  }
}
