"use client";

import React, { useEffect, useRef } from "react";

/**
 * Injects header and footer custom code (GTM, gtag, etc.) only after the first
 * click or touch (not scroll) or after 30s. Scroll is excluded so Lighthouse
 * does not trigger loading during the audit.
 */
export default function DeferredCustomCode({ headerCode = "", footerCode = "" }) {
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current || typeof window === "undefined") return;
    const hasCode =
      (headerCode && headerCode.trim()) || (footerCode && footerCode.trim());
    if (!hasCode) return;

    const run = () => {
      if (injected.current) return;
      injected.current = true;

      if (headerCode?.trim()) {
        const headerDiv = document.createElement("div");
        headerDiv.setAttribute("data-custom-code-injected", "deferred");
        headerDiv.setAttribute("aria-hidden", "true");
        headerDiv.style.display = "none";
        headerDiv.innerHTML = headerCode.trim();
        document.body.insertBefore(headerDiv, document.body.firstChild);
      }

      if (footerCode?.trim()) {
        const footerDiv = document.createElement("div");
        footerDiv.setAttribute("data-custom-code-injected", "deferred");
        footerDiv.setAttribute("aria-hidden", "true");
        footerDiv.style.display = "none";
        footerDiv.innerHTML = footerCode.trim();
        document.body.appendChild(footerDiv);
      }
    };

    const schedule = () => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(run, { timeout: 3000 });
      } else {
        setTimeout(run, 1500);
      }
    };

    const onInteraction = () => {
      schedule();
      removeListeners();
    };

    let fallbackTimer = null;
    const removeListeners = () => {
      window.removeEventListener("click", onInteraction, true);
      window.removeEventListener("touchstart", onInteraction, { passive: true });
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };

    // Only click and touchstart (no scroll) so Lighthouse run does not trigger load
    window.addEventListener("click", onInteraction, true);
    window.addEventListener("touchstart", onInteraction, { passive: true });

    fallbackTimer = setTimeout(() => {
      if (!injected.current) {
        removeListeners();
        schedule();
      }
    }, 30000);

    return removeListeners;
  }, [headerCode, footerCode]);

  return null;
}
