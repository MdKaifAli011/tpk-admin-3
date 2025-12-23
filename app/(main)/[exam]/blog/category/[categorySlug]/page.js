import React from "react";
import { notFound } from "next/navigation";
import {
  fetchExamById,
  fetchBlogs,
  fetchBlogDetails,
  fetchBlogCategories,
  createSlug,
} from "../../../../lib/api";
import BlogListClient from "../../BlogListClient";
import BlogSearchInput from "../../BlogSearchInput";

const BlogCategoryPage = async ({ params }) => {
  const { exam: examIdOrSlug, categorySlug } = await params;

  // Fetch exam data
  const exam = await fetchExamById(examIdOrSlug);
  if (!exam) {
    notFound();
  }

  // Fetch all categories for this exam - force refresh to get latest
  const categories = await fetchBlogCategories({
    examId: exam._id,
    status: "active",
    limit: 100,
    forceRefresh: true,
  });

  // Find the category by slug
  const category = categories.find(
    (cat) => createSlug(cat.name) === categorySlug
  );

  if (!category) {
    notFound();
  }

  // Get exam name in UPPERCASE
  const examName = exam.name ? exam.name.toUpperCase() : "EXAM";
  const examSlug = createSlug(exam.name);

  // Fetch blogs for this exam and category - force refresh to get latest
  let blogs = [];
  try {
    const allBlogs = await fetchBlogs({
      examId: exam._id,
      status: "active",
      limit: 100,
      forceRefresh: true,
    });
    
    // Filter blogs by categoryId
    blogs = allBlogs.filter((blog) => {
      const blogCategoryId = blog.categoryId?._id || blog.categoryId;
      return blogCategoryId && String(blogCategoryId) === String(category._id);
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    blogs = [];
  }

  // Fetch blog details for better excerpts (exclude content for performance)
  const blogsWithDetails = await Promise.all(
    blogs.map(async (blog) => {
      try {
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
                title={`${category.name} - ${examName} Blog`}
              >
                {category.name} - {examName} Blog
              </h1>
              <p
                className="
                    text-[10px] sm:text-xs text-gray-600 mt-0.5
                    truncate
                    max-w-[200px] sm:max-w-[300px] md:max-w-[500px]
                    "
                title={`${category.name} articles and updates for ${exam.name} aspirants.`}
              >
                {category.name} articles and updates for {exam.name} aspirants.
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

export default BlogCategoryPage;

