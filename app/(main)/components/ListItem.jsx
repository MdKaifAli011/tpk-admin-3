
"use client";
import React, { memo } from "react";
import Link from "next/link";
import { FaCheck, FaEye } from "react-icons/fa";
import ProgressBar from "./ProgressBar";

const ListItem = memo(({ item, index, href, color }) => {
  const colorVariants = {
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    black: "bg-black",
    indigo: "bg-indigo-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
  };

  const getColor = () => {
    if (color) return colorVariants[color] || colorVariants.blue;
    const colors = ["blue", "blue", "yellow", "green", "black"];
    return colorVariants[colors[index % colors.length]] || colorVariants.blue;
  };

  const weightage = item.weightage ?? "20%";
  const engagement = item.engagement ?? "2.2K";
  const isCompleted = Boolean(item.isCompleted);
  const resolvedProgress =
    item.progress !== undefined && item.progress !== null
      ? Number(item.progress)
      : isCompleted
      ? 100
      : 0;
  const progressValue = Number.isFinite(resolvedProgress)
    ? resolvedProgress
    : 0;
  const progressPercent = Math.min(100, Math.max(0, progressValue));
  const progressLabel = Math.round(progressPercent);

  const Wrapper = href ? Link : "div";
  const wrapperProps = href ? { href } : {};
  const indicatorColor = getColor();

  const statusMarkup = isCompleted ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-emerald-200 bg-emerald-500 text-white">
      <FaCheck className="text-xs" />
    </span>
  ) : (
    <span className="text-xs font-medium text-gray-400">Mark as Done</span>
  );

  return (
    <Wrapper
      {...wrapperProps}
      className="block px-4 py-4 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:px-6"
    >
      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_140px_180px] sm:items-center sm:gap-6">
        <div className="flex items-start gap-3">
          <span
            className={`hidden sm:block w-1 self-stretch rounded-full ${indicatorColor}`}
            aria-hidden="true"
          />
          <span
            className={`block h-0.5 w-12 rounded-full ${indicatorColor} sm:hidden`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 sm:text-base">
              {item.name}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 sm:text-sm">
              <span className="font-medium text-emerald-600">
                Weightage: {weightage}
              </span>
              <span className="inline-flex items-center gap-1">
                <FaEye className="text-gray-400" />
                {engagement}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start sm:justify-center">
          {statusMarkup}
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
          <ProgressBar
            progress={progressPercent}
            size="lg"
            showLabel={true}
            labelPosition="right"
            variant={progressPercent >= 100 ? "emerald" : "emerald"}
            className="flex-1 sm:flex-initial"
          />
        </div>
      </div>
    </Wrapper>
  );
});

ListItem.displayName = "ListItem";

export default ListItem;
