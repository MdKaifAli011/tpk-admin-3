/**
 * Service Worker for caching and offline support
 * Production-ready service worker with cache strategies
 */

const CACHE_NAME = "testprepkart-v2";
const RUNTIME_CACHE = "testprepkart-runtime-v2";
const STATIC_CACHE = "testprepkart-static-v2";

// Base path - should match next.config.mjs basePath
const BASE_PATH = "/self-study";

// Assets to cache on install
const STATIC_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/favicon.ico`,
  `${BASE_PATH}/logo.png`,
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Failed to cache some static assets:", err);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name !== STATIC_CACHE &&
              name !== RUNTIME_CACHE &&
              name !== CACHE_NAME
            );
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API requests (they should always be fresh)
  // Handle both /api/ and /self-study/api/
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith(`${BASE_PATH}/api/`)) {
    return;
  }

  // Skip Next.js RSC (React Server Components) - never cache; prevents stale UI and failed prefetches
  if (url.searchParams.has("_rsc")) {
    return;
  }

  // Skip Next.js internal routes
  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  // Strategy: Cache First for static assets, Network First for pages
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script"
  ) {
    // Cache First for static assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Don't cache if not successful
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
  } else {
    // Network First for pages
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache if not successful
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to offline page if available
            if (request.destination === "document") {
              return caches.match(`${BASE_PATH}/offline.html`);
            }
          });
        })
    );
  }
});

