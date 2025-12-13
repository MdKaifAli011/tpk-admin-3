import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const chapterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    orderNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    weightage: {
      type: Number,
      default: 0,
      min: 0,
    },
    time: {
      type: Number,
      default: 0,
      min: 0,
    },
    questions: {
      type: Number,
      default: 0,
      min: 0,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Add compound index to ensure unique orderNumber per unit within an exam
chapterSchema.index({ unitId: 1, orderNumber: 1 }, { unique: true });

// Compound index for unique slug per unit
chapterSchema.index({ unitId: 1, slug: 1 }, { unique: true, sparse: true });

// Pre-save hook to auto-generate slug
chapterSchema.pre("save", async function (next) {
  if (this.isModified("name") || this.isNew) {
    const baseSlug = createSlug(this.name);

    // Check if slug exists within the same unit (excluding current document for updates)
    const checkExists = async (slug, excludeId) => {
      const query = { unitId: this.unitId, slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await mongoose.models.Chapter.findOne(query);
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

// Cascading delete: When a Chapter is deleted, delete all related Definitions, Topics, and SubTopics
chapterSchema.pre("findOneAndDelete", async function () {
  try {
    const chapter = await this.model.findOne(this.getQuery());
    if (chapter) {
      console.log(
        `🗑️ Cascading delete: Deleting all entities for chapter ${chapter._id}`
      );

      // Get models - dynamically import if not already registered
      const Topic =
        mongoose.models.Topic || (await import("./Topic.js")).default;
      const SubTopic =
        mongoose.models.SubTopic || (await import("./SubTopic.js")).default;
      const Definition =
        mongoose.models.Definition || (await import("./Definition.js")).default;
      const DefinitionDetails =
        mongoose.models.DefinitionDetails ||
        (await import("./DefinitionDetails.js")).default;
      const ChapterDetails =
        mongoose.models.ChapterDetails ||
        (await import("./ChapterDetails.js")).default;
      const PracticeSubCategory =
        mongoose.models.PracticeSubCategory ||
        (await import("./PracticeSubCategory.js")).default;
      const PracticeQuestion =
        mongoose.models.PracticeQuestion ||
        (await import("./PracticeQuestion.js")).default;

      // Delete chapter details first
      const chapterDetailsResult = await ChapterDetails.deleteMany({
        chapterId: chapter._id,
      });
      console.log(
        `🗑️ Cascading delete: Deleted ${chapterDetailsResult.deletedCount} ChapterDetails for chapter ${chapter._id}`
      );

      // Find all definitions in this chapter
      const definitions = await Definition.find({ chapterId: chapter._id });
      const definitionIds = definitions.map((definition) => definition._id);
      console.log(
        `🗑️ Found ${definitions.length} definitions for chapter ${chapter._id}`
      );

      // Delete all definition details
      let definitionDetailsResult = { deletedCount: 0 };
      if (definitionIds.length > 0) {
        definitionDetailsResult = await DefinitionDetails.deleteMany({
          definitionId: { $in: definitionIds },
        });
      }
      console.log(
        `🗑️ Cascading delete: Deleted ${definitionDetailsResult.deletedCount} DefinitionDetails for chapter ${chapter._id}`
      );

      // Delete all definitions in this chapter
      const definitionsResult = await Definition.deleteMany({
        chapterId: chapter._id,
      });
      console.log(
        `🗑️ Cascading delete: Deleted ${definitionsResult.deletedCount} Definitions for chapter ${chapter._id}`
      );

      // Find all topics in this chapter
      const topics = await Topic.find({ chapterId: chapter._id });
      const topicIds = topics.map((topic) => topic._id);
      console.log(
        `🗑️ Found ${topics.length} topics for chapter ${chapter._id}`
      );

      // Delete all subtopics in these topics
      let subTopicsResult = { deletedCount: 0 };
      if (topicIds.length > 0) {
        subTopicsResult = await SubTopic.deleteMany({
          topicId: { $in: topicIds },
        });
      }
      console.log(
        `🗑️ Cascading delete: Deleted ${subTopicsResult.deletedCount} SubTopics for chapter ${chapter._id}`
      );

      // Delete all topics in this chapter
      const topicsResult = await Topic.deleteMany({ chapterId: chapter._id });
      console.log(
        `🗑️ Cascading delete: Deleted ${topicsResult.deletedCount} Topics for chapter ${chapter._id}`
      );

      // Find all practice subcategories for this chapter
      const practiceSubCategories = await PracticeSubCategory.find({
        chapterId: chapter._id,
      });
      const practiceSubCategoryIds = practiceSubCategories.map(
        (subCategory) => subCategory._id
      );
      console.log(
        `🗑️ Found ${practiceSubCategories.length} practice subcategories for chapter ${chapter._id}`
      );

      // Delete all practice questions in these subcategories
      let practiceQuestionsResult = { deletedCount: 0 };
      if (practiceSubCategoryIds.length > 0) {
        practiceQuestionsResult = await PracticeQuestion.deleteMany({
          subCategoryId: { $in: practiceSubCategoryIds },
        });
      }
      console.log(
        `🗑️ Cascading delete: Deleted ${practiceQuestionsResult.deletedCount} PracticeQuestions for chapter ${chapter._id}`
      );

      // Delete all practice subcategories
      const practiceSubCategoriesResult = await PracticeSubCategory.deleteMany({
        chapterId: chapter._id,
      });
      console.log(
        `🗑️ Cascading delete: Deleted ${practiceSubCategoriesResult.deletedCount} PracticeSubCategories for chapter ${chapter._id}`
      );
    }
  } catch (error) {
    console.error("❌ Error in Chapter cascading delete middleware:", error);
    // Don't throw - allow the delete to continue even if cascading fails
  }
});

const Chapter =
  mongoose.models.Chapter || mongoose.model("Chapter", chapterSchema);

export default Chapter;
