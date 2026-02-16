import mongoose from "mongoose";

const examInfoSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      unique: true, // One ExamInfo per Exam; index created via schema.index() below
    },
    examDate: {
      type: Date,
      required: true,
    },
    examCut: {
      SC_ST: {
        type: Number,
        default: null,
      },
      OBC: {
        type: Number,
        default: null,
      },
      General: {
        type: Number,
        default: null,
      },
      NRIs: {
        type: Number,
        default: null,
      },
    },
    maximumMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    subjects: [
      {
        subjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          required: true,
        },
        subjectName: {
          type: String,
          required: true,
          trim: true,
        },
        numberOfQuestions: {
          type: Number,
          required: true,
          min: 0,
        },
        maximumMarks: {
          type: Number,
          required: true,
          min: 0,
        },
        weightage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        studyHours: {
          type: Number,
          default: null,
          min: 0,
        },
        time: {
          type: Number,
          default: null,
          min: 0,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique examId
examInfoSchema.index({ examId: 1 }, { unique: true });

// Ensure subjects array has unique subjectIds
examInfoSchema.pre("save", function (next) {
  if (this.isModified("subjects")) {
    const subjectIds = this.subjects.map((s) => String(s.subjectId));
    const uniqueIds = [...new Set(subjectIds)];
    if (subjectIds.length !== uniqueIds.length) {
      return next(new Error("Duplicate subjects are not allowed"));
    }
  }
  next();
});

const ExamInfo =
  mongoose.models.ExamInfo || mongoose.model("ExamInfo", examInfoSchema);

export default ExamInfo;
