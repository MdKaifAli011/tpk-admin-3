export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { mkdir, rm } from "fs/promises";
import path from "path";
import connectDB from "@/lib/mongodb";
import Media from "@/models/Media";
import MediaFolder, { normalizePath, pathToName, capitalizeDisplayName } from "@/models/MediaFolder";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";

const mediaBaseDir = path.join(process.cwd(), "public", "assets", "media");

/** Build tree: { path, name, parentPath, children: [] } — group by normalized parentPath */
function buildTree(flatList, parentPath = "") {
  const tree = [];
  const byParent = new Map();
  for (const f of flatList) {
    const p = normalizePath(f.parentPath ?? "");
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(f);
  }
  const key = normalizePath(parentPath);
  const children = byParent.get(key) || [];
  for (const c of children.sort((a, b) => (a.name || "").localeCompare(b.name || ""))) {
    tree.push({
      ...c,
      children: buildTree(flatList, c.path),
    });
  }
  return tree;
}

/** GET: List folders as tree (from MediaFolder + distinct folder from Media). Optional ?type=image|video|document|file for item count per folder. */
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";

    const [folderDocs, mediaFolders] = await Promise.all([
      MediaFolder.find({}).lean(),
      Media.distinct("folder", {
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      }),
    ]);

    const pathSet = new Set(folderDocs.map((f) => normalizePath(f.path)));
    for (const p of mediaFolders) {
      const norm = normalizePath(String(p));
      if (!norm) continue;
      if (pathSet.has(norm)) continue;
      pathSet.add(norm);
      folderDocs.push({
        path: norm,
        name: capitalizeDisplayName(pathToName(norm).replace(/-/g, " ")),
        parentPath: norm.includes("/") ? norm.split("/").slice(0, -1).join("/") : "",
      });
    }

    const pathToDoc = new Map();
    for (const f of folderDocs) {
      const norm = normalizePath(f.path);
      if (!pathToDoc.has(norm)) {
        pathToDoc.set(norm, { ...f, path: norm, name: capitalizeDisplayName((f.name || "").replace(/-/g, " ")) });
      }
    }
    const deduped = Array.from(pathToDoc.values());

    let countsByFolder = new Map();
    let totalCount = 0;
    const validTypes = ["image", "video", "document", "file"];
    if (type && validTypes.includes(type)) {
      const match = {
        type,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      };
      const agg = await Media.aggregate([
        { $match: match },
        { $group: { _id: { $ifNull: ["$folder", ""] }, count: { $sum: 1 } } },
      ]);
      for (const row of agg) {
        countsByFolder.set(row._id, row.count);
        totalCount += row.count;
      }
    }

    const flat = deduped.sort((a, b) => (a.path || "").localeCompare(b.path || ""));
    const flatWithCount = flat.map((f) => ({
      ...f,
      count: type && validTypes.includes(type) ? (countsByFolder.get(f.path) || 0) : undefined,
    }));
    const tree = buildTree(flatWithCount);

    const payload = { folders: flatWithCount, tree };
    if (type && validTypes.includes(type)) payload.totalCount = totalCount;

    return successResponse(payload);
  } catch (error) {
    return handleApiError(error, "Failed to list folders");
  }
}

/** All normalized (lowercase) folder paths that exist: MediaFolder paths + Media.folder distinct */
async function getAllFolderPaths() {
  const [folderPaths, mediaFolders] = await Promise.all([
    MediaFolder.distinct("path"),
    Media.distinct("folder", {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    }),
  ]);
  const set = new Set();
  for (const p of folderPaths) {
    const n = normalizePath(String(p));
    if (n) set.add(n);
  }
  for (const p of mediaFolders) {
    const n = normalizePath(String(p));
    if (n) set.add(n);
  }
  return set;
}

/** Find one MediaFolder by path (case-insensitive) */
async function findFolderByPathCaseInsensitive(pathValue) {
  if (!pathValue || typeof pathValue !== "string") return null;
  return MediaFolder.findOne({ path: new RegExp(`^${escapeRegex(pathValue)}$`, "i") }).lean();
}

/** POST: Create folder (body: { name, parentPath? } or { path }) */
export async function POST(request) {
  try {
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();

    const body = await request.json().catch(() => ({}));
    let folderPath;
    let name;
    let parentPath = "";

    if (body.path && typeof body.path === "string") {
      folderPath = normalizePath(body.path);
      name = pathToName(folderPath);
      parentPath = folderPath.includes("/") ? folderPath.split("/").slice(0, -1).join("/") : "";
    } else if (body.name && typeof body.name === "string") {
      const rawName = body.name.trim().replace(/[/\\]/g, "").replace(/\s+/g, " ") || "New folder";
      const parentRaw = (body.parentPath && String(body.parentPath).trim()) || "";
      parentPath = normalizePath(parentRaw);
      folderPath = normalizePath(parentPath ? `${parentPath}/${rawName}` : rawName);
      name = capitalizeDisplayName(rawName.replace(/-/g, " "));
    } else {
      return errorResponse("Provide 'name' (and optional 'parentPath') or 'path'", 400);
    }

    if (!folderPath) return errorResponse("Invalid folder path", 400);

    const existing = await findFolderByPathCaseInsensitive(folderPath);
    if (existing) {
      return errorResponse("A folder with this name already exists in this location. Only one folder per name is allowed.", 400);
    }

    if (parentPath) {
      const allPaths = await getAllFolderPaths();
      const parentExists = allPaths.has(parentPath) || (await findFolderByPathCaseInsensitive(parentPath));
      if (!parentExists) {
        return errorResponse("Parent folder does not exist. Create parent first.", 400);
      }
      const parentDoc = await findFolderByPathCaseInsensitive(parentPath);
      if (parentDoc) parentPath = parentDoc.path;
    }

    const doc = await MediaFolder.create({ path: folderPath, name, parentPath });

    // Create physical directory: public/assets/media/[folderPath]
    const physicalPath = path.join(mediaBaseDir, folderPath.replace(/\//g, path.sep));
    try {
      await mkdir(physicalPath, { recursive: true });
    } catch (err) {
      console.error("Failed to create physical folder:", physicalPath, err);
      // Don't fail the request; DB folder exists, disk can be fixed later
    }

    return successResponse(doc.toObject(), "Folder created", 201);
  } catch (error) {
    console.error("Folders POST error:", error);
    return handleApiError(error, "Failed to create folder");
  }
}

/** PATCH: Rename folder (body: { path, newName }) */
export async function PATCH(request) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const oldPath = normalizePath(body.path);
    const newName = (body.newName && String(body.newName).trim()).replace(/[/\\]/g, "").replace(/\s+/g, " ") || null;
    if (!oldPath || !newName) {
      return errorResponse("Provide 'path' and 'newName'", 400);
    }

    let folder = await MediaFolder.findOne({ path: oldPath }).lean();
    if (!folder) {
      folder = await findFolderByPathCaseInsensitive(oldPath);
      if (!folder) return errorResponse("Folder not found", 404);
    }
    const canonicalPath = folder.path;

    const parentPath = folder.parentPath ?? "";
    const newPath = normalizePath(parentPath ? `${parentPath}/${newName}` : newName);
    const displayName = capitalizeDisplayName(newName.replace(/-/g, " "));
    if (newPath === canonicalPath) {
      return successResponse(folder, "No change", 200);
    }

    const existing = await findFolderByPathCaseInsensitive(newPath);
    if (existing) {
      return errorResponse("A folder with that name already exists here. Only one folder per name is allowed.", 400);
    }

    // Update folder doc (use canonical path for update)
    await MediaFolder.updateOne({ path: canonicalPath }, { $set: { path: newPath, name: displayName } });

    const prefix = canonicalPath + "/";
    const escapedPrefix = escapeRegex(prefix);
    const prefixRe = new RegExp(`^${escapedPrefix}`);

    // Update Media: exact match then subfolders
    await Media.updateMany({ folder: canonicalPath }, { $set: { folder: newPath } });
    const mediaInSubfolders = await Media.find({ folder: prefixRe }).lean();
    for (const m of mediaInSubfolders) {
      await Media.updateOne({ _id: m._id }, { $set: { folder: newPath + m.folder.slice(canonicalPath.length) } });
    }

    // Update child MediaFolder docs (path and parentPath) — process deepest first so path updates don't conflict
    const childFolders = await MediaFolder.find({ $or: [{ path: prefixRe }, { parentPath: canonicalPath }] }).sort({ path: -1 }).lean();
    for (const c of childFolders) {
      if (c.path === canonicalPath) continue;
      const newChildPath = c.path.startsWith(prefix) ? newPath + c.path.slice(canonicalPath.length) : c.path;
      const newChildParent = c.parentPath === canonicalPath ? newPath : (c.parentPath.startsWith(prefix) ? newPath + c.parentPath.slice(canonicalPath.length) : c.parentPath);
      const newChildName = capitalizeDisplayName(pathToName(newChildPath).replace(/-/g, " "));
      await MediaFolder.updateOne({ path: c.path }, { $set: { path: newChildPath, parentPath: newChildParent, name: newChildName } });
    }

    // Rename physical directory
    const oldPhysical = path.join(mediaBaseDir, canonicalPath.replace(/\//g, path.sep));
    const newPhysical = path.join(mediaBaseDir, newPath.replace(/\//g, path.sep));
    try {
      const { rename } = await import("fs/promises");
      await rename(oldPhysical, newPhysical);
    } catch (err) {
      console.error("Failed to rename physical folder:", oldPhysical, newPhysical, err);
    }

    const updated = await MediaFolder.findOne({ path: newPath }).lean();
    return successResponse(updated, "Folder renamed", 200);
  } catch (error) {
    console.error("Folders PATCH error:", error);
    return handleApiError(error, "Failed to rename folder");
  }
}

/** DELETE: Delete folder. Body: { path }. Query: ?force=true to delete even when not empty (recursive). Requires DELETE permission. */
export async function DELETE(request) {
  try {
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const body = await request.json().catch(() => ({}));
    const pathParam = body.path != null ? String(body.path).trim() : "";
    let folderPath = normalizePath(pathParam);
    if (!folderPath && pathParam) {
      const byCase = await findFolderByPathCaseInsensitive(pathParam);
      if (byCase) folderPath = byCase.path;
    }
    if (!folderPath) {
      return errorResponse("Provide 'path'", 400);
    }

    let folder = await MediaFolder.findOne({ path: folderPath }).lean();
    if (!folder) {
      const byCase = await findFolderByPathCaseInsensitive(folderPath);
      if (!byCase) return errorResponse("Folder not found", 404);
      folderPath = byCase.path;
      folder = byCase;
    }

    const prefix = folderPath + "/";
    const escapedPrefix = escapeRegex(prefix);
    const [mediaCount, childFolderCount] = await Promise.all([
      Media.countDocuments({
        $and: [
          { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
          { $or: [{ folder: folderPath }, { folder: { $regex: `^${escapedPrefix}` } }] },
        ],
      }),
      MediaFolder.countDocuments({ $or: [{ parentPath: folderPath }, { path: { $regex: `^${escapedPrefix}` } }] }),
    ]);

    if (!force && (mediaCount > 0 || childFolderCount > 0)) {
      return errorResponse("Folder must be empty (no files or subfolders) before it can be deleted. Use force=true to delete everything inside.", 400);
    }

    if (force && (mediaCount > 0 || childFolderCount > 0)) {
      const childFolders = await MediaFolder.find({ $or: [{ parentPath: folderPath }, { path: { $regex: `^${escapedPrefix}` } }] }).sort({ path: -1 }).lean();
      for (const c of childFolders) {
        await MediaFolder.deleteOne({ path: c.path });
        const childPhysical = path.join(mediaBaseDir, c.path.replace(/\//g, path.sep));
        try {
          await rm(childPhysical, { recursive: true, force: true });
        } catch (err) {
          console.error("Failed to remove child folder:", childPhysical, err);
        }
      }
      await Media.deleteMany({
        $or: [
          { folder: folderPath },
          { folder: { $regex: `^${escapedPrefix}` } },
        ],
      });
    }

    await MediaFolder.deleteOne({ path: folderPath });

    const physicalPath = path.join(mediaBaseDir, folderPath.replace(/\//g, path.sep));
    try {
      await rm(physicalPath, { recursive: true, force: true });
    } catch (err) {
      console.error("Failed to remove physical folder:", physicalPath, err);
    }

    return successResponse({ path: folderPath }, "Folder deleted", 200);
  } catch (error) {
    console.error("Folders DELETE error:", error);
    return handleApiError(error, "Failed to delete folder");
  }
}
