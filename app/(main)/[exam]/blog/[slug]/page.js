import React from "react";
import { notFound } from "next/navigation";
import { FaChevronLeft, FaCalendarAlt, FaUser, FaTag } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import {
  fetchExamById,
  fetchBlogBySlug,
  fetchBlogDetails,
  createSlug,
} from "../../../lib/api";
import RichContent from "../../../components/RichContent";

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

const BlogDetailPage = async ({ params }) => {
  const { exam: examIdOrSlug, slug } = await params;

  // Fetch exam data
  const exam = await fetchExamById(examIdOrSlug);
  if (!exam) {
    notFound();
  }

  const examSlug = createSlug(exam.name);
  const examName = exam.name ? exam.name.toUpperCase() : "EXAM";

  // Fetch blog by slug
  const blog = await fetchBlogBySlug(slug);
  if (!blog) {
    notFound();
  }

  // Fetch blog details
  const blogDetails = await fetchBlogDetails(blog._id);

  // Format date
  const blogDate = blog.createdAt || blog.updatedAt || new Date();
  const formattedDate = new Date(blogDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get content - use blog details content or fallback
  const content = blogDetails?.content || "";
  // Use blog.name for display title (not SEO title)
  const displayTitle = blog.name || "Untitled Blog";
  const metaDescription = blogDetails?.metaDescription || "";
  const keywords = blogDetails?.keywords || "";

  // Check if image is external URL
  const imageSrc = resolveImagePath(blog.image);
  const isExternalImage =
    imageSrc.startsWith("http://") || imageSrc.startsWith("https://");

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <section
        className="
          rounded-xl
          p-3 sm:p-4
          bg-gradient-to-br from-indigo-50 via-white to-purple-50
          border border-indigo-100/60
          shadow-[0_2px_12px_rgba(120,90,200,0.08)]
        "
      >
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-indigo-900 mb-2">
              {displayTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <FaCalendarAlt className="text-indigo-400" />
                {formattedDate}
              </span>
              <span className="mx-1">•</span>
              <span className="flex items-center gap-1">
                <FaUser className="text-indigo-400" />
                {blog.author || "Admin"}
              </span>
              {(blog.categoryId?.name || blog.category) && (
                <>
                  <span className="mx-1">•</span>
                  <span className="flex items-center gap-1">
                    <FaTag className="text-indigo-400" />
                    {blog.categoryId?.name || blog.category}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Image */}
      {blog.image && (
        <div className="relative w-full h-50 sm:h-80 md:h-96 rounded-xl overflow-hidden bg-gray-50">
          <Image
            src={imageSrc}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={isExternalImage}
            priority
          />
        </div>
      )}

      {/* Blog Content */}
      <article className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-6 lg:p-8">
        {/* Content */}
        {content ? (
          <div
            className="prose prose-sm sm:prose-base max-w-none
            prose-headings:text-gray-900 prose-headings:font-bold
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900 prose-strong:font-semibold
            prose-ul:text-gray-700 prose-ol:text-gray-700
            prose-li:text-gray-700
            prose-img:rounded-lg prose-img:shadow-md
            prose-blockquote:border-indigo-200 prose-blockquote:bg-indigo-50/50
            prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          "
          >
            <RichContent html={content} />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">
              Content is being prepared. Please check back soon.
            </p>
          </div>
        )}

        {/* Keywords */}
        {keywords && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Tags:</p>
            <div className="flex flex-wrap gap-2">
              {keywords.split(",").map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100"
                >
                  {keyword.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Bottom Navigation */}
      <div className="flex justify-between items-center pt-2">
        <Link
          href={`/${examSlug}/blog`}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg
            text-xs font-medium text-gray-600 bg-white
            border border-gray-200 shadow-sm
            hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200
            transition-all duration-200
          "
        >
          <FaChevronLeft className="text-[10px]" />
          Back to Blog
        </Link>
        <Link
          href={`/${examSlug}`}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg
            text-xs font-medium text-gray-600 bg-white
            border border-gray-200 shadow-sm
            hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200
            transition-all duration-200
          "
        >
          <FaChevronLeft className="text-[10px]" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default BlogDetailPage;
