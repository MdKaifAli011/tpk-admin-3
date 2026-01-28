import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
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

    // Get selected entity names for template
    let examName = "";
    let subjectName = "";
    let unitName = "";
    let chapterName = "";
    let topicName = "";
    let subtopicName = "";
    let definitionName = "";

    if (searchParams.get("examId")) {
      const exam = await Exam.findById(searchParams.get("examId")).lean();
      examName = exam?.name || "";
    }

    if (searchParams.get("subjectId")) {
      const subject = await Subject.findById(searchParams.get("subjectId")).lean();
      subjectName = subject?.name || "";
    }

    if (searchParams.get("unitId")) {
      const unit = await Unit.findById(searchParams.get("unitId")).lean();
      unitName = unit?.name || "";
    }

    if (searchParams.get("chapterId")) {
      const chapter = await Chapter.findById(searchParams.get("chapterId")).lean();
      chapterName = chapter?.name || "";
    }

    if (searchParams.get("topicId")) {
      const topic = await Topic.findById(searchParams.get("topicId")).lean();
      topicName = topic?.name || "";
    }

    if (searchParams.get("subTopicId")) {
      const subtopic = await SubTopic.findById(searchParams.get("subTopicId")).lean();
      subtopicName = subtopic?.name || "";
    }

    if (searchParams.get("definitionId")) {
      const definition = await Definition.findById(searchParams.get("definitionId")).lean();
      definitionName = definition?.name || "";
    }

    // Build headers based on level - only include hierarchy fields up to selected level
    const headers = [];
    
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
    
    // Add hierarchy fields first
    headers.push(...hierarchyFields);
    
    // Add thread fields (after hierarchy)
    headers.push("title", "content", "guestname", "tags", "views", "is_approved", "is_pinned", "is_locked", "is_solved", "thread_date");
    
    // Add reply fields
    headers.push("reply_content", "reply_approved", "reply_date", "reply2_content", "reply2_approved", "reply2_date");

    // Build sample row with selected entity names
    const sampleRow = {};
    
    // Add hierarchy fields based on level
    if (hierarchyFields.includes("exam")) {
      sampleRow.exam = examName || "NEET";
    }
    if (hierarchyFields.includes("subject")) {
      sampleRow.subject = subjectName || "Physics";
    }
    if (hierarchyFields.includes("unit")) {
      sampleRow.unit = unitName || "Mechanics";
    }
    if (hierarchyFields.includes("chapter")) {
      sampleRow.chapter = chapterName || "Motion";
    }
    if (hierarchyFields.includes("topic")) {
      sampleRow.topic = topicName || "Kinematics";
    }
    if (hierarchyFields.includes("subtopic")) {
      sampleRow.subtopic = subtopicName || "Displacement";
    }
    if (hierarchyFields.includes("definition")) {
      sampleRow.definition = definitionName || "What is Displacement?";
    }
    
    // Add all other discussion fields (after hierarchy)
    sampleRow.title = "Sample Discussion Title";
    sampleRow.content = "This is a sample discussion content. Replace with your actual content.";
    sampleRow.guestname = ""; // Empty - will be auto-generated
    sampleRow.tags = "Question,General";
    sampleRow.views = "0";
    sampleRow.is_approved = "false";
    sampleRow.is_pinned = "false";
    sampleRow.is_locked = "false";
    sampleRow.is_solved = "false";
    sampleRow.thread_date = ""; // Empty - will be random date
    sampleRow.reply_content = "This is a sample reply.";
    sampleRow.reply_approved = "true";
    sampleRow.reply_date = ""; // Empty - will be random date
    sampleRow.reply2_content = "This is a nested reply.";
    sampleRow.reply2_approved = "true";
    sampleRow.reply2_date = ""; // Empty - will be random date

    // Generate CSV
    const csvContent = arrayToCSV([sampleRow], headers);

    return NextResponse.json({
      success: true,
      data: {
        csvContent,
        level,
        headers,
      },
    });

  } catch (error) {
    console.error("Template error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate template" },
      { status: 500 }
    );
  }
}
