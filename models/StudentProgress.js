import mongoose from "mongoose";

const studentProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    progress: {
      type: Map,
      of: {
        progress: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        isManualOverride: {
          type: Boolean,
          default: false,
        },
        manualProgress: {
          type: Number,
          default: null,
        },
        autoCalculatedProgress: {
          type: Number,
          default: 0,
        },
        visitedItems: {
          chapter: {
            type: Boolean,
            default: false,
          },
          topics: [mongoose.Schema.Types.ObjectId],
          subtopics: [mongoose.Schema.Types.ObjectId],
          definitions: [mongoose.Schema.Types.ObjectId],
        },
        congratulationsShown: {
          type: Boolean,
          default: false,
        },
      },
      default: {},
    },
    unitProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    unitCongratulationsShown: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
studentProgressSchema.index({ studentId: 1, unitId: 1 }, { unique: true });
studentProgressSchema.index({ studentId: 1 });
studentProgressSchema.index({ unitId: 1 });

const StudentProgress =
  mongoose.models.StudentProgress || mongoose.model("StudentProgress", studentProgressSchema);

export default StudentProgress;

