import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SubTopic from "@/models/SubTopic";
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
    const { subTopics } = await request.json();

    if (!subTopics || !Array.isArray(subTopics)) {
      return NextResponse.json(
        { success: false, message: "Invalid subTopics data" },
        { status: 400 }
      );
    }

    // Validate each subTopic object
    for (const subTopic of subTopics) {
      if (!subTopic.id || !subTopic.orderNumber) {
        return NextResponse.json(
          { success: false, message: "Each subTopic must have id and orderNumber" },
          { status: 400 }
        );
      }
      if (typeof subTopic.orderNumber !== 'number') {
        return NextResponse.json(
          { success: false, message: "orderNumber must be a number" },
          { status: 400 }
        );
      }
    }

    // Validate that all subTopics belong to the same topic
    const subTopicDocs = await SubTopic.find({ _id: { $in: subTopics.map(st => st.id) } })
      .select('topicId');
    
    if (subTopicDocs.length !== subTopics.length) {
      return NextResponse.json(
        { success: false, message: "Some subTopics not found" },
        { status: 404 }
      );
    }

    const firstSubTopic = subTopicDocs[0];
    const firstTopicId = firstSubTopic.topicId?.toString() || firstSubTopic.topicId;

    for (let i = 1; i < subTopicDocs.length; i++) {
      const subTopic = subTopicDocs[i];
      const topicId = subTopic.topicId?.toString() || subTopic.topicId;
      
      if (topicId !== firstTopicId) {
        return NextResponse.json(
          { success: false, message: "All subTopics must belong to the same topic" },
          { status: 400 }
        );
      }
    }

    // Two-step update to prevent duplicate key errors
    // Step 1: Set all subTopics to temporary high order numbers
    const tempUpdates = subTopics.map((subTopic, index) => ({
      updateOne: {
        filter: { _id: subTopic.id },
        update: { orderNumber: 10000 + index },
      },
    }));

    await SubTopic.bulkWrite(tempUpdates);

    // Step 2: Set all subTopics to their final order numbers
    const finalUpdates = subTopics.map((subTopic) => ({
      updateOne: {
        filter: { _id: subTopic.id },
        update: { orderNumber: subTopic.orderNumber },
      },
    }));

    await SubTopic.bulkWrite(finalUpdates);

    logger.info("SubTopic reorder: same topic, count=" + subTopics.length);

    return NextResponse.json({
      success: true,
      message: "SubTopics reordered successfully",
    });
  } catch (error) {
    logger.error("Error reordering subTopics:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reorder subTopics" },
      { status: 500 }
    );
  }
}

