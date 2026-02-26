import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SiteSettings from "@/models/SiteSettings";
import { successResponse, handleApiError } from "@/utils/apiResponse";

const CUSTOM_CODE_KEY = "custom_code";

/**
 * GET - Public. Returns header and footer custom code for injection on the public site.
 * No auth required so the (main) layout injector can fetch this.
 */
export async function GET() {
  try {
    await connectDB();
    const doc = await SiteSettings.findOne({ key: CUSTOM_CODE_KEY })
      .select("headerCode footerCode")
      .lean();
    const headerCode = doc?.headerCode ?? "";
    const footerCode = doc?.footerCode ?? "";
    return successResponse({ headerCode, footerCode });
  } catch (error) {
    return handleApiError(error, "Failed to fetch custom code");
  }
}
