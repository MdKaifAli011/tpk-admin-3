#!/usr/bin/env node
/**
 * Normalize MediaFolder and Media documents:
 * - MediaFolder: path and parentPath → lowercase, slugified (e.g. "NEET/NEET Planning" → "neet/neet-planning");
 *               name → capitalized display (e.g. "Neet Planning").
 * - Media: folder → normalized path only. path and url are NOT changed so existing links keep working.
 *
 * Run: node scripts/normalize-media-folders.mjs
 *      node scripts/normalize-media-folders.mjs --dry-run   (print changes only, no writes)
 *      Requires MONGODB_URI (and optionally MONGO_DB_NAME). Load .env via dotenv.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (parent of scripts/) so it works when run from any cwd
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "tpk";
const DRY_RUN = process.argv.includes("--dry-run");

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is required. Set it in .env (project root) or the environment.");
  process.exit(1);
}

// Same logic as models/MediaFolder.js (no dependency on that file)
function slugifySegment(segment) {
  if (typeof segment !== "string") return "";
  return segment
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "folder";
}

function normalizePath(p) {
  if (typeof p !== "string") return "";
  const cleaned = p
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "")
    .trim();
  if (!cleaned) return "";
  return cleaned
    .split("/")
    .map(slugifySegment)
    .filter(Boolean)
    .join("/");
}

function pathToName(pathStr) {
  const n = normalizePath(pathStr);
  if (!n) return "";
  const parts = n.split("/");
  return parts[parts.length - 1] || "";
}

function capitalizeDisplayName(str) {
  if (typeof str !== "string" || !str.trim()) return str;
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGO_DB_NAME });
  console.log(`✅ Connected to MongoDB (db: ${MONGO_DB_NAME})\n`);
  if (DRY_RUN) console.log("🔍 DRY RUN – no changes will be written.\n");

  const db = mongoose.connection.db;
  const allCollections = (await db.listCollections().toArray()).map((c) => c.name);
  const getCollection = (candidates) => {
    for (const name of candidates) {
      if (allCollections.includes(name)) return db.collection(name);
    }
    return db.collection(candidates[0]);
  };
  const mediaFolderColl = getCollection(["mediafolders", "MediaFolders", "media_folders"]);
  const mediaColl = getCollection(["media", "medias"]);
  const folderCollName = mediaFolderColl.collectionName;
  const mediaCollName = mediaColl.collectionName;
  console.log(`Using collections: "${folderCollName}" (folders), "${mediaCollName}" (media).\n`);

  // ---------- 1. MediaFolder: normalize path, parentPath, name; merge duplicates ----------
  const folders = await mediaFolderColl.find({}).toArray();
  console.log(`Found ${folders.length} MediaFolder document(s).`);
  if (folders.length === 0 && allCollections.some((c) => /mediafolder/i.test(c))) {
    console.warn("  ⚠ No documents in this collection. If you have folder data elsewhere, check MONGO_DB_NAME and collection name.");
  }

  const byNormalizedPath = new Map();
  for (const doc of folders) {
    const newPath = normalizePath(doc.path);
    const newParentPath = normalizePath(doc.parentPath || "");
    const newName = capitalizeDisplayName(pathToName(newPath).replace(/-/g, " "));
    const entry = {
      _id: doc._id,
      oldPath: doc.path,
      oldParentPath: doc.parentPath || "",
      newPath,
      newParentPath,
      newName,
      createdAt: doc.createdAt,
    };
    if (!byNormalizedPath.has(newPath)) {
      byNormalizedPath.set(newPath, []);
    }
    byNormalizedPath.get(newPath).push(entry);
  }

  const toDelete = [];
  const toUpdate = [];
  for (const [, entries] of byNormalizedPath) {
    entries.sort((a, b) => (a.createdAt && b.createdAt ? a.createdAt - b.createdAt : 0));
    const keep = entries[0];
    toUpdate.push(keep);
    for (let i = 1; i < entries.length; i++) toDelete.push(entries[i]._id);
  }

  if (toDelete.length > 0) {
    if (!DRY_RUN) {
      const delRes = await mediaFolderColl.deleteMany({ _id: { $in: toDelete } });
      console.log(`  Deleted ${delRes.deletedCount} duplicate MediaFolder(s) (same normalized path).`);
    } else {
      console.log(`  Would delete ${toDelete.length} duplicate MediaFolder(s).`);
    }
  }

  for (const u of toUpdate) {
    const hasChange = u.oldPath !== u.newPath || u.oldParentPath !== u.newParentPath;
    if (DRY_RUN && hasChange) {
      console.log(`  Folder: path "${u.oldPath}" → "${u.newPath}", parentPath "${u.oldParentPath}" → "${u.newParentPath}", name → "${u.newName}"`);
    }
    if (!DRY_RUN) {
      await mediaFolderColl.updateOne(
        { _id: u._id },
        { $set: { path: u.newPath, parentPath: u.newParentPath, name: u.newName } }
      );
    }
  }
  if (!DRY_RUN) console.log(`  Updated ${toUpdate.length} MediaFolder(s) with normalized path, parentPath, name.`);

  // ---------- 2. Media: set folder = normalized path; do NOT change path or url ----------
  const mediaDocs = await mediaColl.find({}).toArray();
  console.log(`\nFound ${mediaDocs.length} Media document(s).`);
  if (mediaDocs.length === 0 && allCollections.some((c) => /^media$/i.test(c) || c === "medias")) {
    console.warn("  ⚠ No documents in this collection. If you have media elsewhere, check MONGO_DB_NAME and collection name.");
  }

  let mediaUpdated = 0;
  for (const doc of mediaDocs) {
    const oldFolder = doc.folder != null ? String(doc.folder).trim() : "";
    const newFolder = normalizePath(oldFolder);
    if (newFolder !== oldFolder) {
      if (DRY_RUN) {
        console.log(`  Media ${doc._id}: folder "${oldFolder}" → "${newFolder}"`);
        mediaUpdated++;
      } else {
        await mediaColl.updateOne({ _id: doc._id }, { $set: { folder: newFolder } });
        mediaUpdated++;
      }
    }
  }
  console.log(`  Updated ${mediaUpdated} Media document(s) folder field to normalized path.`);
  console.log("  (path and url were left unchanged so existing links keep working.)");

  console.log("\n✅ Normalization done.");
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
