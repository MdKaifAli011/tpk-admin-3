import React from "react";
import { notFound } from "next/navigation";
import { FaChevronLeft } from "react-icons/fa";
import Link from "next/link";
import {
  fetchExamById,
  fetchBlogs,
  fetchBlogDetails,
  createSlug,
} from "../../lib/api";
import BlogListClient from "./BlogListClient";
import BlogSearchInput from "./BlogSearchInput";
import { BLOG_PUBLIC_AUTHOR_LABEL } from "@/constants/blogPublic";

const BlogPage = async ({ params }) => {
  const { exam: examIdOrSlug } = await params;

  // Fetch exam data
  const exam = await fetchExamById(examIdOrSlug);
  if (!exam) {
    notFound();
  }

  // Get exam name in UPPERCASE
  const examName = exam.name ? exam.name.toUpperCase() : "EXAM";
  const examSlug = createSlug(exam.name);

  // Fetch blogs for this exam (or all active blogs if no exam filter)
  let blogs = [];
  try {
    blogs = await fetchBlogs({
      examId: exam._id,
      status: "active",
      limit: 50,
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    blogs = [];
  }

  // Fetch blog details for better excerpts (exclude content for performance)
  const blogsWithDetails = await Promise.all(
    blogs.map(async (blog) => {
      try {
        // Exclude content field when fetching for cards - we only need shortDescription/metaDescription
        const details = await fetchBlogDetails(blog._id, { excludeContent: true });
        return { ...blog, details };
      } catch (error) {
        return { ...blog, details: null };
      }
    })
  );

  // Transform blogs to posts format
  const posts = blogsWithDetails.map((blog) => {
    const blogDate = blog.createdAt || blog.updatedAt || new Date();
    // Use shortDescription from details for card display, or fallback to metaDescription, or default message
    const categoryName = blog.categoryId?.name || blog.category || "General";
    const excerpt =
      blog.details?.shortDescription ||
      blog.details?.metaDescription ||
      `Explore insights and tips about ${categoryName}.` ||
      "Read more about this topic...";

    return {
      id: blog._id,
      title: blog.name || "Untitled Blog",
      excerpt: excerpt,
      author: BLOG_PUBLIC_AUTHOR_LABEL,
      date: new Date(blogDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      category: categoryName,
      image: blog.image || "",
      slug: blog.slug || createSlug(blog.name),
    };
  });

  return (
    <BlogListClient posts={posts} examSlug={examSlug}>
      <div className="space-y-4">
        {/* 1. Header Section - Matching ExamPage Style Exactly */}
        <section
          className="hero-section rounded-xl p-3 sm:p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(120,90,200,0.08)]"
          aria-labelledby="blog-list-title"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-3 sm:gap-4">
            <div className="flex flex-col min-w-0 leading-tight flex-1">
              <h1
                id="blog-list-title"
                className="
                    text-lg sm:text-xl font-bold text-indigo-900
                    truncate
                    max-w-[180px] sm:max-w-[250px] md:max-w-[400px]
                    "
                title={`${examName} Blog`}
              >
                {examName} Blog
              </h1>
              <p
                className="
                    text-[10px] sm:text-xs text-gray-600 mt-0.5
                    truncate
                    max-w-[200px] sm:max-w-[300px] md:max-w-[500px]
                    "
                title={`Latest updates, tips, and news for ${exam.name} aspirants.`}
              >
                Latest updates, tips, and news for {exam.name} aspirants.
              </p>
            </div>

            {/* RIGHT — Search */}
            <div className="w-full md:w-auto md:shrink-0 md:ml-auto">
              <BlogSearchInput />
            </div>
          </div>
        </section>

        {/* 2. Blog Grid with Search and Pagination - rendered by BlogListClient */}
      </div>
    </BlogListClient>
  );
};

export default BlogPage;
