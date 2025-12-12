"use client";

import React from "react";
import Link from "next/link";

/**
 * Unified Card Component
 * Standardizes all card styles across the application
 * 
 * @param {string} variant - Card variant: 'standard' | 'premium' | 'gradient' | 'stat' (default: 'standard')
 * @param {boolean} hover - Enable hover effects (default: true)
 * @param {string} href - If provided, renders as Link wrapper
 * @param {React.ReactNode} children - Card content
 * @param {string} className - Additional CSS classes
 * @param {object} props - Other props
 */
const Card = ({
  variant = "standard",
  hover = true,
  href,
  children,
  className = "",
  ...props
}) => {
  // Variant configurations
  const getVariantClasses = () => {
    const base = "transition-all duration-200";

    switch (variant) {
      case "standard":
        return `${base} bg-white rounded-xl border border-gray-200 shadow-sm ${
          hover ? "hover:shadow-md hover:border-indigo-300" : ""
        }`;

      case "premium":
        return `${base} bg-white rounded-2xl border-2 border-gray-100 shadow-lg ${
          hover ? "hover:shadow-xl hover:border-indigo-200" : ""
        }`;

      case "gradient":
        return `${base} bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl border border-indigo-100/60 shadow-sm ${
          hover ? "hover:shadow-md" : ""
        }`;

      case "stat":
        return `${base} bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg ${
          hover ? "hover:shadow-xl hover:-translate-y-1" : ""
        }`;

      default:
        return `${base} bg-white rounded-xle border border-gray-200 shadow-sm`;
    }
  };

  const classes = `${getVariantClasses()} ${className}`;

  // Render as Link wrapper if href is provided
  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;

