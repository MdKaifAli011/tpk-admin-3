import { generateMetadata as generateSEO } from "@/utils/seo";
import { createSlug } from "@/utils/slug";
import { logger } from "@/utils/logger";
import { generateDiscussionForumMetadata } from "@/utils/discussionSeo";

// Force dynamic rendering to ensure fresh metadata
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { exam: examSlug, subject: subjectSlug, unit: unitSlug, chapter: chapterSlug } = await params;

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

    // Use SEO fields from Details: title, metaDescription, keywords
    // Prioritize admin-provided meta data over auto-generated
    const adminTitle = chapterDetails?.title?.trim();
    const adminMetaDescription = chapterDetails?.metaDescription?.trim();
    const adminKeywords = chapterDetails?.keywords?.trim();
    
    const seoData = {
      title: (adminTitle && adminTitle.length > 0)
        ? adminTitle
        : (chapter.name && subject?.name && exam?.name 
          ? `${chapter.name} - ${subject.name} - ${exam.name} | Study Notes & Practice Questions`
          : `${chapter.name || "Chapter"} - Exam Preparation`),
      metaDescription: (adminMetaDescription && adminMetaDescription.length > 0)
        ? adminMetaDescription
        : (chapter.name && subject?.name && exam?.name
          ? `Learn ${chapter.name} in ${subject.name} for ${exam.name} exam. Access detailed notes, solved examples, practice questions, and expert explanations. Master ${chapter.name} concepts with comprehensive study materials.`
          : `Learn ${chapter.name || "Chapter"} with detailed study materials, solved examples, and practice questions.`),
      keywords: (adminKeywords && adminKeywords.length > 0)
        ? adminKeywords
        : (chapter.name && subject?.name && exam?.name 
          ? `${chapter.name}, ${subject.name}, ${exam.name}, ${chapter.name} ${subject.name}, ${chapter.name} notes, ${exam.name} ${chapter.name} practice questions`
          : `${chapter.name || "Chapter"}, ${chapter.name || "Chapter"} preparation, study notes`),
    };

    return generateSEO(seoData, {
      type: "chapter",
      name: chapter.name,
      path: `/${createSlug(exam?.name || "")}/${createSlug(subject?.name || "")}/${createSlug(unit?.name || "")}/${createSlug(chapter.name)}`,
    });
  } catch (error) {
    // Always return valid metadata even on error
    logger.warn("Error generating metadata:", error.message);
    return generateSEO({}, { type: "chapter", name: chapterSlug || "Chapter" });
  }
}

export default function ChapterLayout({ children }) {
  return <>{children}</>;
}

