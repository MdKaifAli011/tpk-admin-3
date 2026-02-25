export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import { copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import connectDB from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAction } from "@/middleware/authMiddleware";
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

/** POST: Copy media to another folder. Body: { folder: string }. */
export async function POST(request, { params }) {
  try {
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    const { id } = await params;
    if (!id) return errorResponse("Media ID is required", 400);

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const folderNorm = normalizeFolderPath(body.folder || "");

    const existing = await Media.findById(id).lean();
    if (!existing) return errorResponse("Media not found", 404);
    if (existing.deletedAt) return errorResponse("Cannot copy item from trash", 400);

    const currentPath = path.join(assetsBaseDir, (existing.path || "").replace(/\//g, path.sep));
    if (!existsSync(currentPath)) return errorResponse("Source file not found on disk", 404);

    const targetDir = folderNorm
      ? path.join(mediaBaseDir, folderNorm.split("/").join(path.sep))
      : path.join(mediaBaseDir, existing.type || "file");
    if (!existsSync(targetDir)) await mkdir(targetDir, { recursive: true });

    const ext = path.extname(existing.path || existing.fileName || "");
    const baseName = path.basename(existing.path || existing.fileName || "", ext) || "file";
    let filename = `${baseName}${ext}`;
    let newFilePath = path.join(targetDir, filename);
    if (existsSync(newFilePath)) {
      filename = `${baseName}_copy_${Date.now()}${ext}`;
      newFilePath = path.join(targetDir, filename);
    }

    await copyFile(currentPath, newFilePath);

    const newRelativePath = path.relative(assetsBaseDir, newFilePath).replace(/\\/g, "/");
    const newUrl = `${basePath}/api/uploads/${newRelativePath}`;

    const copyName = (existing.name || existing.fileName || "").trim() || "Copy";
    const doc = await Media.create({
      name: copyName,
      fileName: existing.fileName || filename,
      altText: existing.altText || "",
      url: newUrl,
      path: newRelativePath,
      type: existing.type || "file",
      mimeType: existing.mimeType || "",
      size: existing.size || 0,
      folder: folderNorm || "",
    });

    return successResponse(
      { ...doc.toObject(), url: newUrl },
      "Media copied successfully",
      201
    );
  } catch (error) {
    console.error("Media copy error:", error);
    return handleApiError(error, "Failed to copy media");
  }
}
