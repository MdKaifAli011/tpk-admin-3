import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/authMiddleware";
import { getEmailSettings } from "@/lib/getEmailSettings";
import { sendMail } from "@/lib/mailer";
import { successResponse, errorResponse } from "@/utils/apiResponse";

/**
 * POST /api/lead/send-export
 * Sends the exported leads CSV to the configured email (LEAD_EXPORT_MAIL_TO).
 * Body: { csvContent: string, exportCount: number, totalLeads: number }
 * Subject: "YYYY-MM-DD HH:mm (exportCount) & (totalLeads)"
 */
export async function POST(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const body = await request.json();
    const { csvContent, exportCount, totalLeads } = body;

    if (typeof csvContent !== "string" || csvContent.length === 0) {
      return errorResponse("csvContent is required", 400);
    }

    const count = Math.max(0, parseInt(exportCount, 10) || 0);
    const total = Math.max(0, parseInt(totalLeads, 10) || 0);

    const now = new Date();
    const dateTimeStr = now.toISOString().slice(0, 16).replace("T", " ");
    const subject = `${dateTimeStr} (${count}) & (${total})`;

    const settings = await getEmailSettings();
    const to = (settings.leadExportMailTo || "").trim();
    if (!to) {
      return errorResponse("Lead export email not configured. Set it in Admin → Email & Notifications.", 500);
    }

    const filename = `leads_${now.toISOString().split("T")[0]}.csv`;
    const result = await sendMail({
      to,
      subject,
      text: `Lead export: ${count} of ${total} leads. See attached CSV.`,
      html: `<p>Lead export: <strong>${count}</strong> of <strong>${total}</strong> leads.</p><p>See attached CSV file.</p>`,
      attachments: [
        {
          filename,
          content: csvContent,
          contentType: "text/csv; charset=utf-8",
        },
      ],
    });

    if (!result.success) {
      return errorResponse(result.error || "Failed to send email", 500);
    }

    return successResponse(
      { messageId: result.messageId, subject, to },
      "Export email sent successfully",
      200
    );
  } catch (err) {
    console.error("Lead send-export error:", err);
    return errorResponse(err?.message || "Failed to send export email", 500);
  }
}
