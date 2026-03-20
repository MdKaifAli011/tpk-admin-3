import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";

const assetsBaseDir = path.join(process.cwd(), "public", "assets");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

// Served paths: (1) api/upload/image → assets/{exam}/{subject}/.../file.png
// (2) api/media with folder "editor" → assets/media/editor/name_timestamp.png
// If a file is missing (ENOENT), it may have been deleted or content was copied from elsewhere.

function fileNotFoundHtml() {
  const homeUrl = basePath.startsWith("http") ? basePath : `${basePath}/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>File not found</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: linear-gradient(135deg, #f4f7fe 0%, #e8efff 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      color: #1e293b;
    }
    .card {
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(0,82,204,0.08);
      border: 1px solid #e2e8f0;
      padding: 2.5rem;
      max-width: 420px;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.25rem;
      background: #fef2f2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: #dc2626;
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.35rem;
      font-weight: 600;
      color: #0f172a;
    }
    p {
      margin: 0 0 1.5rem;
      font-size: 0.9375rem;
      color: #64748b;
      line-height: 1.5;
    }
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem 1.25rem;
      font-size: 0.9375rem;
      font-weight: 500;
      color: #fff;
      background: #0052CC;
      border-radius: 0.5rem;
      text-decoration: none;
      transition: background 0.2s;
    }
    a:hover { background: #0044AA; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon" aria-hidden="true">&#128196;</div>
    <h1>File not found</h1>
    <p>This file is no longer available. It may have been moved or deleted.</p>
    <a href="${homeUrl}">Go to Home</a>
  </div>
</body>
</html>`;
}

export async function GET(request, { params }) {
  try {
    // ✅ MUST await params
    const { slug } = await params;

    // Ensure slug is array
    const safeParts = Array.isArray(slug) ? slug.map(String) : [String(slug)];
    const filePath = path.join(assetsBaseDir, ...safeParts);

    // Check file existence
    await fs.access(filePath);

    const fileBuffer = await fs.readFile(filePath);

    // Detect content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogg": "video/ogg",
      ".mov": "video/quicktime",
    };

    return new Response(fileBuffer, {
      headers: {
        "Content-Type":
          contentTypeMap[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const isNotFound = err?.code === "ENOENT" || err?.errno === -4058;
    if (isNotFound) {
      console.warn("Uploaded file not found (may have been deleted or moved):", filePath);
    } else {
      console.error("Error serving uploaded file:", err);
    }
    const accept = request.headers.get("accept") || "";
    const wantsJson = accept.includes("application/json");
    if (wantsJson) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    return new NextResponse(fileNotFoundHtml(), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
