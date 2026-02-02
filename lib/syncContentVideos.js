import ContentVideo from "@/models/ContentVideo";
import { extractYoutubeVideosFromHtml } from "@/utils/contentVideos";

/**
 * Sync YouTube videos from editor content into ContentVideo collection (at save time).
 * Call this after saving any *Details (exam, subject, unit, chapter, topic, subtopic, definition).
 * @param {string} level - "exam" | "subject" | "unit" | "chapter" | "topic" | "subtopic" | "definition"
 * @param {string|ObjectId} itemId - The entity _id for this level
 * @param {string} content - HTML content from details
 * @param {Object} hierarchy - { examId, examName, subjectId?, subjectName?, unitId?, unitName?, chapterId?, chapterName?, topicId?, topicName?, subTopicId?, subTopicName?, definitionId?, definitionName? }
 */
export async function syncContentVideosForDetails(level, itemId, content, hierarchy) {
  if (!content || typeof content !== "string") return;
  const videos = extractYoutubeVideosFromHtml(content);
  const id = typeof itemId === "string" ? itemId : itemId?.toString?.();
  if (!id) return;

  await ContentVideo.deleteMany({ level, itemId: id });

  if (videos.length === 0) return;

  const docs = videos.map((v) => ({
    level,
    itemId: id,
    examId: hierarchy.examId || null,
    examName: hierarchy.examName ?? "",
    subjectId: hierarchy.subjectId || null,
    subjectName: hierarchy.subjectName ?? "",
    unitId: hierarchy.unitId || null,
    unitName: hierarchy.unitName ?? "",
    chapterId: hierarchy.chapterId || null,
    chapterName: hierarchy.chapterName ?? "",
    topicId: hierarchy.topicId || null,
    topicName: hierarchy.topicName ?? "",
    subTopicId: hierarchy.subTopicId || null,
    subTopicName: hierarchy.subTopicName ?? "",
    definitionId: hierarchy.definitionId || null,
    definitionName: hierarchy.definitionName ?? "",
    youtubeVideoId: v.videoId,
    embedUrl: v.embedUrl,
  }));

  await ContentVideo.insertMany(docs);
}
