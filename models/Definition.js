import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const definitionSchema = new mongoose.Schema(
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
      required: false, // Made optional for backward compatibility - will be populated from topicId if missing
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },
    subTopicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubTopic",
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

// Add compound index to ensure unique orderNumber per subTopic within an exam
definitionSchema.index({ subTopicId: 1, orderNumber: 1 }, { unique: true });

// Compound index for unique slug per subTopic
definitionSchema.index(
  { subTopicId: 1, slug: 1 },
  { unique: true, sparse: true }
);

// Pre-save hook to auto-populate chapterId from topicId if missing (for backward compatibility)
definitionSchema.pre("save", async function (next) {
  // If chapterId is missing but topicId exists, populate it from the topic
  if (
    (!this.chapterId ||
      this.chapterId === null ||
      this.chapterId === undefined) &&
    this.topicId
  ) {
    try {
      const Topic = mongoose.models.Topic || mongoose.model("Topic");
      const topic = await Topic.findById(this.topicId)
        .select("chapterId")
        .lean();
      if (topic?.chapterId) {
        this.chapterId = topic.chapterId;
        console.log(
          `✅ Auto-populated chapterId ${topic.chapterId} from topicId ${
            this.topicId
          } for definition ${this._id || "new"}`
        );
      }
    } catch (error) {
      console.error("Error auto-populating chapterId from topicId:", error);
      // Don't block save if this fails
    }
  }
  next();
});

// Pre-save hook to auto-generate slug
definitionSchema.pre("save", async function (next) {
  if (this.isModified("name") || this.isNew) {
    const baseSlug = createSlug(this.name);

    // Check if slug exists within the same subTopic (excluding current document for updates)
    const checkExists = async (slug, excludeId) => {
      const query = { subTopicId: this.subTopicId, slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await mongoose.models.Definition.findOne(query);
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

// Cascading delete: When a Definition is deleted, delete its details
definitionSchema.pre("findOneAndDelete", async function () {
  try {
    const definition = await this.model.findOne(this.getQuery());
    if (definition) {
      console.log(
        `🗑️ Cascading delete: Deleting details for definition ${definition._id}`
      );

      // Get model - use mongoose.model() to ensure model is loaded
      const DefinitionDetails =
        mongoose.models.DefinitionDetails ||
        mongoose.model("DefinitionDetails");

      const result = await DefinitionDetails.deleteMany({
        definitionId: definition._id,
      });
      console.log(
        `🗑️ Cascading delete: Deleted ${result.deletedCount} DefinitionDetails for definition ${definition._id}`
      );
    }
  } catch (error) {
    console.error("❌ Error in Definition cascading delete middleware:", error);
    // Don't throw - allow the delete to continue even if cascading fails
  }
});

// Ensure the latest schema is used during dev hot-reload
// If a previous version of the model exists (with an outdated schema), delete it first
if (mongoose.connection?.models?.Definition) {
  delete mongoose.connection.models.Definition;
}

const Definition = mongoose.model("Definition", definitionSchema);

export default Definition;
