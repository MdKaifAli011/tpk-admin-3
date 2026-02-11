import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Definition from "@/models/Definition";
import { requireAction } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";

export async function POST(request) {
  return handleReorder(request);
}

export async function PATCH(request) {
  return handleReorder(request);
}

async function handleReorder(request) {
  try {
    // Check authentication and permissions (users need to be able to update)
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { definitions } = await request.json();

    if (!definitions || !Array.isArray(definitions)) {
      return NextResponse.json(
        { success: false, message: "Invalid definitions data" },
        { status: 400 }
      );
    }

    // Validate each definition object
    for (const definition of definitions) {
      if (!definition.id || !definition.orderNumber) {
        return NextResponse.json(
          { success: false, message: "Each definition must have id and orderNumber" },
          { status: 400 }
        );
      }
      if (typeof definition.orderNumber !== 'number') {
        return NextResponse.json(
          { success: false, message: "orderNumber must be a number" },
          { status: 400 }
        );
      }
    }

    // Validate that all definitions belong to the same subtopic
    const definitionDocs = await Definition.find({ _id: { $in: definitions.map(d => d.id) } })
      .select('subTopicId');
    
    if (definitionDocs.length !== definitions.length) {
      return NextResponse.json(
        { success: false, message: "Some definitions not found" },
        { status: 404 }
      );
    }

    const firstDefinition = definitionDocs[0];
    const firstSubTopicId = firstDefinition.subTopicId?.toString() || firstDefinition.subTopicId;

    for (let i = 1; i < definitionDocs.length; i++) {
      const definition = definitionDocs[i];
      const subTopicId = definition.subTopicId?.toString() || definition.subTopicId;
      
      if (subTopicId !== firstSubTopicId) {
        return NextResponse.json(
          { success: false, message: "All definitions must belong to the same subtopic" },
          { status: 400 }
        );
      }
    }

    // Two-step update to prevent duplicate key errors
    // Step 1: Set all definitions to temporary high order numbers
    const tempUpdates = definitions.map((definition, index) => ({
      updateOne: {
        filter: { _id: definition.id },
        update: { orderNumber: 10000 + index },
      },
    }));

    await Definition.bulkWrite(tempUpdates);

    // Step 2: Set all definitions to their final order numbers
    const finalUpdates = definitions.map((definition) => ({
      updateOne: {
        filter: { _id: definition.id },
        update: { orderNumber: definition.orderNumber },
      },
    }));

    await Definition.bulkWrite(finalUpdates);

    logger.info("Definition reorder: same subtopic, count=" + definitions.length);

    return NextResponse.json({
      success: true,
      message: "Definitions reordered successfully",
    });
  } catch (error) {
    logger.error("Error reordering definitions:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reorder definitions" },
      { status: 500 }
    );
  }
}

