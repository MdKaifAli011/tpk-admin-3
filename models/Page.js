import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug";

const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    // When set, page is under /self-study/[exam]/pages/[slug]; when null, under /self-study/pages/[slug]
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
    },
    content: {
      type: String,
      default: "",
    },
    // active: show in UI, index + follow | draft: show in UI, noindex + nofollow | inactive: hide from UI, noindex + nofollow
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "draft",
    },
    metaDescription: {
      type: String,
      trim: true,
      default: "",
    },
    keywords: {
      type: String,
      trim: true,
      default: "",
    },
    // Soft delete: when set, page is hidden from public and can be restored in admin
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Unique slug per scope: one (null, slug) for site-level, one (examId, slug) per exam
pageSchema.index({ exam: 1, slug: 1 }, { unique: true, sparse: true });
pageSchema.index({ status: 1 });
pageSchema.index({ deletedAt: 1 });

// Pre-save hook to auto-generate slug from title (scoped by exam)
pageSchema.pre("save", async function (next) {
  if (this.isModified("title") || this.isNew) {
    const baseSlug = createSlug(this.title);
    const examId = this.exam || null;

    const checkExists = async (slug, excludeId) => {
      const query = { slug, exam: examId };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await mongoose.models.Page?.findOne(query);
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

const Page = mongoose.models.Page || mongoose.model("Page", pageSchema);

export default Page;
