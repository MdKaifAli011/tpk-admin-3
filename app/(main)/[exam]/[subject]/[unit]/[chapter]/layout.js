import { generateMetadata as generateSEO } from "@/utils/seo";
import { createSlug } from "@/utils/slug";
import { logger } from "@/utils/logger";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";

// Force dynamic rendering to ensure fresh metadata
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Generate metadata for chapter pages with tab awareness
 * 
 * IMPORTANT SEO NOTES:
 * - View-source shows INITIAL SSR metadata (this is CORRECT and SEO-safe)
 * - Client-side metadata updates enhance UX but don't affect view-source
 * - Google crawls the INITIAL HTML (view-source), which is why SSR metadata is critical
 * - Tabs are handled via searchParams: ?tab=overview|discussion|practice|performance
 * - Performance tab is NON-indexable (user-specific analytics)
 */
export async function generateMetadata({ params, searchParams }) {
  const { exam: examSlug, subject: subjectSlug, unit: unitSlug, chapter: chapterSlug } = await params;
  
  // In Next.js 16, searchParams in layouts might be undefined or a Promise
  // Try to extract searchParams, with fallback to empty object
  let resolvedSearchParams = {};
  
  if (searchParams !== undefined && searchParams !== null) {
    resolvedSearchParams = await extractSearchParams(searchParams);
  }
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === "development") {
    logger.debug("Chapter Layout - Raw searchParams:", searchParams);
    logger.debug("Chapter Layout - Resolved searchParams:", resolvedSearchParams);
    logger.debug("Chapter Layout - Tab from searchParams:", resolvedSearchParams?.tab);
  }

  try {
    // Try to fetch data, but don't fail if it doesn't work
    let exam = null;
    let subject = null;
    let unit = null;
    let chapter = null;
    let chapterDetails = null;

    try {
      const { fetchExamById, fetchSubjectById, fetchUnitById, fetchChapterById, fetchChapterDetailsById, fetchSubjectsByExam, fetchUnitsBySubject, fetchChaptersByUnit, findByIdOrSlug } = await import("../../../../lib/api");
      
      // Fetch exam first
      exam = await fetchExamById(examSlug).catch(() => null);
      
      // Fetch subject - using fetchSubjectsByExam and findByIdOrSlug
      if (exam?._id) {
        const subjects = await fetchSubjectsByExam(exam._id).catch(() => []);
        if (subjects.length > 0) {
          subject = findByIdOrSlug(subjects, subjectSlug);
          if (subject?._id) {
            const fullSubjectData = await fetchSubjectById(subject._id).catch(() => null);
            if (fullSubjectData) subject = fullSubjectData;
          }
        }
      }
      
      // Fetch unit - using fetchUnitsBySubject and findByIdOrSlug
      if (subject?._id && exam?._id) {
        const units = await fetchUnitsBySubject(subject._id, exam._id).catch(() => []);
        if (units.length > 0) {
          unit = findByIdOrSlug(units, unitSlug);
          if (unit?._id) {
            const fullUnitData = await fetchUnitById(unit._id).catch(() => null);
            if (fullUnitData) unit = fullUnitData;
          }
        }
      }
      
      // Fetch chapter - using fetchChaptersByUnit and findByIdOrSlug
      if (unit?._id) {
        const chapters = await fetchChaptersByUnit(unit._id).catch(() => []);
        if (chapters.length > 0) {
          chapter = findByIdOrSlug(chapters, chapterSlug);
          if (chapter?._id) {
            const fullChapterData = await fetchChapterById(chapter._id).catch(() => null);
            if (fullChapterData) chapter = fullChapterData;
          }
        }
      }
      
      // Fetch chapter details separately
      if (chapter?._id) {
        chapterDetails = await fetchChapterDetailsById(chapter._id).catch(() => null);
      }
    } catch (fetchError) {
      // Silently fail - we'll use defaults
      logger.warn("Could not fetch data for metadata:", fetchError.message);
    }

    if (!chapter) {
      return generateSEO({}, { type: "chapter", name: chapterSlug || "Chapter" });
    }

    // Build path for canonical URL
    const path = `/${createSlug(exam?.name || "")}/${createSlug(subject?.name || "")}/${createSlug(unit?.name || "")}/${createSlug(chapter.name)}`;

    // Generate tab-aware metadata
    return await generateTabAwareMetadata(
      {
        name: chapter.name,
        type: "chapter",
      },
      chapterDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: exam?.name,
          subject: subject?.name,
          unit: unit?.name,
          chapter: chapter.name,
        },
      }
    );
  } catch (error) {
    // Always return valid metadata even on error
    logger.warn("Error generating metadata:", error.message);
    return generateSEO({}, { type: "chapter", name: chapterSlug || "Chapter" });
  }
}

export default function ChapterLayout({ children }) {
  return <>{children}</>;
}

