import mongoose from "mongoose";

/**
 * Stores YouTube/Shorts videos extracted from editor content at save time.
 * Used by Prime Video page – no parsing of long content on read (fast, one API call).
 */
const contentVideoSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["exam", "subject", "unit", "chapter", "topic", "subtopic", "definition"],
      required: true,
    },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    examName: { type: String, default: "" },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    subjectName: { type: String, default: "" },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    unitName: { type: String, default: "" },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
    chapterName: { type: String, default: "" },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
    topicName: { type: String, default: "" },
    subTopicId: { type: mongoose.Schema.Types.ObjectId, ref: "SubTopic" },
    subTopicName: { type: String, default: "" },
    definitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Definition" },
    definitionName: { type: String, default: "" },
    youtubeVideoId: { type: String, required: true },
    embedUrl: { type: String, required: true },
  },
  { timestamps: true }
);

contentVideoSchema.index({ level: 1, itemId: 1 });
contentVideoSchema.index({ examId: 1 });
contentVideoSchema.index({ examId: 1, subjectId: 1, unitId: 1, chapterId: 1, topicId: 1, subTopicId: 1, definitionId: 1 });

const ContentVideo =
  mongoose.models.ContentVideo || mongoose.model("ContentVideo", contentVideoSchema);

export default ContentVideo;
