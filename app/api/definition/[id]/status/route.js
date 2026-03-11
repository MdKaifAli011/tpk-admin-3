import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Definition from "@/models/Definition";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";

// ---------- PATCH DEFINITION STATUS ----------
export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid definition ID" },
        { status: 400 },
      );
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid status is required (active or inactive)",
        },
        { status: 400 },
      );
    }

    const updated = await Definition.findByIdAndUpdate(
      id,
      {
        status,
        manualInactive: status === "inactive",
      },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Definition not found" },
        { status: 404 },
      );
    }

    logger.info(`Definition status updated to ${status} for definition ${id}`);

    return NextResponse.json({
      success: true,
      message: `Definition ${
        status === "inactive" ? "deactivated" : "activated"
      } successfully`,
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating definition status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update definition status" },
      { status: 500 },
    );
  }
}
