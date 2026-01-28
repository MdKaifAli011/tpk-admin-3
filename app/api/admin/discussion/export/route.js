import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import Reply from "@/models/Reply";
import { requireAuth } from "@/middleware/authMiddleware";
import { arrayToCSV } from "@/utils/csvParser";

export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") || "exam";
    const checkOnly = searchParams.get("checkOnly") === "1";

    // Build query based on selected level
    const query = {};
    
    // Same query for both "has data" check and export: all threads under the selected hierarchy path
    // (e.g. exam=NEET → all threads with that examId, at any depth: subject/unit/chapter/etc.)
    if (searchParams.get("examId")) query.examId = searchParams.get("examId");
    if (searchParams.get("subjectId")) query.subjectId = searchParams.get("subjectId");
    if (searchParams.get("unitId")) query.unitId = searchParams.get("unitId");
    if (searchParams.get("chapterId")) query.chapterId = searchParams.get("chapterId");
    if (searchParams.get("topicId")) query.topicId = searchParams.get("topicId");
    if (searchParams.get("subTopicId")) query.subTopicId = searchParams.get("subTopicId");
    if (searchParams.get("definitionId")) query.definitionId = searchParams.get("definitionId");

    // If checkOnly: just count threads (optimized - no populate/sort needed)
    if (checkOnly) {
      const count = await Thread.countDocuments(query);
      return NextResponse.json({
        success: true,
        hasData: count > 0,
        count: count,
      });
    }

    // Fetch threads with all hierarchy populated (for actual export)
    const threads = await Thread.find(query)
      .populate("examId", "name")
      .populate("subjectId", "name")
      .populate("unitId", "name")
      .populate("chapterId", "name")
      .populate("topicId", "name")
      .populate("subTopicId", "name")
      .populate("definitionId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch replies for each thread
    const threadIds = threads.map(t => t._id);
    const replies = await Reply.find({ threadId: { $in: threadIds } })
      .sort({ createdAt: 1 })
      .lean();

    // Group replies by thread
    const repliesByThread = {};
    replies.forEach(reply => {
      if (!repliesByThread[reply.threadId]) {
        repliesByThread[reply.threadId] = [];
      }
      repliesByThread[reply.threadId].push(reply);
    });

    // Define hierarchy fields based on level (only include up to selected level)
    const hierarchyFields = [];
    if (level === "exam") {
      hierarchyFields.push("exam");
    } else if (level === "subject") {
      hierarchyFields.push("exam", "subject");
    } else if (level === "unit") {
      hierarchyFields.push("exam", "subject", "unit");
    } else if (level === "chapter") {
      hierarchyFields.push("exam", "subject", "unit", "chapter");
    } else if (level === "topic") {
      hierarchyFields.push("exam", "subject", "unit", "chapter", "topic");
    } else if (level === "subtopic") {
      hierarchyFields.push("exam", "subject", "unit", "chapter", "topic", "subtopic");
    } else if (level === "definition") {
      hierarchyFields.push("exam", "subject", "unit", "chapter", "topic", "subtopic", "definition");
    }

    // Convert to CSV format
    const csvData = threads.map(thread => {
      const threadReplies = repliesByThread[thread._id] || [];
      const topLevelReplies = threadReplies.filter(r => !r.parentReplyId);
      
      // Start with hierarchy fields (only up to selected level)
      const row = {};
      
      // Add hierarchy fields based on level
      if (hierarchyFields.includes("exam")) {
        row.exam = thread.examId?.name || "";
      }
      if (hierarchyFields.includes("subject")) {
        row.subject = thread.subjectId?.name || "";
      }
      if (hierarchyFields.includes("unit")) {
        row.unit = thread.unitId?.name || "";
      }
      if (hierarchyFields.includes("chapter")) {
        row.chapter = thread.chapterId?.name || "";
      }
      if (hierarchyFields.includes("topic")) {
        row.topic = thread.topicId?.name || "";
      }
      if (hierarchyFields.includes("subtopic")) {
        row.subtopic = thread.subTopicId?.name || "";
      }
      if (hierarchyFields.includes("definition")) {
        row.definition = thread.definitionId?.name || "";
      }

      // Add all other discussion fields (after hierarchy fields)
      row.title = thread.title || "";
      row.content = thread.content || "";
      row.guestname = thread.guestName || "";
      row.tags = thread.tags?.join(",") || "";
      row.views = thread.views || 0;
      row.is_approved = thread.isApproved ? "true" : "false";
      row.is_pinned = thread.isPinned ? "true" : "false";
      row.is_locked = thread.isLocked ? "true" : "false";
      row.is_solved = thread.isSolved ? "true" : "false";
      row.thread_date = thread.createdAt ? new Date(thread.createdAt).toISOString() : "";
      row.reply_content = topLevelReplies[0]?.content || "";
      row.reply_approved = topLevelReplies[0]?.isApproved ? "true" : "false";
      row.reply_date = topLevelReplies[0]?.createdAt ? new Date(topLevelReplies[0].createdAt).toISOString() : "";

      // Add nested replies (reply2, reply3, etc.)
      let replyIndex = 2;
      const nestedReplies = threadReplies.filter(r => r.parentReplyId);
      nestedReplies.forEach((reply, idx) => {
        row[`reply${replyIndex}_content`] = reply.content || "";
        row[`reply${replyIndex}_approved`] = reply.isApproved ? "true" : "false";
        row[`reply${replyIndex}_date`] = reply.createdAt ? new Date(reply.createdAt).toISOString() : "";
        replyIndex++;
      });

      return row;
    });

    // Generate CSV headers - hierarchy fields first, then other fields
    const headers = [...hierarchyFields];
    
    // Add all other discussion fields (after hierarchy)
    headers.push(
      "title", "content", "guestname", "tags", "views",
      "is_approved", "is_pinned", "is_locked", "is_solved", "thread_date",
      "reply_content", "reply_approved", "reply_date"
    );

    // Add dynamic reply columns
    const maxReplies = Math.max(...csvData.map(row => {
      let count = 0;
      let idx = 2;
      while (row[`reply${idx}_content`]) {
        count++;
        idx++;
      }
      return count;
    }), 0);

    for (let i = 2; i <= maxReplies + 1; i++) {
      headers.push(`reply${i}_content`, `reply${i}_approved`, `reply${i}_date`);
    }

    // Always return at least header row so file is not blank when no rows
    const csvContent = csvData.length > 0
      ? arrayToCSV(csvData, headers)
      : headers.map(h => (h.includes(",") || h.includes('"') ? `"${String(h).replace(/"/g, '""')}"` : h)).join(",") + "\n";

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="discussions_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Export failed" },
      { status: 500 }
    );
  }
}