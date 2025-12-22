"use client";

import React, { useState, useMemo, createContext, useContext } from "react";
import { FaNewspaper, FaSearch } from "react-icons/fa";
import BlogCard from "./BlogCard";
import Pagination from "@/components/shared/Pagination";

// Create search context
export const BlogSearchContext = createContext();

const BlogListClient = ({ posts, examSlug, children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3 columns × 3 rows

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) {
      return posts;
    }

    const query = searchQuery.toLowerCase().trim();
    return posts.filter((post) => {
      const titleMatch = post.title?.toLowerCase().includes(query);
      const excerptMatch = post.excerpt?.toLowerCase().includes(query);
      const categoryMatch = post.category?.toLowerCase().includes(query);
      const authorMatch = post.author?.toLowerCase().includes(query);

      return titleMatch || excerptMatch || categoryMatch || authorMatch;
    });
  }, [posts, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <BlogSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
      {/* Blog Grid */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/60 p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <FaNewspaper className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? "No Results Found" : "No Blog Posts Yet"}
            </h3>
            <p className="text-sm text-gray-600 max-w-md">
              {searchQuery
                ? `No blog posts match "${searchQuery}". Try a different search term.`
                : "There are no blog posts available at the moment. Check back soon for updates, tips, and news!"}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 py-3">
            {paginatedPosts.map((post) => (
              <BlogCard key={post.id} post={post} examSlug={examSlug} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showPrevNext={true}
              maxVisible={5}
            />
          )}

          {/* Results count */}
          {searchQuery && (
            <div className="text-center text-sm text-gray-600 mt-4">
              Found {filteredPosts.length} result
              {filteredPosts.length !== 1 ? "s" : ""} for &quot;{searchQuery}
              &quot;
            </div>
          )}
        </>
      )}
    </BlogSearchContext.Provider>
  );
};

export default BlogListClient;
