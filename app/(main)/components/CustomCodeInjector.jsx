"use client";

import React, { useEffect, useRef } from "react";

/**
 * Injects script/link/meta from an HTML string into the DOM so scripts execute.
 * Scripts added via innerHTML do not run; we create new script elements and append.
 * @param {HTMLElement} target - Where to append (e.g. document.head or document.body)
 * @param {HTMLElement} [hiddenTarget] - If set, non-script nodes go here (hidden) so no extra UI shows after footer
 */
function injectCode(htmlString, target, hiddenTarget = null) {
  if (!htmlString || typeof htmlString !== "string" || !target) return;
  const trimmed = htmlString.trim();
  if (!trimmed) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    "<div id=\"__inject-root\">" + trimmed + "</div>",
    "text/html"
  );
  const root = doc.getElementById("__inject-root");
  if (!root) return;

  const nodes = Array.from(root.childNodes);
  nodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName?.toLowerCase();
      if (tagName === "script") {
        const script = document.createElement("script");
        if (node.src) {
          script.src = node.src;
          if (node.async) script.async = true;
          if (node.defer) script.defer = true;
        } else {
          script.textContent = node.textContent || "";
        }
        Array.from(node.attributes || []).forEach((attr) => {
          if (attr.name !== "src" && attr.name !== "async" && attr.name !== "defer") {
            try { script.setAttribute(attr.name, attr.value); } catch (_) { }
          }
        });
        target.appendChild(script);
      } else {
        const dest = hiddenTarget || target;
        try {
          dest.appendChild(document.importNode(node, true));
        } catch (_) {
          try {
            dest.appendChild(node.cloneNode(true));
          } catch (_) { }
        }
      }
    }
  });
}

/** Get the app root so footer injection stays inside layout; nothing visible after Footer. */
function getFooterInjectParent() {
  return document.getElementById("main-app-root") || document.body;
}

export default function CustomCodeInjector() {
  const injected = useRef({ header: false, footer: false });

  useEffect(() => {
    if (injected.current.header && injected.current.footer) return;
    if (document.querySelector("[data-custom-code-injected='server']")) return;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
    const url = `${basePath}/api/site-settings/custom-code`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success || !data?.data) return;
        const { headerCode, footerCode } = data.data;

        if (headerCode && typeof headerCode === "string" && !injected.current.header) {
          injectCode(headerCode, document.head);
          injected.current.header = true;
        }
        if (footerCode && typeof footerCode === "string" && !injected.current.footer) {
          const parent = getFooterInjectParent();
          const footerHidden = document.createElement("div");
          footerHidden.setAttribute("data-custom-footer-hidden", "true");
          footerHidden.setAttribute("aria-hidden", "true");
          footerHidden.setAttribute("hidden", "");
          footerHidden.style.cssText =
            "display:none!important;visibility:hidden!important;position:absolute!important;left:-99999px!important;width:0!important;height:0!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;pointer-events:none!important;";
          parent.appendChild(footerHidden);
          injectCode(footerCode, parent, footerHidden);
          injected.current.footer = true;
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
