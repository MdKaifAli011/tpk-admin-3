import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { requireRole } from "@/middleware/authMiddleware";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";

const cssFilePath = join(process.cwd(), "app", "(main)", "commanStyle.css");

export async function GET(request) {
  try {
    const authCheck = await requireRole(request, ["admin"]);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const css = await readFile(cssFilePath, "utf8");
    return successResponse({ css }, "Common CSS fetched");
  } catch (error) {
    return handleApiError(error, "Failed to read common CSS");
  }
}

export async function PUT(request) {
  try {
    const authCheck = await requireRole(request, ["admin"]);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const body = await request.json();
    const css = typeof body?.css === "string" ? body.css : "";
    if (!css.trim()) {
      return errorResponse("CSS content cannot be empty", 400);
    }

    await writeFile(cssFilePath, css, "utf8");
    return successResponse({ saved: true }, "Common CSS updated");
  } catch (error) {
    return handleApiError(error, "Failed to update common CSS");
  }
}
