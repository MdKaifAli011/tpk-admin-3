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
    // --- Assign to level (7-level hierarchy: exam → subject → unit → chapter → topic → subtopic → definition) ---
    assignmentLevel: {
      type: String,
      enum: ["", "exam", "subject", "unit", "chapter", "topic", "subtopic", "definition"],
      default: "",
      trim: true,
    },
    assignmentSubjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: false },
    assignmentUnitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: false },
    assignmentChapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: false },
    assignmentTopicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: false },
    assignmentSubTopicId: { type: mongoose.Schema.Types.ObjectId, ref: "SubTopic", required: false },
    assignmentDefinitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Definition", required: false },
  },
  { timestamps: true }
);

blogSchema.index({ examId: 1, slug: 1 }, { unique: true, sparse: true });

blogSchema.pre("save", async function (next) {
  if (this.isModified("name") || this.isModified("examId") || this.isNew) {
    const baseSlug = createSlug(this.name);

    const checkExists = async (slug, excludeId) => {
      const query = { slug, examId: this.examId || null };
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
