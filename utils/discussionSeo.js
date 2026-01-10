// ============================================
// Discussion Forum SEO Utility Functions
// ============================================

import { generateMetadata as generateSEO } from "@/utils/seo";
import { APP_CONFIG, SEO_DEFAULTS } from "@/constants";
import { logger } from "@/utils/logger";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";

/**
 * Generate SEO metadata for discussion forum list pages
 * @param {Object} entityData - Entity data (exam, subject, chapter, etc.)
 * @param {Object} options - Additional options like type, name, path
 * @returns {Object} SEO metadata object
 */
export function generateDiscussionForumMetadata(entityData, options = {}) {
  const { type = "", name = "", path = "" } = options;
  const entityName = name || entityData?.name || "Discussion Forum";

  const seoData = {
    title: `${entityName} Discussion Forum - Ask Questions & Share Insights | ${APP_CONFIG.name}`,
    metaDescription: `Join the ${entityName} discussion forum. Ask questions, share study notes, get help from peers, and engage with the community. Find answers to your ${entityName} questions and help others learn.`,
    keywords: `${entityName}, ${entityName} discussion, ${entityName} forum, ${entityName} questions, study forum, student discussion, ${entityName} help, exam discussion, study community`,
  };

  return generateSEO(seoData, {
    type: "discussion_forum",
    name: `${entityName} Discussion Forum`,
    path: path || "",
  });
}

/**
 * Fetch thread data by slug (server-side)
 * @param {string} slug - Thread slug
 * @returns {Object|null} Thread data or null
 */
export async function fetchThreadBySlug(slug) {
  try {
    await connectDB();
    const thread = await Thread.findOne({ slug })
      .populate("author", "firstName lastName avatar role")
      .populate("examId", "name slug")
      .populate("subjectId", "name slug")
      .populate("unitId", "name slug")
      .populate("chapterId", "name slug")
      .populate("topicId", "name slug")
      .populate("subTopicId", "name slug")
      .lean();

    return thread;
  } catch (error) {
    logger.error("Error fetching thread for SEO:", error);
    return null;
  }
}

/**
 * Generate SEO metadata for thread detail pages
 * @param {Object} thread - Thread data
 * @param {Object} entityData - Parent entity data (exam, subject, chapter, etc.)
 * @param {Object} options - Additional options like path
 * @returns {Object} SEO metadata object
 */
export function generateThreadMetadata(thread, entityData = {}, options = {}) {
  const { path = "" } = options;

  if (!thread) {
    return generateSEO(
      {
        title: "Discussion Thread - Thread Not Found",
        metaDescription: "The requested discussion thread could not be found.",
      },
      {
        type: "thread",
        name: "Thread",
        path: path || "",
      }
    );
  }

  // Clean HTML from content for description
  const cleanContent = (thread.content || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 150);

  const threadTitle = thread.title || "Discussion Thread";
  const entityName = entityData?.name || thread.chapterId?.name || thread.subjectId?.name || thread.examId?.name || "";
  const tags = thread.tags?.join(", ") || "";
  const authorName = thread.author
    ? `${thread.author.firstName || ""} ${thread.author.lastName || ""}`.trim()
    : thread.guestName || "Community Member";

  const seoData = {
    title: `${threadTitle}${entityName ? ` - ${entityName}` : ""} | Discussion Forum | ${APP_CONFIG.name}`,
    metaDescription: cleanContent
      ? `${cleanContent}... Join the discussion and share your insights.`
      : `Read and participate in the discussion: ${threadTitle}. ${entityName ? `Part of ${entityName} discussion forum.` : ""} Get answers, share knowledge, and learn from the community.`,
    keywords: `${threadTitle}, ${entityName ? `${entityName}, ` : ""}discussion thread, forum, ${tags}, student discussion, ${authorName}, Q&A, study help`,
  };

  // No title truncation - show full title for better SEO and user experience
  // Keep description reasonable but allow longer descriptions (max 300 chars for better SEO)
  if (seoData.metaDescription.length > 300) {
    seoData.metaDescription = seoData.metaDescription.substring(0, 297) + "...";
  }

  const metadata = generateSEO(seoData, {
    type: "thread",
    name: threadTitle,
    path: path || `/discussion/threads/${thread.slug}`,
  });

  // Add structured data for better SEO
  metadata.openGraph = {
    ...metadata.openGraph,
    type: "article",
    publishedTime: thread.createdAt ? new Date(thread.createdAt).toISOString() : undefined,
    authors: authorName ? [authorName] : undefined,
    tags: thread.tags || [],
  };

  return metadata;
}

/**
 * Generate SEO metadata based on URL search params (for client-side use)
 * This is a fallback when server-side metadata generation isn't possible
 * @param {string} threadSlug - Thread slug from URL
 * @param {Object} entityData - Entity data
 * @returns {Promise<Object>} SEO metadata object
 */
export async function generateThreadMetadataFromSlug(threadSlug, entityData = {}) {
  if (!threadSlug) {
    return generateDiscussionForumMetadata(entityData);
  }

  const thread = await fetchThreadBySlug(threadSlug);
  return generateThreadMetadata(thread, entityData);
}


