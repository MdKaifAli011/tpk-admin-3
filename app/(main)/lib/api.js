import api from "@/lib/api";
import {
  createSlug as createSlugUtil,
  findByIdOrSlug as findByIdOrSlugUtil,
} from "@/utils/slug";
import { STATUS } from "@/constants";
import { logger } from "@/utils/logger";

// Create slug utility function for use in this file (local variable)
const createSlugLocal = createSlugUtil;

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

// Helper to get base URL for server-side requests
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Client-side: use basePath for relative URLs
    return basePath;
  }
  // Server-side (e.g. SSR, server components): use deployment URL in production so fetch() reaches the same app
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}${basePath}`;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    const base = appUrl.replace(/\/$/, "");
    return `${base}${basePath}`;
  }
  // Development or same-host production: localhost
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}${basePath}`;
};

// Request cache for deduplication (prevents duplicate requests)
const requestCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

// Helper to get cache key
const getCacheKey = (url, params = {}) => {
  return `${url}_${JSON.stringify(params)}`;
};

// Fetch all active exams (with pagination support and request deduplication)
export const fetchExams = async (options = {}) => {
  try {
    const { page = 1, limit = 100, status = STATUS.ACTIVE } = options;

    // Check if we're on server side
    const isServer = typeof window === "undefined";
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/exam?page=${page}&limit=${limit}&status=${status}`;
    const cacheKey = getCacheKey(url, { page, limit, status });

    // Check cache for recent requests (deduplication)
    if (!isServer && requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
      requestCache.delete(cacheKey);
    }

    // Use fetch for server-side, axios for client-side
    let result = [];
    if (isServer) {
      const response = await fetch(url, {
        cache: "no-store", // Always fetch fresh data for exams
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        // API already filters by status correctly, so return all data
        // Only do a safety check to ensure we have valid exams with names
        const exams = data.data || [];
        result = exams.filter((exam) => exam && exam.name);
      }
    } else {
      // Client-side: use axios (for active exams, no auth needed)
      // For inactive/all, axios will automatically include token if available
      const response = await api
        .get(`/exam?page=${page}&limit=${limit}&status=${status}`, {
          // Don't send auth header for active exams (public access)
          ...(status === STATUS.ACTIVE ? { headers: {} } : {}),
        })
        .catch((error) => {
          // If axios fails, try with fetch (no auth)
          if (status === STATUS.ACTIVE) {
            return fetch(
              `${baseUrl || ""
              }/api/exam?page=${page}&limit=${limit}&status=${status}`
            )
              .then((res) => res.json())
              .catch(() => ({ success: false, data: [] }));
          }
          throw error;
        });

      if (response.data?.success && response.data?.data) {
        const exams = response.data.data || [];
        result = exams.filter((exam) => exam && exam.name);
      }
    }

    // Cache result for deduplication
    if (!isServer && result.length > 0) {
      requestCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
      // Clean up old cache entries
      setTimeout(() => {
        requestCache.delete(cacheKey);
      }, CACHE_DURATION);
    }

    return result;
  } catch (error) {
    logger.error("Error fetching exams:", error);
    return [];
  }
};

// Fetch exam by ID or name/slug
export const fetchExamById = async (examId) => {
  if (!examId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // Try by ID first (only if it looks like an ObjectId)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(examId);
    if (isObjectId) {
      if (isServer) {
        // Server-side: use fetch
        try {
          const response = await fetch(`${baseUrl}/api/exam/${examId}`, {
            next: { revalidate: 60 },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              return data.data;
            }
          }
        } catch (err) {
          // Continue to fallback
        }
      } else {
        // Client-side: use axios
        try {
          const response = await api.get(`/exam/${examId}`);
          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (error) {
          // Continue to fallback
        }
      }
    }
  } catch (error) {
    // Continue to fallback
  }

  // Fallback: fetch all exams and find by slug
  try {
    const exams = await fetchExams({ limit: 100 });
    const examIdLower = examId?.toLowerCase();
    const found = exams.find(
      (exam) =>
        exam._id === examId ||
        exam.name?.toLowerCase() === examIdLower ||
        createSlugLocal(exam.name) === examIdLower
    );

    // If found by slug, fetch the full exam data by its actual ID
    if (found && found._id) {
      try {
        if (isServer) {
          const response = await fetch(`${baseUrl}/api/exam/${found._id}`, {
            next: { revalidate: 60 },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              return data.data;
            }
          }
          return found;
        } else {
          const fullResponse = await api.get(`/exam/${found._id}`);
          if (fullResponse.data.success && fullResponse.data.data) {
            return fullResponse.data.data;
          }
          return found;
        }
      } catch (fullErr) {
        return found;
      }
    }

    return found || null;
  } catch (err) {
    logger.warn("Error fetching exam by slug:", err.message);
    return null;
  }
};

// Fetch prime video tree (YouTube videos from editor content, one call)
export const fetchPrimeVideo = async () => {
  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/video-library`;
  try {
    if (isServer) {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return { success: false, data: { exams: [], nodes: [] } };
      const json = await response.json();
      return json.success ? json : { success: false, data: { exams: [], nodes: [] } };
    }
    const response = await api.get("/video-library");
    return response.data?.success ? response.data : { success: false, data: { exams: [], nodes: [] } };
  } catch (err) {
    logger.warn("fetchPrimeVideo error:", err?.message);
    return { success: false, data: { exams: [], nodes: [] } };
  }
};

// Fetch subjects by exam ID (optimized with pagination)
export const fetchSubjectsByExam = async (examId, options = {}) => {
  if (!examId) {
    logger.warn("fetchSubjectsByExam: No examId provided");
    return [];
  }

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const { page = 1, limit = 100 } = options;
    const url = `${baseUrl}/api/subject?examId=${examId}&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`;

    if (isServer) {
      // Server-side: use fetch
      const response = await fetch(url, {
        cache: "no-store", // Always fetch fresh data
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          const subjects = data.data || [];

          // Handle paginated response
          if (data.pagination) {
            const validSubjects = subjects.filter((subject) => {
              const subjectExamId = subject.examId?._id || subject.examId;
              const matchesExam =
                String(subjectExamId) === String(examId) ||
                subject.examId?.name?.toLowerCase() ===
                String(examId).toLowerCase();
              const matchesStatus = subject.status
                ? subject.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
                : false;
              return matchesExam && matchesStatus;
            });
            return validSubjects.sort(
              (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
            );
          }

          // Handle legacy response format
          const filteredSubjects = subjects.filter((subject) => {
            const subjectExamId = subject.examId?._id || subject.examId;
            const matchesExam =
              String(subjectExamId) === String(examId) ||
              subject.examId === examId ||
              subject.examId?.name?.toLowerCase() ===
              String(examId).toLowerCase();
            const matchesStatus = subject.status
              ? subject.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
              : false;
            return matchesExam && matchesStatus;
          });
          return filteredSubjects.sort(
            (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
          );
        }
      }
      return [];
    } else {
      // Client-side: use axios
      const response = await api.get(
        `/subject?examId=${examId}&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`
      );

      if (response.data?.success) {
        const subjects = response.data.data || [];

        // Handle paginated response - API already filters by examId, but let's verify
        if (response.data.pagination) {
          // Double-check that subjects belong to the correct exam
          const validSubjects = subjects.filter((subject) => {
            const subjectExamId = subject.examId?._id || subject.examId;
            const matchesExam =
              String(subjectExamId) === String(examId) ||
              subject.examId?.name?.toLowerCase() ===
              String(examId).toLowerCase();
            const matchesStatus = subject.status
              ? subject.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
              : false;
            return matchesExam && matchesStatus;
          });

          // Sort by orderNumber
          return validSubjects.sort(
            (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
          );
        }

        // Handle legacy response format
        const filteredSubjects = subjects.filter((subject) => {
          const subjectExamId = subject.examId?._id || subject.examId;
          const matchesExam =
            String(subjectExamId) === String(examId) ||
            subject.examId === examId ||
            subject.examId?.name?.toLowerCase() ===
            String(examId).toLowerCase();
          const matchesStatus = subject.status
            ? subject.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
            : false;
          return matchesExam && matchesStatus;
        });
        // Sort by orderNumber
        return filteredSubjects.sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );
      }

      logger.warn(
        "fetchSubjectsByExam: Response not successful:",
        response.data
      );
      return [];
    }
  } catch (error) {
    logger.error("Error fetching subjects:", error);
    logger.error("Error details:", {
      message: error.message,
      response: error.response?.data,
      examId,
    });
    return [];
  }
};

// Fetch subject by ID or slug
export const fetchSubjectById = async (subjectId) => {
  if (!subjectId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // Try by ID first (only if it looks like an ObjectId)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(subjectId);
    if (isObjectId) {
      if (isServer) {
        // Server-side: use fetch
        try {
          const response = await fetch(`${baseUrl}/api/subject/${subjectId}`, {
            next: { revalidate: 60 },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              return data.data;
            }
          }
        } catch (err) {
          // Continue to fallback
        }
      } else {
        // Client-side: use axios
        try {
          const response = await api.get(`/subject/${subjectId}`);
          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (error) {
          // Continue to fallback
        }
      }
    }
  } catch (error) {
    // Continue to fallback
  }

  // Fallback: try to fetch all subjects (this is less efficient, but works)
  // Note: This fallback requires an examId, so it may not work perfectly
  // For now, we'll return null if we can't find by ID
  return null;
};

// Fetch units by subject ID and exam ID (optimized with pagination)
export const fetchUnitsBySubject = async (subjectId, examId, options = {}) => {
  if (!subjectId) return [];

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const { page = 1, limit = 100 } = options;
    const url = `${baseUrl}/api/unit?subjectId=${subjectId}${examId ? `&examId=${examId}` : ""
      }&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`;

    if (isServer) {
      // Server-side: use fetch
      const response = await fetch(url, {
        cache: "no-store", // Always fetch fresh data
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Handle paginated response
          if (data.pagination) {
            return data.data || [];
          }
          // Handle legacy response format
          const filteredUnits = (data.data || []).filter(
            (unit) =>
              unit.status &&
              unit.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
          );
          // Sort by orderNumber
          return filteredUnits.sort(
            (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
          );
        }
      }
      return [];
    } else {
      // Client-side: use axios
      const response = await api.get(
        `/unit?subjectId=${subjectId}${examId ? `&examId=${examId}` : ""
        }&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`
      );

      if (response.data.success) {
        // Handle paginated response
        if (response.data.pagination) {
          return response.data.data || [];
        }
        // Handle legacy response format
        const filteredUnits = (response.data.data || []).filter(
          (unit) =>
            unit.status &&
            unit.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
        );
        // Sort by orderNumber
        return filteredUnits.sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching units:", error);
    return [];
  }
};

// Fetch chapters by unit ID (optimized with pagination)
export const fetchChaptersByUnit = async (unitId, options = {}) => {
  if (!unitId) return [];

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const { page = 1, limit = 100 } = options;
    const url = `${baseUrl}/api/chapter?unitId=${unitId}&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`;

    if (isServer) {
      // Server-side: use fetch
      const response = await fetch(url, {
        cache: "no-store", // Always fetch fresh data
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Handle paginated response
          if (data.pagination) {
            return data.data || [];
          }
          // Handle legacy response format
          const filteredChapters = (data.data || []).filter(
            (chapter) =>
              chapter.status &&
              chapter.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
          );
          // Sort by orderNumber
          return filteredChapters.sort(
            (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
          );
        }
      }
      return [];
    } else {
      // Client-side: use axios
      const response = await api.get(
        `/chapter?unitId=${unitId}&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`
      );

      if (response.data.success) {
        // Handle paginated response
        if (response.data.pagination) {
          return response.data.data || [];
        }
        // Handle legacy response format
        const filteredChapters = (response.data.data || []).filter(
          (chapter) =>
            chapter.status &&
            chapter.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
        );
        // Sort by orderNumber
        return filteredChapters.sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching chapters:", error);
    return [];
  }
};

// Fetch chapters by subject ID
export const fetchChaptersBySubject = async (subjectId, examId) => {
  try {
    let url = `/chapter?subjectId=${subjectId}`;
    if (examId) {
      url += `&examId=${examId}`;
    }
    const response = await api.get(url);
    if (response.data.success) {
      // Filter only active chapters (case-insensitive)
      return response.data.data.filter(
        (chapter) =>
          chapter.status &&
          chapter.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
      );
    }
    return [];
  } catch (error) {
    logger.error("Error fetching chapters by subject:", error);
    return [];
  }
};

// Fetch all chapters for a subject (through units)
export const fetchAllChaptersForSubject = async (subjectId, examId) => {
  try {
    // First fetch units for this subject
    const units = await fetchUnitsBySubject(subjectId, examId);

    // Then fetch chapters for each unit
    const allChapters = [];
    for (const unit of units) {
      const chapters = await fetchChaptersByUnit(unit._id);
      allChapters.push(...chapters);
    }

    // Sort by orderNumber
    return allChapters.sort(
      (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
    );
  } catch (error) {
    logger.error("Error fetching all chapters for subject:", error);
    return [];
  }
};

// Fetch unit by ID or slug
export const fetchUnitById = async (unitId) => {
  if (!unitId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // Try by ID first (only if it looks like an ObjectId)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(unitId);
    if (isObjectId) {
      if (isServer) {
        // Server-side: use fetch
        try {
          const response = await fetch(`${baseUrl}/api/unit/${unitId}`, {
            next: { revalidate: 60 },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              return data.data;
            }
          }
        } catch (err) {
          // Continue to fallback
        }
      } else {
        // Client-side: use axios
        try {
          const response = await api.get(`/unit/${unitId}`);
          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (error) {
          // Continue to fallback
        }
      }
    }
  } catch (error) {
    // Continue to fallback
  }

  // Fallback: try fetching all units (this is less efficient, but works)
  // Note: This fallback requires a subjectId or examId, so it may not work perfectly
  // For now, we'll return null if we can't find by ID
  return null;
};

// Fetch chapter by ID or slug
export const fetchChapterById = async (chapterId) => {
  if (!chapterId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // Try by ID first (only if it looks like an ObjectId)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(chapterId);
    if (isObjectId) {
      if (isServer) {
        // Server-side: use fetch
        try {
          const response = await fetch(`${baseUrl}/api/chapter/${chapterId}`, {
            next: { revalidate: 60 },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              return data.data;
            }
          }
        } catch (err) {
          // Continue to fallback
        }
      } else {
        // Client-side: use axios
        try {
          const response = await api.get(`/chapter/${chapterId}`);
          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (error) {
          // Continue to fallback
        }
      }
    }
  } catch (error) {
    // Continue to fallback
  }

  // Fallback: try fetching all chapters (this is less efficient, but works)
  // Note: This fallback requires a unitId, so it may not work perfectly
  // For now, we'll return null if we can't find by ID
  return null;
};

// Fetch topics by chapter ID (optimized with pagination)
export const fetchTopicsByChapter = async (chapterId, options = {}) => {
  if (!chapterId) return [];

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const { page = 1, limit = 100 } = options;
    const url = `${baseUrl}/api/topic?chapterId=${chapterId}&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`;

    if (isServer) {
      // Server-side: use fetch
      const response = await fetch(url, {
        cache: "no-store", // Always fetch fresh data
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Handle paginated response
          if (data.pagination) {
            return data.data || [];
          }
          // Handle legacy response format
          const filteredTopics = (data.data || []).filter(
            (topic) =>
              topic.status &&
              topic.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
          );
          // Sort by orderNumber
          return filteredTopics.sort(
            (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
          );
        }
      }
      return [];
    } else {
      // Client-side: use axios
      const response = await api.get(
        `/topic?chapterId=${chapterId}&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`
      );

      if (response.data.success) {
        // Handle paginated response
        if (response.data.pagination) {
          return response.data.data || [];
        }
        // Handle legacy response format
        const filteredTopics = (response.data.data || []).filter(
          (topic) =>
            topic.status &&
            topic.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
        );
        // Sort by orderNumber
        return filteredTopics.sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching topics:", error);
    return [];
  }
};

// Fetch topic by ID or slug
export const fetchTopicById = async (topicId) => {
  if (!topicId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // Try by ID first (only if it looks like an ObjectId)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(topicId);
    if (isObjectId) {
      if (isServer) {
        // Server-side: use fetch
        try {
          const response = await fetch(`${baseUrl}/api/topic/${topicId}`, {
            next: { revalidate: 60 },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              return data.data;
            }
          }
        } catch (err) {
          // Continue to fallback
        }
      } else {
        // Client-side: use axios
        try {
          const response = await api.get(`/topic/${topicId}`);
          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (error) {
          // Continue to fallback
        }
      }
    }
  } catch (error) {
    // Continue to fallback
  }

  // Fallback: try fetching all topics (this is less efficient, but works)
  // Note: This fallback requires a chapterId, so it may not work perfectly
  // For now, we'll return null if we can't find by ID
  return null;
};

// Fetch subtopics by topic ID (optimized with pagination)
export const fetchSubTopicsByTopic = async (topicId, options = {}) => {
  if (!topicId) return [];

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const { page = 1, limit = 100 } = options;
    const url = `${baseUrl}/api/subtopic?topicId=${topicId}&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`;

    if (isServer) {
      // Server-side: use fetch
      const response = await fetch(url, {
        cache: "no-store", // Always fetch fresh data
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Handle paginated response
          if (data.pagination) {
            return data.data || [];
          }
          // Handle legacy response format
          const filteredSubTopics = (data.data || []).filter(
            (sub) =>
              sub.status &&
              sub.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
          );
          // Sort by orderNumber
          return filteredSubTopics.sort(
            (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
          );
        }
      }
      return [];
    } else {
      // Client-side: use axios
      const response = await api.get(
        `/subtopic?topicId=${topicId}&page=${page}&limit=${limit}&status=${STATUS.ACTIVE}`
      );

      if (response.data.success) {
        // Handle paginated response
        if (response.data.pagination) {
          return response.data.data || [];
        }
        // Handle legacy response format
        const filteredSubTopics = (response.data.data || []).filter(
          (sub) =>
            sub.status &&
            sub.status.toLowerCase() === STATUS.ACTIVE.toLowerCase()
        );
        // Sort by orderNumber
        return filteredSubTopics.sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching subtopics:", error);
    return [];
  }
};

// Fetch subtopic by ID or slug
export const fetchSubTopicById = async (subTopicId) => {
  if (!subTopicId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // Try by ID first (only if it looks like an ObjectId)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(subTopicId);
    if (isObjectId) {
      if (isServer) {
        // Server-side: use fetch
        try {
          const response = await fetch(
            `${baseUrl}/api/subtopic/${subTopicId}`,
            {
              next: { revalidate: 60 },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              return data.data;
            }
          }
        } catch (err) {
          // Continue to fallback
        }
      } else {
        // Client-side: use axios
        try {
          const response = await api.get(`/subtopic/${subTopicId}`);
          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (error) {
          // Continue to fallback
        }
      }
    }
  } catch (error) {
    // Continue to fallback
  }

  // Fallback: try fetching all subtopics (this is less efficient, but works)
  // Note: This fallback requires a topicId, so it may not work perfectly
  // For now, we'll return null if we can't find by ID
  return null;
};

// ========== DETAILS FETCHING FUNCTIONS ==========
// These functions fetch Details (content and SEO fields) separately from main entities

// Fetch exam details (content, title, metaDescription, keywords)
export const fetchExamDetailsById = async (examId) => {
  if (!examId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  // Convert examId to string if it's an ObjectId object
  const examIdString = examId.toString ? examId.toString() : String(examId);

  try {
    if (isServer) {
      const response = await fetch(
        `${baseUrl}/api/exam/${examIdString}/details`,
        {
          cache: "no-store", // Always fetch fresh data for metadata
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
      // If no details exist, return defaults
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    } else {
      try {
        const response = await api.get(`/exam/${examId}/details`);
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
      } catch (error) {
        // If no details exist, return defaults
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    }
  } catch (error) {
    logger.warn("Error fetching exam details:", error);
    return {
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    };
  }
};

// Fetch exam info (exam date, maximumMarks, etc.) for dashboard prep days / time required
export const fetchExamInfo = async (examId) => {
  if (!examId) return null;
  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();
  const id = examId.toString ? examId.toString() : String(examId);
  try {
    if (isServer) {
      const response = await fetch(`${baseUrl}/api/exam-info?examId=${id}`, {
        cache: "no-store",
      });
      if (!response.ok) return null;
      const data = await response.json();
      const list = data?.success && Array.isArray(data?.data) ? data.data : [];
      return list[0] || null;
    }
    const response = await api.get(`/exam-info?examId=${id}`);
    const list = response?.data?.data;
    return Array.isArray(list) && list.length ? list[0] : null;
  } catch (err) {
    logger.warn("fetchExamInfo error:", err?.message);
    return null;
  }
};

// Fetch subject details
export const fetchSubjectDetailsById = async (subjectId) => {
  if (!subjectId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  // Convert subjectId to string if it's an ObjectId object
  const subjectIdString = subjectId.toString
    ? subjectId.toString()
    : String(subjectId);

  try {
    if (isServer) {
      const response = await fetch(
        `${baseUrl}/api/subject/${subjectIdString}/details`,
        {
          cache: "no-store", // Always fetch fresh data for metadata
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    } else {
      try {
        const response = await api.get(`/subject/${subjectId}/details`);
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
      } catch (error) {
        // If no details exist, return defaults
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    }
  } catch (error) {
    logger.warn("Error fetching subject details:", error);
    return {
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    };
  }
};

// Fetch unit details
export const fetchUnitDetailsById = async (unitId) => {
  if (!unitId) {
    logger.warn("fetchUnitDetailsById called with null/undefined unitId");
    return null;
  }

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  // Convert unitId to string if it's an ObjectId object
  const unitIdString = unitId.toString ? unitId.toString() : String(unitId);

  try {
    if (isServer) {
      const url = `${baseUrl}/api/unit/${unitIdString}/details`;
      const response = await fetch(url, {
        cache: "no-store", // Always fetch fresh data for metadata (no caching)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        } else {
          logger.warn("Unit details response not successful or no data", {
            unitId: unitIdString,
            response: data,
          });
        }
      } else {
        const errorText = await response.text();
        logger.error("Unit details API response not OK", {
          status: response.status,
          unitId: unitIdString,
          error: errorText,
        });
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    } else {
      try {
        const response = await api.get(`/unit/${unitId}/details`);
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
      } catch (error) {
        // If no details exist, return defaults
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    }
  } catch (error) {
    logger.warn("Error fetching unit details:", error);
    return {
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    };
  }
};

// Fetch chapter details
export const fetchChapterDetailsById = async (chapterId) => {
  if (!chapterId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  // Convert chapterId to string if it's an ObjectId object
  const chapterIdString = chapterId.toString
    ? chapterId.toString()
    : String(chapterId);

  try {
    if (isServer) {
      const response = await fetch(
        `${baseUrl}/api/chapter/${chapterIdString}/details`,
        {
          cache: "no-store", // Always fetch fresh data for metadata
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    } else {
      try {
        const response = await api.get(`/chapter/${chapterId}/details`);
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
      } catch (error) {
        // If no details exist, return defaults
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    }
  } catch (error) {
    logger.warn("Error fetching chapter details:", error);
    return {
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    };
  }
};

// Fetch topic details
export const fetchTopicDetailsById = async (topicId) => {
  if (!topicId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  // Convert topicId to string if it's an ObjectId object
  const topicIdString = topicId.toString ? topicId.toString() : String(topicId);

  try {
    if (isServer) {
      const response = await fetch(
        `${baseUrl}/api/topic/${topicIdString}/details`,
        {
          cache: "no-store", // Always fetch fresh data for metadata
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    } else {
      try {
        const response = await api.get(`/topic/${topicId}/details`);
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
      } catch (error) {
        // If no details exist, return defaults
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    }
  } catch (error) {
    logger.warn("Error fetching topic details:", error);
    return {
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    };
  }
};

// Fetch subtopic details
export const fetchSubTopicDetailsById = async (subTopicId) => {
  if (!subTopicId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  // Convert subTopicId to string if it's an ObjectId object
  const subTopicIdString = subTopicId.toString
    ? subTopicId.toString()
    : String(subTopicId);

  try {
    if (isServer) {
      const response = await fetch(
        `${baseUrl}/api/subtopic/${subTopicIdString}/details`,
        {
          cache: "no-store", // Always fetch fresh data for metadata
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    } else {
      try {
        const response = await api.get(`/subtopic/${subTopicId}/details`);
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
      } catch (error) {
        // If no details exist, return defaults
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    }
  } catch (error) {
    logger.warn("Error fetching subtopic details:", error);
    return {
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    };
  }
};

// ========== PRACTICE TEST API FUNCTIONS ==========

// Fetch practice subcategories (practice tests/papers) with hierarchical filters
export const fetchPracticeTests = async (filters = {}) => {
  try {
    const {
      categoryId,
      examId,
      subjectId,
      unitId,
      chapterId,
      topicId,
      subTopicId,
      status = STATUS.ACTIVE,
      page = 1,
      limit = 100,
    } = filters;

    const isServer = typeof window === "undefined";
    const baseUrl = getBaseUrl();

    // Build query parameters
    const params = new URLSearchParams();
    if (categoryId) params.append("categoryId", categoryId);
    if (examId) params.append("examId", examId);
    if (subjectId) params.append("subjectId", subjectId);
    if (unitId) params.append("unitId", unitId);
    if (chapterId) params.append("chapterId", chapterId);
    if (topicId) params.append("topicId", topicId);
    if (subTopicId) params.append("subTopicId", subTopicId);
    params.append("status", status);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const url = `${baseUrl}/api/practice/subcategory?${params.toString()}`;

    if (isServer) {
      const response = await fetch(url, {
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        // API handles all filtering, so just return the data
        return data.data || [];
      }
      return [];
    } else {
      // Client-side: use axios
      const response = await api.get(
        `/practice/subcategory?${params.toString()}`
      );

      if (response.data.success && response.data.data) {
        // API handles all filtering, so just return the data
        return response.data.data || [];
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching practice tests:", error);
    return [];
  }
};

// Fetch practice categories for an exam/subject
export const fetchPracticeCategories = async (filters = {}) => {
  try {
    const { examId, subjectId, status = STATUS.ACTIVE } = filters;

    const isServer = typeof window === "undefined";
    const baseUrl = getBaseUrl();

    const params = new URLSearchParams();
    if (examId) params.append("examId", examId);
    if (subjectId) params.append("subjectId", subjectId);
    params.append("status", status);
    params.append("limit", "100");

    const url = `${baseUrl}/api/practice/category?${params.toString()}`;

    if (isServer) {
      const response = await fetch(url, {
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        let categories = data.data || [];

        // Client-side filtering
        if (examId) {
          categories = categories.filter(
            (cat) =>
              (cat.examId?._id || cat.examId) === examId ||
              cat.examId === examId
          );
        }
        if (subjectId) {
          categories = categories.filter(
            (cat) =>
              (cat.subjectId?._id || cat.subjectId) === subjectId ||
              cat.subjectId === subjectId
          );
        }

        return categories;
      }
      return [];
    } else {
      const response = await api.get(`/practice/category?${params.toString()}`);

      if (response.data.success && response.data.data) {
        let categories = response.data.data || [];

        // Client-side filtering
        if (examId) {
          categories = categories.filter(
            (cat) =>
              (cat.examId?._id || cat.examId) === examId ||
              cat.examId === examId
          );
        }
        if (subjectId) {
          categories = categories.filter(
            (cat) =>
              (cat.subjectId?._id || cat.subjectId) === subjectId ||
              cat.subjectId === subjectId
          );
        }

        return categories;
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching practice categories:", error);
    return [];
  }
};

// Fetch practice test (subcategory) by ID or slug
export const fetchPracticeTestById = async (identifier) => {
  if (!identifier) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    if (isServer) {
      const response = await fetch(
        `${baseUrl}/api/practice/subcategory/${identifier}`,
        {
          next: { revalidate: 60 },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
    } else {
      const response = await api.get(`/practice/subcategory/${identifier}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
    }
  } catch (error) {
    logger.error(`Error fetching practice test by ID/Slug ${identifier}:`, error);
  }

  return null;
};

// Fetch all questions for a practice test (no pagination - get all questions)
export const fetchPracticeTestQuestions = async (subCategoryId) => {
  if (!subCategoryId) return [];

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // Fetch all questions (use a high limit to get all)
    const url = `${baseUrl}/api/practice/question?subCategoryId=${subCategoryId}&status=active&page=1&limit=1000`;

    if (isServer) {
      const response = await fetch(url, {
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Sort by orderNumber
        return (data.data || []).sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );
      }
      return [];
    } else {
      const response = await api.get(
        `/practice/question?subCategoryId=${subCategoryId}&status=active&page=1&limit=1000`
      );

      if (response.data.success && response.data.data) {
        // Sort by orderNumber
        return (response.data.data || []).sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching practice test questions:", error);
    return [];
  }
};

// Fetch complete hierarchical tree structure
export const fetchTree = async (options = {}) => {
  try {
    const { examId = null, status = STATUS.ACTIVE } = options;

    const isServer = typeof window === "undefined";
    const baseUrl = getBaseUrl();

    // Build query string
    let queryString = `status=${status}`;
    if (examId) {
      queryString += `&examId=${examId}`;
    }

    const url = `${baseUrl}/api/tree?${queryString}`;

    if (isServer) {
      const response = await fetch(url, {
        cache: "no-store", // Always fetch fresh data for tree
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data || [];
      }
      return [];
    } else {
      // Client-side: use axios
      const response = await api.get(`/tree?${queryString}`);

      if (response.data.success && response.data.data) {
        return response.data.data || [];
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching tree:", error);
    return [];
  }
};

// Fetch definitions by subtopic
export const fetchDefinitionsBySubTopic = async (subTopicId, options = {}) => {
  if (!subTopicId) return [];

  const { status = STATUS.ACTIVE, page = 1, limit = 1000 } = options;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const url = `${baseUrl}/api/definition?subTopicId=${subTopicId}&status=${status}&page=${page}&limit=${limit}`;

    if (isServer) {
      const response = await fetch(url, {
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Sort by orderNumber
        return (data.data || []).sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );
      }
      return [];
    } else {
      const response = await api.get(
        `/definition?subTopicId=${subTopicId}&status=${status}&page=${page}&limit=${limit}`
      );

      if (response.data.success && response.data.data) {
        // Sort by orderNumber
        return (response.data.data || []).sort(
          (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching definitions:", error);
    return [];
  }
};

// Fetch definition by ID or slug
export const fetchDefinitionById = async (definitionId) => {
  if (!definitionId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // Try by ID first (only if it looks like an ObjectId)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(definitionId);
    if (isObjectId) {
      if (isServer) {
        try {
          const response = await fetch(
            `${baseUrl}/api/definition/${definitionId}`,
            {
              next: { revalidate: 60 },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              return data.data;
            }
          }
        } catch (err) {
          // Continue to fallback
        }
      } else {
        try {
          const response = await api.get(`/definition/${definitionId}`);
          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (err) {
          // Continue to fallback
        }
      }
    }

    // Fallback: search by slug (would need a search endpoint)
    // For now, return null if not found by ID
    return null;
  } catch (error) {
    logger.error("Error fetching definition:", error);
    return null;
  }
};

// Fetch definition details by definition ID
export const fetchDefinitionDetailsById = async (definitionId) => {
  if (!definitionId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const url = `${baseUrl}/api/definition/${definitionId}/details`;

    if (isServer) {
      const response = await fetch(url, {
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        return {
          content: "",
          title: "",
          metaDescription: "",
          keywords: "",
        };
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    } else {
      const response = await api.get(`/definition/${definitionId}/details`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return {
        content: "",
        title: "",
        metaDescription: "",
        keywords: "",
      };
    }
  } catch (error) {
    logger.error("Error fetching definition details:", error);
    return {
      content: "",
      title: "",
      metaDescription: "",
      keywords: "",
    };
  }
};

// Save student test result
export async function saveTestResult(resultData) {
  const isServer = typeof window === "undefined";

  if (isServer) {
    console.warn("saveTestResult called on server side, returning null");
    return null;
  }

  try {
    const token = localStorage.getItem("student_token");
    if (!token) {
      console.error("saveTestResult: No student token found");
      return { success: false, message: "Not authenticated" };
    }

    console.log("saveTestResult: Attempting to save test result", {
      testId: resultData.testId,
      totalQuestions: resultData.totalQuestions,
      percentage: resultData.percentage,
      questionResultsCount: resultData.questionResults?.length || 0,
    });

    const response = await api.post("/student/test-results", resultData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("saveTestResult: Response received", {
      success: response.data.success,
      message: response.data.message,
      hasData: !!response.data.data,
    });

    if (response.data.success) {
      console.log("saveTestResult: Successfully saved test result", response.data.data?._id);
      return { success: true, data: response.data.data };
    }
    console.warn("saveTestResult: Response indicates failure", response.data.message);
    return { success: false, message: response.data.message };
  } catch (error) {
    console.error("saveTestResult: Error occurred", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack,
    });
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to save test result",
    };
  }
}

// Fetch student test results
export async function fetchStudentTestResults(testId = null) {
  const isServer = typeof window === "undefined";

  if (isServer) {
    return null;
  }

  try {
    const token = localStorage.getItem("student_token");
    if (!token) {
      return null;
    }

    const url = testId
      ? `/student/test-results?testId=${testId}`
      : "/student/test-results";

    const response = await api.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.data.success) {
      const data = response.data.data;
      if (data === null || data === undefined) {
        return null;
      }
      if (Array.isArray(data)) {
        return data.length > 0 ? data[0] : null;
      }
      return data;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Fetch all student test results with filtering options
export async function fetchAllStudentTestResults(filters = {}) {
  const isServer = typeof window === "undefined";

  if (isServer) {
    return [];
  }

  try {
    const token = localStorage.getItem("student_token");
    if (!token) {
      return [];
    }

    const {
      examId,
      subjectId,
      unitId,
      chapterId,
      topicId,
      subTopicId,
      limit = 1000,
    } = filters;

    // Build query parameters
    const params = new URLSearchParams();
    if (examId) params.append("examId", examId);
    if (subjectId) params.append("subjectId", subjectId);
    if (unitId) params.append("unitId", unitId);
    if (chapterId) params.append("chapterId", chapterId);
    if (topicId) params.append("topicId", topicId);
    if (subTopicId) params.append("subTopicId", subTopicId);
    if (limit) params.append("limit", limit.toString());

    const url = `/student/test-results?${params.toString()}`;

    const response = await api.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    logger.error("Error fetching all test results:", error);
    return [];
  }
}

// Fetch blogs (public access for active blogs)
export const fetchBlogs = async (options = {}) => {
  try {
    const { examId = null, status = STATUS.ACTIVE, limit = 100 } = options;

    const isServer = typeof window === "undefined";
    const baseUrl = getBaseUrl();

    // Build query string
    let queryString = `status=${status}&limit=${limit}`;
    if (examId) {
      queryString += `&examId=${examId}`;
    }

    const url = `${baseUrl}/api/blog?${queryString}`;

    if (isServer) {
      // Server-side: use fetch (no auth for active blogs)
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        // If auth required, return empty array
        return [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data || [];
      }
      return [];
    } else {
      // Client-side: try with fetch first (no auth)
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return data.data || [];
          }
        }
      } catch (err) {
        // If fetch fails, try with api (might have auth)
        try {
          const response = await api.get(`/blog?${queryString}`);
          if (response.data?.success && response.data?.data) {
            return response.data.data || [];
          }
        } catch (apiErr) {
          logger.error("Error fetching blogs:", apiErr);
        }
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching blogs:", error);
    return [];
  }
};

// Fetch blog by slug (public access for active blogs)
export const fetchBlogBySlug = async (slug) => {
  if (!slug) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // API now supports slug lookup - try fetching by slug
    const url = `${baseUrl}/api/blog/${slug}`;

    if (isServer) {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } else {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return data.data;
          }
        }
      } catch (err) {
        // If fetch fails, try with api
        try {
          const response = await api.get(`/blog/${slug}`);
          if (response.data?.success && response.data?.data) {
            return response.data.data;
          }
        } catch (apiErr) {
          logger.error("Error fetching blog by slug:", apiErr);
        }
      }
      return null;
    }
  } catch (error) {
    logger.error("Error fetching blog by slug:", error);
    return null;
  }
};

// Fetch blog details by blog ID
export const fetchBlogDetails = async (blogId, options = {}) => {
  if (!blogId) return null;

  const { excludeContent = false } = options;
  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    // Add query parameter to exclude content if requested
    const queryParam = excludeContent ? "?excludeContent=true" : "";
    const url = `${baseUrl}/api/blog/${blogId}/details${queryParam}`;

    if (isServer) {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } else {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return data.data;
          }
        }
      } catch (err) {
        // Try with api if fetch fails
        try {
          const apiUrl = excludeContent
            ? `/blog/${blogId}/details?excludeContent=true`
            : `/blog/${blogId}/details`;
          const response = await api.get(apiUrl);
          if (response.data?.success && response.data?.data) {
            return response.data.data;
          }
        } catch (apiErr) {
          logger.error("Error fetching blog details:", apiErr);
        }
      }
      return null;
    }
  } catch (error) {
    logger.error("Error fetching blog details:", error);
    return null;
  }
};

// Fetch page by slug (public access for active pages only)
export const fetchPageBySlug = async (slug) => {
  if (!slug) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const url = `${baseUrl}/api/page/${slug}`;

    if (isServer) {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.success && data.data) return data.data;
      return null;
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) return data.data;
      }
    } catch (err) {
      try {
        const response = await api.get(`/page/${slug}`);
        if (response.data?.success && response.data?.data) {
          return response.data.data;
        }
      } catch (apiErr) {
        logger.error("Error fetching page by slug:", apiErr);
      }
    }
    return null;
  } catch (error) {
    logger.error("Error fetching page by slug:", error);
    return null;
  }
};

// Fetch blog categories (public access for active categories)
export const fetchBlogCategories = async (options = {}) => {
  try {
    const { examId = null, status = STATUS.ACTIVE, limit = 100 } = options;

    const isServer = typeof window === "undefined";
    const baseUrl = getBaseUrl();

    // Build query string
    let queryString = `status=${status}&limit=${limit}`;
    if (examId) {
      queryString += `&examId=${examId}`;
    }

    const url = `${baseUrl}/api/blog/category?${queryString}`;

    if (isServer) {
      // Server-side: use fetch (no auth for active categories)
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data || [];
      }
      return [];
    } else {
      // Client-side: try with fetch first (no auth)
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return data.data || [];
          }
        }
      } catch (err) {
        // If fetch fails, try with api (might have auth)
        try {
          const response = await api.get(`/blog/category?${queryString}`);
          if (response.data?.success && response.data?.data) {
            return response.data.data || [];
          }
        } catch (apiErr) {
          logger.error("Error fetching blog categories:", apiErr);
        }
      }
      return [];
    }
  } catch (error) {
    logger.error("Error fetching blog categories:", error);
    return [];
  }
};

// ========== DOWNLOAD API FUNCTIONS ==========

// Fetch download folders by exam ID.
// Options: status, limit, page, includeCounts. If returnFullResponse: true, returns { data, pagination }.
export const fetchDownloadFolders = async (examId, options = {}) => {
  try {
    const {
      status = STATUS.ACTIVE,
      limit = 100,
      page = 1,
      includeCounts = false,
      returnFullResponse = false,
    } = options;

    const isServer = typeof window === "undefined";
    const baseUrl = getBaseUrl();

    const params = new URLSearchParams();
    params.append("parentFolderId", "null");
    params.append("status", status);
    params.append("limit", limit.toString());
    params.append("page", String(page));
    if (examId) {
      params.append("examId", examId);
    }
    if (includeCounts) {
      params.append("includeCounts", "1");
    }

    const url = `${baseUrl}/api/download/folder?${params.toString()}`;

    if (isServer) {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        const list = data.data || [];
        if (returnFullResponse) {
          return {
            data: list,
            pagination: data.pagination || { total: list.length, page: 1, limit },
          };
        }
        return list;
      }
      return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
    } else {
      const response = await api.get(`/download/folder?${params.toString()}`);

      if (response.data.success && response.data.data) {
        const list = response.data.data || [];
        if (returnFullResponse) {
          return {
            data: list,
            pagination:
              response.data.pagination || { total: list.length, page: 1, limit },
          };
        }
        return list;
      }
      return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
    }
  } catch (error) {
    logger.error("Error fetching download folders:", error);
    return options.returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
  }
};

// Fetch download folder by ID or slug
export const fetchDownloadFolderById = async (folderId) => {
  if (!folderId) return null;

  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(folderId);
    if (isObjectId) {
      if (isServer) {
        const response = await fetch(`${baseUrl}/api/download/folder/${folderId}`, {
          next: { revalidate: 60 },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return data.data;
          }
        }
      } else {
        const response = await api.get(`/download/folder/${folderId}`);
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
      }
    }
    return null;
  } catch (error) {
    logger.error("Error fetching download folder:", error);
    return null;
  }
};

// Fetch subfolders by parent folder ID.
// Options: status, limit, page, onlyWithFiles, returnFullResponse (returns { data, pagination }).
export const fetchSubfoldersByFolder = async (folderId, options = {}) => {
  if (!folderId) return options.returnFullResponse ? { data: [], pagination: { total: 0 } } : [];

  const {
    status = STATUS.ACTIVE,
    limit = 100,
    page = 1,
    onlyWithFiles = false,
    returnFullResponse = false,
  } = options;
  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const params = new URLSearchParams();
    params.append("parentFolderId", folderId);
    params.append("status", status);
    params.append("limit", limit.toString());
    params.append("page", String(page));
    if (onlyWithFiles) {
      params.append("onlyWithFiles", "1");
    }

    const url = `${baseUrl}/api/download/folder?${params.toString()}`;

    if (isServer) {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        const list = data.data || [];
        if (returnFullResponse) {
          return {
            data: list,
            pagination: data.pagination || { total: list.length, page, limit },
          };
        }
        return list;
      }
      return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
    } else {
      const response = await api.get(`/download/folder?${params.toString()}`);

      if (response.data.success && response.data.data) {
        const list = response.data.data || [];
        if (returnFullResponse) {
          return {
            data: list,
            pagination:
              response.data.pagination || { total: list.length, page, limit },
          };
        }
        return list;
      }
      return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
    }
  } catch (error) {
    logger.error("Error fetching subfolders:", error);
    return options.returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
  }
};

// Fetch files by folder ID (subfolder). Supports pagination.
// Options: status, limit, page, skip. Use skip for load-more (next N items); when skip is set it overrides page.
// If returnFullResponse: true, returns { data, pagination }.
export const fetchFilesByFolder = async (folderId, options = {}) => {
  if (!folderId) return options.returnFullResponse ? { data: [], pagination: { total: 0 } } : [];

  const { status = STATUS.ACTIVE, limit = 100, page = 1, skip: skipOption, returnFullResponse = false } = options;
  const isServer = typeof window === "undefined";
  const baseUrl = getBaseUrl();

  try {
    const params = new URLSearchParams();
    params.append("folderId", folderId);
    params.append("status", status);
    params.append("limit", limit.toString());
    if (skipOption !== undefined && skipOption !== null && Number.isInteger(skipOption) && skipOption >= 0) {
      params.append("skip", String(skipOption));
    } else {
      params.append("page", String(page));
    }

    const url = `${baseUrl}/api/download/file?${params.toString()}`;

    if (isServer) {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
      }

      const data = await response.json();
      if (data.success && data.data) {
        const list = data.data || [];
        if (returnFullResponse) {
          return {
            data: list,
            pagination: data.pagination || { total: list.length, page: 1, limit },
          };
        }
        return list;
      }
      return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
    } else {
      const response = await api.get(`/download/file?${params.toString()}`);

      if (response.data.success && response.data.data) {
        const list = response.data.data || [];
        if (returnFullResponse) {
          return {
            data: list,
            pagination: response.data.pagination || { total: list.length, page: 1, limit },
          };
        }
        return list;
      }
      return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
    }
  } catch (error) {
    logger.error("Error fetching files:", error);
    return returnFullResponse ? { data: [], pagination: { total: 0 } } : [];
  }
};

// Submit download form (unlock downloads)
export const submitDownloadForm = async (formData) => {
  const isServer = typeof window === "undefined";

  if (isServer) {
    return { success: false, message: "Cannot submit form on server" };
  }

  try {
    // Store form data in localStorage to unlock downloads
    localStorage.setItem("download_form_submitted", "true");
    localStorage.setItem("download_form_data", JSON.stringify(formData));

    // Optionally send to API if you want to track submissions
    // const response = await api.post("/download/form", formData);
    // if (response.data.success) {
    //   return { success: true, data: response.data.data };
    // }

    return { success: true, message: "Form submitted successfully" };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to submit form",
    };
  }
};

// Check if download form is submitted
export const isDownloadFormSubmitted = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("download_form_submitted") === "true";
};

// Re-export slug utilities for backward compatibility
export const createSlug = createSlugUtil;
export const findByIdOrSlug = findByIdOrSlugUtil;
