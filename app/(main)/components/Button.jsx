"use client";

import React from "react";
import Link from "next/link";

/**
 * Unified Button Component
 * Standardizes all button styles across the application
 * 
 * @param {string} variant - Button variant: 'primary' | 'secondary' | 'outline' | 'ghost' (default: 'primary')
 * @param {string} size - Button size: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} fullWidth - Full width button (default: false)
 * @param {string} href - If provided, renders as Link instead of button
 * @param {React.ReactNode} children - Button content
 * @param {string} className - Additional CSS classes
 * @param {object} props - Other button/link props
 */
const Button = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  href,
  children,
  className = "",
  ...props
}) => {
  // Size configurations
  const sizeConfig = {
    sm: {
      padding: "px-3 py-1.5",
      text: "text-xs",
      font: "font-medium",
    },
    md: {
      padding: "px-4 py-2",
      text: "text-sm",
      font: "font-semibold",
    },
    lg: {
      padding: "px-6 py-3",
      text: "text-base",
      font: "font-bold",
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Variant configurations
  const getVariantClasses = () => {
    const base = `${config.padding} ${config.text} ${config.font} rounded-lg transition-all duration-200`;

    switch (variant) {
      case "primary":
        return `${base} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg`;
      
      case "secondary":
        return `${base} bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105`;
      
      case "outline":
        return `${base} bg-white border-2 border-gray-300 hover:border-indigo-500 text-gray-900 hover:text-indigo-600 shadow-md hover:shadow-lg`;
      
      case "ghost":
        return `${base} bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900`;
      
      default:
        return `${base} bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg`;
    }
  };

  const classes = `${getVariantClasses()} ${fullWidth ? "w-full" : ""} ${className}`;

  // Render as Link if href is provided
  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};

export default Button;

