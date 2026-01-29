import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Form from "@/models/Form";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

// GET: Fetch all forms (admin only)
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const forms = await Form.find(query).sort({ createdAt: -1 }).lean();

    return successResponse(forms, "Forms fetched successfully");
  } catch (error) {
    return handleApiError(error, "Failed to fetch forms");
  }
}

// POST: Create a new form (admin only)
export async function POST(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const body = await request.json();

    // Validation
    if (!body.formId?.trim()) {
      return errorResponse("Form ID is required", 400);
    }

    if (
      !body.fields ||
      !Array.isArray(body.fields) ||
      body.fields.length === 0
    ) {
      return errorResponse("At least one field is required", 400);
    }

    // Check if formId already exists
    const existingForm = await Form.findOne({
      formId: body.formId.trim().toLowerCase(),
    });
    if (existingForm) {
      return errorResponse("Form ID already exists", 400);
    }

    // Validate fields
    for (const field of body.fields) {
      if (!field.type || !field.label || !field.name) {
        return errorResponse("Each field must have type, label, and name", 400);
      }
    }

    const form = await Form.create({
      formId: body.formId.trim().toLowerCase(),
      formName: body.formId.trim().toLowerCase(), // Use formId as formName for backward compatibility
      description: body.description?.trim() || "",
      fields: body.fields.map((field, index) => ({
        ...field,
        order: field.order || index,
      })),
      settings: {
        title: body.settings?.title?.trim() || body.formId.trim().toLowerCase(),
        description: body.settings?.description?.trim() || "",
        imageUrl: body.settings?.imageUrl?.trim() || "",
        buttonText: body.settings?.buttonText?.trim() || "Submit",
        buttonColor: body.settings?.buttonColor || "#2563eb",
        redirectLink: body.settings?.redirectLink?.trim() || "",
        successMessage:
          body.settings?.successMessage?.trim() ||
          "Thank you! Your request has been submitted successfully.",
        modal: body.settings?.modal !== undefined ? body.settings.modal : true,
        showVerification:
          body.settings?.showVerification !== undefined
            ? body.settings.showVerification
            : true,
      },
      status: body.status || "active",
      highlightInLeads: body.highlightInLeads === true,
      submissionCount: 0,
    });

    return successResponse(form, "Form created successfully", 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse("Form ID already exists", 400);
    }
    return handleApiError(error, "Failed to create form");
  }
}
