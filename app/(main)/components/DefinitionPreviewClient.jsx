"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaChevronDown } from "react-icons/fa";
import RichContent from "./RichContent";
import { truncateHtmlContent, hasMoreContent } from "../lib/utils/contentUtils";

const DefinitionPreviewClient = ({
  definition,
  definitionUrl,
  definitionContent,
}) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  // Get truncated HTML content (show preview, preserving HTML structure)
  const truncatedHtml = definitionContent
    ? truncateHtmlContent(definitionContent, 200, 400)
    : "";
  const showReadMore = definitionContent
    ? hasMoreContent(definitionContent, 200)
    : false;

  const handleReadMore = (e) => {
    if (!definitionUrl || isNavigating) return;

    e.preventDefault();
    setIsNavigating(true);

    // Add page transition animation
    const container = e.currentTarget.closest(".definition-container");
    if (container) {
      container.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
      container.style.transform = "scale(0.98)";
      container.style.opacity = "0.9";
    }

    // Navigate after brief animation using Next.js router (handles basepath automatically)
    setTimeout(() => {
      router.push(definitionUrl);
    }, 200);
  };

  return (
    <div className="space-y-3">
      {definitionUrl ? (
        <Link href={definitionUrl} className="group/link">
          <h3 className="text-lg sm:text-xl font-bold text-indigo-700 group-hover/link:text-indigo-500 group-hover/link:underline transition-all duration-200 cursor-pointer mb-3 inline-block">
            {definition.name}
          </h3>
        </Link>
      ) : (
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
          {definition.name}
        </h3>
      )}
      {definitionContent && (
        <div className="space-y-0">
          {/* Premium Content Container with Max 300px Height */}
          <div className="definition-container bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 rounded-xl border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_4px_16px_rgba(100,70,200,0.12)] hover:border-indigo-200/80 relative">
            {/* Content Wrapper - Max 300px Height, Auto when content is less */}
            <div className="relative max-h-[300px] min-h-0 overflow-hidden">
              <div className="max-h-[300px] min-h-0 overflow-y-auto p-5 sm:p-6 md:p-7 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="prose prose-sm sm:prose max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-indigo-700 prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700">
                  <RichContent
                    key={`definition-preview-${definition._id || "unknown"}`}
                    html={truncatedHtml}
                  />
                </div>
              </div>

              {/* Premium Gradient Fade Overlay at Bottom */}
              {showReadMore && (
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-indigo-50/50 via-white/98 to-transparent pointer-events-none z-10"></div>
              )}

              {/* Premium Read More Button - Overlapping at Bottom */}
              {showReadMore && definitionUrl && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 px-5">
                  <Link
                    href={definitionUrl}
                    onClick={handleReadMore}
                    className="group inline-flex items-center gap-2.5 px-5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-700 hover:via-indigo-700 hover:to-indigo-800 text-white text-sm font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_8px_20px_rgba(99,102,241,0.35)] transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_12px_rgba(99,102,241,0.25)] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <span className="tracking-wide">Read More</span>
                    <FaChevronDown className="w-3 h-3 transition-transform duration-300 group-hover:translate-y-1" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefinitionPreviewClient;

