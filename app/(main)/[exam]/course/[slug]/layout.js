import { generateMetadata as generateSEO } from "@/utils/seo";
import { logger } from "@/utils/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}${basePath}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return `${appUrl.replace(/\/$/, "")}${basePath}`;
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}${basePath}`;
}

export async function generateMetadata({ params }) {
  const { exam: examSlug, slug } = await params;

  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/course/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return generateSEO({}, { name: "Course" });

    const json = await res.json();
    const course = json?.data;
    if (!course) return generateSEO({}, { name: "Course" });

    const title =
      (course.metaTitle && course.metaTitle.trim()) || course.title || "Course";
    const metaDescription =
      (course.metaDescription && course.metaDescription.trim()) || "";
    const keywords = (course.keywords && course.keywords.trim()) || "";

    const seoData = {
      title,
      metaDescription: metaDescription || undefined,
      keywords: keywords || undefined,
    };

    return generateSEO(seoData, {
      name: course.title || "Course",
      path: `/${examSlug}/course/${slug}`,
    });
  } catch (error) {
    logger.warn("Error generating course metadata:", error?.message);
    return generateSEO({}, { name: "Course" });
  }
}

export default function CourseSlugLayout({ children }) {
  return <>{children}</>;
}
