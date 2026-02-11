import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Unit from "@/models/Unit";
import mongoose from "mongoose";
import { logger } from "@/utils/logger";
import { requireAction } from "@/middleware/authMiddleware";
import cacheManager from "@/utils/cacheManager";

// ---------- REORDER UNITS (per subject): POST or PATCH ----------
async function handleReorder(request) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();
    const { units } = body;

    if (!Array.isArray(units) || units.length === 0) {
      return NextResponse.json(
        { success: false, message: "Units array is required" },
        { status: 400 }
      );
    }

    // Validate all unit IDs
    for (const unit of units) {
      if (!mongoose.Types.ObjectId.isValid(unit.id)) {
        return NextResponse.json(
          { success: false, message: `Invalid unit ID: ${unit.id}` },
          { status: 400 }
        );
      }
      if (!unit.orderNumber || typeof unit.orderNumber !== 'number') {
        return NextResponse.json(
          { success: false, message: `Each unit must have a valid orderNumber` },
          { status: 400 }
        );
      }
    }

    // Validate that all units belong to the same subject and exam
    const unitDocs = await Unit.find({ _id: { $in: units.map(u => u.id) } })
      .select('subjectId examId');
    
    if (unitDocs.length !== units.length) {
      return NextResponse.json(
        { success: false, message: "Some units not found" },
        { status: 404 }
      );
    }

    const firstUnit = unitDocs[0];
    const firstSubjectId = firstUnit.subjectId?.toString() || firstUnit.subjectId;
    const firstExamId = firstUnit.examId?.toString() || firstUnit.examId;

    for (let i = 1; i < unitDocs.length; i++) {
      const unit = unitDocs[i];
      const subjectId = unit.subjectId?.toString() || unit.subjectId;
      const examId = unit.examId?.toString() || unit.examId;
      
      if (subjectId !== firstSubjectId || examId !== firstExamId) {
        return NextResponse.json(
          { success: false, message: "All units must belong to the same subject and exam" },
          { status: 400 }
        );
      }
    }

    // Strategy: Use temporary high order numbers to avoid conflicts
    const tempOrderBase = 10000;

    // Step 1: Set all units to temporary order numbers
    for (let i = 0; i < units.length; i++) {
      await Unit.findByIdAndUpdate(units[i].id, {
        orderNumber: tempOrderBase + i,
      });
    }

    // Step 2: Set all units to their final order numbers
    for (const unit of units) {
      await Unit.findByIdAndUpdate(unit.id, {
        orderNumber: unit.orderNumber,
      });
    }

    logger.info("Unit reorder: same subject, count=" + units.length);
    cacheManager?.clear?.("units-");

    return NextResponse.json({
      success: true,
      message: "Units reordered successfully",
    });
  } catch (error) {
    logger.error("Error reordering units:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reorder units" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  return handleReorder(request);
}

export async function POST(request) {
  return handleReorder(request);
}

