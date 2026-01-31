import { generateMetadata as generateSEO } from "@/utils/seo";
import { createSlug } from "@/utils/slug";
import { logger } from "@/utils/logger";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";

// Force dynamic rendering to ensure fresh metadata
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Generate metadata for definition pages with tab awareness
 * 
 * IMPORTANT SEO NOTES:
 * - View-source shows INITIAL SSR metadata (this is CORRECT and SEO-safe)
 * - Client-side metadata updates enhance UX but don't affect view-source
 * - Google crawls the INITIAL HTML (view-source), which is why SSR metadata is critical
 * - Tabs are handled via searchParams: ?tab=overview|discussion|practice|performance
 * - Performance tab is NON-indexable (user-specific analytics)
 */
export async function generateMetadata({ params, searchParams }) {
  const { definition: definitionSlug } = await params;
  
  // In Next.js 16, searchParams in layouts is a Promise - await it directly
  // This ensures metadata is generated correctly for view-source
  const resolvedSearchParams = await extractSearchParams(searchParams);

  try {
    // Try to fetch definition data and details, but don't fail if it doesn't work
    let definition = null;
    let definitionDetails = null;

    try {
      // We need to extract all params to find the definition
      const { exam, subject, unit, chapter, topic, subtopic } = await params;

      // Fetch the full hierarchy to get to the definition
      const {
        fetchExamById,
        fetchSubjectsByExam,
        fetchSubjectById,
        fetchUnitsBySubject,
        fetchUnitById,
        fetchChaptersByUnit,
        fetchChapterById,
        fetchTopicsByChapter,
        fetchTopicById,
        fetchSubTopicsByTopic,
        fetchDefinitionsBySubTopic,
        fetchDefinitionById,
        fetchDefinitionDetailsById,
        findByIdOrSlug,
      } = await import("../../../../../../../lib/api");

      const examData = await fetchExamById(exam).catch(() => null);
      if (!examData) {
        return generateSEO(
          {},
          { type: "definition", name: definitionSlug || "Definition", indexable: false }
        );
      }

      const subjects = await fetchSubjectsByExam(examData._id).catch(() => []);
      const foundSubject = findByIdOrSlug(subjects, subject);
      if (!foundSubject) {
        return generateSEO(
          {},
          { type: "definition", name: definitionSlug || "Definition", indexable: false }
        );
      }

      const units = await fetchUnitsBySubject(
        foundSubject._id,
        examData._id
      ).catch(() => []);
      const foundUnit = findByIdOrSlug(units, unit);
      if (!foundUnit) {
        return generateSEO(
          {},
          { type: "definition", name: definitionSlug || "Definition", indexable: false }
        );
      }

      const chapters = await fetchChaptersByUnit(foundUnit._id).catch(() => []);
      const foundChapter = findByIdOrSlug(chapters, chapter);
      if (!foundChapter) {
        return generateSEO(
          {},
          { type: "definition", name: definitionSlug || "Definition" }
        );
      }

      const topics = await fetchTopicsByChapter(foundChapter._id).catch(
        () => []
      );
      const foundTopic = findByIdOrSlug(topics, topic);
      if (!foundTopic) {
        return generateSEO(
          {},
          { type: "definition", name: definitionSlug || "Definition", indexable: false }
        );
      }

      const subtopics = await fetchSubTopicsByTopic(foundTopic._id).catch(
        () => []
      );
      const foundSubtopic = findByIdOrSlug(subtopics, subtopic);
      if (!foundSubtopic) {
        return generateSEO(
          {},
          { type: "definition", name: definitionSlug || "Definition", indexable: false }
        );
      }

      const definitions = await fetchDefinitionsBySubTopic(
        foundSubtopic._id
      ).catch(() => []);
      definition = findByIdOrSlug(definitions, definitionSlug);

      if (definition?._id) {
        definitionDetails = await fetchDefinitionDetailsById(
          definition._id
        ).catch(() => null);
      }
    } catch (fetchError) {
      // Silently fail - we'll use defaults
      logger.warn(
        "Could not fetch definition for metadata:",
        fetchError.message
      );
    }

    if (!definition) {
      return generateSEO(
        {},
        { type: "definition", name: definitionSlug || "Definition" }
      );
    }

    // Build path for canonical URL
    const examSlug = createSlug(definition.examId?.name || "");
    const subjectSlug = createSlug(definition.subjectId?.name || "");
    const unitSlug = createSlug(definition.unitId?.name || "");
    const chapterSlug = createSlug(definition.chapterId?.name || "");
    const topicSlug = createSlug(definition.topicId?.name || "");
    const subtopicSlug = createSlug(definition.subTopicId?.name || "");
    const definitionSlugValue = createSlug(definition.name);
    const path = `/${examSlug}/${subjectSlug}/${unitSlug}/${chapterSlug}/${topicSlug}/${subtopicSlug}/${definitionSlugValue}`;

    // Generate tab-aware metadata
    return await generateTabAwareMetadata(
      {
        name: definition.name,
        type: "definition",
      },
      definitionDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: definition.examId?.name,
          subject: definition.subjectId?.name,
          unit: definition.unitId?.name,
          chapter: definition.chapterId?.name,
          topic: definition.topicId?.name,
          subtopic: definition.subTopicId?.name,
        },
      }
    );
  } catch (error) {
    // Always return valid metadata even on error
    logger.warn("Error generating metadata:", error.message);
    return generateSEO(
      {},
      { type: "definition", name: definitionSlug || "Definition", indexable: false }
    );
  }
}

export default function DefinitionLayout({ children }) {
  return <>{children}</>;
}
