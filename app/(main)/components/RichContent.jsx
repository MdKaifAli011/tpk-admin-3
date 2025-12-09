"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { lazy, Suspense } from "react";
import loadMathJax from "../lib/utils/mathJaxLoader";
import { logger } from "@/utils/logger";

// Lazy load FormRenderer to reduce initial bundle size
const FormRenderer = lazy(() =>
  import("./forms/FormRenderer").catch(() => ({
    default: () => (
      <div className="text-red-600 text-sm p-2">
        Failed to load form. Please refresh the page.
      </div>
    ),
  }))
);

// Helper function to capitalize button text - moved outside component to avoid recreation
const capitalizeButtonText = (text) => {
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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

// Helper function to check if HTML content is inline - moved outside to avoid recreation
const blockLevelTags = [
  "<p",
  "<div",
  "<h1",
  "<h2",
  "<h3",
  "<h4",
  "<h5",
  "<h6",
  "<ul",
  "<ol",
  "<li",
  "<blockquote",
  "<pre",
  "<table",
  "<section",
  "<article",
  "<header",
  "<footer",
  "<nav",
  "<aside",
  "<main",
  "<figure",
  "<hr",
];
const isInlineContent = (html) => {
  if (!html || !html.trim()) return false;
  const trimmed = html.trim().toLowerCase();
  return !blockLevelTags.some((tag) => trimmed.startsWith(tag));
};

const RichContent = ({ html }) => {
  const containerRef = useRef(null);
  const mathJaxTimerRef = useRef(null);
  const mathJaxInitTimerRef = useRef(null);
  const [mathJaxError, setMathJaxError] = useState(false);
  const [formStates, setFormStates] = useState({});
  const [formConfigs, setFormConfigs] = useState({});

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending MathJax timers
      if (mathJaxTimerRef.current) {
        clearTimeout(mathJaxTimerRef.current);
      }
    };
  }, []);

  // Handle button clicks - ensure links work properly
  useEffect(() => {
    if (!containerRef.current || !html) return;

    const handleButtonClick = (e) => {
      // Check if clicked element is a button link or inside a button wrapper
      const buttonLink = e.target.closest('.inline-button-wrapper a, .inline-button');
      if (!buttonLink) return;

      // If it's an anchor tag, handle the link
      if (buttonLink.tagName === 'A') {
        const href = buttonLink.getAttribute('href') || buttonLink.getAttribute('data-button-link');
        if (href) {
          // Handle relative URLs - use Next.js router for internal navigation
          if (href.startsWith('/')) {
            e.preventDefault();
            // Use window.location for reliable navigation
            window.location.href = href;
          } else if (href.startsWith('http://') || href.startsWith('https://')) {
            // External links - let default behavior handle it (target="_blank" already set)
            // No need to prevent default
          } else if (href.startsWith('#')) {
            // Anchor links - let default behavior handle it
            // No need to prevent default
          } else {
            // Treat as relative URL
            e.preventDefault();
            window.location.href = `/${href}`;
          }
        }
      } else if (buttonLink.tagName === 'BUTTON') {
        // Button without link - do nothing or handle as needed
        e.preventDefault();
      }
    };

    const container = containerRef.current;
    
    // Use event delegation for dynamically inserted buttons
    container.addEventListener('click', handleButtonClick, true);

    return () => {
      container.removeEventListener('click', handleButtonClick, true);
    };
  }, [html]);

  useEffect(() => {
    let isMounted = true;

    if (!html || typeof window === "undefined") {
      return () => {
        isMounted = false;
      };
    }

    const processMathJax = (MathJaxInstance) => {
      if (!MathJaxInstance || !isMounted || !containerRef.current) return;

      try {
        // Get all content divs within the container
        const contentDivs = containerRef.current.querySelectorAll(
          "[data-content-part]"
        );
        const elementsToProcess =
          contentDivs.length > 0
            ? Array.from(contentDivs)
            : [containerRef.current];

        // Use MathJax 2.x Hub API
        if (
          MathJaxInstance.Hub &&
          typeof MathJaxInstance.Hub.Typeset === "function"
        ) {
          MathJaxInstance.Hub.Typeset(elementsToProcess);
        } else if (typeof MathJaxInstance.typeset === "function") {
          // Fallback for MathJax 3.x
          MathJaxInstance.typeset(elementsToProcess);
        }
      } catch (error) {
        logger.error("MathJax typeset failed", error);
        if (isMounted) {
          setMathJaxError(true);
        }
      }
    };

    loadMathJax()
      .then((MathJax) => {
        if (!MathJax || !isMounted || !containerRef.current) return;
        setMathJaxError(false);

        try {
          // Ensure MathJax Hub is ready (MathJax 2.x)
          if (MathJax.Hub) {
            if (MathJax.isReady) {
              // MathJax is ready, process immediately
              processMathJax(MathJax);
            } else {
              // Wait for MathJax to finish initialization
              if (MathJax.Hub.Register) {
                MathJax.Hub.Register.StartupHook("End", () => {
                  if (isMounted && containerRef.current) {
                    processMathJax(MathJax);
                  }
                });
              } else {
                // Fallback: retry after shorter delay
                mathJaxInitTimerRef.current = setTimeout(() => {
                  if (isMounted && containerRef.current && window.MathJax) {
                    processMathJax(window.MathJax);
                  }
                }, 300);
              }
            }
          } else {
            // Try processing anyway (might be MathJax 3.x)
            processMathJax(MathJax);
          }
        } catch (error) {
          logger.error("MathJax initialization failed", error);
          if (isMounted) {
            setMathJaxError(true);
          }
        }
      })
      .catch((error) => {
        logger.error("Unable to load MathJax", error);
        if (isMounted) {
          setMathJaxError(true);
        }
        // Don't block rendering if MathJax fails - just show error message
      });

    return () => {
      isMounted = false;
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
      buttonLink: /data-button-link=["']([^"']*)["']/i,
      imageUrl: /data-image-url=["']([^"']*)["']/i,
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
      const fetchPromises = uniqueFormIds.map(async (formId) => {
        try {
          const response = await fetch(`/api/form/${formId}`);
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

        if (window.MathJax?.Hub?.Queue) {
          window.MathJax.Hub.Queue([
            "Typeset",
            window.MathJax.Hub,
            elementsToProcess,
          ]);
        } else if (window.MathJax?.Hub?.Typeset) {
          window.MathJax.Hub.Typeset(elementsToProcess);
        } else if (window.MathJax?.typeset) {
          window.MathJax.typeset(elementsToProcess);
        }
      } catch (error) {
        logger.error("MathJax reprocessing error:", error);
      }
    }, 100); // Minimal delay for fast processing
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

            // For inline forms
            if (formData?.isInline) {
              // Priority: formData (from HTML attributes) > formConfig > default
              const buttonText =
                (formData.buttonText && formData.buttonText.trim()) ||
                formConfig?.settings?.buttonText ||
                "Open Form";
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
                    className="inline-block px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md sm:rounded-lg text-xs sm:text-sm md:text-base font-medium transition-all duration-200 transform active:scale-95"
                    style={{
                      display: "inline-block",
                      verticalAlign: "baseline",
                      cursor: "pointer",
                      lineHeight: "1.5",
                      margin: "0 4px",
                      whiteSpace: "nowrap",
                      textDecoration: "none",
                    }}
                  >
                    {capitalizeButtonText(buttonText || "Open Form")}
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
                    >
                      {isOpen ? "Close" : capitalizeButtonText(buttonText)}
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
            const startsWithBlockTag =
              /^<[^>]+(?:p|div|h[1-6]|ul|ol|li|blockquote|pre|table|section|article|header|footer|nav|aside|main|figure|hr)[\s>\/]/.test(
                trimmedPart
              );

            // Check if content contains complete list structures
            const hasListStructure = /<(ul|ol)[^>]*>[\s\S]*<\/(ul|ol)>/i.test(
              trimmedPart
            );

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
        <div className="text-yellow-600 text-sm mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          Note: Math equations may not render correctly. Please refresh the
          page.
        </div>
      )}
      <div ref={containerRef} className="rich-text-content">
        {renderContent}
      </div>
    </>
  );
};

export default RichContent;
