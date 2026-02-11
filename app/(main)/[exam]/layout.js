import { generateMetadata as generateSEO } from "@/utils/seo";
import { createSlug } from "@/utils/slug";
import { logger } from "@/utils/logger";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";
import NotificationStrip from "../components/NotificationStrip";

// Force dynamic rendering to ensure fresh metadata
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Generate metadata for exam pages with tab awareness
 * 
 * IMPORTANT SEO NOTES:
 * - View-source shows INITIAL SSR metadata (this is CORRECT and SEO-safe)
 * - Client-side metadata updates enhance UX but don't affect view-source
 * - Google crawls the INITIAL HTML (view-source), which is why SSR metadata is critical
 * - Tabs are handled via searchParams: ?tab=overview|discussion|practice|performance
 * - Performance tab is NON-indexable (user-specific analytics)
 */
export async function generateMetadata({ params, searchParams }) {
  const { exam: examSlug } = await params;
  
  // In Next.js 16, searchParams in layouts is a Promise - await it directly
  // This ensures metadata is generated correctly for view-source
  const resolvedSearchParams = await extractSearchParams(searchParams);

  try {
    // Try to fetch exam data and details, but don't fail if it doesn't work
    let exam = null;
    let examDetails = null;
    
    try {
      const { fetchExamById, fetchExamDetailsById } = await import("../lib/api");
      exam = await fetchExamById(examSlug).catch(() => null);
      
      if (exam?._id) {
        examDetails = await fetchExamDetailsById(exam._id).catch(() => null);
      }
    } catch (fetchError) {
      // Silently fail - we'll use defaults
      logger.warn("Could not fetch exam for metadata:", fetchError.message);
    }

    if (!exam) {
      return generateSEO({}, { type: "exam", name: examSlug || "Exam", indexable: false });
    }

    // Build path for canonical URL
    const path = `/${createSlug(exam.name)}`;

    // Generate tab-aware metadata
    return await generateTabAwareMetadata(
      {
        name: exam.name,
        type: "exam",
      },
      examDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: exam.name,
        },
      }
    );
  } catch (error) {
    // Always return valid metadata even on error
    logger.warn("Error generating metadata:", error.message);
    return generateSEO({}, { type: "exam", name: examSlug || "Exam", indexable: false });
  }
}

export default function ExamLayout({ children }) {
  return (
    <>
      {/* Notification strip at top of header for all 7 levels: exam, subject, unit, chapter, topic, subtopic, definition */}
      <NotificationStrip />
      {children}
    </>
  );
}
