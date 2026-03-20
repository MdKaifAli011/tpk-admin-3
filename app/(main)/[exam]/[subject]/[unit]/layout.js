import { generateMetadata as generateSEO } from "@/utils/seo";
import { createSlug } from "@/utils/slug";
import { logger } from "@/utils/logger";
import { generateTabAwareMetadata, extractSearchParams } from "@/utils/tabSeo";

// Force dynamic rendering to ensure fresh metadata
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Generate metadata for unit pages with tab awareness
 * 
 * IMPORTANT SEO NOTES:
 * - View-source shows INITIAL SSR metadata (this is CORRECT and SEO-safe)
 * - Client-side metadata updates enhance UX but don't affect view-source
 * - Google crawls the INITIAL HTML (view-source), which is why SSR metadata is critical
 * - Tabs are handled via searchParams: ?tab=overview|discussion|practice|performance
 * - Performance tab is NON-indexable (user-specific analytics)
 */
export async function generateMetadata({ params, searchParams }) {
  const { exam: examSlug, subject: subjectSlug, unit: unitSlug } = await params;
  
  // In Next.js 16, searchParams in layouts is a Promise - await it directly
  // This ensures metadata is generated correctly for view-source
  const resolvedSearchParams = await extractSearchParams(searchParams);

    try {
      // Try to fetch data, but don't fail if it doesn't work
      let exam = null;
      let subject = null;
      let unit = null;
      let unitDetails = null;

      try {
        const { fetchExamById, fetchSubjectById, fetchUnitById, fetchUnitDetailsById, fetchUnitsBySubject, fetchSubjectsByExam, findByIdOrSlug, createSlug } = await import("../../../lib/api");
        
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
          } else {
            logger.warn(`No subjects found for exam ${exam._id}`);
          }
        } else {
          logger.warn("Cannot fetch subjects - exam not found");
        }
        
        // Since fetchUnitById only works with ObjectIds, we need to fetch all units and find by slug
        // This is the correct approach for metadata generation
        if (subject?._id && exam?._id) {
          try {
            const units = await fetchUnitsBySubject(subject._id, exam._id).catch(() => []);
            
            if (units.length > 0) {
              // Find unit by slug
              unit = findByIdOrSlug(units, unitSlug);
              
              // If found by slug, fetch full unit data by ID to ensure we have all fields
              if (unit?._id) {
                const fullUnitData = await fetchUnitById(unit._id).catch(() => null);
                if (fullUnitData) {
                  unit = fullUnitData;
                }
              }
            } else {
              logger.debug(`No units found for subject ${subject._id}`);
            }
          } catch (err) {
            logger.warn("Could not fetch units by subject:", err.message);
          }
        } else {
          logger.debug("Cannot fetch units - missing subject or exam ID (exam or subject lookup may have failed)");
        }
        
        if (!unit) {
          logger.debug(`Unit not found for slug: ${unitSlug}`);
        }
        
        // Fetch unit details separately - only if unit was found and has an _id
        if (unit?._id) {
          try {
            unitDetails = await fetchUnitDetailsById(unit._id);
            // Log for debugging (only in development)
            if (unitDetails && process.env.NODE_ENV === "development") {
              logger.debug(`Unit details fetched successfully for ${unit._id}:`, {
                unitId: unitDetails.unitId,
                title: unitDetails.title,
                titleLength: unitDetails.title?.length || 0,
                titleAfterTrim: unitDetails.title?.trim(),
                hasTitle: !!unitDetails.title,
                hasMetaDescription: !!unitDetails.metaDescription,
                hasKeywords: !!unitDetails.keywords,
              });
            } else if (!unitDetails) {
              // Missing unit details is expected for some units; only log in dev to avoid log flood
              if (process.env.NODE_ENV === "development") {
                logger.debug(`No unit details for unitId: ${unit._id} (metadata will use defaults)`);
              }
            }
          } catch (detailsError) {
            logger.warn("Could not fetch unit details:", detailsError.message);
            unitDetails = null;
          }
        } else if (unit && process.env.NODE_ENV === "development") {
          logger.debug("Unit found but no _id available for unit details lookup");
        }
    } catch (fetchError) {
      // Silently fail - we'll use defaults
      logger.warn("Could not fetch data for metadata:", fetchError.message);
    }

    if (!unit) {
      return generateSEO({}, { type: "unit", name: unitSlug || "Unit", indexable: false });
    }

    // Build path for canonical URL
    const path = `/${createSlug(exam?.name || "")}/${createSlug(subject?.name || "")}/${createSlug(unit.name)}`;

    // Generate tab-aware metadata
    return await generateTabAwareMetadata(
      {
        name: unit.name,
        type: "unit",
      },
      unitDetails,
      resolvedSearchParams,
      {
        path,
        hierarchy: {
          exam: exam?.name,
          subject: subject?.name,
          unit: unit.name,
        },
      }
    );
  } catch (error) {
    // Always return valid metadata even on error
    logger.warn("Error generating metadata:", error.message);
    return generateSEO({}, { type: "unit", name: unitSlug || "Unit", indexable: false });
  }
}

export default function UnitLayout({ children }) {
  return <>{children}</>;
}

