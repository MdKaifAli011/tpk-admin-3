/**
 * Utility functions for content manipulation
 * Client-side utilities for HTML content processing
 */

/**
 * Strip HTML tags and get plain text
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
export function stripHtml(html) {
  if (!html) return "";

  // Create a temporary DOM element to parse HTML (client-side only)
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const text = tmp.textContent || tmp.innerText || "";
      // Clean up extra whitespace
      return text.replace(/\s+/g, " ").trim();
    } catch (error) {
      console.error("Error stripping HTML:", error);
      // Fallback to regex method
    }
  }

  // Fallback: use regex to strip HTML tags (works on both client and server)
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove script tags
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove style tags
    .replace(/<[^>]+>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
    .replace(/&amp;/g, "&") // Replace &amp; with &
    .replace(/&lt;/g, "<") // Replace &lt; with <
    .replace(/&gt;/g, ">") // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/&#x27;/g, "'") // Replace &#x27; with '
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();
}

/**
 * Get first N words from text
 * @param {string} text - Plain text
 * @param {number} wordCount - Number of words to extract
 * @returns {string} First N words
 */
export function getFirstNWords(text, wordCount = 500) {
  if (!text) return "";

  const words = text.trim().split(/\s+/);
  if (words.length <= wordCount) {
    return text;
  }

  return words.slice(0, wordCount).join(" ") + "...";
}

/**
 * Truncate HTML content to show a preview while preserving HTML structure
 * Truncates at natural break points (end of paragraphs, sentences, etc.)
 * @param {string} html - HTML content
 * @param {number} minWords - Minimum words to show (default: 200)
 * @param {number} maxWords - Maximum words to show (default: 400)
 * @returns {string} Truncated HTML content
 */
export function truncateHtmlContent(html, minWords = 200, maxWords = 400) {
  if (!html) return "";

  // First, get plain text to count words
  const plainText = stripHtml(html);
  const words = plainText.trim().split(/\s+/);

  // If content is shorter than minWords, return full HTML
  if (words.length <= minWords) {
    return html;
  }

  // Use DOM-based approach for accurate truncation (client-side only)
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;

      // Function to count words in a node
      const countWords = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0).length;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          let count = 0;
          for (const child of node.childNodes) {
            count += countWords(child);
          }
          return count;
        }
        return 0;
      };

      // Function to find the best truncation point
      const findTruncationPoint = (node, targetWords, currentWords = 0) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const nodeWords = node.textContent
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);
          const newCount = currentWords + nodeWords.length;

          if (newCount >= targetWords) {
            // We've reached the target, try to find a good break point
            const wordsNeeded = targetWords - currentWords;

            // Try to break at sentence end
            let text = node.textContent;
            const sentences = text.match(/[^.!?]*[.!?]+/g) || [];
            let sentenceWords = 0;
            let truncatedText = "";

            for (const sentence of sentences) {
              const sentenceWordCount = sentence
                .trim()
                .split(/\s+/)
                .filter((w) => w.length > 0).length;
              if (sentenceWords + sentenceWordCount <= wordsNeeded) {
                truncatedText += sentence;
                sentenceWords += sentenceWordCount;
              } else {
                break;
              }
            }

            if (truncatedText) {
              node.textContent = truncatedText.trim();
              return {
                truncated: true,
                wordsUsed: currentWords + sentenceWords,
              };
            } else {
              // Fallback: just truncate at word boundary
              const wordsToTake = nodeWords.slice(0, wordsNeeded);
              node.textContent = wordsToTake.join(" ");
              return { truncated: true, wordsUsed: targetWords };
            }
          }
          return { truncated: false, wordsUsed: newCount };
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName?.toLowerCase();
          const isBlockElement = [
            "p",
            "div",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "li",
            "blockquote",
          ].includes(tagName);

          let totalWords = currentWords;
          const children = Array.from(node.childNodes);
          let shouldTruncate = false;

          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const result = findTruncationPoint(child, targetWords, totalWords);

            totalWords = result.wordsUsed;

            if (result.truncated) {
              // Remove remaining siblings
              for (let j = i + 1; j < children.length; j++) {
                children[j].remove();
              }
              shouldTruncate = true;
              break;
            }

            // If we're close to target and this is a block element, consider stopping here
            if (
              isBlockElement &&
              totalWords >= minWords &&
              totalWords < maxWords
            ) {
              // Check if next sibling would push us over maxWords
              if (i + 1 < children.length) {
                const nextChildWords = countWords(children[i + 1]);
                if (totalWords + nextChildWords > maxWords) {
                  // Stop at this block element
                  for (let j = i + 1; j < children.length; j++) {
                    children[j].remove();
                  }
                  shouldTruncate = true;
                  break;
                }
              }
            }
          }

          return { truncated: shouldTruncate, wordsUsed: totalWords };
        }

        return { truncated: false, wordsUsed: currentWords };
      };

      // Find truncation point
      const result = findTruncationPoint(tmp, maxWords);

      // If we didn't truncate but content is longer, force truncation
      if (!result.truncated && words.length > maxWords) {
        // Find last paragraph or div and remove everything after
        const allElements = tmp.querySelectorAll(
          "p, div, li, h1, h2, h3, h4, h5, h6"
        );
        let wordCount = 0;

        for (const el of allElements) {
          const elWords = countWords(el);
          if (wordCount + elWords > maxWords) {
            // Remove this element and all following
            let next = el.nextSibling;
            while (next) {
              const toRemove = next;
              next = next.nextSibling;
              toRemove.remove();
            }
            el.remove();
            break;
          }
          wordCount += elWords;
        }
      }

      return tmp.innerHTML;
    } catch (error) {
      console.error("Error truncating HTML with DOM:", error);
      // Fall through to fallback method
    }
  }

  // Fallback: Simple approach - estimate position and truncate safely (for server-side)
  // Calculate target: aim for somewhere between minWords and maxWords
  const targetWords = Math.min(
    maxWords,
    Math.max(minWords, Math.floor((minWords + maxWords) / 2))
  );
  const targetText = words.slice(0, targetWords).join(" ");
  const textLength = targetText.length;
  const plainTextLength = plainText.length;
  const htmlLength = html.length;

  // Estimate position based on text ratio
  const ratio = plainTextLength > 0 ? textLength / plainTextLength : 0.5;
  let estimatedPosition = Math.floor(htmlLength * ratio * 1.3); // Add buffer for HTML tags
  estimatedPosition = Math.min(estimatedPosition, htmlLength - 1);

  // Find a safe truncation point (after closing tags, punctuation, etc.)
  let truncateAt = estimatedPosition;
  const safePatterns = [
    /<\/p>/i,
    /<\/div>/i,
    /<\/li>/i,
    /<\/h[1-6]>/i,
    /<\/blockquote>/i,
    /[.!?]\s*</,
    /\.\s*$/,
  ];

  // Look backwards from estimated position for a safe point (within reasonable range)
  const searchRange = Math.min(500, htmlLength);
  const initialTruncateAt = truncateAt;
  for (
    let i = Math.min(truncateAt + searchRange, htmlLength - 1);
    i >= Math.max(0, truncateAt - searchRange);
    i--
  ) {
    const substring = html.substring(0, i + 1);
    for (const pattern of safePatterns) {
      if (pattern.test(substring)) {
        truncateAt = i + 1;
        break;
      }
    }
    if (truncateAt !== initialTruncateAt) break;
  }

  // Ensure we don't truncate too early (at least minWords worth)
  if (truncateAt < htmlLength * 0.3) {
    // If truncation point is too early, find a better one
    const minPosition = Math.floor(htmlLength * 0.4);
    for (
      let i = minPosition;
      i < Math.min(minPosition + 300, htmlLength);
      i++
    ) {
      const substring = html.substring(0, i + 1);
      for (const pattern of safePatterns) {
        if (pattern.test(substring)) {
          truncateAt = i + 1;
          break;
        }
      }
      if (truncateAt > minPosition) break;
    }
  }

  let truncatedHtml = html.substring(0, truncateAt);

  // Basic tag closing (close common open tags)
  const tagStack = [];
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*(?:\/>|>)/gi;
  const voidElements = new Set([
    "img",
    "br",
    "hr",
    "input",
    "meta",
    "link",
    "area",
    "base",
    "col",
    "embed",
    "source",
    "track",
    "wbr",
  ]);

  let match;
  while ((match = tagRegex.exec(truncatedHtml)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullTag.startsWith("</");
    const isSelfClosing = fullTag.endsWith("/>");

    if (isClosing) {
      // Remove from stack
      const index = tagStack.lastIndexOf(tagName);
      if (index !== -1) {
        tagStack.splice(index, 1);
      }
    } else if (!isSelfClosing && !voidElements.has(tagName)) {
      // Add to stack
      tagStack.push(tagName);
    }
  }

  // Close remaining open tags (in reverse order)
  for (let i = tagStack.length - 1; i >= 0; i--) {
    truncatedHtml += `</${tagStack[i]}>`;
  }

  return truncatedHtml;
}

/**
 * Check if content has more content to show (for Read More button)
 * @param {string} html - HTML content
 * @param {number} minWords - Minimum words threshold (default: 200)
 * @returns {boolean} True if content has more than minWords
 */
export function hasMoreContent(html, minWords = 200) {
  if (!html) return false;

  const plainText = stripHtml(html);
  const words = plainText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  return words.length > minWords;
}
