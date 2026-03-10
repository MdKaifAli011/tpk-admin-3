import mongoose from "mongoose";
import Exam from "./Exam.js";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const subjectSchema = new mongoose.Schema(
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
    // Order number for subject within an exam (independent per exam)
    orderNumber: {
      type: Number,
      min: 1,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    explicitlyInactive: {
      type: Boolean,
      default: false,
    },
    practiceDisabled: {
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
  { timestamps: true }
);

// Compound index for unique slug per exam
subjectSchema.index({ examId: 1, slug: 1 }, { unique: true, sparse: true });

// Ensure unique ordering per exam only when orderNumber is set
// This keeps order numbers independent per exam and avoids conflicts for docs without orderNumber
subjectSchema.index(
  { examId: 1, orderNumber: 1 },
  { unique: true, partialFilterExpression: { orderNumber: { $exists: true } } }
);

// Pre-save hook to auto-generate slug
subjectSchema.pre("save", async function (next) {
  if (this.isModified("name") || this.isNew) {
    const baseSlug = createSlug(this.name);
    
    // Check if slug exists within the same exam (excluding current document for updates)
    const checkExists = async (slug, excludeId) => {
      const query = { examId: this.examId, slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await mongoose.models.Subject.findOne(query);
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

// Cascading delete: When a Subject is deleted, delete all related Units, Chapters, Definitions, Topics, and SubTopics
subjectSchema.pre("findOneAndDelete", async function () {
  try {
    const subject = await this.model.findOne(this.getQuery());
    if (subject) {
      console.log(
        `🗑️ Cascading delete: Deleting all entities for subject ${subject._id}`
      );

      // Get models - dynamically import if not already registered
      const Unit = mongoose.models.Unit || (await import("./Unit.js")).default;
      const Chapter = mongoose.models.Chapter || (await import("./Chapter.js")).default;
      const Topic = mongoose.models.Topic || (await import("./Topic.js")).default;
      const SubTopic = mongoose.models.SubTopic || (await import("./SubTopic.js")).default;
      const Definition = mongoose.models.Definition || (await import("./Definition.js")).default;
      const DefinitionDetails = mongoose.models.DefinitionDetails || (await import("./DefinitionDetails.js")).default;
      const SubjectDetails = mongoose.models.SubjectDetails || (await import("./SubjectDetails.js")).default;
      const PracticeCategory = mongoose.models.PracticeCategory || (await import("./PracticeCategory.js")).default;
      const PracticeSubCategory = mongoose.models.PracticeSubCategory || (await import("./PracticeSubCategory.js")).default;
      const PracticeQuestion = mongoose.models.PracticeQuestion || (await import("./PracticeQuestion.js")).default;

      // Step 1: Find all related entities in parallel (where possible)
      const [units, practiceCategories] = await Promise.all([
        Unit.find({ subjectId: subject._id }).select("_id").lean(),
        PracticeCategory.find({ subjectId: subject._id }).select("_id").lean(),
      ]);

      const unitIds = units.map((u) => u._id);
      const practiceCategoryIds = practiceCategories.map((c) => c._id);

      console.log(
        `🗑️ Found ${units.length} units and ${practiceCategories.length} practice categories for subject ${subject._id}`
      );

      // Step 2: Find chapters and practice subcategories in parallel
      const [chapters, practiceSubCategories] = await Promise.all([
        unitIds.length > 0
          ? Chapter.find({ unitId: { $in: unitIds } }).select("_id").lean()
          : Promise.resolve([]),
        practiceCategoryIds.length > 0
          ? PracticeSubCategory.find({ categoryId: { $in: practiceCategoryIds } })
              .select("_id")
              .lean()
          : Promise.resolve([]),
      ]);

      const chapterIds = chapters.map((c) => c._id);
      const practiceSubCategoryIds = practiceSubCategories.map((sc) => sc._id);

      console.log(
        `🗑️ Found ${chapters.length} chapters and ${practiceSubCategories.length} practice subcategories for subject ${subject._id}`
      );

      // Step 3: Find definitions and topics in parallel
      const [definitions, topics] = await Promise.all([
        chapterIds.length > 0
          ? Definition.find({ chapterId: { $in: chapterIds } }).select("_id").lean()
          : Promise.resolve([]),
        chapterIds.length > 0
          ? Topic.find({ chapterId: { $in: chapterIds } }).select("_id").lean()
          : Promise.resolve([]),
      ]);

      const definitionIds = definitions.map((d) => d._id);
      const topicIds = topics.map((t) => t._id);

      console.log(
        `🗑️ Found ${definitions.length} definitions and ${topics.length} topics for subject ${subject._id}`
      );

      // Step 4: Delete all independent entities in parallel
      const [
        subjectDetailsResult,
        unitsResult,
        practiceCategoriesResult,
      ] = await Promise.all([
        SubjectDetails.deleteMany({ subjectId: subject._id }),
        Unit.deleteMany({ subjectId: subject._id }),
        PracticeCategory.deleteMany({ subjectId: subject._id }),
      ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${subjectDetailsResult.deletedCount} SubjectDetails, ${unitsResult.deletedCount} Units, ${practiceCategoriesResult.deletedCount} PracticeCategories for subject ${subject._id}`
      );

      // Step 5: Delete chapters, topics, definitions, and practice subcategories in parallel
      const [
        chaptersResult,
        topicsResult,
        definitionsResult,
        practiceSubCategoriesResult,
      ] = await Promise.all([
        unitIds.length > 0
          ? Chapter.deleteMany({ unitId: { $in: unitIds } })
          : Promise.resolve({ deletedCount: 0 }),
        chapterIds.length > 0
          ? Topic.deleteMany({ chapterId: { $in: chapterIds } })
          : Promise.resolve({ deletedCount: 0 }),
        chapterIds.length > 0
          ? Definition.deleteMany({ chapterId: { $in: chapterIds } })
          : Promise.resolve({ deletedCount: 0 }),
        practiceCategoryIds.length > 0
          ? PracticeSubCategory.deleteMany({ categoryId: { $in: practiceCategoryIds } })
          : Promise.resolve({ deletedCount: 0 }),
      ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${chaptersResult.deletedCount} Chapters, ${topicsResult.deletedCount} Topics, ${definitionsResult.deletedCount} Definitions, ${practiceSubCategoriesResult.deletedCount} PracticeSubCategories for subject ${subject._id}`
      );

      // Step 6: Delete dependent entities in parallel
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
        `🗑️ Cascading delete: Deleted ${definitionDetailsResult.deletedCount} DefinitionDetails, ${subTopicsResult.deletedCount} SubTopics, ${practiceQuestionsResult.deletedCount} PracticeQuestions for subject ${subject._id}`
      );
    }
  } catch (error) {
    console.error("❌ Error in Subject cascading delete middleware:", error);
    // Don't throw - allow the delete to continue even if cascading fails
  }
});

// Ensure the latest schema is used during dev hot-reload
// If a previous version of the model exists (with an outdated schema), delete it first
if (mongoose.connection?.models?.Subject) {
  delete mongoose.connection.models.Subject;
}

const Subject = mongoose.model("Subject", subjectSchema);

export default Subject;
