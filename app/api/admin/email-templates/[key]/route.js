import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailTemplate from "@/models/EmailTemplate";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { EMAIL_TEMPLATE_KEYS, EMAIL_TEMPLATE_META } from "@/lib/emailTemplateRegistry";
import { getDefaultContent, getDefaultTemplateSampleVars } from "@/lib/getEmailTemplateContent";

/**
 * GET - Single template by key. Admin only.
 * Query: ?default=1 - return built-in default content (subject, bodyText, bodyHtml) with sample vars.
 */
export async function GET(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const { key } = await params;
    if (!key || !EMAIL_TEMPLATE_KEYS.includes(key)) {
      return errorResponse("Invalid template key", 400);
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get("default") === "1") {
      const sampleVars = getDefaultTemplateSampleVars(key);
      const { subject, text, html } = getDefaultContent(key, sampleVars);
      return successResponse(
        { subject, bodyText: text, bodyHtml: html },
        "Default template preview"
      );
    }

    await connectDB();
    const meta = EMAIL_TEMPLATE_META[key] || {
      name: key,
      description: "",
      placeholders: [],
      order: 99,
    };
    const doc = await EmailTemplate.findOne({ key }).lean();
    const data = {
      key,
      name: meta.name,
      description: meta.description,
      placeholders: meta.placeholders || [],
      subject: doc?.subject ?? "",
      bodyText: doc?.bodyText ?? "",
      bodyHtml: doc?.bodyHtml ?? "",
      isActive: doc?.isActive ?? true,
      updatedAt: doc?.updatedAt || null,
    };
    return successResponse(data, "OK");
  } catch (error) {
    return handleApiError(error, "Failed to fetch template");
  }
}

/**
 * PATCH - Update template by key. Admin only. Creates doc if not exists.
 */
export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const { key } = await params;
    if (!key || !EMAIL_TEMPLATE_KEYS.includes(key)) {
      return errorResponse("Invalid template key", 400);
    }

    const body = await request.json();
    const meta = EMAIL_TEMPLATE_META[key] || {
      name: key,
      description: "",
      placeholders: [],
      order: 99,
    };

    await connectDB();
    let doc = await EmailTemplate.findOne({ key });
    if (!doc) {
      doc = new EmailTemplate({
        key,
        name: meta.name,
        description: meta.description,
        placeholders: meta.placeholders || [],
        subject: "",
        bodyText: "",
        bodyHtml: "",
        isActive: true,
        order: meta.order ?? 99,
      });
    }

    if (body.subject !== undefined) doc.subject = String(body.subject).trim();
    if (body.bodyText !== undefined) doc.bodyText = String(body.bodyText);
    if (body.bodyHtml !== undefined) doc.bodyHtml = String(body.bodyHtml);
    if (body.isActive !== undefined) doc.isActive = Boolean(body.isActive);

    await doc.save();
    return successResponse(
      {
        key: doc.key,
        subject: doc.subject,
        bodyText: doc.bodyText,
        bodyHtml: doc.bodyHtml,
        isActive: doc.isActive,
        updatedAt: doc.updatedAt,
      },
      "Template saved"
    );
  } catch (error) {
    return handleApiError(error, "Failed to save template");
  }
}
