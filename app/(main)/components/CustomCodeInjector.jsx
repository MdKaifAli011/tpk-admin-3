"use client";

import React, { useEffect, useRef } from "react";
import api from "@/lib/api";

/**
 * Injects script/link/meta from an HTML string into the DOM so scripts execute.
 * Scripts added via innerHTML do not run; we create new script elements and append.
 * @param {HTMLElement} target - Where to append (e.g. document.head or document.body)
 * @param {HTMLElement} [hiddenTarget] - If set, non-script nodes go here (hidden) to avoid duplicate visible UI after footer
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
          // Scripts go to body so they run; any other HTML (nav, blog, comment, copyright) goes into a hidden container
          // so we don't show duplicate footer/nav/blog/comment content after the app Footer.
          const footerHidden = document.createElement("div");
          footerHidden.setAttribute("data-custom-footer-hidden", "true");
          footerHidden.setAttribute("aria-hidden", "true");
          footerHidden.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);";
          document.body.appendChild(footerHidden);
          injectCode(footerCode, document.body, footerHidden);
          injected.current.footer = true;
        }
      })
      .catch(() => { });
  }, []);

  return null;
}
