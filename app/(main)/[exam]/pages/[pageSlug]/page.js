import React from "react";
import { notFound } from "next/navigation";
import connectDB from "@/lib/mongodb";
import Page from "@/models/Page";
import Exam from "@/models/Exam";
import RichContent from "../../../components/RichContent";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

// Ensure metadata and content are always fresh (no static cache)
export const dynamic = "force-dynamic";

/**
 * Fetch exam-level page by exam slug and page slug for public UI.
 * - deletedAt must be null
 * - active: show, index + follow | draft: show, noindex + nofollow
 */
async function getExamPageBySlug(examSlug, pageSlug) {
  if (!examSlug || !pageSlug) return null;
  await connectDB();
  const exam = await Exam.findOne({ slug: examSlug }).select("_id").lean();
  if (!exam) return null;
  const page = await Page.findOne({
    slug: pageSlug,
    exam: exam._id,
    deletedAt: null,
    status: { $in: ["active", "draft"] },
  }).lean();
  return page ? { ...page, _id: page._id?.toString() } : null;
}

export async function generateMetadata({ params }) {
  const { exam: examSlug, pageSlug } = await params;
  const page = await getExamPageBySlug(examSlug, pageSlug);
  if (!page) {
    return { title: "Page Not Found" };
  }
  const isActive = page.status === "active";
  const title = (page.metaTitle && page.metaTitle.trim()) || page.title || "Page";
  const description = (page.metaDescription && page.metaDescription.trim()) || "";
  const keywords = page.keywords && page.keywords.trim()
    ? page.keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : undefined;
  return {
    title,
    description: description || undefined,
    keywords: keywords?.length ? keywords : undefined,
    robots: isActive ? "index, follow" : "noindex, nofollow",
  };
}

export default async function ExamDynamicPageRoute({ params }) {
  const { exam: examSlug, pageSlug } = await params;
  const page = await getExamPageBySlug(examSlug, pageSlug);

  if (!page) {
    notFound();
  }

  const title = page.title || "Untitled";
  const content = page.content || "";

  return (
    <div className="space-y-4">
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
    </div>
  );
}
