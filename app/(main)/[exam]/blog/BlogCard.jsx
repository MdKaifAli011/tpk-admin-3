"use client";

import React, { useState } from "react";
import { FaCalendarAlt, FaUser } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import { BLOG_PUBLIC_AUTHOR_LABEL } from "@/constants/blogPublic";

// Helper function to resolve image path with base path
const resolveImagePath = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith(basePath)) {
    return cleanPath;
  }
  return `${basePath}${cleanPath}`;
};

const BlogCard = ({ post, examSlug }) => {
  const [imageError, setImageError] = useState(false);

  const imageSrc = resolveImagePath(post.image);

  return (
    <article
      className="
              group bg-white rounded-xl border border-gray-200/60
              overflow-hidden flex flex-col
              hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-indigo-100
              transition-all duration-300
            "
    >
      {/* Thumbnail: natural image height (no forced aspect ratio). */}
      <div className="relative w-full rounded-t-xl bg-gray-50 overflow-hidden">
        {post.image && !imageError ? (
          <Image
            src={imageSrc}
            alt={post.title}
            width={827}
            height={312}
            className="h-auto w-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            onError={() => setImageError(true)}
            unoptimized={imageSrc.startsWith("http://")}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 group-hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            {/* Abstract Shapes */}
            <div className="w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl absolute top-0 right-0" />
            <div className="w-20 h-20 bg-purple-100/50 rounded-full blur-2xl absolute bottom-0 left-0" />
            <span className="text-gray-300 font-bold opacity-30 text-5xl select-none">
              {post.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-2.5 text-[11px] text-gray-500">
          <FaCalendarAlt className="text-indigo-400" />
          <span>{post.date}</span>
          <span className="mx-1">•</span>
          <span className="flex items-center gap-1">
            <FaUser className="text-indigo-400" />
            {BLOG_PUBLIC_AUTHOR_LABEL}
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
          <Link
            href={`/${examSlug}/blog/${post.slug}`}
            className="focus:outline-none hover:underline cursor-pointer"
          >
            {post.title}
          </Link>
        </h2>

        <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1 leading-relaxed">
          {post.excerpt}
        </p>

        <div className="pt-3 mt-auto border-t border-gray-50">
          <Link
            href={`/${examSlug}/blog/${post.slug}`}
            className="flex items-center justify-between group/link cursor-pointer"
          >
            <span className="text-xs font-semibold text-indigo-600 group-hover/link:underline uppercase tracking-wider">
              Read Article
            </span>
            <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center transform group-hover/link:translate-x-1 transition-transform">
              <svg
                className="w-2.5 h-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;
