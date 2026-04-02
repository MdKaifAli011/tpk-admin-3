import { generateMetadata as generateSEO } from "@/utils/seo";
import { createSlug } from "@/utils/slug";
import { logger } from "@/utils/logger";
import { SEO_DEFAULTS, APP_CONFIG } from "@/constants";
import { BLOG_PUBLIC_AUTHOR_LABEL } from "@/constants/blogPublic";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { exam: examSlug, slug } = await params;

  try {
    // Try to fetch data, but don't fail if it doesn't work
    let exam = null;
    let blog = null;
    let blogDetails = null;

    try {
      const {
        fetchExamById,
        fetchBlogBySlug,
        fetchBlogDetails,
      } = await import("../../../lib/api");

      // Fetch exam first
      exam = await fetchExamById(examSlug).catch(() => null);

      // Fetch blog by slug
      if (exam) {
        blog = await fetchBlogBySlug(slug).catch(() => null);

        // Fetch blog details separately
        if (blog?._id) {
          blogDetails = await fetchBlogDetails(blog._id).catch(() => null);
        }
      }
    } catch (fetchError) {
      // Silently fail - we'll use defaults
      logger.warn("Could not fetch data for metadata:", fetchError.message);
    }

    if (!blog || !exam) {
      return generateSEO({}, { type: "article", name: "Blog Post" });
    }

    const examName = exam.name || "Exam";
    const examSlugPath = createSlug(examName);

    // Use SEO fields from Details: title, metaDescription, keywords
    // Prioritize admin-provided meta data over auto-generated
    const adminTitle = blogDetails?.title?.trim();
    const adminMetaDescription = blogDetails?.metaDescription?.trim();
    const adminKeywords = blogDetails?.keywords?.trim();

    // Build title - prioritize admin title, fallback to blog name
    const title =
      adminTitle && adminTitle.length > 0
        ? adminTitle
        : blog.name && examName
        ? `${blog.name} - ${examName} Blog | Exam Preparation`
        : `${blog.name || "Blog Post"} - ${examName} Blog`;

    // Build description - prioritize admin description, fallback to generated
    const metaDescription =
      adminMetaDescription && adminMetaDescription.length > 0
        ? adminMetaDescription
        : blog.name && examName
        ? `Read ${blog.name} on ${examName} blog. Get insights, tips, and expert advice for ${examName} exam preparation. Learn from expert guidance and improve your exam performance.`
        : `Read ${blog.name || "this article"} for exam preparation tips and insights.`;

    // Build keywords - prioritize admin keywords, fallback to generated
    let keywords = "";
    if (adminKeywords && adminKeywords.length > 0) {
      keywords = adminKeywords;
    } else {
      const categoryName = blog.categoryId?.name || blog.category || "exam tips";
      const baseKeywords = [
        blog.name,
        examName,
        `${examName} blog`,
        categoryName,
        "exam preparation",
        "study guide",
      ];
      baseKeywords.push(BLOG_PUBLIC_AUTHOR_LABEL);
      keywords = baseKeywords.filter(Boolean).join(", ");
    }

    // Build image URL for Open Graph
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
    let ogImage = `${APP_CONFIG.url}${basePath}${SEO_DEFAULTS.OG_IMAGE}`;
    if (blog.image) {
      if (blog.image.startsWith("http://") || blog.image.startsWith("https://")) {
        ogImage = blog.image;
      } else {
        const cleanPath = blog.image.startsWith("/") ? blog.image : `/${blog.image}`;
        ogImage = `${APP_CONFIG.url}${basePath}${cleanPath}`;
      }
    }

    const seoData = {
      title,
      metaDescription,
      keywords,
    };

    const metadata = generateSEO(seoData, {
      type: "article",
      name: blog.name,
      path: `/${examSlugPath}/blog/${slug}`,
    });

    // Override Open Graph image if blog has an image
    if (blog.image) {
      metadata.openGraph.images = [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ];
      metadata.twitter.images = [ogImage];
    }

    // Add article-specific metadata
    metadata.openGraph.type = "article";
    if (blog.status === "draft") {
      metadata.robots = {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      };
    }
    metadata.openGraph.authors = [BLOG_PUBLIC_AUTHOR_LABEL];
    if (blog.createdAt) {
      metadata.openGraph.publishedTime = new Date(blog.createdAt).toISOString();
    }
    if (blog.updatedAt) {
      metadata.openGraph.modifiedTime = new Date(blog.updatedAt).toISOString();
    }
    const categoryName = blog.categoryId?.name || blog.category;
    if (categoryName) {
      metadata.openGraph.section = categoryName;
    }

    // Log metadata generation (only in development)
    if (process.env.NODE_ENV === "development") {
      logger.info(`Generating metadata for blog ${blog._id}:`, {
        adminTitle: adminTitle,
        adminTitleLength: adminTitle?.length || 0,
        finalTitle: seoData.title,
        finalDescription: seoData.metaDescription?.substring(0, 50) + "...",
        finalKeywords: seoData.keywords,
        usingAdminTitle: adminTitle && adminTitle.length > 0,
        usingAdminMetaDescription:
          adminMetaDescription && adminMetaDescription.length > 0,
        usingAdminKeywords: adminKeywords && adminKeywords.length > 0,
      });
    }

    return metadata;
  } catch (error) {
    // Always return valid metadata even on error
    logger.warn("Error generating metadata:", error.message);
    return generateSEO({}, { type: "article", name: "Blog Post" });
  }
}

export default function BlogDetailLayout({ children }) {
  return <>{children}</>;
}

