import mongoose from "mongoose";
import { STATUS } from "../constants/index.js";

const practiceSubCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeCategory",
      required: true,
    },
    // Hierarchical references
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
    // Paper details
    duration: {
      type: String,
      trim: true,
      default: "",
    },
    maximumMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    numberOfQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE],
      default: STATUS.ACTIVE,
    },
    // Optional: Order number for subcategory within a category
    orderNumber: {
      type: Number,
      min: 1,
    },
    // Optional: Description for the subcategory
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // URL-friendly slug
    slug: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allow nulls while still being unique
    },
    // SEO Data
    seoData: {
      metaTitle: { type: String, trim: true },
      metaDescription: { type: String, trim: true },
      metaKeywords: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

// Ensure unique subcategory name per category
practiceSubCategorySchema.index({ categoryId: 1, name: 1 }, { unique: true });

// Index for better query performance
// Index for better query performance
practiceSubCategorySchema.index({ categoryId: 1, status: 1 });
practiceSubCategorySchema.index({ unitId: 1, status: 1 });
practiceSubCategorySchema.index({ chapterId: 1, status: 1 });
practiceSubCategorySchema.index({ topicId: 1, status: 1 });
practiceSubCategorySchema.index({ subTopicId: 1, status: 1 });
practiceSubCategorySchema.index({ status: 1 });
practiceSubCategorySchema.index({ createdAt: -1 });

// Ensure unique ordering per category only when orderNumber is set
practiceSubCategorySchema.index(
  { categoryId: 1, orderNumber: 1 },
  { unique: true, partialFilterExpression: { orderNumber: { $exists: true } } }
);

// Cascading delete: When a PracticeSubCategory is deleted, delete all related PracticeQuestions
practiceSubCategorySchema.pre("findOneAndDelete", async function () {
  try {
    const subCategory = await this.model.findOne(this.getQuery());
    if (subCategory) {
      console.log(
        `🗑️ Cascading delete: Deleting practice subcategory ${subCategory._id}`
      );
      // Get model - dynamically import if not already registered
      const PracticeQuestion = mongoose.models.PracticeQuestion || (await import("./PracticeQuestion.js")).default;
      const result = await PracticeQuestion.deleteMany({
        subCategoryId: subCategory._id,
      });
      console.log(
        `🗑️ Cascading delete: Deleted ${result.deletedCount} PracticeQuestions for subcategory ${subCategory._id}`
      );
    }
  } catch (error) {
    console.error(
      "❌ Error in PracticeSubCategory cascading delete middleware:",
      error
    );
    // Don't throw - allow the delete to continue even if cascading fails
  }
});

// Ensure the latest schema is used during dev hot-reload
if (mongoose.connection?.models?.PracticeSubCategory) {
  delete mongoose.connection.models.PracticeSubCategory;
}

const PracticeSubCategory = mongoose.model(
  "PracticeSubCategory",
  practiceSubCategorySchema
);

export default PracticeSubCategory;
