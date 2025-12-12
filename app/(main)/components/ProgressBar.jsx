"use client";

import React from "react";

/**
 * Unified ProgressBar Component
 * Standardizes all progress indicators across the application
 * 
 * @param {number} progress - Progress value (0-100)
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} showLabel - Show percentage label (default: true)
 * @param {string} labelPosition - Label position: 'left' | 'right' | 'top' | 'bottom' | 'inside' (default: 'right')
 * @param {string} variant - Color variant: 'default' | 'emerald' | 'blue' (default: 'default')
 * @param {boolean} isLoading - Show loading state (default: false)
 * @param {string} className - Additional CSS classes
 */
const ProgressBar = ({
  progress = 0,
  size = "md",
  showLabel = true,
  labelPosition = "right",
  variant = "default",
  isLoading = false,
  className = "",
}) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isComplete = clampedProgress >= 100;

  // Size configurations
  const sizeConfig = {
    sm: {
      height: "h-1",
      labelSize: "text-[10px]",
      barWidth: "w-16 sm:w-20",
    },
    md: {
      height: "h-1.5",
      labelSize: "text-xs",
      barWidth: "w-20 sm:w-24",
    },
    lg: {
      height: "h-2",
      labelSize: "text-sm",
      barWidth: "w-full sm:w-48",
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Color variants
  const getColorClasses = () => {
    if (isComplete) {
      return "bg-gradient-to-r from-emerald-500 to-emerald-600";
    }

    switch (variant) {
      case "emerald":
        return "bg-gradient-to-r from-emerald-400 to-emerald-500";
      case "blue":
        return "bg-gradient-to-r from-blue-500 to-indigo-600";
      case "default":
      default:
        return "bg-gradient-to-r from-blue-500 to-indigo-600";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && labelPosition === "left" && (
          <span className={`${config.labelSize} font-semibold text-gray-400`}>
            ...
          </span>
        )}
        <div
          className={`${config.barWidth} ${config.height} bg-gray-200 rounded-full overflow-hidden shadow-inner`}
        >
          <div
            className="h-full bg-gray-300 animate-pulse"
            style={{ width: "30%" }}
          ></div>
        </div>
        {showLabel && labelPosition === "right" && (
          <span className={`${config.labelSize} font-semibold text-gray-400`}>
            ...
          </span>
        )}
      </div>
    );
  }

  // Label component
  const Label = () => {
    if (!showLabel) return null;

    const labelClasses = `${config.labelSize} font-semibold ${
      labelPosition === "right" || labelPosition === "left"
        ? "text-gray-700"
        : "text-gray-600"
    }`;

    if (labelPosition === "inside") {
      return (
        <span className={`absolute inset-0 flex items-center justify-center ${labelClasses} text-white`}>
          {Math.round(clampedProgress)}%
        </span>
      );
    }

    return (
      <span className={labelClasses}>{Math.round(clampedProgress)}%</span>
    );
  };

  // Container classes based on label position
  const getContainerClasses = () => {
    const base = "flex items-center gap-2";
    if (labelPosition === "top" || labelPosition === "bottom") {
      return `${base} flex-col`;
    }
    if (labelPosition === "inside") {
      return "relative";
    }
    return base;
  };

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      {/* Top label */}
      {showLabel && labelPosition === "top" && (
        <div className="w-full flex justify-between items-center">
          <span className={`${config.labelSize} text-gray-600`}>Progress</span>
          <Label />
        </div>
      )}

      {/* Left label */}
      {showLabel && labelPosition === "left" && <Label />}

      {/* Progress bar */}
      <div
        className={`${config.barWidth} ${config.height} bg-gray-200 rounded-full overflow-hidden shadow-inner relative`}
      >
        <div
          className={`h-full ${getColorClasses()} transition-all duration-300 ${
            labelPosition === "inside" ? "relative" : ""
          }`}
          style={{ width: `${clampedProgress}%` }}
        >
          {labelPosition === "inside" && <Label />}
        </div>
      </div>

      {/* Right label */}
      {showLabel && labelPosition === "right" && <Label />}

      {/* Bottom label */}
      {showLabel && labelPosition === "bottom" && (
        <div className="w-full flex justify-between items-center">
          <span className={`${config.labelSize} text-gray-600`}>Progress</span>
          <Label />
        </div>
      )}
    </div>
  );
};

export default ProgressBar;

