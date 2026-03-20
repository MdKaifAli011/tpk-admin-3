import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { ERROR_MESSAGES, STATUS } from "@/constants";
import { fetchAndBuildTree } from "@/lib/treeBuilder";

/**
 * GET /api/tree
 * Returns complete hierarchical tree structure
 * Query params:
 *   - status: "active" | "inactive" | "all" (default: "active")
 *   - examId: Optional - filter by specific exam
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilterParam = searchParams.get("status") || STATUS.ACTIVE;
    const examIdParam = searchParams.get("examId") || null;

    const { tree } = await fetchAndBuildTree(statusFilterParam, examIdParam);
    return successResponse(tree);
  } catch (error) {
    if (error.status === 400) {
      return errorResponse(error.message, 400);
    }
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}
