import mongoose from "mongoose";
import { STATUS } from "@/constants";

const practiceQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    optionA: {
      type: String,
      required: true,
      trim: true,
    },
    optionB: {
      type: String,
      required: true,
      trim: true,
    },
    optionC: {
      type: String,
      required: true,
      trim: true,
    },
    optionD: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D"],
      uppercase: true,
    },
    videoLink: {
      type: String,
      trim: true,
      default: "",
    },
    detailsExplanation: {
      type: String,
      trim: true,
      default: "",
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeSubCategory",
      required: true,
    },
    status: {
      type: String,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE],
      default: STATUS.ACTIVE,
    },
    // Optional: Order number for question within a subcategory
    orderNumber: {
      type: Number,
      min: 1,
    },
  },
  { timestamps: true }
);

// Index for better query performance
practiceQuestionSchema.index({ subCategoryId: 1, status: 1 });
practiceQuestionSchema.index({ status: 1 });
practiceQuestionSchema.index({ createdAt: -1 });

// Ensure unique ordering per subcategory only when orderNumber is set
// Note: This index covers queries on subCategoryId + orderNumber, so separate index not needed
practiceQuestionSchema.index(
  { subCategoryId: 1, orderNumber: 1 },
  { unique: true, partialFilterExpression: { orderNumber: { $exists: true } } }
);

// Ensure the latest schema is used during dev hot-reload
if (mongoose.connection?.models?.PracticeQuestion) {
  delete mongoose.connection.models.PracticeQuestion;
}

const PracticeQuestion = mongoose.model("PracticeQuestion", practiceQuestionSchema);

export default PracticeQuestion;

