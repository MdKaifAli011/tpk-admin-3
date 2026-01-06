// ============================================
// Tab-Aware SEO Metadata Utility
// ============================================
// 
// PURPOSE:
// - Generate SEO metadata that respects tab context (overview, discussion, practice, performance)
// - Handle searchParams in generateMetadata (Next.js App Router supports this)
// - Ensure Performance tab is non-indexable (user-specific analytics)
// - Provide consistent metadata across all 7 route levels
//
// IMPORTANT NOTES:
// - View-source shows INITIAL SSR metadata only (this is CORRECT and SEO-safe)
// - Client-side metadata updates (via DiscussionMetadata, PracticeTestList) enhance UX but don't affect view-source
// - Google crawls the INITIAL HTML (view-source), which is why SSR metadata is critical
// - Client-side updates help with social sharing and browser history, but don't affect SEO crawling

import { generateMetadata as generateBaseMetadata } from "@/utils/seo";
import { generateDiscussionForumMetadata, generateThreadMetadata, fetchThreadBySlug } from "@/utils/discussionSeo";
import { APP_CONFIG } from "@/constants";
import { logger } from "@/utils/logger";
import { createSlug } from "@/utils/slug";

/**
 * Tab types and their SEO characteristics
 */
export const TAB_TYPES = {
  OVERVIEW: "overview",
  DISCUSSION: "discussion",
  PRACTICE: "practice",
  PERFORMANCE: "performance",
};

/**
 * Determine if a tab should be SEO-indexable
 * @param {string} tab - Tab identifier
 * @returns {boolean} - true if indexable, false otherwise
 */
export function isTabIndexable(tab) {
  if (!tab) return true; // Default (overview) is indexable

  const normalizedTab = tab.toLowerCase();

  // Performance tab contains user-specific analytics - NOT indexable
  if (normalizedTab === TAB_TYPES.PERFORMANCE) {
    return false;
  }

  // Overview, Discussion, Practice are all indexable
  return true;
}

/**
 * Generate tab-specific metadata suffix
 * @param {string} tab - Tab identifier
 * @param {Object} context - Additional context (test slug, thread slug, etc.)
 * @returns {string} - Tab suffix for title/description
 */
export function getTabSuffix(tab, context = {}) {
  if (!tab) return "";

  const normalizedTab = tab.toLowerCase();

  switch (normalizedTab) {
    case TAB_TYPES.DISCUSSION:
      if (context.threadSlug) {
        return "Discussion Thread";
      }
      return "Discussion Forum";
    case TAB_TYPES.PRACTICE:
      if (context.testSlug) {
        return "Practice Test";
      }
      return "Practice Tests";
    case TAB_TYPES.PERFORMANCE:
      return "Performance Analytics";
    case TAB_TYPES.OVERVIEW:
    default:
      return "";
  }
}

/**
 * Generate tab-aware metadata for entity pages
 * @param {Object} entityData - Entity data (name, type, etc.)
 * @param {Object} entityDetails - Entity details (content, SEO fields)
 * @param {Object} searchParams - URL search params (tab, test, thread)
 * @param {Object} options - Additional options (path, hierarchy context)
 * @returns {Promise<Object>} - SEO metadata object
 */
export async function generateTabAwareMetadata(
  entityData,
  entityDetails,
  searchParams = {},
  options = {}
) {
  const { path = "", hierarchy = {} } = options;
  
  // Extract tab and other search params
  // In Next.js 16, searchParams is a plain object { tab: "discussion", ... }
  // Handle both plain object and URLSearchParams for robustness
  const tab = searchParams?.tab || (searchParams?.get && searchParams.get("tab")) || null;
  const testSlug = searchParams?.test || (searchParams?.get && searchParams.get("test")) || null;
  const threadSlug = searchParams?.thread || (searchParams?.get && searchParams.get("thread")) || null;
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === "development") {
    logger.debug("generateTabAwareMetadata - Tab:", tab, "SearchParams:", searchParams);
  }

  // Check if tab is indexable
  const isIndexable = isTabIndexable(tab);

  // If Performance tab, return non-indexable metadata
  if (!isIndexable) {
    const baseMetadata = generateBaseMetadata(
      {
        title: `${entityData.name} - Performance Analytics | ${APP_CONFIG.name}`,
        metaDescription: `View your performance analytics and progress for ${entityData.name}. Track your test scores, completion rates, and study progress.`,
      },
      {
        type: entityData.type || "page",
        name: `${entityData.name} - Performance`,
        path: path,
      }
    );

    // Mark as non-indexable
    baseMetadata.robots = {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    };

    return baseMetadata;
  }

  // Handle Discussion Forum tab with thread detail
  if (tab === TAB_TYPES.DISCUSSION && threadSlug) {
    try {
      const thread = await fetchThreadBySlug(threadSlug);
      if (thread) {
        return generateThreadMetadata(thread, entityData, {
          path: `${path}?tab=discussion&thread=${threadSlug}`,
        });
      }
    } catch (error) {
      logger.warn("Failed to fetch thread for metadata:", error);
    }
  }

  // Handle Discussion Forum tab (list view)
  if (tab === TAB_TYPES.DISCUSSION && !threadSlug) {
    return generateDiscussionForumMetadata(entityData, {
      type: entityData.type || "page",
      name: entityData.name,
      path: `${path}?tab=discussion`,
    });
  }

  // Handle Practice Test tab with specific test
  if (tab === TAB_TYPES.PRACTICE && testSlug) {
    // Note: Practice test metadata is handled client-side in PracticeTestList.jsx
    // This is because test data may not be available server-side
    // We generate a generic practice test metadata here
    const tabSuffix = getTabSuffix(tab, { testSlug });
    const adminTitle = entityDetails?.title?.trim();
    const adminMetaDescription = entityDetails?.metaDescription?.trim();
    const adminKeywords = entityDetails?.keywords?.trim();

    const seoData = {
      title: adminTitle && adminTitle.length > 0
        ? adminTitle
        : `${entityData.name} - ${tabSuffix} | ${APP_CONFIG.name}`,
      metaDescription: adminMetaDescription && adminMetaDescription.length > 0
        ? adminMetaDescription
        : `Practice ${entityData.name} with comprehensive practice tests. Improve your exam preparation with timed tests, detailed solutions, and performance tracking.`,
      keywords: adminKeywords && adminKeywords.length > 0
        ? adminKeywords
        : `${entityData.name}, ${entityData.name} practice test, ${entityData.name} practice questions, exam preparation, practice tests`,
    };

    return generateBaseMetadata(seoData, {
      type: "practice_test",
      name: `${entityData.name} - Practice Test`,
      path: `${path}?tab=practice${testSlug ? `&test=${testSlug}` : ""}`,
    });
  }

  // Handle Practice Test tab (list view)
  if (tab === TAB_TYPES.PRACTICE && !testSlug) {
    const tabSuffix = getTabSuffix(tab);
    const adminTitle = entityDetails?.title?.trim();
    const adminMetaDescription = entityDetails?.metaDescription?.trim();
    const adminKeywords = entityDetails?.keywords?.trim();

    const seoData = {
      title: adminTitle && adminTitle.length > 0
        ? adminTitle
        : `${entityData.name} - ${tabSuffix} | ${APP_CONFIG.name}`,
      metaDescription: adminMetaDescription && adminMetaDescription.length > 0
        ? adminMetaDescription
        : `Access practice tests for ${entityData.name}. Improve your exam preparation with comprehensive practice questions, mock tests, and detailed solutions.`,
      keywords: adminKeywords && adminKeywords.length > 0
        ? adminKeywords
        : `${entityData.name}, ${entityData.name} practice tests, ${entityData.name} mock tests, exam preparation, practice questions`,
    };

    return generateBaseMetadata(seoData, {
      type: "practice_tests",
      name: `${entityData.name} - Practice Tests`,
      path: `${path}?tab=practice`,
    });
  }

  // Default: Overview tab or no tab specified
  // Use entity details SEO data if available, otherwise generate defaults
  const adminTitle = entityDetails?.title?.trim();
  const adminMetaDescription = entityDetails?.metaDescription?.trim();
  const adminKeywords = entityDetails?.keywords?.trim();

  // Build hierarchy context for better SEO (exclude current entity to avoid duplication)
  // Only include parent entities, not the current entity itself
  const hierarchyContext = [
    hierarchy.exam,
    hierarchy.subject,
    hierarchy.unit,
    hierarchy.chapter,
    hierarchy.topic,
    hierarchy.subtopic,
  ]
    .filter(Boolean)
    .filter(name => name !== entityData.name) // Exclude current entity to avoid duplication
    .join(" - ");

  // Build title: Entity Name - Parent Hierarchy | App Name
  // Example: "Biology - NEET | TestPrepKart" (not "Biology - NEET - Biology")
  const title = adminTitle && adminTitle.length > 0
    ? adminTitle
    : hierarchyContext
      ? `${entityData.name} - ${hierarchyContext} | ${APP_CONFIG.name}`
      : `${entityData.name} | ${APP_CONFIG.name}`;

  // Build description: Study Entity in Parent Hierarchy...
  const description = adminMetaDescription && adminMetaDescription.length > 0
    ? adminMetaDescription
    : hierarchyContext
      ? `Study ${entityData.name} in ${hierarchyContext}. Access comprehensive study materials, practice questions, and expert guidance for exam preparation.`
      : `Study ${entityData.name}. Access comprehensive study materials, practice questions, and expert guidance for exam preparation.`;

  // Build keywords: Entity, Parent Hierarchy, relevant terms
  const keywords = adminKeywords && adminKeywords.length > 0
    ? adminKeywords
    : hierarchyContext
      ? `${entityData.name}, ${hierarchyContext}, exam preparation, study materials, practice questions`
      : `${entityData.name}, exam preparation, study materials, practice questions`;

  const seoData = {
    title,
    metaDescription: description,
    keywords,
  };

  return generateBaseMetadata(seoData, {
    type: entityData.type || "page",
    name: entityData.name,
    path: path,
  });
}

/**
 * Helper to extract searchParams from Next.js generateMetadata context
 * IMPORTANT: In Next.js App Router, layouts DON'T receive searchParams - only pages do!
 * This function handles both cases and provides fallback via headers if needed
 * @param {Object|Promise<Object>|undefined} searchParams - searchParams from generateMetadata context
 * @param {Object} headers - Optional headers object to read query params from URL
 * @returns {Promise<Object>} - Normalized searchParams object
 */
export async function extractSearchParams(searchParams, headers = null) {
  // In Next.js App Router:
  // - Pages receive searchParams (can be Promise or object)
  // - Layouts DON'T receive searchParams (undefined)
  
  // If searchParams is provided (from page), use it
  if (searchParams !== undefined && searchParams !== null) {
    // If it's a Promise, await it
    if (typeof searchParams.then === "function") {
      try {
        const resolved = await searchParams;
        if (process.env.NODE_ENV === "development") {
          logger.debug("extractSearchParams: Resolved Promise from page, result:", resolved);
        }
        return resolved || {};
      } catch (error) {
        logger.warn("extractSearchParams: Error awaiting Promise:", error);
        return {};
      }
    }

    // If it's already an object
    if (typeof searchParams === "object" && searchParams !== null) {
      if (process.env.NODE_ENV === "development") {
        logger.debug("extractSearchParams: Plain object from page:", searchParams);
      }
      return searchParams;
    }
  }

  // If searchParams is not available (layout context), try to read from headers
  // Note: This is a fallback - layouts typically don't have access to query params
  if (headers) {
    try {
      const referer = headers.get("referer") || headers.referer;
      if (referer) {
        const url = new URL(referer);
        const params = Object.fromEntries(url.searchParams);
        if (process.env.NODE_ENV === "development") {
          logger.debug("extractSearchParams: Extracted from headers:", params);
        }
        return params;
      }
    } catch (error) {
      // Silently fail - headers might not be available
    }
  }

  if (process.env.NODE_ENV === "development") {
    logger.debug("extractSearchParams: No searchParams available (layout context)");
  }
  
  return {};
}

/**
 * Build canonical URL with base path
 * @param {string} path - Relative path
 * @param {Object} searchParams - Search params to include
 * @returns {string} - Full canonical URL
 */
export function buildCanonicalUrl(path, searchParams = {}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
  const baseUrl = APP_CONFIG.url;

  // Only include SEO-relevant search params in canonical URL
  const relevantParams = {};
  if (searchParams.tab && searchParams.tab !== "overview") {
    relevantParams.tab = searchParams.tab;
  }
  if (searchParams.thread) {
    relevantParams.thread = searchParams.thread;
  }
  // Note: We don't include 'test' in canonical URL as it's handled client-side
  // This prevents canonical URL pollution with dynamic test slugs

  const queryString = Object.keys(relevantParams).length > 0
    ? "?" + new URLSearchParams(relevantParams).toString()
    : "";

  return `${baseUrl}${basePath}${path}${queryString}`;
}
