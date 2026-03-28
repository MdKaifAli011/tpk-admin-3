import { NextResponse } from "next/server";
import { stat } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "app", "(main)", "commanStyle.css");
    const fileStats = await stat(filePath);
    const version = String(Math.floor(fileStats.mtimeMs));
    return NextResponse.json(
      { success: true, data: { version } },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to get CSS version" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
