import mongoose from "mongoose";

const discussionUploadSchema = new mongoose.Schema(
  {
    uploaderType: { type: String, required: true, enum: ["guest", "student"] },
    uploaderId: { type: String, required: true, trim: true }, // guest id or student Mongo _id (for ref)
    studentPublicId: { type: Number, default: null }, // numeric student id (1,2,3...) when uploaderType is student
    displayName: { type: String, default: "", trim: true }, // guest name or student full name for display
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", default: null },
    fileName: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true }, // relative path: asset/user/guest_xxx/file_1.png
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, default: "", trim: true },
    size: { type: Number, default: 0 },
  },
  { timestamps: true }
);

discussionUploadSchema.index({ uploaderType: 1, uploaderId: 1 });
discussionUploadSchema.index({ examId: 1 });
discussionUploadSchema.index({ createdAt: -1 });

const DiscussionUpload =
  mongoose.models.DiscussionUpload ||
  mongoose.model("DiscussionUpload", discussionUploadSchema);

export default DiscussionUpload;
