"use client";

import React, { useRef, useState, useEffect } from "react";

/**
 * Collapsible - Smooth collapsible/expandable container component
 * @param {boolean} isOpen - Whether the content is expanded
 * @param {ReactNode} children - Content to show/hide
 * @param {string} className - Additional CSS classes
 */
const Collapsible = ({ isOpen, children, className = "" }) => {
  const ref = useRef(null);
  const [maxHeight, setMaxHeight] = useState("0px");

  // Only depend on isOpen so parent re-renders (new children reference) don't re-run and cause remount/flicker
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isOpen) {
      setMaxHeight(`${el.scrollHeight}px`);
      const t = setTimeout(() => setMaxHeight("none"), 220);
      return () => clearTimeout(t);
    } else {
      if (el.scrollHeight) {
        setMaxHeight(`${el.scrollHeight}px`);
        requestAnimationFrame(() => setMaxHeight("0px"));
      } else {
        setMaxHeight("0px");
      }
    }
  }, [isOpen]);

  const style =
    maxHeight === "none"
      ? {
        overflowY: "visible",
        transition: "max-height 200ms cubic-bezier(.2,.9,.2,1)",
      }
      : {
        maxHeight,
        overflow: "hidden",
        transition: "max-height 200ms cubic-bezier(.2,.9,.2,1)",
      };

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
};

export default Collapsible;

