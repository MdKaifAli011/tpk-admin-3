import "./globals.css";
import { SEO_DEFAULTS } from "@/constants";
import { getSiteSettingsCustomCode } from "@/lib/getSiteSettingsCustomCode";
import { headers } from "next/headers";

const TEST_DOMAIN = "app.testprepkart.in";

const baseMetadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: SEO_DEFAULTS.TITLE,
  description: SEO_DEFAULTS.DESCRIPTION,
  keywords: SEO_DEFAULTS.KEYWORDS.join(", "),
  icons: {
    icon: [
      {
        url: SEO_DEFAULTS.FAVICON,
        type: "image/png",
      },
      {
        url: SEO_DEFAULTS.FAVICON,
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: SEO_DEFAULTS.FAVICON,
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: SEO_DEFAULTS.FAVICON,
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: SEO_DEFAULTS.FAVICON,
  },
  openGraph: {
    title: SEO_DEFAULTS.TITLE,
    description: SEO_DEFAULTS.DESCRIPTION,
    type: "website",
    images: [
      {
        url: SEO_DEFAULTS.OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SEO_DEFAULTS.TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_DEFAULTS.TITLE,
    description: SEO_DEFAULTS.DESCRIPTION,
  },
};

export async function generateMetadata() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  return {
    ...baseMetadata,
    ...(host === TEST_DOMAIN && { robots: { index: false, follow: false } }),
  };
}

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isAdmin =
    pathname.startsWith("/self-study/admin") || pathname.startsWith("/admin");
  const { headerCode, footerCode } = isAdmin
    ? { headerCode: "", footerCode: "" }
    : await getSiteSettingsCustomCode();

  return (
    <html lang="en">
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        {headerCode?.trim() ? (
          <div
            data-custom-code-injected="server"
            dangerouslySetInnerHTML={{ __html: headerCode }}
            style={{ display: "none" }}
            suppressHydrationWarning
            aria-hidden
          />
        ) : null}
        {children}
        {footerCode?.trim() ? (
          <div
            data-custom-code-injected="server"
            dangerouslySetInnerHTML={{ __html: footerCode }}
            style={{ display: "none" }}
            suppressHydrationWarning
            aria-hidden
          />
        ) : null}
      </body>
    </html>
  );
}
