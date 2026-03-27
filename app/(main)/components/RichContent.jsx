"use client";

/* Rich HTML blocks (tk-*, chapter modules, etc.) — shared with admin RichTextEditor via /api/richtext-common-css */
import "../commanStyle.css";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  forwardRef,
} from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaPlay, FaSpinner } from "react-icons/fa";
import { lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import loadMathJax from "../lib/utils/mathJaxLoader";
import { logger } from "@/utils/logger";

// Lazy load FormRenderer to reduce initial bundle size
const FormRenderer = lazy(() =>
  import("./forms/FormRenderer").catch(() => ({
    default: () => (
      <div className="text-red-600 text-sm p-2" role="alert">
        Failed to load form. Please refresh the page.
      </div>
    ),
  }))
);

// Block-level tags for structure detection (must match editor/content expectations)
const BLOCK_TAG_REGEX = /^<[^>]*(?:p|div|h[1-6]|ul|ol|li|blockquote|pre|table|section|article|header|footer|nav|aside|main|figure|hr)[\s>\/]/i;
const LIST_STRUCTURE_REGEX = /<(ul|ol)[^>]*>[\s\S]*<\/(ul|ol)>/i;

// Helper function to Title-Case button text while preserving ALL-CAPS tokens (e.g., "PDF", "NEET").
// Examples:
// - "download neet pdf" -> "Download Neet Pdf"
// - "Dowload Neet PDF"  -> "Dowload Neet PDF"
// - "NEET PDF"          -> "NEET PDF"
const titleCasePreserveAcronyms = (text) => {
  if (!text) return "";
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      // Preserve surrounding punctuation (e.g. "(PDF)", "PDF,", "pdf.")
      const m = token.match(/^([^A-Za-z0-9]*)([A-Za-z0-9]+)([^A-Za-z0-9]*)$/);
      if (!m) return token;
      const [, prefix, core, suffix] = m;

      const hasLetter = /[A-Za-z]/.test(core);
      const isAllCaps =
        hasLetter && core === core.toUpperCase() && core !== core.toLowerCase();

      const nextCore = isAllCaps
        ? core
        : core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();

      return `${prefix}${nextCore}${suffix}`;
    })
    .join(" ");
};

// Cache for decoded attributes to avoid repeated processing
// Limited size with LRU eviction to prevent memory leaks
const MAX_DECODE_CACHE_SIZE = 50;
const decodeCache = new Map();
const decodeAttr = (str) => {
  if (!str) return "";
  if (decodeCache.has(str)) {
    // Move to end (LRU)
    const value = decodeCache.get(str);
    decodeCache.delete(str);
    decodeCache.set(str, value);
    return value;
  }
  const decoded = str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
  // LRU eviction: remove oldest if cache is full
  if (decodeCache.size >= MAX_DECODE_CACHE_SIZE) {
    const firstKey = decodeCache.keys().next().value;
    decodeCache.delete(firstKey);
  }
  decodeCache.set(str, decoded);
  return decoded;
};

// Only allow safe hex colors to avoid CSS injection via saved HTML attributes.
const sanitizeHexColor = (value, fallback = "#2563eb") => {
  if (!value) return fallback;
  const v = String(value).trim();
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v) ? v : fallback;
};

// Helper function to check if HTML content is inline (for rendering flow)
const isInlineContent = (html) => {
  if (!html || !html.trim()) return false;
  const trimmed = html.trim().toLowerCase();
  const blockStarts = ["<p", "<div", "<h1", "<h2", "<h3", "<h4", "<h5", "<h6", "<ul", "<ol", "<li", "<blockquote", "<pre", "<table", "<section", "<article", "<header", "<footer", "<nav", "<aside", "<main", "<figure", "<hr"];
  return !blockStarts.some((tag) => trimmed.startsWith(tag));
};

// Helper function to extract YouTube video ID from URL (including YouTube Shorts)
const extractYouTubeId = (url) => {
  if (!url) return null;

  // Handle various YouTube URL formats including Shorts
  const patterns = [
    // YouTube Shorts: youtube.com/shorts/VIDEO_ID
    /youtube\.com\/shorts\/([^&\n?#\/]+)/,
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([^&\n?#]+)/,
    // Old format: youtube.com/v/VIDEO_ID
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Helper function to normalize YouTube URL to embed format (supports Shorts)
const normalizeYouTubeUrl = (url) => {
  if (!url) return url;

  // If already an embed URL, return as is (after cleaning query params)
  if (url.includes("youtube.com/embed/")) {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  }

  // Extract video ID from any YouTube URL format (including Shorts)
  const videoId = extractYouTubeId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // If we can't extract, return original URL
  return url;
};

const RichContent = forwardRef(({ html = "" }, ref) => {
  const containerRef = useRef(null);
  const mergedRef = useCallback(
    (el) => {
      containerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref]
  );
  const mathJaxTimerRef = useRef(null);
  const mathJaxInitTimerRef = useRef(null);
  const [mathJaxError, setMathJaxError] = useState(false);
  const [formStates, setFormStates] = useState({});
  const [formConfigs, setFormConfigs] = useState({});
  const [formLinkModal, setFormLinkModal] = useState({ open: false, formId: null, redirectAfter: "" });
  const [activeVideo, setActiveVideo] = useState(null); // { url, type, mimeType }
  const router = useRouter();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending MathJax timers
      if (mathJaxTimerRef.current) {
        clearTimeout(mathJaxTimerRef.current);
      }
    };
  }, []);

  // LCP: prioritize first image in content, lazy-load the rest
  useEffect(() => {
    if (!containerRef.current || !html) return;
    const container = containerRef.current;
    const imgs = container.querySelectorAll("img");
    imgs.forEach((img, index) => {
      if (index === 0) {
        img.setAttribute("fetchpriority", "high");
        img.setAttribute("loading", "eager");
        img.setAttribute("decoding", "async");
        if (!img.hasAttribute("sizes")) {
          img.setAttribute("sizes", "(max-width: 768px) 100vw, 720px");
        }
      } else {
        img.setAttribute("loading", "lazy");
      }
    });
  }, [html]);

  // Handle interaction clicks (Buttons and Videos)
  useEffect(() => {
    if (!containerRef.current || !html) return;

    const handleContainerClick = (e) => {
      // 0. Form link: link that opens form modal on click
      const formLink = e.target.closest("a.form-modal-link");
      if (formLink) {
        const formId = formLink.getAttribute("data-form-id");
        if (formId) {
          e.preventDefault();
          const redirectAfter = formLink.getAttribute("data-redirect-after") || "";
          setFormLinkModal({ open: true, formId, redirectAfter });
        }
        return;
      }

      // 1. Handle Button Clicks
      const buttonLink = e.target.closest(
        ".inline-button-wrapper a, .inline-button"
      );

      if (buttonLink) {
        if (buttonLink.tagName === "A") {
          const href =
            buttonLink.getAttribute("href") ||
            buttonLink.getAttribute("data-button-link");
          if (href) {
            if (href.startsWith("/")) {
              e.preventDefault();
              router.push(href);
            } else if (href.startsWith("http")) {
              // Let browser handle external links
            } else if (href.startsWith("#")) {
              // Let browser handle anchors
            } else {
              e.preventDefault();
              router.push(`/${href}`);
            }
          }
        } else if (buttonLink.tagName === "BUTTON") {
          e.preventDefault();
        }
        return;
      }

      // 2. Handle Video Container Clicks
      const videoContainer = e.target.closest(".video-container");
      if (videoContainer) {
        e.preventDefault();
        e.stopPropagation();

        const url = videoContainer.getAttribute("data-video-url");
        const type = videoContainer.getAttribute("data-video-type");
        const mimeType = videoContainer.getAttribute("data-mime-type");

        if (url) {
          // Normalize YouTube URLs (including Shorts) to embed format
          let normalizedUrl = url;
          if (type === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
            normalizedUrl = normalizeYouTubeUrl(url);
          }
          setActiveVideo({ url: normalizedUrl, type: type || "youtube", mimeType });
        } else {
          // Fallback for older content: find video/iframe
          const videoEl = videoContainer.querySelector("video source");
          const iframeEl = videoContainer.querySelector("iframe");

          if (videoEl) {
            setActiveVideo({
              url: videoEl.src,
              type: "upload",
              mimeType: videoEl.type,
            });
          } else if (iframeEl) {
            // Normalize YouTube URLs from iframe src (including Shorts)
            const iframeSrc = iframeEl.src;
            const normalizedUrl = normalizeYouTubeUrl(iframeSrc);
            setActiveVideo({
              url: normalizedUrl,
              type: "youtube",
            });
          }
        }
      }
    };

    const container = containerRef.current;
    container.addEventListener("click", handleContainerClick, true);

    return () => {
      container.removeEventListener("click", handleContainerClick, true);
    };
  }, [html, router]);

  useEffect(() => {
    let isMounted = true;

    if (!html || typeof window === "undefined") {
      return () => {
        isMounted = false;
      };
    }

    // Load MathJax only when content contains math, and defer until container is in view (reduces TBT and avoids loading on every page)
    const hasMath =
      /\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$/.test(html) ||
      html.includes("\\(") ||
      html.includes("\\[");
    if (!hasMath) {
      return () => {
        isMounted = false;
      };
    }

    const container = containerRef.current;
    if (!container) {
      return () => { isMounted = false; };
    }

    let observer = null;
    let loaded = false;

    const runMathJax = () => {
      if (loaded || !isMounted) return;
      loaded = true;
      if (observer && container) {
        try { observer.disconnect(); } catch (_) {}
      }

      const processMathJax = (MathJaxInstance) => {
        if (!MathJaxInstance || !isMounted || !containerRef.current) return;
        try {
          if (MathJaxInstance.Hub && MathJaxInstance.Hub.Config) {
            MathJaxInstance.Hub.Config({
              tex2jax: {
                inlineMath: [['\\(', '\\)']],
                displayMath: [['\\[', '\\]']],
                processEscapes: true,
                ignoreClass: "tex2jax_ignore",
                processClass: "tex2jax_process",
                skipTags: ["script", "noscript", "style", "textarea", "pre"]
              },
              TeX: { extensions: ["mhchem.js"] },
              messageStyle: "none"
            });
          }
          const contentDivs = containerRef.current.querySelectorAll("[data-content-part]");
          const elementsToProcess = contentDivs.length > 0 ? Array.from(contentDivs) : [containerRef.current];
          if (MathJaxInstance.Hub && typeof MathJaxInstance.Hub.Queue === "function") {
            MathJaxInstance.Hub.Queue(["Typeset", MathJaxInstance.Hub, elementsToProcess]);
          } else if (typeof MathJaxInstance.typeset === "function") {
            MathJaxInstance.typeset(elementsToProcess);
          }
        } catch (error) {
          logger.error("MathJax typeset failed", error);
          if (isMounted) setMathJaxError(true);
        }
      };

      loadMathJax()
        .then((MathJax) => {
          if (!MathJax || !isMounted || !containerRef.current) return;
          setMathJaxError(false);
          try {
            if (MathJax.Hub) {
              if (MathJax.isReady) {
                processMathJax(MathJax);
              } else if (MathJax.Hub.Register) {
                MathJax.Hub.Register.StartupHook("End", () => {
                  if (isMounted && containerRef.current) processMathJax(MathJax);
                });
              } else {
                mathJaxInitTimerRef.current = setTimeout(() => {
                  if (isMounted && containerRef.current && window.MathJax) processMathJax(window.MathJax);
                }, 300);
              }
            } else {
              processMathJax(MathJax);
            }
          } catch (error) {
            logger.error("MathJax initialization failed", error);
            if (isMounted) setMathJaxError(true);
          }
        })
        .catch((error) => {
          logger.error("Unable to load MathJax", error);
          if (isMounted) setMathJaxError(true);
        });
    };

    const scheduleLoad = () => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => runMathJax(), { timeout: 2500 });
      } else {
        setTimeout(runMathJax, 1200);
      }
    };

    let minDelayTimer = null;
    let scrollListener = null;
    let didSchedule = false;
    const onIntersectOrScroll = () => {
      if (didSchedule || !isMounted) return;
      didSchedule = true;
      if (minDelayTimer) clearTimeout(minDelayTimer);
      minDelayTimer = null;
      if (scrollListener) {
        window.removeEventListener("scroll", scrollListener, { passive: true });
        scrollListener = null;
      }
      scheduleLoad();
    };

    observer = new IntersectionObserver(
      (entries) => {
        if (!isMounted || loaded || didSchedule) return;
        const [entry] = entries;
        if (entry?.isIntersecting) {
          // Defer 5s or until user scrolls so Lighthouse mobile run often finishes before MathJax loads
          minDelayTimer = setTimeout(onIntersectOrScroll, 5000);
          scrollListener = () => {
            if (!didSchedule) onIntersectOrScroll();
          };
          window.addEventListener("scroll", scrollListener, { passive: true });
        }
      },
      { rootMargin: "200px", threshold: 0 }
    );
    observer.observe(container);

    return () => {
      isMounted = false;
      if (minDelayTimer) clearTimeout(minDelayTimer);
      if (scrollListener) {
        try { window.removeEventListener("scroll", scrollListener, { passive: true }); } catch (_) {}
      }
      if (observer && container) {
        try { observer.disconnect(); } catch (_) {}
      }
      if (mathJaxInitTimerRef.current) {
        clearTimeout(mathJaxInitTimerRef.current);
      }
    };
  }, [html]);

  // Parse HTML and extract form embeds - optimized regex compilation
  const { processedHtml, forms } = useMemo(() => {
    if (!html) return { processedHtml: "", forms: [] };

    const formsFound = [];
    let processedHtml = html;
    let formIndex = 0;

    // Pre-compile regex patterns for better performance
    const inlineFormRegex =
      /<span[^>]*class="form-embed-inline"[^>]*>[\s\S]*?<\/span>/gi;
    const attrRegexes = {
      formId: /data-form-id=["']?([^"'\s>]+)["']?/i,
      title: /data-title=["']([^"']*)["']/i,
      description: /data-description=["']([^"']*)["']/i,
      buttonText: /data-button-text=["']([^"']*)["']/i,
      buttonColor: /data-button-color=["']([^"']*)["']/i,
      buttonLink: /data-button-link=["']([^"']*)["']/i,
      imageUrl: /data-image-url\s*=\s*["']([^"']*)["']/i,
    };

    // Match inline form embeds - optimized single pass extraction
    let match;
    const matches = [];
    while ((match = inlineFormRegex.exec(html)) !== null) {
      matches.push(match[0]);
    }

    matches.forEach((fullMatch) => {
      const formId = attrRegexes.formId.exec(fullMatch)?.[1] || "";
      if (formId) {
        const placeholder = `<!--FORM_PLACEHOLDER_${formIndex}-->`;
        processedHtml = processedHtml.replace(fullMatch, placeholder);
        formsFound.push({
          formId,
          placeholder,
          index: formIndex,
          buttonText: decodeAttr(
            attrRegexes.buttonText.exec(fullMatch)?.[1] || ""
          ),
          buttonColor: sanitizeHexColor(
            decodeAttr(attrRegexes.buttonColor.exec(fullMatch)?.[1] || "")
          ),
          title: decodeAttr(attrRegexes.title.exec(fullMatch)?.[1] || ""),
          description: decodeAttr(
            attrRegexes.description.exec(fullMatch)?.[1] || ""
          ),
          buttonLink: decodeAttr(
            attrRegexes.buttonLink.exec(fullMatch)?.[1] || ""
          ),
          imageUrl: decodeAttr(attrRegexes.imageUrl.exec(fullMatch)?.[1] || ""),
          isInline: true,
        });
        formIndex++;
      }
    });

    // Match block form embeds - legacy support
    const blockFormRegex =
      /<div[^>]*class="form-embed"[^>]*data-form-id="([^"]+)"[^>]*(?:data-button-text="([^"]*)")?[^>]*>[\s\S]*?<\/div>/gi;
    while ((match = blockFormRegex.exec(html)) !== null) {
      const formId = match[1];
      if (formId) {
        const placeholder = `<!--FORM_PLACEHOLDER_${formIndex}-->`;
        processedHtml = processedHtml.replace(match[0], placeholder);
        formsFound.push({
          formId,
          placeholder,
          index: formIndex,
          buttonText: decodeAttr(match[2] || ""),
          isInline: false,
        });
        formIndex++;
      }
    }

    // Match inline contact form (div) - form shown directly, no button
    const contactFormInlineRegex =
      /<div[^>]*class="[^"]*contact-form-inline[^"]*"[^>]*data-form-id=["']?([^"'\s>]+)["']?[^>]*>[\s\S]*?<\/div>/gi;
    while ((match = contactFormInlineRegex.exec(html)) !== null) {
      const formId = (match[1] || "").trim();
      if (formId) {
        const fullMatch = match[0];
        const placeholder = `<!--FORM_PLACEHOLDER_${formIndex}-->`;
        processedHtml = processedHtml.replace(fullMatch, placeholder);
        // Extract imageUrl: try normal quotes first, then entity-encoded &quot; (saved HTML)
        let extractedImageUrl = attrRegexes.imageUrl.exec(fullMatch)?.[1] || "";
        if (!extractedImageUrl && /data-image-url/i.test(fullMatch)) {
          const entityMatch = fullMatch.match(/data-image-url\s*=\s*&quot;([^&]*(?:&amp;[^&]*)*)&quot;/i);
          if (entityMatch && entityMatch[1]) extractedImageUrl = entityMatch[1];
        }
        formsFound.push({
          formId,
          placeholder,
          index: formIndex,
          title: decodeAttr(attrRegexes.title.exec(fullMatch)?.[1] || ""),
          description: decodeAttr(attrRegexes.description.exec(fullMatch)?.[1] || ""),
          imageUrl: decodeAttr(extractedImageUrl).trim(),
          buttonText: decodeAttr(attrRegexes.buttonText.exec(fullMatch)?.[1] || ""),
          isInline: true,
          isContactFormInline: true,
        });
        formIndex++;
      }
    }

    // LCP: first image gets high priority so it can be LCP; rest get lazy
    let firstImg = true;
    processedHtml = processedHtml.replace(/<img(?=[\s>])/gi, () => {
      if (firstImg) {
        firstImg = false;
        return '<img fetchpriority="high" loading="eager" decoding="async" sizes="(max-width: 768px) 100vw, 720px" ';
      }
      return '<img loading="lazy" ';
    });

    return { processedHtml, forms: formsFound };
  }, [html]);

  // Fetch form configs for all embedded forms - optimized with batch requests
  useEffect(() => {
    if (forms.length === 0) return;

    let isCancelled = false;

    const fetchFormConfigs = async () => {
      // Get unique form IDs
      const uniqueFormIds = [...new Set(forms.map((f) => f.formId))];

      // Batch fetch all form configs in parallel
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
      const fetchPromises = uniqueFormIds.map(async (formId) => {
        try {
          const response = await fetch(`${basePath}/api/form/${formId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              return { formId, config: data.data };
            }
          }
        } catch (error) {
          logger.error(`Error fetching form config for ${formId}:`, error);
        }
        return null;
      });

      const results = await Promise.all(fetchPromises);

      if (isCancelled) return;

      setFormConfigs((prevConfigs) => {
        const newConfigs = { ...prevConfigs };
        results.forEach((result) => {
          if (result) {
            newConfigs[result.formId] = result.config;
          }
        });
        return newConfigs;
      });
    };

    fetchFormConfigs();

    return () => {
      isCancelled = true;
    };
  }, [forms]);

  // Make tables responsive on mobile: always wrap tables in a horizontal scroll container.
  // This guarantees x-axis scrolling when content is long, and avoids edge cases where
  // overflow measurement fails on small screens.
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const wrapTables = () => {
      const tables = container.querySelectorAll("table");
      tables.forEach((table) => {
        const parent = table.parentElement;
        if (parent && parent.classList.contains("rich-table-wrapper")) return;
        const wrapper = document.createElement("div");
        wrapper.className = "rich-table-wrapper";
        table.replaceWith(wrapper);
        wrapper.appendChild(table);
      });
    };

    // Run after layout/paint so widths are correct
    const t1 = setTimeout(wrapTables, 0);
    const t2 = setTimeout(wrapTables, 150);
    window.addEventListener("resize", wrapTables);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", wrapTables);
    };
  }, [html, formConfigs]);

  // Helper function to reprocess MathJax - optimized with debouncing
  const reprocessMathJax = useCallback(() => {
    // Clear any pending reprocessing
    if (mathJaxTimerRef.current) {
      clearTimeout(mathJaxTimerRef.current);
    }

    if (!html || !containerRef.current) return;

    mathJaxTimerRef.current = setTimeout(() => {
      if (!window.MathJax || !containerRef.current) return;

      // Check if MathJax is ready
      if (!window.MathJax.isReady && !window.MathJax.Hub) {
        return;
      }

      try {
        const container = containerRef.current;
        const contentDivs = container.querySelectorAll("[data-content-part]");
        const elementsToProcess =
          contentDivs.length > 0 ? Array.from(contentDivs) : [container];

        if (window.MathJax.Hub?.Queue) {
          // Queue the typeset to ensure it runs after any pending operations
          window.MathJax.Hub.Queue([
            "Typeset",
            window.MathJax.Hub,
            elementsToProcess,
          ]);
        } else if (window.MathJax.typeset) {
          window.MathJax.typeset(elementsToProcess);
        }
      } catch (error) {
        logger.error("MathJax reprocessing error:", error);
      }
    }, 100); // 100ms delay to allow DOM to settle
  }, [html]);

  // Reprocess MathJax when forms are loaded or DOM updates - optimized
  useEffect(() => {
    if (!html || !containerRef.current) return;
    reprocessMathJax();
    return () => {
      if (mathJaxTimerRef.current) {
        clearTimeout(mathJaxTimerRef.current);
      }
    };
  }, [html, formConfigs, reprocessMathJax]);

  // Reprocess MathJax when form states change - optimized
  useEffect(() => {
    if (!html || !containerRef.current) return;
    reprocessMathJax();
    return () => {
      if (mathJaxTimerRef.current) {
        clearTimeout(mathJaxTimerRef.current);
      }
    };
  }, [html, formStates, reprocessMathJax]);

  // Memoize form maps and parts split together for efficiency
  const { formMap, formDataMap, hasInlineForms, parts } = useMemo(() => {
    if (!processedHtml) {
      return { formMap: {}, formDataMap: {}, hasInlineForms: false, parts: [] };
    }

    const map = {};
    const dataMap = {};
    forms.forEach((form) => {
      map[form.placeholder] = form.formId;
      dataMap[form.placeholder] = form;
    });

    return {
      formMap: map,
      formDataMap: dataMap,
      hasInlineForms: forms.some((f) => f.isInline),
      parts: processedHtml.split(/(<!--FORM_PLACEHOLDER_\d+-->)/),
    };
  }, [processedHtml, forms]);

  const isEmpty = !html || (typeof html === "string" && !html.trim());

  // Render content with forms - optimized inline render
  const renderContent = useMemo(() => {
    if (!processedHtml || parts.length === 0) return null;

    return (
      <>
        {parts.map((part, index) => {
          if (formMap[part]) {
            const formId = formMap[part];
            const formData = formDataMap[part];
            const formKey = `form-${formId}-${index}`;
            const isOpen = formStates[formKey] || false;
            const formConfig = formConfigs[formId];

            // Inline contact form (div) — form shown directly in page, no button
            if (formData?.isContactFormInline) {
              return (
                <div key={formKey} className="my-4 w-full min-w-0" data-content-part="true">
                  <Suspense fallback={<div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">Loading form...</div>}>
                    <FormRenderer
                      formId={formId}
                      inline={true}
                      isOpen={true}
                      onClose={() => {}}
                      prepared=""
                      buttonLink=""
                      imageUrl={formData.imageUrl || ""}
                      title={formData.title || ""}
                      description={formData.description || ""}
                      submitButtonText={formData.buttonText || ""}
                    />
                  </Suspense>
                </div>
              );
            }

            // For inline forms (button that opens modal)
            if (formData?.isInline) {
              // Priority: formData (from HTML attributes) > formConfig > default
              const buttonText =
                (formData.buttonText && formData.buttonText.trim()) ||
                formConfig?.settings?.buttonText ||
                "Open Form";
              const buttonColor = sanitizeHexColor(
                (formData.buttonColor && formData.buttonColor.trim()) ||
                formConfig?.settings?.buttonColor ||
                "#2563eb"
              );
              const imageUrl =
                (formData.imageUrl && formData.imageUrl.trim()) || "";
              const buttonLink =
                (formData.buttonLink && formData.buttonLink.trim()) || "";

              return (
                <React.Fragment key={formKey}>
                  <button
                    onClick={() =>
                      setFormStates((prev) => ({
                        ...prev,
                        [formKey]: !prev[formKey],
                      }))
                    }
                    className="inline-block px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2 text-white rounded-md sm:rounded-lg text-xs sm:text-sm md:text-base font-medium transition-all duration-200 transform active:scale-95 hover:opacity-90 active:opacity-80"
                    aria-label={isOpen ? `Close ${formId} form` : `Open ${formId} form`}
                    style={{
                      display: "inline-block",
                      verticalAlign: "baseline",
                      cursor: "pointer",
                      lineHeight: "1.5",
                      margin: "0 4px",
                      whiteSpace: "nowrap",
                      textDecoration: "none",
                      backgroundColor: buttonColor,
                    }}
                  >
                    {titleCasePreserveAcronyms(buttonText || "Open Form")}
                  </button>
                  {isOpen && (
                    <Suspense fallback={null}>
                      <FormRenderer
                        formId={formId}
                        isOpen={isOpen}
                        onClose={() =>
                          setFormStates((prev) => ({
                            ...prev,
                            [formKey]: false,
                          }))
                        }
                        prepared=""
                        buttonLink={buttonLink}
                        imageUrl={imageUrl}
                        title={formData.title || ""}
                        description={formData.description || ""}
                      />
                    </Suspense>
                  )}
                </React.Fragment>
              );
            }

            // For block forms (legacy)
            const buttonText =
              formConfig?.settings?.buttonText ||
              formData?.buttonText ||
              "Open Form";
            const formName = formId; // Use formId as form name
            const formDescription = formConfig?.description || "";

            return (
              <div key={formKey} className="my-3 sm:my-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3">
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 mb-1">
                        {formName}
                      </h4>
                      {formDescription && (
                        <p className="text-[11px] sm:text-xs text-gray-600 mb-1">
                          {formDescription}
                        </p>
                      )}
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        Click the button below to open the form
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setFormStates((prev) => ({
                          ...prev,
                          [formKey]: !prev[formKey],
                        }))
                      }
                      className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md sm:rounded-lg text-xs sm:text-sm md:text-base font-medium transition-all duration-200 transform active:scale-95 whitespace-nowrap"
                      aria-label={isOpen ? `Close ${formName} form` : `Open ${formName} form`}
                    >
                      {isOpen ? "Close" : titleCasePreserveAcronyms(buttonText)}
                    </button>
                  </div>
                  {isOpen && (
                    <Suspense fallback={null}>
                      <FormRenderer
                        formId={formId}
                        isOpen={isOpen}
                        onClose={() =>
                          setFormStates((prev) => ({
                            ...prev,
                            [formKey]: false,
                          }))
                        }
                        prepared=""
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            );
          }

          // Regular HTML content - preserve exact structure from editor
          if (part.trim()) {
            const trimmedPart = part.trim();

            // Check if content starts with block-level elements (lists, paragraphs, etc.)
            const startsWithBlockTag = BLOCK_TAG_REGEX.test(trimmedPart);
            const hasListStructure = LIST_STRUCTURE_REGEX.test(trimmedPart);

            // For block-level content (lists, paragraphs, etc.), render directly to preserve structure
            // Lists need to be rendered exactly as they are in the editor
            if (startsWithBlockTag || hasListStructure || !hasInlineForms) {
              return (
                <div
                  key={`content-${index}`}
                  data-content-part="true"
                  dangerouslySetInnerHTML={{ __html: part }}
                />
              );
            } else {
              // For inline content with inline forms, render inline to maintain flow
              return (
                <span
                  key={`content-${index}`}
                  data-content-part="true"
                  style={{ display: "inline" }}
                  dangerouslySetInnerHTML={{ __html: part }}
                />
              );
            }
          }
          return null;
        })}
      </>
    );
  }, [
    parts,
    formMap,
    formDataMap,
    formStates,
    formConfigs,
    hasInlineForms,
    processedHtml,
  ]);

  return (
    <>
      {mathJaxError && (
        <div className="text-yellow-600 text-sm mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded" role="alert">
          Note: Math equations may not render correctly. Please refresh the
          page.
        </div>
      )}
      {!isEmpty && (
      <div
        ref={mergedRef}
        className="rich-text-content rich-html-common wrap-anywhere min-w-0"
        data-rich-common-css="commanStyle"
        suppressHydrationWarning
      >
        <style jsx global>{`
        .video-grid-container {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .video-grid-container .video-grid-inner {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .video-grid-container .video-parent-container {
          max-width: 100%;
          box-sizing: border-box;
        }
        .video-grid-cols-2.video-grid-inner {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .video-grid-cols-3.video-grid-inner {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (max-width: 768px) {
          .video-grid-cols-2.video-grid-inner,
          .video-grid-cols-3.video-grid-inner {
            grid-template-columns: 1fr;
          }
        }
        .video-container {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
        }
        .video-container:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
        }
        .video-container:hover .video-play-overlay > div {
          transform: scale(1.15);
          background: rgba(220, 38, 38, 1) !important;
          box-shadow: 0 0 30px rgba(220, 38, 38, 0.5);
        }
        .video-play-overlay > div {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
        {renderContent}
      </div>
      )}

      {/* Video Modal Player */}
      {activeVideo && (
        <VideoModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}

      {/* Form link modal: opened when user clicks a "form link" in content */}
      {formLinkModal.open && formLinkModal.formId && (
        <Suspense fallback={null}>
          <FormRenderer
            formId={formLinkModal.formId}
            isOpen={formLinkModal.open}
            onClose={() => setFormLinkModal({ open: false, formId: null, redirectAfter: "" })}
            prepared=""
            buttonLink={formLinkModal.redirectAfter || ""}
          />
        </Suspense>
      )}
    </>
  );
});

// Internal Video Modal Component
const VideoModal = ({ video, onClose }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      {/* Background overlay for closing */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-[95vw] lg:max-w-6xl aspect-video bg-black rounded-xl lg:rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] scale-in-center animate-in zoom-in-90 duration-500">
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <FaSpinner className="w-10 h-10 text-red-600 animate-spin" />
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] p-2.5 bg-black/40 hover:bg-red-600 text-white rounded-full transition-all duration-300 backdrop-blur-sm group"
          title="Close (Esc)"
          aria-label="Close video"
        >
          <FaTimes className="w-5 h-5 group-hover:scale-110" aria-hidden />
        </button>

        {/* Video Frame */}
        <div className="w-full h-full">
          {video.type === "youtube" ? (
            <iframe
              src={(() => {
                // Ensure URL is normalized to embed format (supports Shorts)
                const normalizedUrl = normalizeYouTubeUrl(video.url);
                // Add autoplay and other parameters
                const separator = normalizedUrl.includes("?") ? "&" : "?";
                return `${normalizedUrl}${separator}autoplay=1&rel=0&modestbranding=1&playsinline=1`;
              })()}
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title="YouTube video player"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                console.error("Failed to load YouTube video:", video.url);
              }}
            ></iframe>
          ) : (
            <video
              src={video.url}
              className="w-full h-full"
              controls
              autoPlay
              playsInline
              onLoadedData={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                console.error("Failed to load video:", video.url);
              }}
            >
              <source src={video.url} type={video.mimeType} />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

RichContent.displayName = "RichContent";

export default RichContent;
