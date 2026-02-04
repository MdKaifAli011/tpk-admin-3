import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const downloadFolderSchema = new mongoose.Schema(
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
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DownloadFolder",
      default: null, // null means root folder
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: false, // Optional: can be general or exam-specific
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
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Compound index for unique slug per parent folder
downloadFolderSchema.index(
  { parentFolderId: 1, slug: 1 },
  { unique: true, sparse: true }
);

// Index for examId
downloadFolderSchema.index({ examId: 1 });

// Index for status
downloadFolderSchema.index({ status: 1 });

// Ensure unique ordering per parent folder
downloadFolderSchema.index(
  { parentFolderId: 1, orderNumber: 1 },
  { unique: true, partialFilterExpression: { orderNumber: { $exists: true } } }
);

// Pre-save hook to auto-generate slug; backfill when missing
downloadFolderSchema.pre("save", async function (next) {
  const needsSlug = !this.slug || this.isModified("name") || this.isNew;
  if (needsSlug) {
    const baseSlug = createSlug(this.name);

    // Check if slug exists within the same parent folder (excluding current document for updates)
    const checkExists = async (slug, excludeId) => {
      const query = { parentFolderId: this.parentFolderId || null, slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await mongoose.models.DownloadFolder.findOne(query);
      return !!existing;
    };

    this.slug = await generateUniqueSlug(
      baseSlug,
      checkExists,
      this._id || null
    );
  }
  next();
});

// Cascading delete: When a DownloadFolder is deleted, delete all subfolders and files
downloadFolderSchema.pre("findOneAndDelete", async function () {
  try {
    const folder = await this.model.findOne(this.getQuery());
    if (folder) {
      console.log(
        `🗑️ Cascading delete: Deleting all entities for folder ${folder._id}`
      );

      // Get models - dynamically import if not already registered
      const DownloadFolder =
        mongoose.models.DownloadFolder ||
        (await import("./DownloadFolder.js")).default;
      const DownloadFile =
        mongoose.models.DownloadFile ||
        (await import("./DownloadFile.js")).default;

      // Step 1: Find all subfolders recursively
      const findAllSubfolders = async (parentId) => {
        const subfolders = await DownloadFolder.find({
          parentFolderId: parentId,
        })
          .select("_id")
          .lean();
        let allSubfolderIds = subfolders.map((sf) => sf._id);

        // Recursively find subfolders of subfolders
        for (const subfolder of subfolders) {
          const nestedSubfolders = await findAllSubfolders(subfolder._id);
          allSubfolderIds = [...allSubfolderIds, ...nestedSubfolders];
        }

        return allSubfolderIds;
      };

      const subfolderIds = await findAllSubfolders(folder._id);
      const allFolderIds = [folder._id, ...subfolderIds];

      console.log(
        `🗑️ Found ${subfolderIds.length} subfolder(s) for folder ${folder._id}`
      );

      // Step 2: Delete all files in this folder and subfolders
      const filesResult = await DownloadFile.deleteMany({
        folderId: { $in: allFolderIds },
      });

      console.log(
        `🗑️ Cascading delete: Deleted ${filesResult.deletedCount} file(s) for folder ${folder._id}`
      );

      // Step 3: Delete all subfolders (in reverse order to handle nested folders)
      if (subfolderIds.length > 0) {
        // Delete from deepest to shallowest
        const deleteSubfolders = async (parentId) => {
          const directSubfolders = await DownloadFolder.find({
            parentFolderId: parentId,
          })
            .select("_id")
            .lean();
          for (const subfolder of directSubfolders) {
            await deleteSubfolders(subfolder._id);
            await DownloadFolder.findByIdAndDelete(subfolder._id);
          }
        };
        await deleteSubfolders(folder._id);
      }

      console.log(
        `🗑️ Cascading delete: Deleted ${subfolderIds.length} subfolder(s) for folder ${folder._id}`
      );
    }
  } catch (error) {
    console.error(
      "❌ Error in DownloadFolder cascading delete middleware:",
      error
    );
    // Don't throw - allow the delete to continue even if cascading fails
  }
});

const DownloadFolder =
  mongoose.models.DownloadFolder ||
  mongoose.model("DownloadFolder", downloadFolderSchema);

export default DownloadFolder;
