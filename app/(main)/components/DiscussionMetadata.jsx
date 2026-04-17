"use client";

import { useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import api from "@/lib/api";
import { APP_CONFIG } from "@/constants";
import { stripHtml } from "../lib/utils/contentUtils";

/**
 * Client-side component to update metadata for discussion threads
 * 
 * NOTE: Next.js 16+ supports searchParams in layout generateMetadata (SSR),
 * but this client-side component provides:
 * 1. Real-time metadata updates on client navigation (better UX)
 * 2. Fallback if SSR metadata generation fails
 * 3. Dynamic thread-specific metadata that may not be available server-side
 * 
 * View-source shows INITIAL SSR metadata (from layout generateMetadata)
 * This component enhances metadata for browser history and social sharing
 */
export default function DiscussionMetadata({ entityData = {} }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const threadSlug = searchParams.get("thread");

  useEffect(() => {
    if (!threadSlug || typeof window === "undefined") return;

    // Fetch thread data and update metadata
    const updateMetadata = async () => {
      if (!threadSlug) {
        console.warn("DiscussionMetadata: No thread slug provided");
        return;
      }
      
      try {
        const response = await api.get(`/discussion/threads/${threadSlug}`);
        if (!response.data?.success || !response.data?.data?.thread) {
          console.warn("DiscussionMetadata: Thread not found or not approved", {
            threadSlug,
            success: response.data?.success,
            hasThread: !!response.data?.data?.thread,
          });
          return;
        }

        const thread = response.data.data.thread;
        const entityName = entityData?.name || thread.chapterId?.name || thread.subjectId?.name || thread.examId?.name || "";

        // Clean HTML from content for description
        const cleanContent = stripHtml(thread.content || "").substring(0, 150);

        const threadTitle = thread.title || "Discussion Thread";
        const tags = thread.tags?.join(", ") || "";
        const authorName = thread.contributorDisplayName
          ? thread.contributorDisplayName
          : thread.authorType === "User" && thread.author
            ? (thread.author.name || thread.author.email || "Admin")
            : thread.authorType === "Student" && thread.author
              ? `${thread.author.firstName || ""} ${thread.author.lastName || ""}`.trim() || thread.author.email || "Student"
              : thread.guestName || "Community Member";

        // Generate metadata - Full title without truncation
        const title = `${threadTitle}${entityName ? ` - ${entityName}` : ""} | Discussion Forum | ${APP_CONFIG.name}`;
        const description = cleanContent
          ? `${cleanContent}... Join the discussion and share your insights.`
          : `Read and participate in the discussion: ${threadTitle}. ${entityName ? `Part of ${entityName} discussion forum.` : ""} Get answers, share knowledge, and learn from the community.`;
        const keywords = `${threadTitle}, ${entityName ? `${entityName}, ` : ""}discussion thread, forum, ${tags}, student discussion, ${authorName}, Q&A, study help`;
        const canonicalUrl = window.location.href;

        // Update document title - Show full title without truncation
        document.title = title;

        // Update meta description - Allow longer descriptions for better SEO (max 300 chars)
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
          metaDescription = document.createElement("meta");
          metaDescription.setAttribute("name", "description");
          document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute("content", description.length > 300 ? description.substring(0, 297) + "..." : description);

        // Update meta keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
          metaKeywords = document.createElement("meta");
          metaKeywords.setAttribute("name", "keywords");
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute("content", keywords);

        // Update Open Graph tags
        const updateOGTag = (property, content) => {
          if (!content) return;
          let ogTag = document.querySelector(`meta[property="${property}"]`);
          if (!ogTag) {
            ogTag = document.createElement("meta");
            ogTag.setAttribute("property", property);
            document.head.appendChild(ogTag);
          }
          ogTag.setAttribute("content", content);
        };

        updateOGTag("og:title", title);
        updateOGTag("og:description", description.length > 300 ? description.substring(0, 297) + "..." : description);
        updateOGTag("og:url", canonicalUrl);
        updateOGTag("og:type", "article");
        if (thread.createdAt) {
          updateOGTag("og:published_time", new Date(thread.createdAt).toISOString());
        }

        // Update Twitter Card tags
        const updateTwitterTag = (name, content) => {
          if (!content) return;
          let twitterTag = document.querySelector(`meta[name="${name}"]`);
          if (!twitterTag) {
            twitterTag = document.createElement("meta");
            twitterTag.setAttribute("name", name);
            document.head.appendChild(twitterTag);
          }
          twitterTag.setAttribute("content", content);
        };

        updateTwitterTag("twitter:card", "summary_large_image");
        updateTwitterTag("twitter:title", title);
        updateTwitterTag("twitter:description", description.length > 300 ? description.substring(0, 297) + "..." : description);

        // Update canonical URL
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
          canonicalLink = document.createElement("link");
          canonicalLink.setAttribute("rel", "canonical");
          document.head.appendChild(canonicalLink);
        }
        canonicalLink.setAttribute("href", canonicalUrl);
      } catch (error) {
        // Only log error if it's not a 404 (thread might not exist or be approved yet)
        if (error.response?.status !== 404) {
          console.error("Error updating discussion metadata:", {
            message: error.message,
            status: error.response?.status,
            threadSlug,
          });
        }
      }
    };

    updateMetadata();
  }, [threadSlug, pathname, entityData]);

  return null; // This component doesn't render anything
}

