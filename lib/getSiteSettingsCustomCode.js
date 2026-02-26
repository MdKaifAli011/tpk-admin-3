import connectDB from "@/lib/mongodb";
import SiteSettings from "@/models/SiteSettings";

const CUSTOM_CODE_KEY = "custom_code";

/**
 * Server-only. Returns header and footer custom code for server-rendered injection.
 * Use in root layout so custom code appears in view-source.
 */
export async function getSiteSettingsCustomCode() {
  try {
    await connectDB();
    const doc = await SiteSettings.findOne({ key: CUSTOM_CODE_KEY })
      .select("headerCode footerCode")
      .lean();
    return {
      headerCode: doc?.headerCode ?? "",
      footerCode: doc?.footerCode ?? "",
    };
  } catch {
    return { headerCode: "", footerCode: "" };
  }
}
