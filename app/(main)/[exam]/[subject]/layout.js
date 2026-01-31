import { generateMetadata as generateSEO } from "@/utils/seo";
import { createSlug } from "@/utils/slug";
import { logger } from "@/utils/logger";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";

// Force dynamic rendering to ensure fresh metadata
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Generate metadata for subject pages with tab awareness
 * 
 * IMPORTANT SEO NOTES:
 * - View-source shows INITIAL SSR metadata (this is CORRECT and SEO-safe)
 * - Client-side metadata updates enhance UX but don't affect view-source
 * - Google crawls the INITIAL HTML (view-source), which is why SSR metadata is critical
 * - Tabs are handled via searchParams: ?tab=overview|discussion|practice|performance
 * - Performance tab is NON-indexable (user-specific analytics)
 */
export async function generateMetadata({ params, searchParams }) {
  const { exam: examSlug, subject: subjectSlug } = await params;
  
  // In Next.js 16, searchParams in layouts is a Promise - await it directly
  // This ensures metadata is generated correctly for view-source
  const resolvedSearchParams = await extractSearchParams(searchParams);

  try {
    // Try to fetch data, but don't fail if it doesn't work
    let exam = null;
    let subject = null;
    let subjectDetails = null;

    try {
      const { fetchExamById, fetchSubjectById, fetchSubjectDetailsById, fetchSubjectsByExam, findByIdOrSlug } = await import("../../lib/api");
      
      // Fetch exam first
      exam = await fetchExamById(examSlug).catch(() => null);
      
      // Fetch subject - try by ID first, then by slug if needed
      if (exam?._id) {
        const subjects = await fetchSubjectsByExam(exam._id).catch(() => []);
        if (subjects.length > 0) {
          // Find subject by slug
          subject = findByIdOrSlug(subjects, subjectSlug);
          
          // If found by slug, fetch full subject data by ID
          if (subject?._id) {
            const fullSubjectData = await fetchSubjectById(subject._id).catch(() => null);
            if (fullSubjectData) {
              subject = fullSubjectData;
            }
          }
        }
      }
      
      // Fetch subject details separately
      if (subject?._id) {
        subjectDetails = await fetchSubjectDetailsById(subject._id).catch(() => null);
      }
    } catch (fetchError) {
      // Silently fail - we'll use defaults
      logger.warn("Could not fetch data for metadata:", fetchError.message);
    }

    if (!subject) {
      return generateSEO(
        {},
        { type: "subject", name: subjectSlug || "Subject", indexable: false }
      );
    }

    // Build path for canonical URL
    const path = `/${createSlug(exam?.name || "")}/${createSlug(subject.name)}`;

    // Generate tab-aware metadata
    return await generateTabAwareMetadata(
      {
        name: subject.name,
        type: "subject",
      },
      subjectDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: exam?.name,
          subject: subject.name,
        },
      }
    );
  } catch (error) {
    // Always return valid metadata even on error
    logger.warn("Error generating metadata:", error.message);
    return generateSEO({}, { type: "subject", name: subjectSlug || "Subject", indexable: false });
  }
}

export default function SubjectLayout({ children }) {
  return <>{children}</>;
}
