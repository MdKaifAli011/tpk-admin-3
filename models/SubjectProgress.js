import mongoose from "mongoose";

const subjectProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    subjectProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    subjectCongratulationsShown: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
subjectProgressSchema.index({ studentId: 1, subjectId: 1 }, { unique: true });
subjectProgressSchema.index({ studentId: 1 });
subjectProgressSchema.index({ subjectId: 1 });

const SubjectProgress =
  mongoose.models.SubjectProgress || mongoose.model("SubjectProgress", subjectProgressSchema);

export default SubjectProgress;

