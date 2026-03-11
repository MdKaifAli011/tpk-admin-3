import mongoose from "mongoose";
import Subject from "./Subject.js";
import Exam from "./Exam.js";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const unitSchema = new mongoose.Schema(
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
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    time: {
      type: Number,
      default: 0,
      min: 0,
    },
    weightage: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    /** True when admin manually set this item to inactive; cascade activate will skip it and its subtree */
    manualInactive: {
      type: Boolean,
      default: false,
    },
    visitStats: {
      totalVisits: { type: Number, default: 0 },
      todayVisits: { type: Number, default: 0 },
      uniqueVisits: { type: Number, default: 0 },
      lastUpdated: { type: Date },
    },
  },
  { timestamps: true },
);

// Add compound index to ensure unique orderNumber per subject within an exam
unitSchema.index({ subjectId: 1, orderNumber: 1 }, { unique: true });

// Compound index for unique slug per subject
unitSchema.index({ subjectId: 1, slug: 1 }, { unique: true, sparse: true });

// Pre-save hook to auto-generate slug (skip if slug already set, e.g. by bulk import)
unitSchema.pre("save", async function (next) {
  if (
    (this.isModified("name") || this.isNew) &&
    (!this.slug || this.slug === "")
  ) {
    const baseSlug = createSlug(this.name);

    // Check if slug exists within the same subject (excluding current document for updates)
    const checkExists = async (slug, excludeId) => {
      const query = { subjectId: this.subjectId, slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await mongoose.models.Unit.findOne(query);
      return !!existing;
    };

    this.slug = await generateUniqueSlug(
      baseSlug,
      checkExists,
      this._id || null,
    );
  }
  next();
});

// Cascading delete: When a Unit is deleted, delete all related Chapters, Definitions, Topics, and SubTopics
unitSchema.pre("findOneAndDelete", async function () {
  try {
    const unit = await this.model.findOne(this.getQuery());
    if (unit) {
      console.log(
        `🗑️ Cascading delete: Deleting all entities for unit ${unit._id}`,
      );

      // Get models - dynamically import if not already registered
      const Chapter =
        mongoose.models.Chapter || (await import("./Chapter.js")).default;
      const Topic =
        mongoose.models.Topic || (await import("./Topic.js")).default;
      const SubTopic =
        mongoose.models.SubTopic || (await import("./SubTopic.js")).default;
      const Definition =
        mongoose.models.Definition || (await import("./Definition.js")).default;
      const DefinitionDetails =
        mongoose.models.DefinitionDetails ||
        (await import("./DefinitionDetails.js")).default;
      const UnitDetails =
        mongoose.models.UnitDetails ||
        (await import("./UnitDetails.js")).default;
      const PracticeSubCategory =
        mongoose.models.PracticeSubCategory ||
        (await import("./PracticeSubCategory.js")).default;
      const PracticeQuestion =
        mongoose.models.PracticeQuestion ||
        (await import("./PracticeQuestion.js")).default;

      // Step 1: Find all related entities in parallel
      const [chapters, practiceSubCategories] = await Promise.all([
        Chapter.find({ unitId: unit._id }).select("_id").lean(),
        PracticeSubCategory.find({ unitId: unit._id }).select("_id").lean(),
      ]);

      const chapterIds = chapters.map((c) => c._id);
      const practiceSubCategoryIds = practiceSubCategories.map((sc) => sc._id);

      console.log(
        `🗑️ Found ${chapters.length} chapters and ${practiceSubCategories.length} practice subcategories for unit ${unit._id}`,
      );

      // Step 2: Find definitions and topics in parallel
      const [definitions, topics] = await Promise.all([
        chapterIds.length > 0
          ? Definition.find({ chapterId: { $in: chapterIds } })
              .select("_id")
              .lean()
          : Promise.resolve([]),
        chapterIds.length > 0
          ? Topic.find({ chapterId: { $in: chapterIds } })
              .select("_id")
              .lean()
          : Promise.resolve([]),
      ]);

      const definitionIds = definitions.map((d) => d._id);
      const topicIds = topics.map((t) => t._id);

      console.log(
        `🗑️ Found ${definitions.length} definitions and ${topics.length} topics for unit ${unit._id}`,
      );

      // Step 3: Delete all independent entities in parallel
      const [unitDetailsResult, chaptersResult, practiceSubCategoriesResult] =
        await Promise.all([
          UnitDetails.deleteMany({ unitId: unit._id }),
          Chapter.deleteMany({ unitId: unit._id }),
          PracticeSubCategory.deleteMany({ unitId: unit._id }),
        ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${unitDetailsResult.deletedCount} UnitDetails, ${chaptersResult.deletedCount} Chapters, ${practiceSubCategoriesResult.deletedCount} PracticeSubCategories for unit ${unit._id}`,
      );

      // Step 4: Delete definitions and topics in parallel
      const [definitionsResult, topicsResult] = await Promise.all([
        chapterIds.length > 0
          ? Definition.deleteMany({ chapterId: { $in: chapterIds } })
          : Promise.resolve({ deletedCount: 0 }),
        chapterIds.length > 0
          ? Topic.deleteMany({ chapterId: { $in: chapterIds } })
          : Promise.resolve({ deletedCount: 0 }),
      ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${definitionsResult.deletedCount} Definitions, ${topicsResult.deletedCount} Topics for unit ${unit._id}`,
      );

      // Step 5: Delete dependent entities in parallel
      const [
        definitionDetailsResult,
        subTopicsResult,
        practiceQuestionsResult,
      ] = await Promise.all([
        definitionIds.length > 0
          ? DefinitionDetails.deleteMany({
              definitionId: { $in: definitionIds },
            })
          : Promise.resolve({ deletedCount: 0 }),
        topicIds.length > 0
          ? SubTopic.deleteMany({ topicId: { $in: topicIds } })
          : Promise.resolve({ deletedCount: 0 }),
        practiceSubCategoryIds.length > 0
          ? PracticeQuestion.deleteMany({
              subCategoryId: { $in: practiceSubCategoryIds },
            })
          : Promise.resolve({ deletedCount: 0 }),
      ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${definitionDetailsResult.deletedCount} DefinitionDetails, ${subTopicsResult.deletedCount} SubTopics, ${practiceQuestionsResult.deletedCount} PracticeQuestions for unit ${unit._id}`,
      );
    }
  } catch (error) {
    console.error("❌ Error in Unit cascading delete middleware:", error);
    // Don't throw - allow the delete to continue even if cascading fails
  }
});

const Unit = mongoose.models.Unit || mongoose.model("Unit", unitSchema);

export default Unit;
