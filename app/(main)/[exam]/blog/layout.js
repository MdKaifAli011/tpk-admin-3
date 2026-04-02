import { generateMetadata as generateSEO } from "@/utils/seo";
import { createSlug } from "@/utils/slug";
import { logger } from "@/utils/logger";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { exam: examSlug } = await params;

  try {
    // Try to fetch data, but don't fail if it doesn't work
    let exam = null;

    try {
      const { fetchExamById } = await import("../../lib/api");

      // Fetch exam first
      exam = await fetchExamById(examSlug).catch(() => null);
    } catch (fetchError) {
      // Silently fail - we'll use defaults
      logger.warn("Could not fetch data for metadata:", fetchError.message);
    }

    if (!exam) {
      return generateSEO({}, { type: "blog", name: "Blog" });
    }

    const examName = exam.name || "Exam";

    // Generate SEO data for blog list page
    const seoData = {
      title: `${examName} Blog - Latest Articles, Tips & News | Exam Preparation`,
      metaDescription: `Read the latest ${examName} blog articles, tips, and news. Get expert advice, study strategies, and insights to help you prepare for your ${examName} exam. Stay updated with the latest exam preparation resources.`,
      keywords: `${examName} blog, ${examName} articles, ${examName} tips, ${examName} news, ${examName} exam preparation, ${examName} study guide, exam blog, preparation tips, ${examName} updates`,
    };

    return generateSEO(seoData, {
      type: "blog",
      name: `${examName} Blog`,
      path: `/${createSlug(examName)}/blog`,
    });
  } catch (error) {
    // Always return valid metadata even on error
    logger.warn("Error generating metadata:", error.message);
    return generateSEO({}, { type: "blog", name: "Blog" });
  }
}

export default function BlogLayout({ children }) {
  return <>{children}</>;
}


