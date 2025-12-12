"use client";

import React from "react";
import Card from "./Card";

const HeaderCard = ({ title, breadcrumb = [], progress = null }) => {
  return (
    <Card variant="gradient" hover={false} className="p-3 sm:p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5">
        {/* Left: Title + Breadcrumb */}
        <div className="flex-1 leading-tight">
          <h1 className="text-lg sm:text-xl font-bold text-indigo-900">
            {title}
          </h1>

          {breadcrumb.length > 0 && (
            <p className="text-xs text-gray-500 sm:text-sm mt-1">
              {breadcrumb.join(" > ")}
            </p>
          )}
        </div>

        {/* Right: Progress Component */}
        {progress && <div>{progress}</div>}
      </div>
    </Card>
  );
};

export default HeaderCard;
