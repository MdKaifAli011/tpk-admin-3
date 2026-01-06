import { generateMetadata as generateSEO } from "@/utils/seo";
import { SEO_DEFAULTS } from "@/constants";
import MainLayoutClient from "./layout/MainLayoutClient";

// Export metadata for the main layout (homepage and general pages)
export const metadata = generateSEO(
  {
    title: "Free NEET Topic Wise Notes, Papers & Study Material",
    metaDescription:
      "NEET, JEE, SAT & AP (Advanced Placement) examination online preparation portal for NRI students worldwide. Practice at your own pace and get all study resources at one place. Your own dashboard for exam preparation.",
    keywords:
      "NEET Practice Papers Online, NEET Study Resources, NEET Topic Wise Notes, NEET eBooks, PYQ Solutions Downloads",
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
