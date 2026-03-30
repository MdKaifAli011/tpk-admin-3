import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";

/**
 * Serves public/commanStyle.css for CKEditor contentsCss (iframe needs a URL).
 * Same file backs rich content styling on the frontend (via this route + cache headers).
 */
export async function GET(request) {
  try {
    const filePath = join(process.cwd(), "public", "commanStyle.css");
    const fileStats = await stat(filePath);
    const css = await readFile(filePath, "utf8");
    const version = String(Math.floor(fileStats.mtimeMs));
    const etag = `W/"richtext-common-css-${version}"`;
    const { searchParams } = new URL(request.url);
    const requestedVersion = searchParams.get("v");
    const isVersionPinned = requestedVersion && requestedVersion === version;
    const cacheControl = isVersionPinned
      ? "public, max-age=31536000, immutable"
      : "public, max-age=60, stale-while-revalidate=86400";

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": cacheControl,
          "X-Richtext-Css-Version": version,
        },
      });
    }

    return new NextResponse(css, {
      status: 200,
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": cacheControl,
        ETag: etag,
        "Last-Modified": fileStats.mtime.toUTCString(),
        "X-Richtext-Css-Version": version,
      },
    });
  } catch {
    return new NextResponse("/* Failed to load richtext common styles */\n", {
      status: 500,
      headers: { "Content-Type": "text/css; charset=utf-8" },
    });
  }
}
