import { generateMetadata as generateSEO } from "@/utils/seo";
import { createSlug } from "@/utils/slug";
import { logger } from "@/utils/logger";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";

// Force dynamic rendering to ensure fresh metadata
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Generate metadata for topic pages with tab awareness
 * 
 * IMPORTANT SEO NOTES:
 * - View-source shows INITIAL SSR metadata (this is CORRECT and SEO-safe)
 * - Client-side metadata updates enhance UX but don't affect view-source
 * - Google crawls the INITIAL HTML (view-source), which is why SSR metadata is critical
 * - Tabs are handled via searchParams: ?tab=overview|discussion|practice|performance
 * - Performance tab is NON-indexable (user-specific analytics)
 */
export async function generateMetadata({ params, searchParams }) {
  const { exam: examSlug, subject: subjectSlug, unit: unitSlug, chapter: chapterSlug, topic: topicSlug } = await params;
  
  // In Next.js 16, searchParams in layouts is a Promise - await it directly
  // This ensures metadata is generated correctly for view-source
  const resolvedSearchParams = await extractSearchParams(searchParams);

  try {
    // Try to fetch data, but don't fail if it doesn't work
    let exam = null;
    let subject = null;
    let unit = null;
    let chapter = null;
    let topic = null;
    let topicDetails = null;

    try {
      const { fetchExamById, fetchSubjectById, fetchUnitById, fetchChapterById, fetchTopicById, fetchTopicDetailsById, fetchSubjectsByExam, fetchUnitsBySubject, fetchChaptersByUnit, fetchTopicsByChapter, findByIdOrSlug } = await import("../../../../../lib/api");
      
      // Fetch exam first
      exam = await fetchExamById(examSlug).catch(() => null);
      
      // Fetch subject
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
      
      // Fetch unit
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
      
      // Fetch chapter
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
      
      // Fetch topic - using fetchTopicsByChapter and findByIdOrSlug
      if (chapter?._id) {
        const topics = await fetchTopicsByChapter(chapter._id).catch(() => []);
        if (topics.length > 0) {
          topic = findByIdOrSlug(topics, topicSlug);
          if (topic?._id) {
            const fullTopicData = await fetchTopicById(topic._id).catch(() => null);
            if (fullTopicData) topic = fullTopicData;
          }
        }
      }
      
      // Fetch topic details separately
      if (topic?._id) {
        topicDetails = await fetchTopicDetailsById(topic._id).catch(() => null);
      }
    } catch (fetchError) {
      // Silently fail - we'll use defaults
      logger.warn("Could not fetch data for metadata:", fetchError.message);
    }

    if (!topic) {
      return generateSEO({}, { type: "topic", name: topicSlug || "Topic", indexable: false });
    }

    // Build path for canonical URL
    const path = `/${createSlug(exam?.name || "")}/${createSlug(subject?.name || "")}/${createSlug(unit?.name || "")}/${createSlug(chapter?.name || "")}/${createSlug(topic.name)}`;

    // Generate tab-aware metadata
    return await generateTabAwareMetadata(
      {
        name: topic.name,
        type: "topic",
      },
      topicDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: exam?.name,
          subject: subject?.name,
          unit: unit?.name,
          chapter: chapter?.name,
          topic: topic.name,
        },
      }
    );
  } catch (error) {
    // Always return valid metadata even on error
    logger.warn("Error generating metadata:", error.message);
    return generateSEO({}, { type: "topic", name: topicSlug || "Topic", indexable: false });
  }
}

export default function TopicLayout({ children }) {
  return <>{children}</>;
}

