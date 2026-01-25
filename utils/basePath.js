/**
 * Base Path Utility
 * Centralizes base path logic for consistent URL handling across the application
 */

/**
 * Gets the base path for the application
 * @returns {string} The base path (e.g., "/self-study")
 */
export const getBasePath = () => {
  return process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
};

/**
 * Constructs a full URL with base path
 * @param {string} url - The relative URL (e.g., "/images/banner/test.png")
 * @returns {string} The full URL with base path (e.g., "/self-study/images/banner/test.png")
 */
export const getUrlWithBasePath = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  
  const basePath = getBasePath();
  // Check if URL already has base path (API now returns full URLs)
  return url.startsWith(basePath) ? url : `${basePath}${url}`;
};

/**
 * Cleans a URL by removing the base path (for backend storage)
 * @param {string} url - The full URL with base path
 * @returns {string} The clean URL without base path
 */
export const cleanUrlFromBasePath = (url) => {
  if (!url) return "";
  const basePath = getBasePath();
  return url.replace(basePath, "").replace(/^\/+/, "");
};
