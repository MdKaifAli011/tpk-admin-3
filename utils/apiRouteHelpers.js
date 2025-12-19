// ============================================
// Shared API Route Helpers
// ============================================

import mongoose from "mongoose";
import { STATUS } from "@/constants";
import cacheManager from "@/utils/cacheManager";

/**
 * Build MongoDB query from search params
 * @param {URLSearchParams} searchParams - URL search parameters
 * @param {Object} options - Query options
 * @returns {Object} MongoDB query object
 */
export function buildQueryFromParams(searchParams, options = {}) {
  const {
    statusKey = "status",
    statusDefault = STATUS.ACTIVE,
    idFields = [],
  } = options;

  const query = {};
  const statusFilter = searchParams.get(statusKey) || statusDefault;

  // Add status filter
  if (statusFilter !== "all") {
    query[statusKey] = statusFilter;
  }

  // Add ID filters
  idFields.forEach((field) => {
    const value = searchParams.get(field);
    if (value && mongoose.Types.ObjectId.isValid(value)) {
      query[field] = value;
    }
  });

  return query;
}

/**
 * Get cached response or execute query
 * @param {string} cacheKey - Cache key
 * @param {Function} queryFn - Query function
 * @param {Object} options - Options
 * @returns {Promise} Query result
 */
export async function getCachedOrExecute(cacheKey, queryFn, options = {}) {
  const { useCache = true, statusFilter } = options;

  // Check cache (only for active status queries)
  if (useCache && statusFilter === STATUS.ACTIVE) {
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Execute query
  const result = await queryFn();

  // Cache the result (only for active status)
  if (useCache && statusFilter === STATUS.ACTIVE) {
    cacheManager.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes TTL
  }

  return result;
}

/**
 * Optimized count and find query execution
 * @param {Object} Model - Mongoose model
 * @param {Object} query - MongoDB query
 * @param {Object} options - Query options
 * @returns {Promise<Array>} [total, documents]
 */
export async function optimizedFind(Model, query, options = {}) {
  const {
    page = 1,
    limit = 10,
    skip = 0,
    populate = [],
    sort = { orderNumber: 1 },
    select = null,
    shouldCount = true,
  } = options;

  // Parallel execution for better performance
  const [total, documents] = await Promise.all([
    shouldCount ? Model.countDocuments(query) : Promise.resolve(0),
    (async () => {
      let queryBuilder = Model.find(query);

      // Apply populate
      populate.forEach((pop) => {
        if (typeof pop === "string") {
          queryBuilder = queryBuilder.populate(pop);
        } else if (typeof pop === "object") {
          queryBuilder = queryBuilder.populate(pop);
        }
      });

      // Apply select
      if (select) {
        queryBuilder = queryBuilder.select(select);
      }

      // Apply sort, skip, limit
      return queryBuilder.sort(sort).skip(skip).limit(limit).lean().exec();
    })(),
  ]);

  return [total, documents];
}

/**
 * Clear cache for a specific pattern or all
 * @param {string} pattern - Cache key pattern (optional)
 */
export function clearQueryCache(pattern = null) {
  cacheManager.clear(pattern);
}

/**
 * Update numberOfQuestions count for a practice subcategory
 * Automatically calculates and updates the count based on actual questions
 * @param {string} subCategoryId - Practice subcategory ID
 * @returns {Promise<number>} Updated count of questions
 */
export async function updateSubCategoryQuestionCount(subCategoryId) {
  try {
    if (!subCategoryId || !mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return 0;
    }

    // Dynamically import to avoid circular dependencies
    const PracticeQuestion =
      mongoose.models.PracticeQuestion ||
      (await import("@/models/PracticeQuestion.js")).default;
    const PracticeSubCategory =
      mongoose.models.PracticeSubCategory ||
      (await import("@/models/PracticeSubCategory.js")).default;

    // Count questions for this subcategory
    const questionCount = await PracticeQuestion.countDocuments({
      subCategoryId,
    });

    // Update the subcategory's numberOfQuestions
    await PracticeSubCategory.findByIdAndUpdate(subCategoryId, {
      $set: { numberOfQuestions: questionCount },
    });

    // Clear cache for subcategories
    cacheManager.clear("practice-subcategories-");

    return questionCount;
  } catch (error) {
    console.error(
      `Error updating question count for subcategory ${subCategoryId}:`,
      error
    );
    // Don't throw - allow the operation to continue even if count update fails
    return 0;
  }
}
