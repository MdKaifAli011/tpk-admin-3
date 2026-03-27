import mongoose from "mongoose";

const mediaFolderSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    parentPath: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

mediaFolderSchema.index({ parentPath: 1 });

/** Slugify a single path segment: lowercase, spaces → hyphens, remove unsafe chars */
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

/** Display name: capitalize first letter of each word (e.g. "neet demo" → "Neet Demo") */
function capitalizeDisplayName(str) {
  if (typeof str !== "string" || !str.trim()) return str;
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const MediaFolder =
  mongoose.models.MediaFolder || mongoose.model("MediaFolder", mediaFolderSchema);
export default MediaFolder;
export { normalizePath, pathToName, slugifySegment, capitalizeDisplayName };
