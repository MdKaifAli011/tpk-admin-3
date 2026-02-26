"use client";

import React, { useEffect, useRef } from "react";
import api from "@/lib/api";

/**
 * Injects script/link/meta from an HTML string into the DOM so scripts execute.
 * Scripts added via innerHTML do not run; we create new script elements and append.
 */
function injectCode(htmlString, target) {
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
            try { script.setAttribute(attr.name, attr.value); } catch (_) {}
          }
        });
        target.appendChild(script);
      } else {
        try {
          target.appendChild(document.importNode(node, true));
        } catch (_) {
          // fallback: append clone if importNode fails
          try {
            target.appendChild(node.cloneNode(true));
          } catch (_) {}
        }
      }
    }
  });
}

export default function CustomCodeInjector() {
  const injected = useRef({ header: false, footer: false });

  useEffect(() => {
    if (injected.current.header && injected.current.footer) return;
    // Skip if server already injected (so view-source shows code and we don't duplicate)
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
          injectCode(footerCode, document.body);
          injected.current.footer = true;
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
