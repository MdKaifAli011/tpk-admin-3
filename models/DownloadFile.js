import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const downloadFileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DownloadFolder",
      required: true,
    },
    fileType: {
      type: String,
      enum: ["url", "upload"],
      required: true,
    },
    fileUrl: {
      type: String,
      trim: true,
      // Optional when fileType is "url"
    },
    uploadedFile: {
      type: String,
      trim: true,
      // Optional when fileType is "upload"
    },
    fileSize: {
      type: Number,
      // Size in bytes (for uploaded files)
    },
    mimeType: {
      type: String,
      trim: true,
      // MIME type (e.g., "application/pdf", "image/png")
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    orderNumber: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for folderId
downloadFileSchema.index({ folderId: 1 });

// Index for status
downloadFileSchema.index({ status: 1 });

// Index for fileType
downloadFileSchema.index({ fileType: 1 });

// Ensure unique ordering per folder
downloadFileSchema.index(
  { folderId: 1, orderNumber: 1 },
  { unique: true, partialFilterExpression: { orderNumber: { $exists: true } } }
);

// Compound index for better query performance
downloadFileSchema.index({ folderId: 1, status: 1 });

// Compound index for unique slug per folder (for URL-friendly file links)
downloadFileSchema.index(
  { folderId: 1, slug: 1 },
  { unique: true, sparse: true }
);

// Pre-save: auto-generate slug from name (unique per folder); backfill when missing
downloadFileSchema.pre("save", async function (next) {
  const needsSlug = !this.slug || this.isModified("name") || this.isNew;
  if (needsSlug) {
    const baseSlug = createSlug(this.name);
    const folderId = this.folderId?._id || this.folderId;
    const checkExists = async (slug, excludeId) => {
      const query = { folderId, slug };
      if (excludeId) query._id = { $ne: excludeId };
      const existing = await mongoose.models.DownloadFile.findOne(query);
      return !!existing;
    };
    this.slug = await generateUniqueSlug(baseSlug, checkExists, this._id || null);
  }
  next();
});

const DownloadFile = mongoose.models.DownloadFile || mongoose.model("DownloadFile", downloadFileSchema);

export default DownloadFile;

