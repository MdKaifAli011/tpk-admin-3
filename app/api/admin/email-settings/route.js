import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailSettings from "@/models/EmailSettings";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { clearEmailSettingsCache } from "@/lib/getEmailSettings";
import { sendMail } from "@/lib/mailer";

const DEFAULT_KEY = "default";

function maskPassword(val) {
  if (!val || typeof val !== "string") return "";
  if (val.length <= 4) return "****";
  return val.slice(0, 2) + "****" + val.slice(-2);
}

/**
 * GET - Admin only. Returns email settings (password masked).
 */
export async function GET() {
  try {
    const authCheck = await requireAuth();
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const doc = await EmailSettings.findOne({ key: DEFAULT_KEY }).lean();
    const defaults = {
      mailMailer: "smtp",
      mailHost: "",
      mailPort: 465,
      mailUsername: "",
      mailPassword: "",
      mailEncryption: "ssl",
      mailFromAddress: "",
      mailFromName: "TestPrepKart",
      leadExportMailTo: "",
    };
    if (!doc) {
      return successResponse(
        { ...defaults, mailPasswordMasked: "" },
        "OK"
      );
    }
    const data = {
      mailMailer: doc.mailMailer ?? defaults.mailMailer,
      mailHost: doc.mailHost ?? defaults.mailHost,
      mailPort: doc.mailPort ?? defaults.mailPort,
      mailUsername: doc.mailUsername ?? defaults.mailUsername,
      mailEncryption: doc.mailEncryption ?? defaults.mailEncryption,
      mailFromAddress: doc.mailFromAddress ?? defaults.mailFromAddress,
      mailFromName: doc.mailFromName ?? defaults.mailFromName,
      leadExportMailTo: doc.leadExportMailTo ?? defaults.leadExportMailTo,
      mailPasswordMasked: maskPassword(doc.mailPassword),
    };
    return successResponse(data, "OK");
  } catch (error) {
    return handleApiError(error, "Failed to load email settings");
  }
}

/**
 * PATCH - Admin only. Update email settings. Omit password to keep existing.
 * Body: { mailHost?, mailPort?, mailUsername?, mailPassword?, mailEncryption?, mailFromAddress?, mailFromName?, leadExportMailTo? }
 */
export async function PATCH(request) {
  try {
    const authCheck = await requireAuth();
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const body = await request.json();
    const update = {};

    const stringFields = [
      "mailMailer", "mailHost", "mailUsername", "mailEncryption",
      "mailFromAddress", "mailFromName", "leadExportMailTo",
    ];
    stringFields.forEach((f) => {
      if (body[f] !== undefined) update[f] = String(body[f]).trim();
    });
    if (body.mailPassword !== undefined && body.mailPassword !== "") {
      update.mailPassword = String(body.mailPassword);
    }
    if (body.mailPort !== undefined) {
      const n = parseInt(body.mailPort, 10);
      if (!Number.isNaN(n)) update.mailPort = n;
    }

    const doc = await EmailSettings.findOneAndUpdate(
      { key: DEFAULT_KEY },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    clearEmailSettingsCache();

    const data = {
      mailMailer: doc.mailMailer,
      mailHost: doc.mailHost,
      mailPort: doc.mailPort,
      mailUsername: doc.mailUsername,
      mailEncryption: doc.mailEncryption,
      mailFromAddress: doc.mailFromAddress,
      mailFromName: doc.mailFromName,
      leadExportMailTo: doc.leadExportMailTo ?? "",
      mailPasswordMasked: maskPassword(doc.mailPassword),
    };
    return successResponse(data, "Email settings saved successfully");
  } catch (error) {
    return handleApiError(error, "Failed to save email settings");
  }
}

/**
 * POST - Admin only. Send a test email to the given address (or from address).
 * Body: { to?: string }
 */
export async function POST(request) {
  try {
    const authCheck = await requireAuth();
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const body = await request.json().catch(() => ({}));
    const to = (body.to && String(body.to).trim()) || null;

    const subject = "TestPrepKart – Test email";
    const text = "This is a test email from your TestPrepKart admin email settings.";
    const html = "<p>This is a test email from your <strong>TestPrepKart</strong> admin email settings.</p>";

    const { getEmailSettings } = await import("@/lib/getEmailSettings");
    const settings = await getEmailSettings();
    const recipient = to || settings.mailFromAddress || settings.mailUsername;
    if (!recipient) {
      return errorResponse("No recipient. Set From address in settings or pass 'to' in body.", 400);
    }

    const result = await sendMail({
      to: recipient,
      subject,
      text,
      html,
    });

    if (!result.success) {
      return errorResponse(result.error || "Failed to send test email", 500);
    }
    return successResponse(
      { messageId: result.messageId, to: recipient },
      "Test email sent successfully"
    );
  } catch (error) {
    return handleApiError(error, "Failed to send test email");
  }
}
