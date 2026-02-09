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
      unique: true,
      sparse: true,
      trim: true,
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
  },
  { timestamps: true }
);

pageSchema.index({ slug: 1 });
pageSchema.index({ status: 1 });

// Pre-save hook to auto-generate slug from title
pageSchema.pre("save", async function (next) {
  if (this.isModified("title") || this.isNew) {
    const baseSlug = createSlug(this.title);

    const checkExists = async (slug, excludeId) => {
      const query = { slug };
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
