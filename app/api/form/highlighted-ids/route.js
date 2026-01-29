import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Form from "@/models/Form";
import { successResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

/** GET /api/form/highlighted-ids – returns form IDs marked as highlightInLeads (for lead table styling) */
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const docs = await Form.find({ highlightInLeads: true })
      .select("formId")
      .lean();
    const formIds = docs.map((d) => d.formId).filter(Boolean);

    return successResponse({ formIds }, "Highlighted form IDs fetched");
  } catch (error) {
    return handleApiError(error, "Failed to fetch highlighted form IDs");
  }
}
