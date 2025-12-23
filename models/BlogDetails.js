import mongoose from "mongoose";

const blogDetailsSchema = new mongoose.Schema(
  {
    blogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    // SEO title
    title: {
      type: String,
      trim: true,
      default: "",
    },
    // SEO description
    metaDescription: {
      type: String,
      trim: true,
      default: "",
    },
    // Short description for card display
    shortDescription: {
      type: String,
      trim: true,
      default: "",
    },
    // SEO keywords (for meta tags)
    keywords: {
      type: String,
      trim: true,
      default: "",
    },
    // Tags (for displaying on blog page)
    tags: {
      type: String,
      trim: true,
      default: "",
    },
    // Canonical URL or other SEO fields could go here

    // Status can mirror parent or be independent for content workflow
    status: {
      type: String,
      enum: ["publish", "unpublish", "draft"],
      default: "draft",
      trim: true,
    },
  },
  { timestamps: true }
);

// Ensure one details record per blog
blogDetailsSchema.index({ blogId: 1 }, { unique: true });

const BlogDetails =
  mongoose.models.BlogDetails ||
  mongoose.model("BlogDetails", blogDetailsSchema);

export default BlogDetails;
