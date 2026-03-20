import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailTemplate from "@/models/EmailTemplate";
import { successResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { EMAIL_TEMPLATE_KEYS, EMAIL_TEMPLATE_META } from "@/lib/emailTemplateRegistry";

/**
 * GET - List all email templates (registry keys + DB overlay). Admin only.
 */
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const docs = await EmailTemplate.find({
      key: { $in: EMAIL_TEMPLATE_KEYS },
    })
      .lean()
      .then((list) => Object.fromEntries(list.map((d) => [d.key, d])));

    const list = EMAIL_TEMPLATE_KEYS.map((key) => {
      const meta = EMAIL_TEMPLATE_META[key] || {
        name: key,
        description: "",
        placeholders: [],
        order: 99,
      };
      const db = docs[key];
      return {
        key,
        name: meta.name,
        description: meta.description,
        placeholders: meta.placeholders || [],
        order: meta.order ?? 99,
        subject: db?.subject ?? "",
        bodyText: db?.bodyText ?? "",
        bodyHtml: db?.bodyHtml ?? "",
        isActive: db?.isActive ?? true,
        updatedAt: db?.updatedAt || null,
      };
    }).sort((a, b) => a.order - b.order);

    return successResponse(list, "OK");
  } catch (error) {
    return handleApiError(error, "Failed to fetch email templates");
  }
}
