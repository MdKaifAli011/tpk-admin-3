import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";

const assetsBaseDir = path.join(process.cwd(), "public", "assets");

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
    };

    return new Response(fileBuffer, {
      headers: {
        "Content-Type":
          contentTypeMap[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error serving uploaded file:", err);
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    );
  }
}
