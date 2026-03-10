import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const topicSchema = new mongoose.Schema(
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
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
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
    explicitlyInactive: {
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

// Add compound index to ensure unique orderNumber per chapter within an exam
topicSchema.index({ chapterId: 1, orderNumber: 1 }, { unique: true });

// Compound index for unique slug per chapter
topicSchema.index({ chapterId: 1, slug: 1 }, { unique: true, sparse: true });

// Pre-save hook to auto-generate slug (skip if slug already set, e.g. by bulk import)
topicSchema.pre("save", async function (next) {
  if ((this.isModified("name") || this.isNew) && (!this.slug || this.slug === "")) {
    const baseSlug = createSlug(this.name);
    
    // Check if slug exists within the same chapter (excluding current document for updates)
    const checkExists = async (slug, excludeId) => {
      const query = { chapterId: this.chapterId, slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await mongoose.models.Topic.findOne(query);
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

// Cascading delete: When a Topic is deleted, delete all related SubTopics
topicSchema.pre("findOneAndDelete", async function () {
  try {
    const topic = await this.model.findOne(this.getQuery());
    if (topic) {
      console.log(
        `🗑️ Cascading delete: Deleting all entities for topic ${topic._id}`
      );

      // Get models - dynamically import if not already registered
      const SubTopic = mongoose.models.SubTopic || (await import("./SubTopic.js")).default;
      const TopicDetails = mongoose.models.TopicDetails || (await import("./TopicDetails.js")).default;
      const PracticeSubCategory = mongoose.models.PracticeSubCategory || (await import("./PracticeSubCategory.js")).default;
      const PracticeQuestion = mongoose.models.PracticeQuestion || (await import("./PracticeQuestion.js")).default;

      // Step 1: Find practice subcategories
      const practiceSubCategories = await PracticeSubCategory.find({
        topicId: topic._id,
      }).select("_id").lean();
      const practiceSubCategoryIds = practiceSubCategories.map((sc) => sc._id);

      console.log(
        `🗑️ Found ${practiceSubCategories.length} practice subcategories for topic ${topic._id}`
      );

      // Step 2: Delete all independent entities in parallel
      const [topicDetailsResult, subTopicsResult, practiceSubCategoriesResult] = await Promise.all([
        TopicDetails.deleteMany({ topicId: topic._id }),
        SubTopic.deleteMany({ topicId: topic._id }),
        PracticeSubCategory.deleteMany({ topicId: topic._id }),
      ]);

      console.log(
        `🗑️ Cascading delete: Deleted ${topicDetailsResult.deletedCount} TopicDetails, ${subTopicsResult.deletedCount} SubTopics, ${practiceSubCategoriesResult.deletedCount} PracticeSubCategories for topic ${topic._id}`
      );

      // Step 3: Delete dependent entities
      const practiceQuestionsResult = practiceSubCategoryIds.length > 0
        ? await PracticeQuestion.deleteMany({ subCategoryId: { $in: practiceSubCategoryIds } })
        : { deletedCount: 0 };

      console.log(
        `🗑️ Cascading delete: Deleted ${practiceQuestionsResult.deletedCount} PracticeQuestions for topic ${topic._id}`
      );
    }
  } catch (error) {
    console.error("❌ Error in Topic cascading delete middleware:", error);
    // Don't throw - allow the delete to continue even if cascading fails
  }
});

// Ensure the latest schema is used during dev hot-reload
// If a previous version of the model exists (with an outdated schema), delete it first
if (mongoose.connection?.models?.Topic) {
  delete mongoose.connection.models.Topic;
}

const Topic = mongoose.model("Topic", topicSchema);

export default Topic;
