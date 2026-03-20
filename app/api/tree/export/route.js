import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/authMiddleware";
import { fetchAndBuildTree } from "@/lib/treeBuilder";
import { STATUS } from "@/constants";

/**
 * GET /api/tree/export
 * Returns the full hierarchy tree as a downloadable JSON file.
 * Same data as GET /api/tree with Content-Disposition: attachment.
 * Auth: requireAuth (admin only).
 * Query params:
 *   - status: "active" | "inactive" | "all" (default: "active")
 *   - examId: Optional - filter by specific exam
 */
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const examIdParam = searchParams.get("examId") || null;

    const { tree, filters } = await fetchAndBuildTree(statusFilterParam, examIdParam);

    const payload = {
      tree,
      exportedAt: new Date().toISOString(),
      filters,
    };

    const filename = `tree-export-${new Date().toISOString().split("T")[0]}.json`;
    const jsonString = JSON.stringify(payload, null, 2);

    return new NextResponse(jsonString, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error.status === 400) {
      return NextResponse.json(
        { success: false, message: error.message || "Invalid request" },
        { status: 400 }
      );
    }
    console.error("Tree export error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Tree export failed" },
      { status: 500 }
    );
  }
}
