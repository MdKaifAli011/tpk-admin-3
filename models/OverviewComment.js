import mongoose from "mongoose";

const overviewCommentSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["exam", "subject", "unit", "chapter", "topic", "subtopic"],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: false,
      index: true,
    },
    name: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

overviewCommentSchema.index({ entityType: 1, entityId: 1, status: 1 });
overviewCommentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

overviewCommentSchema.pre("save", function (next) {
  if (this.studentId) return next();
  if (!this.name?.trim() || !this.email?.trim()) {
    const err = new Error("Either studentId or both name and email must be provided");
    err.name = "ValidationError";
    return next(err);
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(this.email)) {
    const err = new Error("Invalid email format");
    err.name = "ValidationError";
    return next(err);
  }
  if (this.name.trim().length < 2) {
    const err = new Error("Name must be at least 2 characters");
    err.name = "ValidationError";
    return next(err);
  }
  next();
});

const OverviewComment =
  mongoose.models.OverviewComment ||
  mongoose.model("OverviewComment", overviewCommentSchema);

export default OverviewComment;
