import { headers } from "next/headers";

const TEST_DOMAIN = "app.testprepkart.in";

export default async function robots() {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  if (host === TEST_DOMAIN) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/self-study/",
        disallow: ["/self-study/admin/", "/self-study/api/"],
      },
    ],
    sitemap: "https://testprepkart.com/self-study/sitemap.xml",
  };
}
