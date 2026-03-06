export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const DISCUSSION_DIR = path.join(process.cwd(), "public", "discussion");
const MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * GET /api/discussion/serve-image?path=user/neet/filename.png
 * Serves discussion images from public/discussion/ so they load reliably in the editor
 * (avoids static file streaming issues that can cause broken images).
 */
export async function GET(request) {
  try {
    const pathParam = request.nextUrl.searchParams.get("path");
    if (!pathParam || typeof pathParam !== "string") {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }
    const normalized = pathParam.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
    if (normalized.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const fullPath = path.join(DISCUSSION_DIR, normalized);
    const resolved = path.resolve(fullPath);
    const baseResolved = path.resolve(DISCUSSION_DIR);
    if (!resolved.startsWith(baseResolved)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ext = path.extname(resolved).toLowerCase().replace(".", "") || "png";
    const mime = MIME[ext] || "application/octet-stream";
    const buffer = await readFile(resolved);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    if (err.code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Discussion serve-image error:", err);
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
  }
}
