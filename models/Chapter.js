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

      // Step 1: Find all related entities in parallel
      const [definitions, topics, practiceSubCategories] = await Promise.all([
        Definition.find({ chapterId: chapter._id }).select("_id").lean(),
        Topic.find({ chapterId: chapter._id }).select("_id").lean(),
        PracticeSubCategory.find({ chapterId: chapter._id }).select("_id").lean(),
      ]);

      const definitionIds = definitions.map((d) => d._id);
      const topicIds = topics.map((t) => t._id);
      const practiceSubCategoryIds = practiceSubCategories.map((sc) => sc._id);

      console.log(
        `🗑️ Found ${definitions.length} definitions, ${topics.length} topics, and ${practiceSubCategories.length} practice subcategories for chapter ${chapter._id}`
      );

      // Step 2: Delete all independent entities in parallel
      const [
        chapterDetailsResult,
        definitionsResult,
        topicsResult,
        practiceSubCategoriesResult,
      ] = await Promise.all([
        ChapterDetails.deleteMany({ chapterId: chapter._id }),
        Definition.deleteMany({ chapterId: chapter._id }),
        Topic.deleteMany({ chapterId: chapter._id }),
        PracticeSubCategory.deleteMany({ chapterId: chapter._id }),
      ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${chapterDetailsResult.deletedCount} ChapterDetails, ${definitionsResult.deletedCount} Definitions, ${topicsResult.deletedCount} Topics, ${practiceSubCategoriesResult.deletedCount} PracticeSubCategories for chapter ${chapter._id}`
      );

      // Step 3: Delete dependent entities in parallel
      const [definitionDetailsResult, subTopicsResult, practiceQuestionsResult] = await Promise.all([
        definitionIds.length > 0
          ? DefinitionDetails.deleteMany({ definitionId: { $in: definitionIds } })
          : Promise.resolve({ deletedCount: 0 }),
        topicIds.length > 0
          ? SubTopic.deleteMany({ topicId: { $in: topicIds } })
          : Promise.resolve({ deletedCount: 0 }),
        practiceSubCategoryIds.length > 0
          ? PracticeQuestion.deleteMany({ subCategoryId: { $in: practiceSubCategoryIds } })
          : Promise.resolve({ deletedCount: 0 }),
      ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${definitionDetailsResult.deletedCount} DefinitionDetails, ${subTopicsResult.deletedCount} SubTopics, ${practiceQuestionsResult.deletedCount} PracticeQuestions for chapter ${chapter._id}`
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
