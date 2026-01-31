// ============================================
// SEO Utility Functions
// ============================================

import { SEO_DEFAULTS, APP_CONFIG } from "@/constants";
import { logger } from "@/utils/logger";

/**
 * Generate SEO metadata for pages
 * @param {Object} data - Entity data with title, metaDescription, keywords
 * @param {Object} options - Additional options like type, name, path, indexable
 * @param {boolean} options.indexable - If true: index, follow. If false: noindex, nofollow (default true).
 *   Driven by *Details status: only "publish" → index,follow; "unpublish" | "draft" | missing → noindex,nofollow (see tabSeo).
 * @returns {Object} SEO metadata object
 */
export function generateMetadata(data, options = {}) {
  const { type = "", name = "", path = "", indexable = true } = options;

  // Debug logging (only in development)
  if (process.env.NODE_ENV === "development") {
    logger.debug("=== generateSEO DEBUG ===");
    logger.debug("Received data:", data);
    logger.debug("Data title:", data?.title);
    logger.debug("Data title type:", typeof data?.title);
    logger.debug("Options name:", name);
  }

  // Use admin-provided SEO data if available, otherwise generate defaults
  // Prioritize admin-provided title - if it exists and has content, use it as-is
  let title;
  if (
    data?.title &&
    typeof data.title === "string" &&
    data.title.trim().length > 0
  ) {
    // Use admin-provided title exactly as provided
    title = data.title.trim();
    if (process.env.NODE_ENV === "development") {
      logger.debug("Using admin title:", title);
    }
  } else if (name) {
    // Fallback to name-based title
    title = `${name} - ${APP_CONFIG.name}`;
    if (process.env.NODE_ENV === "development") {
      logger.debug("Using fallback title from name:", title);
    }
  } else {
    // Final fallback to default
    title = SEO_DEFAULTS.TITLE;
    if (process.env.NODE_ENV === "development") {
      logger.debug("Using default title:", title);
    }
  }

  // Show full title without truncation for better SEO and user experience
  // Modern search engines and browsers can handle longer titles
  const optimizedTitle = title;

  // Prioritize admin-provided metaDescription - if it exists and has content, use it as-is
  let description;
  if (data?.metaDescription && data.metaDescription.trim().length > 0) {
    // Use admin-provided description exactly as provided
    description = data.metaDescription.trim();
  } else if (name) {
    // Fallback to name-based description
    description = `Prepare for ${name} with ${APP_CONFIG.name}. ${SEO_DEFAULTS.DESCRIPTION}`;
  } else {
    // Final fallback to default
    description = SEO_DEFAULTS.DESCRIPTION;
  }

  // Allow longer descriptions for better SEO (max 300 chars instead of 160)
  // Modern search engines can handle longer meta descriptions
  const optimizedDescription =
    description.length > 300
      ? `${description.substring(0, 297)}...`
      : description;

  // Handle keywords - prioritize admin-provided keywords
  let keywords = SEO_DEFAULTS.KEYWORDS;
  if (data?.keywords && data.keywords.trim().length > 0) {
    // Use admin-provided keywords
    if (typeof data.keywords === "string") {
      // Split comma-separated string and filter out empty values
      keywords = data.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    } else if (Array.isArray(data.keywords)) {
      keywords = data.keywords.filter((k) => k && k.trim().length > 0);
    }
    // Use only admin-provided keywords (don't mix with defaults)
    keywords = keywords.slice(0, 10);
  } else if (name) {
    // Fallback: Generate keywords from name
    keywords = [name, ...SEO_DEFAULTS.KEYWORDS].slice(0, 10);
  }

  // Build canonical URL with base path
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
  const canonicalUrl = `${APP_CONFIG.url}${basePath}${path || ""}`;

  return {
    title: optimizedTitle,
    description: optimizedDescription,
    keywords: keywords.slice(0, 10).join(", "),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: optimizedTitle,
      description: optimizedDescription,
      type: "website",
      url: canonicalUrl,
      siteName: APP_CONFIG.name,
      images: [
        {
          url: `${APP_CONFIG.url}${process.env.NEXT_PUBLIC_BASE_PATH || ""}${SEO_DEFAULTS.OG_IMAGE}`,
          width: 1200,
          height: 630,
          alt: optimizedTitle,
        },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: optimizedTitle,
      description: optimizedDescription,
      images: [`${APP_CONFIG.url}${process.env.NEXT_PUBLIC_BASE_PATH || ""}${SEO_DEFAULTS.OG_IMAGE}`],
      creator: "@testprepkart",
      site: "@testprepkart",
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        },
  };
}

/**
 * Generate page title from entity data
 */
export function generatePageTitle(data, fallback = SEO_DEFAULTS.TITLE) {
  return data?.title || fallback;
}

/**
 * Generate meta description from entity data
 */
export function generateMetaDescription(
  data,
  fallback = SEO_DEFAULTS.DESCRIPTION
) {
  return data?.metaDescription || fallback;
}

/**
 * Parse keywords from string or array
 */
export function parseKeywords(keywords) {
  if (!keywords) return SEO_DEFAULTS.KEYWORDS;

  if (typeof keywords === "string") {
    return keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  if (Array.isArray(keywords)) {
    return keywords;
  }

  return SEO_DEFAULTS.KEYWORDS;
}
