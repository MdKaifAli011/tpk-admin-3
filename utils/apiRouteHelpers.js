// ============================================
// Shared API Route Helpers
// ============================================

import mongoose from "mongoose";
import { STATUS } from "@/constants";

// Cache for frequently accessed queries
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Maximum cache entries

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
  const now = Date.now();

  // Check cache (only for active status queries)
  if (useCache && statusFilter === STATUS.ACTIVE) {
    const cached = queryCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      return cached.data;
    }
  }

  // Execute query
  const result = await queryFn();

  // Cache the result (only for active status)
  if (useCache && statusFilter === STATUS.ACTIVE) {
    queryCache.set(cacheKey, {
      data: result,
      timestamp: now,
    });

    // Clean up old cache entries periodically
    cleanupQueryCache();
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
      return queryBuilder
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
    })(),
  ]);

  return [total, documents];
}

/**
 * Cleanup cache - remove expired entries and enforce size limit (LRU)
 */
function cleanupQueryCache() {
  const now = Date.now();
  
  // First, remove expired entries
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  }
  
  // If still over limit, remove oldest entries (LRU)
  if (queryCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(queryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => queryCache.delete(key));
  }
}

/**
 * Clear cache for a specific pattern or all
 * @param {string} pattern - Cache key pattern (optional)
 */
export function clearQueryCache(pattern = null) {
  if (pattern) {
    for (const [key] of queryCache.entries()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
}

