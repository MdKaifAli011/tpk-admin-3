export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Large PDF/document uploads (up to 200MB) may take several minutes on slow connections */
export const maxDuration = 600;

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import connectDB from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { validateMediaUploadForApi } from "@/lib/mediaUploadRules";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
const assetsBaseDir = path.join(process.cwd(), "public", "assets");
const mediaBaseDir = path.join(assetsBaseDir, "media");

function safeFilename(name) {
  return String(name)
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "file";
}

/** Normalize folder path for use in filesystem: no leading/trailing slashes, no ".." */
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

export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const search = searchParams.get("search") || "";
    const trash = searchParams.get("trash") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 24));

    const andParts = [];

    if (trash) {
      andParts.push({ deletedAt: { $ne: null } });
    } else {
      andParts.push({
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      });
    }

    const folderParam = searchParams.get("folder");
    const folder = folderParam === null || folderParam === undefined ? undefined : (folderParam || "");

    if (type && ["image", "video", "document", "file"].includes(type)) {
      andParts.push({ type });
    }

    if (folder !== undefined) {
      const folderValue = (typeof folder === "string" ? folder.trim() : "") || "";
      if (folderValue === "") {
        andParts.push({ $or: [{ folder: "" }, { folder: { $exists: false } }, { folder: null }] });
      } else {
        andParts.push({ folder: folderValue });
      }
    }

    if (search && search.trim()) {
      const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(s, "i");
      andParts.push({
        $or: [
          { name: searchRegex },
          { fileName: searchRegex },
          { altText: searchRegex },
        ],
      });
    }

    const query = andParts.length === 1 ? andParts[0] : { $and: andParts };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Media.find(query)
        .sort(trash ? { deletedAt: -1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Media.countDocuments(query),
    ]);

    return successResponse({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Media GET error:", error);
    return handleApiError(error, "Failed to fetch media");
  }
}

export async function POST(request) {
  try {
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();

    let formData;
    try {
      formData = await request.formData();
    } catch (parseErr) {
      console.error("Media POST formData parse:", parseErr);
      return errorResponse(
        "The upload could not be read. If the file is large, set experimental.proxyClientMaxBodySize in next.config (e.g. \"210mb\") and restart the server. PDFs and documents can be up to 200 MB; images up to 10 MB.",
        413,
      );
    }
    const file = formData.get("file");
    const name = formData.get("name") || "";
    const altText = formData.get("altText") || "";
    const folder = formData.get("folder") || "";
    const sourceUrl = formData.get("sourceUrl") ? String(formData.get("sourceUrl")).trim() : "";
    const sourcePath = formData.get("sourcePath") ? String(formData.get("sourcePath")).trim() : "";

    if (!file || !(file instanceof File)) {
      return errorResponse("File is required", 400);
    }

    const mimeType = file.type || "";
    const originalName = file.name || "file";

    const validation = validateMediaUploadForApi(mimeType, file.size, originalName);
    if (!validation.ok) {
      return errorResponse(validation.message, 400);
    }

    const type = validation.category;
    const ext = originalName.includes(".")
      ? originalName.split(".").pop().toLowerCase()
      : "bin";

    let fileUrl;
    let relativePath;
    const displayName = (name && name.trim()) || originalName;

    if (sourceUrl && type === "image") {
      // Editor sent upload URL: store same url/path in Media (no duplicate file)
      fileUrl = sourceUrl;
      relativePath = sourcePath || sourceUrl.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "") || "upload";
    } else {
      const folderNorm = normalizeFolderPath(folder);
      let targetDir;

      if (folderNorm) {
        targetDir = path.join(mediaBaseDir, folderNorm.split("/").join(path.sep));
        if (!existsSync(targetDir)) {
          await mkdir(targetDir, { recursive: true });
        }
      } else {
        targetDir = path.join(mediaBaseDir, type);
        if (!existsSync(targetDir)) {
          await mkdir(targetDir, { recursive: true });
        }
      }

      const baseName = safeFilename(originalName.replace(/\.[^.]+$/, ""));
      const filename = `${baseName}_${Date.now()}.${ext}`;
      const filePath = path.join(targetDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      relativePath = path
        .relative(assetsBaseDir, filePath)
        .replace(/\\/g, "/");
      fileUrl = `${basePath}/api/uploads/${relativePath}`;
    }

    const folderNorm = normalizeFolderPath(folder);
    const doc = await Media.create({
      name: displayName,
      fileName: (name && name.trim()) || originalName,
      altText: (altText && altText.trim()) || "",
      url: fileUrl,
      path: relativePath,
      type,
      mimeType,
      size: file.size,
      folder: folderNorm || "",
    });

    return successResponse(
      { ...doc.toObject(), url: fileUrl },
      "Media uploaded successfully",
      201
    );
  } catch (error) {
    console.error("Media POST error:", error);
    return handleApiError(error, "Failed to upload media");
  }
}
