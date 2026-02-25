export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import { rename, mkdir } from "fs/promises";
import { existsSync } from "fs";
import connectDB from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
const assetsBaseDir = path.join(process.cwd(), "public", "assets");
const mediaBaseDir = path.join(assetsBaseDir, "media");

function normalizeFolderPath(folder) {
  if (typeof folder !== "string") return "";
  const normalized = folder
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "")
    .trim();
  if (normalized.includes("..")) return "";
  return normalized;
}

export async function GET(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const { id } = await params;
    if (!id) return errorResponse("Media ID is required", 400);

    await connectDB();
    const item = await Media.findById(id).lean();
    if (!item) return errorResponse("Media not found", 404);

    return successResponse(item);
  } catch (error) {
    console.error("Media GET [id] error:", error);
    return handleApiError(error, "Failed to fetch media");
  }
}

export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    const { id } = await params;
    if (!id) return errorResponse("Media ID is required", 400);

    await connectDB();
    const body = await request.json();
    const updates = {};

    if (body.restore === true) {
      updates.deletedAt = null;
    }
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.altText === "string") updates.altText = body.altText.trim();
    if (typeof body.fileName === "string") updates.fileName = body.fileName.trim();

    const newFolder = typeof body.folder === "string" ? body.folder.trim() : undefined;
    if (newFolder !== undefined) updates.folder = newFolder;

    if (Object.keys(updates).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const existing = await Media.findById(id).lean();
    if (!existing) return errorResponse("Media not found", 404);

    if (newFolder !== undefined && normalizeFolderPath(newFolder) !== (existing.folder || "")) {
      const folderNorm = normalizeFolderPath(newFolder);
      const currentPath = path.join(assetsBaseDir, (existing.path || "").replace(/\//g, path.sep));
      if (existsSync(currentPath)) {
        const targetDir = folderNorm
          ? path.join(mediaBaseDir, folderNorm.split("/").join(path.sep))
          : path.join(mediaBaseDir, existing.type || "file");
        if (!existsSync(targetDir)) await mkdir(targetDir, { recursive: true });
        const basename = path.basename(existing.path || "");
        const newFilePath = path.join(targetDir, basename);
        const newRelativePath = path.relative(assetsBaseDir, newFilePath).replace(/\\/g, "/");
        const newUrl = `${basePath}/api/uploads/${newRelativePath}`;
        await rename(currentPath, newFilePath);
        updates.path = newRelativePath;
        updates.url = newUrl;
      }
    }

    const item = await Media.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!item) return errorResponse("Media not found", 404);

    return successResponse(item, "Media updated successfully");
  } catch (error) {
    console.error("Media PATCH [id] error:", error);
    return handleApiError(error, "Failed to update media");
  }
}

export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    const { id } = await params;
    if (!id) return errorResponse("Media ID is required", 400);

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    await connectDB();

    if (permanent) {
      const item = await Media.findByIdAndDelete(id);
      if (!item) return errorResponse("Media not found", 404);
      return successResponse({ deleted: true }, "Media permanently deleted");
    }

    const item = await Media.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true }
    ).lean();

    if (!item) return errorResponse("Media not found", 404);
    return successResponse(item, "Media moved to trash");
  } catch (error) {
    console.error("Media DELETE [id] error:", error);
    return handleApiError(error, "Failed to delete media");
  }
}
