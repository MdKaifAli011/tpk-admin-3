import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    altText: { type: String, default: "", trim: true },
    url: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["image", "video", "document", "file"],
      required: true,
    },
    mimeType: { type: String, default: "", trim: true },
    size: { type: Number, default: 0 },
    folder: { type: String, default: "", trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

mediaSchema.index({ type: 1, deletedAt: 1 });
mediaSchema.index({ folder: 1, deletedAt: 1 });
mediaSchema.index({ name: "text", fileName: "text", altText: "text" });
mediaSchema.index({ createdAt: -1 });

const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);
export default Media;
