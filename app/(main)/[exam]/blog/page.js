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
    // Ensure exam._id is converted to string
    const examIdString = exam._id
      ? exam._id.toString
        ? exam._id.toString()
        : String(exam._id)
      : null;

    if (!examIdString) {
      console.error("Blog page: No exam ID found", {
        exam: exam ? { _id: exam._id, name: exam.name } : null,
      });
      blogs = [];
    } else {
      // Log the exam ID being used
      console.log("Blog page: Fetching blogs for exam", {
        examId: examIdString,
        examName: exam.name,
        examIdType: typeof exam._id,
      });

      blogs = await fetchBlogs({
        examId: examIdString,
        status: "active",
        limit: 50,
        forceRefresh: true, // Force refresh to get latest data
      });

      // Log the results
      console.log("Blog page: Fetched blogs result", {
        examId: examIdString,
        examName: exam.name,
        blogCount: blogs.length,
        blogs: blogs.map((b) => ({
          _id: b._id,
          name: b.name,
          examId: b.examId,
        })),
      });
    }
  } catch (error) {
    console.error("Error fetching blogs:", error);
    console.error("Error stack:", error.stack);
    blogs = [];
  }

  // Fetch blog details for better excerpts (exclude content for performance)
  const blogsWithDetails = await Promise.all(
    blogs.map(async (blog) => {
      try {
        // Exclude content field when fetching for cards - we only need shortDescription/metaDescription
        const details = await fetchBlogDetails(blog._id, {
          excludeContent: true,
        });
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
      author: blog.author || "Admin",
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
          className="
          rounded-xl
          p-3 sm:p-4
          bg-gradient-to-br from-indigo-50 via-white to-purple-50
          border border-indigo-100/60
          shadow-[0_2px_12px_rgba(120,90,200,0.08)]
        "
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-3 sm:gap-4">
            {/* LEFT — Title + Description */}
            <div className="flex flex-col min-w-0 leading-tight flex-1">
              <h1
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
