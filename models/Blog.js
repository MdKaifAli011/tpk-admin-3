import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug";

const blogSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      // Legacy field - kept for backward compatibility
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogCategory",
      required: false,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: false, // Can be general blog or exam specific
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "draft",
    },
    image: {
      type: String,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
      default: "Admin",
    },
    publishDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for slug
blogSchema.index({ slug: 1 });
blogSchema.index({ examId: 1 });

// Pre-save hook to auto-generate slug
blogSchema.pre("save", async function (next) {
  if (this.isModified("name") || this.isNew) {
    const baseSlug = createSlug(this.name);

    const checkExists = async (slug, excludeId) => {
      const query = { slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await mongoose.models.Blog?.findOne(query);
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

// Cascading delete: When Blog is deleted, delete its details and comments
blogSchema.pre("findOneAndDelete", async function () {
  try {
    const blog = await this.model.findOne(this.getQuery());
    if (blog) {
      const BlogDetails =
        mongoose.models.BlogDetails || (await import("./BlogDetails")).default;
      const BlogComment =
        mongoose.models.BlogComment || (await import("./BlogComment")).default;

      // Delete blog details
      await BlogDetails.deleteMany({ blogId: blog._id });
      console.log(`🗑️ Cascading delete: Deleted details for blog ${blog._id}`);

      // Delete blog comments
      const commentsResult = await BlogComment.deleteMany({ blogId: blog._id });
      console.log(
        `🗑️ Cascading delete: Deleted ${commentsResult.deletedCount} comment(s) for blog ${blog._id}`
      );
    }
  } catch (error) {
    console.error("❌ Error in Blog cascading delete middleware:", error);
  }
});

const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

export default Blog;
