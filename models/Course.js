import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug";

const courseSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      sparse: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      default: "",
    },
    hours: {
      type: String,
      trim: true,
      default: "",
    },
    lessonsRange: {
      type: String,
      trim: true,
      default: "",
    },
    durationLabel: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      default: null,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },
    orderNumber: {
      type: Number,
      default: 0,
      index: true,
    },
    // SEO
    metaTitle: { type: String, trim: true, default: "" },
    metaDescription: { type: String, trim: true, default: "" },
    keywords: { type: String, trim: true, default: "" },
    // Rich content (HTML from editor)
    content: { type: String, default: "" },
    // Sidebar/card details (public course page)
    madeFor: { type: String, trim: true, default: "" },
    mode: { type: String, trim: true, default: "" },
    target: { type: String, trim: true, default: "" },
    subjectCovered: { type: String, trim: true, default: "" },
    sessionLength: { type: String, trim: true, default: "" },
    tests: { type: String, trim: true, default: "" },
    fullLength: { type: String, trim: true, default: "" },
    feeUsaEurope: { type: String, trim: true, default: "" },
    feeIndiaMeSe: { type: String, trim: true, default: "" },
    timeZone: { type: String, trim: true, default: "" },
    batchClosingDays: { type: Number, default: null },
    callPhone: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

courseSchema.index({ examId: 1, status: 1 });

courseSchema.pre("save", async function (next) {
  if (this.isModified("title") || this.isNew) {
    const baseSlug = createSlug(this.title);
    const checkExists = async (slug, excludeId) => {
      const query = { slug, examId: this.examId };
      if (excludeId) query._id = { $ne: excludeId };
      const existing = await mongoose.models.Course?.findOne(query);
      return !!existing;
    };
    this.slug = await generateUniqueSlug(baseSlug, checkExists, this._id || null);
  }
  next();
});

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);
export default Course;
