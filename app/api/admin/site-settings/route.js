import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SiteSettings from "@/models/SiteSettings";
import { successResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

const CUSTOM_CODE_KEY = "custom_code";

/**
 * PATCH - Admin only. Update header and footer custom code.
 * Body: { headerCode?: string, footerCode?: string }
 */
export async function PATCH(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(
        { success: false, message: authCheck.message },
        { status: authCheck.status || 401 }
      );
    }

    await connectDB();
    const body = await request.json().catch(() => ({}));
    const headerCode =
      typeof body?.headerCode === "string" ? body.headerCode : "";
    const footerCode =
      typeof body?.footerCode === "string" ? body.footerCode : "";

    const doc = await SiteSettings.findOneAndUpdate(
      { key: CUSTOM_CODE_KEY },
      { $set: { headerCode, footerCode } },
      { new: true, upsert: true }
    )
      .select("headerCode footerCode")
      .lean();

    return successResponse(
      { headerCode: doc.headerCode ?? "", footerCode: doc.footerCode ?? "" },
      "Site settings updated successfully"
    );
  } catch (error) {
    return handleApiError(error, "Failed to update site settings");
  }
}
