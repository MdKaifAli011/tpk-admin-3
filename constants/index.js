// ============================================
// CONSTANTS - Production Ready Configuration
// ============================================

// App Configuration
export const APP_CONFIG = {
  name: "Testprepkart",
  description: "Prepare for your exam with expert guidance and resources",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://testprepkart.com",
};

// API Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 10000, // Increased for admin panel to fetch all data
  MIN_LIMIT: 5,
};

// Status Values
export const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

// Error Messages
export const ERROR_MESSAGES = {
  // Generic
  SOMETHING_WENT_WRONG: "Something went wrong. Please try again later.",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  VALIDATION_ERROR: "Validation error",

  // API
  API_ERROR: "API request failed",
  NETWORK_ERROR: "Network error. Please check your connection.",
  TIMEOUT_ERROR: "Request timeout. Please try again.",

  // Data
  NO_DATA_FOUND: "No data found",
  FETCH_FAILED: "Failed to fetch data",
  SAVE_FAILED: "Failed to save data",
  UPDATE_FAILED: "Failed to update data",
  DELETE_FAILED: "Failed to delete data",

  // Entity specific
  EXAM_NOT_FOUND: "Exam not found",
  SUBJECT_NOT_FOUND: "Subject not found",
  UNIT_NOT_FOUND: "Unit not found",
  CHAPTER_NOT_FOUND: "Chapter not found",
  TOPIC_NOT_FOUND: "Topic not found",
  SUBTOPIC_NOT_FOUND: "SubTopic not found",
  DEFINITION_NOT_FOUND: "Definition not found",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: "Saved successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",
  CREATED: "Created successfully",
  FETCHED: "Data fetched successfully",
};

// Loading Messages
export const LOADING_MESSAGES = {
  LOADING: "Loading...",
  FETCHING: "Fetching data...",
  SAVING: "Saving...",
  UPDATING: "Updating...",
  DELETING: "Deleting...",
};

// Placeholder Text
export const PLACEHOLDERS = {
  EXAM_NAME: "Enter exam name",
  SUBJECT_NAME: "Enter subject name",
  UNIT_NAME: "Enter unit name",
  CHAPTER_NAME: "Enter chapter name",
  TOPIC_NAME: "Enter topic name",
  SUBTOPIC_NAME: "Enter subtopic name",
  SEARCH: "Search...",
  SELECT_EXAM: "Select Exam",
  NO_DATA: "No data available",
  LOADING: "Loading...",
};

// SEO Defaults
export const SEO_DEFAULTS = {
  TITLE:
    "Testprepkart | Prepare for your exam with expert guidance and resources",
  DESCRIPTION:
    "Prepare for your exam with expert guidance and resources. Get comprehensive study materials, practice tests, and expert guidance for JEE, NEET, SAT, IB and more.",
  KEYWORDS: [
    "exam preparation",
    "test prep",
    "JEE",
    "NEET",
    "SAT",
    "IB",
    "entrance exam",
    "study materials",
    "practice tests",
  ],
  OG_IMAGE: "/logo.png",
  FAVICON: "https://www.testprepkart.com/public/assets/images/fevicon.png",
};

// Entity Types
export const ENTITY_TYPES = {
  EXAM: "exam",
  SUBJECT: "subject",
  UNIT: "unit",
  CHAPTER: "chapter",
  TOPIC: "topic",
  SUBTOPIC: "subtopic",
};

// Order Numbers
export const ORDER_NUMBER = {
  DEFAULT: 1,
  MIN: 1,
  MAX: 10000,
};

// Slug Configuration
export const SLUG_CONFIG = {
  MAX_LENGTH: 100,
  SEPARATOR: "-",
  LOWERCASE: true,
};

// Cache Configuration
export const CACHE_CONFIG = {
  // Cache durations in milliseconds
  SHORT: 60000, // 1 minute
  MEDIUM: 300000, // 5 minutes
  LONG: 3600000, // 1 hour
  VERY_LONG: 86400000, // 24 hours
};

// Validation Rules
export const VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 5000,
  CONTENT_MAX_LENGTH: 100000,
  TITLE_MAX_LENGTH: 200,
  META_DESCRIPTION_MAX_LENGTH: 500,
  KEYWORDS_MAX_LENGTH: 1000,
};

// Routes
export const ROUTES = {
  HOME: "/",
  ADMIN: "/admin",
  EXAM: "/admin/exam",
  SUBJECT: "/admin/subject",
  UNIT: "/admin/unit",
  CHAPTER: "/admin/chapter",
  TOPIC: "/admin/topic",
  SUBTOPIC: "/admin/sub-topic",
};

// API Endpoints
export const API_ENDPOINTS = {
  EXAM: "/api/exam",
  SUBJECT: "/api/subject",
  UNIT: "/api/unit",
  CHAPTER: "/api/chapter",
  TOPIC: "/api/topic",
  SUBTOPIC: "/api/subtopic",
};

// Colors for UI (based on entity type)
export const ENTITY_COLORS = {
  EXAM: {
    primary: "indigo",
    gradient: "from-indigo-500 to-blue-500",
  },
  SUBJECT: {
    primary: "cyan",
    gradient: "from-cyan-500 to-blue-500",
  },
  UNIT: {
    primary: "purple",
    gradient: "from-purple-500 to-pink-500",
  },
  CHAPTER: {
    primary: "indigo",
    gradient: "from-indigo-500 to-blue-500",
  },
  TOPIC: {
    primary: "indigo",
    gradient: "from-indigo-500 to-blue-500",
  },
  SUBTOPIC: {
    primary: "indigo",
    gradient: "from-indigo-500 to-blue-500",
  },
};

/** Faculty names and image URLs by exam (neet, jee, sat, ap). For course instructor display/suggestions. */
export const FACULTIES_BY_EXAM = {
  neet: [
    { name: "Dr. Navya Gaur", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-neet-testimonial/Screen%20Shot%202017-03-23%20at%2011.31.42%20PM.png" },
    { name: "Dr. Ritu Madan", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-neet-testimonial/Screen%20Shot%202017-03-23%20at%2011.50.33%20PM.png" },
    { name: "Dr. Nivedeta Sion", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-neet-testimonial/Screen%20Shot%202017-03-24%20at%2012.03.55%20AM.png" },
    { name: "Testprepkart", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-neet-testimonial/Logo%20Fevicon.jpg" },
  ],
  jee: [
    { name: "Megha Rastogi", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-jee-testimonial/Megha-TestprepKart.png" },
    { name: "Arpit Nagar", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-jee-testimonial/Arpit-Nagar.png" },
    { name: "Ashwin Rajput", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-jee-testimonial/Ashwin-Rajput-TestprepKart.png" },
  ],
  sat: [
    { name: "NEHA SHARMA", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-sat-testimonial/Neha%20Sharma.png" },
    { name: "VISHAWANATH SHANKARAN", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-sat-testimonial/Vishwanathan-SAT.png" },
    { name: "PRASHANT PANDEY", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-sat-testimonial/faculty-1.png" },
    { name: "PRATEEK RANA", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-sat-testimonial/Faculty-1%20(1).png" },
  ],
  ap: [
    { name: "Mr. D. Bakshi", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/faculty-1.png" },
    { name: "Mr. P. Verma", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/AP_Faculty_1_TestprepKart.jpg" },
    { name: "Mr. Vasu S.", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/AP_Faculty_2_TestprepKart.jpg" },
    { name: "Mrs. A. Garg", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/AP_Faculty_3_TestprepKart.jpg" },
    { name: "Dr. V. Krishnamurthy", imageUrl: "https://www.testprepkart.com/public/assets/images/tpk-AP-testimonial/AP_Faculty_4_TestprepKart.jpg" },
  ],
};

/** Get faculty list for an exam by slug/name (e.g. "neet", "JEE"). Returns [] if not found. */
export function getFacultiesForExam(examSlugOrName) {
  if (!examSlugOrName || typeof examSlugOrName !== "string") return [];
  const key = examSlugOrName.trim().toLowerCase();
  if (FACULTIES_BY_EXAM[key]) return FACULTIES_BY_EXAM[key];
  const firstWord = key.split(/\s+/)[0];
  return FACULTIES_BY_EXAM[firstWord] || [];
}
