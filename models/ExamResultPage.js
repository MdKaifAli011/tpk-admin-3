import mongoose from "mongoose";

const topperSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    /** Shown as "Score" on the result page (percentile, marks, band, etc.). */
    percentile: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    attempt: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" }, // Image URL or YouTube video URL
  },
  { _id: true }
);

const targetAchieverSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    text: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const examResultPageSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    /** Year for this result page (e.g. 2025, 2026). One document per exam per year. Legacy: null = single doc per exam. */
    year: { type: Number, default: null },
    /** active = shown on public result page; inactive = hidden. */
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    /** @deprecated Kept for legacy data; public hero no longer uses a single banner photo. */
    bannerImage: { type: String, trim: true, default: "" },
    bannerTitle: { type: String, trim: true, default: "" },
    bannerSubtitle: { type: String, trim: true, default: "" },
    /** Second banner row: left and right images (URLs), shown in a responsive two-column layout. */
    bannerImageLeft: { type: String, trim: true, default: "" },
    bannerImageRight: { type: String, trim: true, default: "" },
    toppers: [topperSchema],
    targetAchievers: [targetAchieverSchema],
    highlights: [{ type: String, trim: true }],
    studentTestimonials: [testimonialSchema],
    parentTestimonials: [testimonialSchema],
  },
  { timestamps: true }
);

examResultPageSchema.index({ examId: 1, year: 1 }, { unique: true });

const ExamResultPage =
  mongoose.models.ExamResultPage ||
  mongoose.model("ExamResultPage", examResultPageSchema);
export default ExamResultPage;
