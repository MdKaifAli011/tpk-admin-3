import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import bundleAnalyzer from "@next/bundle-analyzer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/self-study",
  assetPrefix: "/self-study/",
  trailingSlash: false,

  outputFileTracingRoot: resolve(__dirname),

  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["react-icons", "framer-motion"],
    // App Router + proxy: default body buffer is 10MB; large multipart uploads need this or FormData() fails
    // @see https://nextjs.org/docs/app/api-reference/config/next-config-js/middlewareClientMaxBodySize
    proxyClientMaxBodySize: "210mb",
    // Server Actions (separate from Route Handler /api uploads)
    serverActions: {
      bodySizeLimit: "210mb",
    },
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000, // 1 year for immutable optimized images
    dangerouslyAllowSVG: true,
    // Serve appropriately sized images on mobile to reduce payload (Improve image delivery)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },

  productionBrowserSourceMaps: false,

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  async headers() {
    const basePath = "/self-study";
    return [
      // Long cache for static chunks and assets (reduces repeat-visit load, helps Lighthouse "efficient cache")
      {
        source: `${basePath}/_next/static/:path*`,
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Cache for LCP image and other public assets (fixes "Use efficient cache lifetimes")
      {
        source: `${basePath}/logo.png`,
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: `${basePath}/:path*`,
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // CSP: restrict resource origins (script/style may need 'unsafe-inline' for Next.js hydration)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
