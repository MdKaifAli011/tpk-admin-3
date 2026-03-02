import React from "react";
import {
  fetchBlogsByAssignment,
  fetchBlogDetails,
  createSlug,
} from "@/app/(main)/lib/api";
import AssignedBlogsSectionClient from "./AssignedBlogsSectionClient";

/**
 * Fetches blogs assigned to the current hierarchy level and renders up to 3 cards
 * plus a "View all" link to the exam blog page. Renders nothing if no assigned blogs.
 * Place before Overview Comment Section on exam/subject/unit/chapter/topic/subtopic/definition pages.
 */
const AssignedBlogsSection = async (props) => {
  const {
    examSlug,
    examId,
    assignmentLevel,
    assignmentSubjectId,
    assignmentUnitId,
    assignmentChapterId,
    assignmentTopicId,
    assignmentSubTopicId,
    assignmentDefinitionId,
  } = props;

  if (!examSlug || !examId || !assignmentLevel) {
    return null;
  }

  const blogs = await fetchBlogsByAssignment({
    examId,
    assignmentLevel,
    assignmentSubjectId: assignmentSubjectId || undefined,
    assignmentUnitId: assignmentUnitId || undefined,
    assignmentChapterId: assignmentChapterId || undefined,
    assignmentTopicId: assignmentTopicId || undefined,
    assignmentSubTopicId: assignmentSubTopicId || undefined,
    assignmentDefinitionId: assignmentDefinitionId || undefined,
    limit: 3,
  });

  if (!blogs || blogs.length === 0) {
    return null;
  }

  const blogsWithDetails = await Promise.all(
    blogs.map(async (blog) => {
      try {
        const details = await fetchBlogDetails(blog._id, { excludeContent: true });
        return { ...blog, details };
      } catch {
        return { ...blog, details: null };
      }
    })
  );

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
      excerpt,
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
    <section
      className="rounded-xl p-4 sm:p-5 bg-white border border-gray-200 shadow-sm"
      aria-labelledby="assigned-blogs-heading"
    >
      <h2
        id="assigned-blogs-heading"
        className="text-lg font-bold text-gray-900 mb-4"
      >
        Related articles
      </h2>
      <AssignedBlogsSectionClient posts={posts} examSlug={examSlug} />
    </section>
  );
};

export default AssignedBlogsSection;
