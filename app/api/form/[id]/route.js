import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Form from "@/models/Form";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

// GET: Fetch a single form by formId (public for rendering, but can be protected)
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!id) {
      return errorResponse("Form ID is required", 400);
    }

    const form = await Form.findOne({ formId: id, status: "active" }).lean();

    if (!form) {
      return errorResponse("Form not found or inactive", 404);
    }

    return successResponse(form, "Form fetched successfully");
  } catch (error) {
    return handleApiError(error, "Failed to fetch form");
  }
}

// PUT: Update a form (admin only)
export async function PUT(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return errorResponse("Form ID is required", 400);
    }

    const form = await Form.findOne({ formId: id });

    if (!form) {
      return errorResponse("Form not found", 404);
    }

    // Update fields
    if (body.description !== undefined)
      form.description = body.description.trim();
    if (body.status) form.status = body.status;

    if (body.fields && Array.isArray(body.fields)) {
      // Validate fields
      for (const field of body.fields) {
        if (!field.type || !field.label || !field.name) {
          return errorResponse(
            "Each field must have type, label, and name",
            400
          );
        }
      }
      form.fields = body.fields.map((field, index) => ({
        ...field,
        order: field.order || index,
      }));
    }

    if (body.settings) {
      form.settings = {
        ...form.settings,
        ...body.settings,
        title: body.settings.title?.trim() || form.formId || form.settings.title,
        description:
          body.settings.description?.trim() || form.settings.description,
        buttonText:
          body.settings.buttonText?.trim() || form.settings.buttonText,
        successMessage:
          body.settings.successMessage?.trim() || form.settings.successMessage,
      };
    }

    await form.save();

    return successResponse(form, "Form updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update form");
  }
}

// DELETE: Delete a form (admin only)
export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!id) {
      return errorResponse("Form ID is required", 400);
    }

    const form = await Form.findOneAndDelete({ formId: id });

    if (!form) {
      return errorResponse("Form not found", 404);
    }

    return successResponse(null, "Form deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete form");
  }
}
