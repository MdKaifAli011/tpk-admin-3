import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Serves app/(main)/commanStyle.css for CKEditor contentsCss (iframe needs a URL).
 * Same file is imported in RichContent.jsx for the public content area.
 */
export async function GET() {
  try {
    const filePath = join(process.cwd(), "app", "(main)", "commanStyle.css");
    const css = await readFile(filePath, "utf8");
    return new NextResponse(css, {
      status: 200,
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("/* Failed to load richtext common styles */\n", {
      status: 500,
      headers: { "Content-Type": "text/css; charset=utf-8" },
    });
  }
}
