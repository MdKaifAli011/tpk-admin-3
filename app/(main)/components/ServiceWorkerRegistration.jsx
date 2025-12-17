"use client";

import { useEffect } from "react";

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/**
 * Service Worker Registration Component
 * Registers service worker for offline support and caching
 */
const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      // Register service worker with basePath
      navigator.serviceWorker
        .register(`${basePath}/sw.js`)
        .then((registration) => {
          // Update available - notify user (optional)
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New service worker available
                  // You can show a notification here if needed
                }
              });
            }
          });
        })
        .catch((error) => {
          // Silently fail - service worker is optional
          if (process.env.NODE_ENV === "development") {
            console.warn("Service worker registration failed:", error);
          }
        });

      // Handle service worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          // Optionally reload the page to use new service worker
          // window.location.reload();
        }
      });
    }
  }, []);

  return null; // This component doesn't render anything
};

export default ServiceWorkerRegistration;

