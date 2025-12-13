import mongoose from "mongoose";

const studentTestResultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeSubCategory",
      required: true,
    },
    // Hierarchical references
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: null,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      default: null,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      default: null,
    },
    subTopicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubTopic",
      default: null,
    },
    // Test results
    totalQuestions: {
      type: Number,
      required: true,
      min: 0,
    },
    correctCount: {
      type: Number,
      required: true,
      min: 0,
    },
    incorrectCount: {
      type: Number,
      required: true,
      min: 0,
    },
    unansweredCount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
      set: (v) => Math.round(v * 100) / 100,
    },
    maximumMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      set: (v) => Math.round(v * 100) / 100,
    },
    timeTaken: {
      type: Number, // in seconds
      required: true,
      min: 0,
    },
    // Answers map: questionId -> answer (A, B, C, D)
    answers: {
      type: Map,
      of: String,
      default: {},
    },
    // Question-wise results
    questionResults: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PracticeQuestion",
          required: true,
        },
        question: {
          type: String,
          required: true,
        },
        userAnswer: {
          type: String,
          enum: ["A", "B", "C", "D"],
          required: false,
        },
        correctAnswer: {
          type: String,
          required: true,
          enum: ["A", "B", "C", "D"],
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
        marks: {
          type: Number,
          required: true,
        },
      },
    ],
    // Metadata
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
// Note: Compound index on studentId + testId covers queries on studentId alone
studentTestResultSchema.index({ studentId: 1, testId: 1 });
studentTestResultSchema.index({ studentId: 1, submittedAt: -1 });
studentTestResultSchema.index({ testId: 1 });
studentTestResultSchema.index({ studentId: 1, examId: 1 });
studentTestResultSchema.index({ studentId: 1, subjectId: 1 });

// Compound index to get best score per test
// Note: This overlaps with { studentId: 1, testId: 1 } but adds percentage for sorting
studentTestResultSchema.index({ studentId: 1, testId: 1, percentage: -1 });

// Pre-save validation hook to ensure data integrity
studentTestResultSchema.pre("save", function (next) {
  // Ensure totalQuestions matches the sum of counts
  const calculatedTotal =
    this.correctCount + this.incorrectCount + this.unansweredCount;
  if (this.totalQuestions !== calculatedTotal) {
    console.warn(
      `Total questions mismatch: ${this.totalQuestions} vs calculated ${calculatedTotal}`
    );
    if (Math.abs(this.totalQuestions - calculatedTotal) <= 1) {
      this.totalQuestions = calculatedTotal;
    }
  }

  // Ensure percentage is within valid range
  if (this.percentage < 0) {
    this.percentage = 0;
  } else if (this.percentage > 100) {
    this.percentage = 100;
  }

  // Ensure totalMarks is not negative
  if (this.totalMarks < 0) {
    this.totalMarks = 0;
  }

  // Ensure totalMarks doesn't exceed maximumMarks
  if (this.totalMarks > this.maximumMarks) {
    this.totalMarks = this.maximumMarks;
  }

  next();
});

const StudentTestResult =
  mongoose.models.StudentTestResult ||
  mongoose.model("StudentTestResult", studentTestResultSchema);

export default StudentTestResult;

