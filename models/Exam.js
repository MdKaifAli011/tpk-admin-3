import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    orderNumber: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },
    // When true, parent activate cascade will not set this to active (user explicitly deactivated this)
    explicitlyInactive: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String, // URL to the image
      trim: true,
    },
    description: {
      type: [String], // Array of up to 4 description items
      validate: [
        (val) => val.length <= 4,
        "{PATH} exceeds the limit of 4 items",
      ],
      default: [],
    },
    // Cached visit stats (updated by cron 3–4am); avoids N API calls on list load
    visitStats: {
      totalVisits: { type: Number, default: 0 },
      todayVisits: { type: Number, default: 0 },
      uniqueVisits: { type: Number, default: 0 },
      lastUpdated: { type: Date },
    },
  },
  { timestamps: true }
);

// No explicit index for slug needed as unique: true already creates one
// orderNumber index is handled inline above

// Pre-save hook to auto-generate slug
examSchema.pre("save", async function (next) {
  if (this.isModified("name") || this.isNew) {
    const baseSlug = createSlug(this.name);

    // Check if slug exists (excluding current document for updates)
    const checkExists = async (slug, excludeId) => {
      const query = { slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await mongoose.models.Exam.findOne(query);
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

// Cascading delete: When an Exam is deleted, delete all related Subjects, Units, Chapters, Definitions, Topics, and SubTopics
examSchema.pre("findOneAndDelete", async function () {
  try {
    const exam = await this.model.findOne(this.getQuery());
    if (exam) {
      console.log(
        `🗑️ Cascading delete: Deleting all entities for exam ${exam._id}`
      );

      // Get models - dynamically import if not already registered
      const Subject = mongoose.models.Subject || (await import("./Subject.js")).default;
      const Unit = mongoose.models.Unit || (await import("./Unit.js")).default;
      const Chapter = mongoose.models.Chapter || (await import("./Chapter.js")).default;
      const Topic = mongoose.models.Topic || (await import("./Topic.js")).default;
      const SubTopic = mongoose.models.SubTopic || (await import("./SubTopic.js")).default;
      const Definition = mongoose.models.Definition || (await import("./Definition.js")).default;
      const DefinitionDetails = mongoose.models.DefinitionDetails || (await import("./DefinitionDetails.js")).default;
      const ExamDetails = mongoose.models.ExamDetails || (await import("./ExamDetails.js")).default;
      const PracticeCategory = mongoose.models.PracticeCategory || (await import("./PracticeCategory.js")).default;
      const PracticeSubCategory = mongoose.models.PracticeSubCategory || (await import("./PracticeSubCategory.js")).default;
      const PracticeQuestion = mongoose.models.PracticeQuestion || (await import("./PracticeQuestion.js")).default;

      // Step 1: Find all related entities that need IDs for dependent deletes (parallel)
      const [definitions, practiceCategories] = await Promise.all([
        Definition.find({ examId: exam._id }).select("_id").lean(),
        PracticeCategory.find({ examId: exam._id }).select("_id").lean(),
      ]);

      const definitionIds = definitions.map((d) => d._id);
      const practiceCategoryIds = practiceCategories.map((c) => c._id);

      console.log(
        `🗑️ Found ${definitions.length} definitions and ${practiceCategories.length} practice categories for exam ${exam._id}`
      );

      // Step 2: Find practice subcategories (depends on practiceCategoryIds)
      const practiceSubCategories = practiceCategoryIds.length > 0
        ? await PracticeSubCategory.find({
          categoryId: { $in: practiceCategoryIds },
        })
          .select("_id")
          .lean()
        : [];
      const practiceSubCategoryIds = practiceSubCategories.map((sc) => sc._id);

      console.log(
        `🗑️ Found ${practiceSubCategories.length} practice subcategories for exam ${exam._id}`
      );

      // Step 3: Delete all independent entities in parallel (all have examId directly)
      const [
        examDetailsResult,
        subTopicsResult,
        topicsResult,
        chaptersResult,
        unitsResult,
        subjectsResult,
        definitionsResult,
        practiceCategoriesResult,
      ] = await Promise.all([
        ExamDetails.deleteMany({ examId: exam._id }),
        SubTopic.deleteMany({ examId: exam._id }),
        Topic.deleteMany({ examId: exam._id }),
        Chapter.deleteMany({ examId: exam._id }),
        Unit.deleteMany({ examId: exam._id }),
        Subject.deleteMany({ examId: exam._id }),
        Definition.deleteMany({ examId: exam._id }),
        PracticeCategory.deleteMany({ examId: exam._id }),
      ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${examDetailsResult.deletedCount} ExamDetails, ${subTopicsResult.deletedCount} SubTopics, ${topicsResult.deletedCount} Topics, ${chaptersResult.deletedCount} Chapters, ${unitsResult.deletedCount} Units, ${subjectsResult.deletedCount} Subjects, ${definitionsResult.deletedCount} Definitions, ${practiceCategoriesResult.deletedCount} PracticeCategories for exam ${exam._id}`
      );

      // Step 4: Delete dependent entities in parallel (after parent deletes)
      const [definitionDetailsResult, practiceQuestionsResult, practiceSubCategoriesResult] = await Promise.all([
        definitionIds.length > 0
          ? DefinitionDetails.deleteMany({ definitionId: { $in: definitionIds } })
          : Promise.resolve({ deletedCount: 0 }),
        practiceSubCategoryIds.length > 0
          ? PracticeQuestion.deleteMany({ subCategoryId: { $in: practiceSubCategoryIds } })
          : Promise.resolve({ deletedCount: 0 }),
        practiceCategoryIds.length > 0
          ? PracticeSubCategory.deleteMany({ categoryId: { $in: practiceCategoryIds } })
          : Promise.resolve({ deletedCount: 0 }),
      ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${definitionDetailsResult.deletedCount} DefinitionDetails, ${practiceQuestionsResult.deletedCount} PracticeQuestions, ${practiceSubCategoriesResult.deletedCount} PracticeSubCategories for exam ${exam._id}`
      );
    }
  } catch (error) {
    console.error("❌ Error in Exam cascading delete middleware:", error);
    // Don't throw - allow the delete to continue even if cascading fails
  }
});

const Exam = mongoose.models.Exam || mongoose.model("Exam", examSchema);

export default Exam;
