/**
 * Shared rules for admin media uploads (images + documents only; no video).
 * Keep server route and client UI in sync.
 */

export const MEDIA_MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MEDIA_MAX_DOCUMENT_BYTES = 200 * 1024 * 1024; // 200 MB

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "avif",
]);

const DOCUMENT_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "rtf",
  "odt",
  "ods",
]);

const VIDEO_EXT = new Set([
  "mp4",
  "webm",
  "ogg",
  "mov",
  "mkv",
  "avi",
  "m4v",
]);

function extFromName(name) {
  if (!name || typeof name !== "string") return "";
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}

/**
 * @returns {"image" | "document" | "video" | "unknown"}
 */
export function getMediaCategory(mimeType, fileName = "") {
  const mime = (mimeType || "").toLowerCase().trim();
  const ext = extFromName(fileName);

  if (mime.startsWith("video/") || VIDEO_EXT.has(ext)) return "video";
  if (mime.startsWith("image/") || IMAGE_EXT.has(ext)) return "image";

  const docMime =
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.ms-excel" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-powerpoint" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mime === "text/plain" ||
    mime === "text/csv" ||
    mime === "application/rtf" ||
    mime.startsWith("application/vnd.oasis.opendocument");

  if (docMime || DOCUMENT_EXT.has(ext)) return "document";

  if (mime && !mime.startsWith("image/")) {
    // e.g. generic binary — treat as document only if extension looks like a doc
    if (DOCUMENT_EXT.has(ext)) return "document";
  }

  return "unknown";
}

export function formatMaxLabel(bytes) {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Validate upload for /api/media. Returns { ok, message?, category?: "image"|"document" }
 */
export function validateMediaUploadForApi(mimeType, sizeBytes, fileName) {
  const category = getMediaCategory(mimeType, fileName);

  if (category === "video") {
    return {
      ok: false,
      message:
        "Video uploads are disabled. Use images or documents (PDF, Word, Excel, etc.), or embed video with a link elsewhere.",
    };
  }

  if (category === "unknown") {
    return {
      ok: false,
      message:
        "This file type is not supported. Allowed: images (e.g. JPG, PNG, WebP) or documents (e.g. PDF, Word, Excel). Videos are not accepted.",
    };
  }

  if (category === "image") {
    if (sizeBytes > MEDIA_MAX_IMAGE_BYTES) {
      return {
        ok: false,
        message: `Image is too large (${formatMaxLabel(sizeBytes)}). Maximum size for images is ${formatMaxLabel(MEDIA_MAX_IMAGE_BYTES)}. Try compressing the image or use a smaller file.`,
      };
    }
    return { ok: true, category: "image" };
  }

  if (sizeBytes > MEDIA_MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      message: `Document is too large (${formatMaxLabel(sizeBytes)}). Maximum size for PDF and other documents is ${formatMaxLabel(MEDIA_MAX_DOCUMENT_BYTES)}.`,
    };
  }
  return { ok: true, category: "document" };
}

/**
 * Client-side check before starting XHR (same rules).
 */
export function validateMediaFileClient(file) {
  if (!file) {
    return { ok: false, message: "No file selected." };
  }
  return validateMediaUploadForApi(file.type, file.size, file.name);
}

export const MEDIA_UPLOAD_HELP_TEXT =
  "Images: max 10 MB (JPG, PNG, GIF, WebP, SVG, etc.). Documents / PDF: max 200 MB. Video uploads are not allowed.";

/** File picker filter when the Documents tab is active */
export const MEDIA_FILE_ACCEPT_DOCUMENTS_ONLY =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv";

export const MEDIA_UPLOAD_HINT_IMAGE =
  "Images tab: upload pictures only — max 10 MB each. Switch to Documents for PDFs and Office files.";

export const MEDIA_UPLOAD_HINT_DOCUMENT =
  "Documents tab: upload PDFs and Office files — max 200 MB each. Switch to Images for pictures.";

/** Library “All folders” tab: combined upload + browse hint */
export const MEDIA_UPLOAD_HINT_ALL =
  "All folders: browse every folder and file. Upload images (max 10 MB) or documents (max 200 MB). Use Images or Documents to show only that type.";
