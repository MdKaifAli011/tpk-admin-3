"use client";

import React, { useContext } from "react";
import { FaSearch } from "react-icons/fa";
import { BlogSearchContext } from "./BlogListClient";

const BlogSearchInput = () => {
  const { searchQuery, setSearchQuery } = useContext(BlogSearchContext);

  return (
    <div className="relative w-full md:w-80 group">
      {/* Glow Background */}
      <div
        className="
          absolute -inset-[1px] rounded-xl
          bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          blur-md transition-opacity duration-300
        "
      />

      {/* Input Wrapper */}
      <div
        className="
          relative flex items-center
          bg-white/90 backdrop-blur-lg
          border border-gray-200
          rounded-xl shadow-sm
          transition-all duration-300
          group-hover:shadow-md
          group-focus-within:border-indigo-500
        "
      >
        {/* Icon */}
        <FaSearch
          className="
            ml-3 text-gray-400 text-xs
            transition-colors duration-300
            group-focus-within:text-indigo-600
          "
        />

        {/* Input */}
        <input
          type="text"
          placeholder="Search articles, guides, updates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="
            w-full h-10
            px-3 py-2
            text-xs text-gray-700
            bg-transparent
            placeholder:text-gray-400
            focus:outline-none
          "
        />
      </div>
    </div>
  );
};

export default BlogSearchInput;
