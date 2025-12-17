import { generateMetadata as generateSEO } from "@/utils/seo";
import { SEO_DEFAULTS } from "@/constants";
import MainLayoutClient from "./layout/MainLayoutClient";

// Export metadata for the main layout (homepage and general pages)
export const metadata = generateSEO(
  {
    title: "TestPrepKart - Entrance Exam Preparation for NRI Students Worldwide",
    metaDescription:
      "Prepare for JEE, NEET, SAT, and IB exams with comprehensive study materials, practice tests, and expert guidance. Highest NRI selections from USA & Middle East. Get free exam preparation resources and track your progress.",
    keywords:
      "JEE preparation, NEET preparation, SAT preparation, IB preparation, NRI students, exam preparation, study materials, practice tests, online coaching, entrance exam",
  },
  {
    type: "homepage",
    name: "TestPrepKart",
    path: "/",
  }
);

export default function MainLayout({ children }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
  return (
    <>
      {/* Preload critical resources for better FCP and LCP */}
      <link
        rel="preload"
        href={`${basePath}/logo.png`}
        as="image"
        type="image/png"
        fetchPriority="high"
      />
      <MainLayoutClient>{children}</MainLayoutClient>
    </>
  );
}
