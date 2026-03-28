import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { sendMail } from "@/lib/mailer";
import { getEmailTemplateContent } from "@/lib/getEmailTemplateContent";
import { isSpamOrFakePhone } from "@/lib/phoneSpamCheck";
import {
  parseUsTimezoneFromBody,
  parseTimezoneTellUsFromBody,
} from "@/constants/usTimezone";

function parsePreferredDateFromBody(raw) {
  if (raw === undefined) return { ok: true, skip: true };
  if (raw === null || raw === "") return { ok: true, value: null };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, message: "preferredDate must be a valid date" };
  }
  return { ok: true, value: d };
}

export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);

    const { page, limit, skip } = parsePagination(searchParams);
    const countryFilter = searchParams.get("country");
    const classNameFilter = searchParams.get("className");
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const usTimezoneFilter = searchParams.get("usTimezone");
    const preferredDateFrom = searchParams.get("preferredDateFrom");
    const preferredDateTo = searchParams.get("preferredDateTo");

    const query = {};

    if (usTimezoneFilter && usTimezoneFilter !== "all") {
      const parsedTz = parseUsTimezoneFromBody(usTimezoneFilter);
      if (parsedTz.ok && !parsedTz.skip && parsedTz.value) {
        query.usTimezone = parsedTz.value;
      }
    }

    if (countryFilter) {
      query.country = { $regex: countryFilter, $options: "i" };
    }

    if (classNameFilter) {
      query.className = { $regex: classNameFilter, $options: "i" };
    }

    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter.toLowerCase();
    }

    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { phoneNumber: { $regex: searchQuery, $options: "i" } },
        { usTimezone: { $regex: searchQuery, $options: "i" } },
        { timezoneTellUs: { $regex: searchQuery, $options: "i" } },
      ];
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    if (preferredDateFrom || preferredDateTo) {
      query.preferredDate = {};
      if (preferredDateFrom) {
        query.preferredDate.$gte = new Date(preferredDateFrom);
      }
      if (preferredDateTo) {
        const endPd = new Date(preferredDateTo);
        endPd.setHours(23, 59, 59, 999);
        query.preferredDate.$lte = endPd;
      }
    }

    const total = await Lead.countDocuments(query);
    
    // Sort leads to show updated leads at the top:
    // 1. Sort by updatedAt descending first (leads with updatedAt appear at top, nulls go to end)
    // 2. Then sort by createdAt descending (for leads without updatedAt, sort by creation time)
    // This ensures:
    // - Leads with updates appear first, sorted by their latest update time (newest first)
    // - Leads without updates appear below, sorted by creation time (newest first)
    const leads = await Lead.find(query)
      .sort({ 
        updatedAt: -1,  // Updated leads first (sorted by updatedAt), nulls go to end
        createdAt: -1   // Then by createdAt for all leads
      })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      createPaginationResponse(leads, total, page, limit)
    );
  } catch (error) {
    return handleApiError(error, "Failed to fetch leads");
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.name?.trim()) {
      return errorResponse("Name is required", 400);
    }

    if (!body.email?.trim()) {
      return errorResponse("Email is required", 400);
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(body.email)) {
      return errorResponse("Please provide a valid email address", 400);
    }

    if (!body.country?.trim()) {
      return errorResponse("Country is required", 400);
    }

    if (!body.className?.trim()) {
      return errorResponse("Class name is required", 400);
    }

    if (!body.phoneNumber?.trim()) {
      return errorResponse("Phone number is required", 400);
    }

    if (isSpamOrFakePhone(body.phoneNumber.trim())) {
      return errorResponse("Please enter a valid phone number", 400);
    }

    const tzParsed = parseUsTimezoneFromBody(body.usTimezone);
    if (!tzParsed.ok) return errorResponse(tzParsed.message, 400);
    const tellParsed = parseTimezoneTellUsFromBody(body.timezoneTellUs);
    if (!tellParsed.ok) return errorResponse(tellParsed.message, 400);

    const preferredParsed = parsePreferredDateFromBody(body.preferredDate);
    if (!preferredParsed.ok) return errorResponse(preferredParsed.message, 400);

    const email = body.email.toLowerCase().trim();
    const existingLead = await Lead.findOne({ email });

    let lead;
    let message;
    let isUpdated = false;
    let previousStatus = null;

    if (existingLead) {
      previousStatus = existingLead.status;
      const newUpdateCount = (existingLead.updateCount || 0) + 1;

      // Update the existing lead document directly - this ensures timestamps are updated correctly
      existingLead.name = body.name.trim();
      existingLead.country = body.country.trim();
      existingLead.className = body.className.trim();
      existingLead.phoneNumber = body.phoneNumber.trim();
      existingLead.status = "updated";
      existingLead.updateCount = newUpdateCount;
      // Mongoose will automatically update updatedAt when we call save()

      // Add new fields if provided - always update source to track latest submission location
      if (body.form_name !== undefined) existingLead.form_name = body.form_name?.trim() || "";
      if (body.form_id !== undefined) existingLead.form_id = body.form_id?.trim() || "";
      if (body.source !== undefined) existingLead.source = body.source?.trim() || ""; // Update source with latest URL
      if (body.prepared !== undefined) existingLead.prepared = body.prepared?.trim() || "";
      if (!tzParsed.skip) {
        existingLead.usTimezone = tzParsed.value;
      }
      if (!tellParsed.skip) {
        existingLead.timezoneTellUs = tellParsed.value;
      }
      if (!preferredParsed.skip) {
        existingLead.preferredDate = preferredParsed.value;
      }

      // Save the document - Mongoose will automatically update updatedAt timestamp when timestamps: true
      lead = await existingLead.save();

      message = `Lead updated successfully. This is update #${newUpdateCount}.`;
      isUpdated = true;
    } else {
      const createData = {
        name: body.name.trim(),
        email,
        country: body.country.trim(),
        className: body.className.trim(),
        phoneNumber: body.phoneNumber.trim(),
        status: "new",
        updateCount: 0,
      };

      // Add new fields if provided - always include form_id and form_name if sent
      if (body.form_name !== undefined) createData.form_name = body.form_name?.trim() || "";
      if (body.form_id !== undefined) createData.form_id = body.form_id?.trim() || "";
      if (body.source !== undefined) createData.source = body.source?.trim() || "";
      if (body.prepared !== undefined) createData.prepared = body.prepared?.trim() || "";
      if (!tzParsed.skip) {
        createData.usTimezone = tzParsed.value;
      }
      if (!tellParsed.skip) {
        createData.timezoneTellUs = tellParsed.value;
      }
      if (!preferredParsed.skip) {
        createData.preferredDate = preferredParsed.value;
      }

      lead = await Lead.create(createData);
      message = "Lead submitted successfully";
    }

    const responseData = {
      ...lead.toObject(),
      isUpdated,
      previousStatus: previousStatus || null,
    };

    // Auto-reply to lead (fire-and-forget)
    const formLabel = body.form_name || body.form_id || "";
    getEmailTemplateContent("lead_auto_reply", { form_name: formLabel }).then(
      ({ subject, text, html }) =>
        sendMail({ to: email, subject, text, html }).catch((err) =>
          console.error("Lead auto-reply email error:", err)
        )
    );

    return successResponse(responseData, message, isUpdated ? 200 : 201);
  } catch (error) {
    return handleApiError(error, "Failed to submit lead");
  }
}
