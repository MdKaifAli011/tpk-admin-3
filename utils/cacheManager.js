/**
 * Centralized Cache Manager
 * Provides a single cache instance with periodic cleanup to prevent memory leaks
 */

class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.maxSize = options.maxSize || 50;
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute
    
    // Start periodic cleanup
    this.startCleanup();
    
    // Cleanup on process exit
    if (typeof process !== 'undefined') {
      process.on('exit', () => this.stopCleanup());
    }
  }
  
  /**
   * Get cached data by key
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    
    // Enforce size limit immediately
    if (this.cache.size > this.maxSize) {
      this.cleanup();
    }
  }
  
  /**
   * Delete cached data by key
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }
  
  /**
   * Clear cache entries matching pattern or all entries
   * @param {string|null} pattern - Cache key pattern (optional)
   */
  clear(pattern = null) {
    if (pattern) {
      for (const [key] of this.cache.entries()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * Cleanup expired entries and enforce size limit (LRU)
   */
  cleanup() {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
    
    // If still over limit, remove oldest entries (LRU)
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - this.maxSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }
  
  /**
   * Start periodic cleanup
   */
  startCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }
  
  /**
   * Stop periodic cleanup
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  cleanupInterval: 60 * 1000, // 1 minute - periodic cleanup
});

export default cacheManager;









