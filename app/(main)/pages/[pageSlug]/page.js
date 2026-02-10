import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FaChevronLeft } from "react-icons/fa";
import connectDB from "@/lib/mongodb";
import Page from "@/models/Page";
import RichContent from "../../components/RichContent";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/**
 * Fetch site-level page by slug for public UI.
 * - exam must be null (site-level)
 * - deletedAt must be null
 * - active: show, index + follow | draft: show, noindex + nofollow
 */
async function getPageBySlug(slug) {
  if (!slug) return null;
  await connectDB();
  const page = await Page.findOne({
    slug,
    exam: null,
    deletedAt: null,
    status: { $in: ["active", "draft"] },
  }).lean();
  return page ? { ...page, _id: page._id?.toString() } : null;
}

export async function generateMetadata({ params }) {
  const { pageSlug } = await params;
  const page = await getPageBySlug(pageSlug);
  if (!page) {
    return { title: "Page Not Found" };
  }
  const isActive = page.status === "active";
  return {
    title: page.title || "Page",
    description: page.metaDescription || "",
    keywords: page.keywords || undefined,
    robots: isActive ? "index, follow" : "noindex, nofollow",
  };
}

export default async function DynamicPageRoute({ params }) {
  const { pageSlug } = await params;
  const page = await getPageBySlug(pageSlug);

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
