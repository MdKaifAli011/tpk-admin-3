import mongoose from "mongoose";

const topperSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    percentile: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    attempt: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    year: { type: Number, default: null }, // optional: filter toppers by session year
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
      unique: true,
    },
    bannerImage: { type: String, trim: true, default: "" },
    bannerTitle: { type: String, trim: true, default: "" },
    bannerSubtitle: { type: String, trim: true, default: "" },
    /** Session years shown as tabs (e.g. [2025, 2024, 2023]). Content can be per-session by filtering toppers by year if needed. */
    sessions: [{ type: Number }],
    /** Toppers list (can be filtered by session/year on frontend or store year in each topper if needed). */
    toppers: [topperSchema],
    targetAchievers: [targetAchieverSchema],
    highlights: [{ type: String, trim: true }],
    studentTestimonials: [testimonialSchema],
    parentTestimonials: [testimonialSchema],
  },
  { timestamps: true }
);

const ExamResultPage =
  mongoose.models.ExamResultPage ||
  mongoose.model("ExamResultPage", examResultPageSchema);
export default ExamResultPage;
