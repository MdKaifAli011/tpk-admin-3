"use client";

import React from "react";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
import BlogCard from "@/app/(main)/[exam]/blog/BlogCard";

const AssignedBlogsSectionClient = ({ posts, examSlug }) => {
  if (!posts || posts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} examSlug={examSlug} />
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <Link
          href={`/${examSlug}/blog`}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
        >
          View all articles
          <FaArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default AssignedBlogsSectionClient;
