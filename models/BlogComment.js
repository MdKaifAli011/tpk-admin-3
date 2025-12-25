import mongoose from "mongoose";

const blogCommentSchema = new mongoose.Schema(
  {
    blogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: false,
      index: true,
    },
    // For anonymous comments (when studentId is not provided)
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
    ipAddress: {
      type: String,
      required: false,
      trim: true,
    },
    adminNotes: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    // Computed field: Check if comment contains URLs (for admin filtering)
    hasUrl: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
blogCommentSchema.index({ blogId: 1, status: 1 });
blogCommentSchema.index({ blogId: 1, createdAt: -1 });
blogCommentSchema.index({ hasUrl: 1, createdAt: -1 });

// Pre-save validation: Either studentId OR (name AND email) must be provided
blogCommentSchema.pre("save", function (next) {
  // If studentId is provided, that's valid
  if (this.studentId) {
    return next();
  }

  // If no studentId, both name and email must be provided
  if (!this.name || !this.email) {
    const error = new Error(
      "Either studentId or both name and email must be provided"
    );
    error.name = "ValidationError";
    return next(error);
  }

  // Validate email format if provided
  if (this.email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.email)) {
      const error = new Error("Invalid email format");
      error.name = "ValidationError";
      return next(error);
    }
  }

  next();
});

// Pre-save validation: Validate name length if provided
blogCommentSchema.pre("save", function (next) {
  if (this.name && this.name.trim().length < 2) {
    const error = new Error("Name must be at least 2 characters");
    error.name = "ValidationError";
    return next(error);
  }
  next();
});

// Pre-save: Compute hasUrl field (check if comment contains URLs)
blogCommentSchema.pre("save", function (next) {
  if (this.comment) {
    // Check if comment contains URLs (http://, https://, www.)
    const urlPattern = /(https?:\/\/|www\.)[^\s]+/gi;
    this.hasUrl = urlPattern.test(this.comment);
  } else {
    this.hasUrl = false;
  }
  next();
});

const BlogComment =
  mongoose.models.BlogComment || mongoose.model("BlogComment", blogCommentSchema);

export default BlogComment;

