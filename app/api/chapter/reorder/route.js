import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Chapter from "@/models/Chapter";
import { logger } from "@/utils/logger";
import { requireAction } from "@/middleware/authMiddleware";

export async function POST(request) {
  return handleReorder(request);
}

export async function PATCH(request) {
  return handleReorder(request);
}

async function handleReorder(request) {
  try {
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();

    const { chapters } = await request.json();

    // Validate input
    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json(
        { success: false, message: "Chapters array is required" },
        { status: 400 }
      );
    }

    // Validate each chapter object
    for (const chapter of chapters) {
      if (!chapter.id || !chapter.orderNumber) {
        return NextResponse.json(
          {
            success: false,
            message: "Each chapter must have id and orderNumber",
          },
          { status: 400 }
        );
      }
      if (typeof chapter.orderNumber !== 'number') {
        return NextResponse.json(
          { success: false, message: "orderNumber must be a number" },
          { status: 400 }
        );
      }
    }

    // Validate that all chapters belong to the same unit
    const chapterDocs = await Chapter.find({ _id: { $in: chapters.map(c => c.id) } })
      .select('unitId');
    
    if (chapterDocs.length !== chapters.length) {
      return NextResponse.json(
        { success: false, message: "Some chapters not found" },
        { status: 404 }
      );
    }

    const firstChapter = chapterDocs[0];
    const firstUnitId = firstChapter.unitId?.toString() || firstChapter.unitId;

    for (let i = 1; i < chapterDocs.length; i++) {
      const chapter = chapterDocs[i];
      const unitId = chapter.unitId?.toString() || chapter.unitId;
      
      if (unitId !== firstUnitId) {
        return NextResponse.json(
          { success: false, message: "All chapters must belong to the same unit" },
          { status: 400 }
        );
      }
    }

    // Two-step update strategy to avoid duplicate key conflicts
    // Step 1: Move all chapters to temporary high order numbers
    const tempUpdates = chapters.map((chapter, index) => ({
      updateOne: {
        filter: { _id: chapter.id },
        update: { orderNumber: 10000 + index },
      },
    }));

    await Chapter.bulkWrite(tempUpdates);

    // Step 2: Update all chapters to their final order numbers
    const finalUpdates = chapters.map((chapter) => ({
      updateOne: {
        filter: { _id: chapter.id },
        update: { orderNumber: chapter.orderNumber },
      },
    }));

    const result = await Chapter.bulkWrite(finalUpdates);

    logger.info("Chapter reorder: same unit, count=" + chapters.length);

    return NextResponse.json({
      success: true,
      message: `Successfully reordered ${chapters.length} chapters`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    logger.error("Error reordering chapters:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reorder chapters" },
      { status: 500 }
    );
  }
}

