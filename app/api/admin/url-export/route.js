import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";

const BASE_URL =
  (process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_ORIGIN ||
    "http://app.testprepkart.in") +
  (process.env.NEXT_PUBLIC_BASE_PATH || "/self-study");

function buildUnitPipeline(examId) {
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  return [
    { $match: { examId: new mongoose.Types.ObjectId(examId) } },
    {
      $lookup: {
        from: "subjects",
        localField: "subjectId",
        foreignField: "_id",
        as: "subject",
      },
    },
    { $unwind: "$subject" },
    {
      $lookup: {
        from: "exams",
        localField: "examId",
        foreignField: "_id",
        as: "exam",
      },
    },
    { $unwind: "$exam" },
    {
      $project: {
        _id: 0,
        level: "unit",
        exam_name: "$exam.slug",
        subject_name: "$subject.slug",
        unit_name: "$slug",
        url: {
          $concat: [base, "/", "$exam.slug", "/", "$subject.slug", "/", "$slug"],
        },
      },
    },
  ];
}

function buildChapterPipeline(examId) {
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  return [
    { $match: { examId: new mongoose.Types.ObjectId(examId) } },
    {
      $lookup: {
        from: "subjects",
        localField: "subjectId",
        foreignField: "_id",
        as: "subject",
      },
    },
    { $unwind: "$subject" },
    {
      $lookup: {
        from: "units",
        localField: "unitId",
        foreignField: "_id",
        as: "unit",
      },
    },
    { $unwind: "$unit" },
    {
      $lookup: {
        from: "exams",
        localField: "examId",
        foreignField: "_id",
        as: "exam",
      },
    },
    { $unwind: "$exam" },
    {
      $project: {
        _id: 0,
        level: "chapter",
        exam_name: "$exam.slug",
        subject_name: "$subject.slug",
        unit_name: "$unit.slug",
        chapter_name: "$slug",
        url: {
          $concat: [
            base,
            "/",
            "$exam.slug",
            "/",
            "$subject.slug",
            "/",
            "$unit.slug",
            "/",
            "$slug",
          ],
        },
      },
    },
  ];
}

function buildTopicPipeline(examId) {
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  return [
    { $match: { examId: new mongoose.Types.ObjectId(examId) } },
    {
      $lookup: {
        from: "subjects",
        localField: "subjectId",
        foreignField: "_id",
        as: "subject",
      },
    },
    { $unwind: "$subject" },
    {
      $lookup: {
        from: "units",
        localField: "unitId",
        foreignField: "_id",
        as: "unit",
      },
    },
    { $unwind: "$unit" },
    {
      $lookup: {
        from: "chapters",
        localField: "chapterId",
        foreignField: "_id",
        as: "chapter",
      },
    },
    { $unwind: "$chapter" },
    {
      $lookup: {
        from: "exams",
        localField: "examId",
        foreignField: "_id",
        as: "exam",
      },
    },
    { $unwind: "$exam" },
    {
      $project: {
        _id: 0,
        level: "topic",
        exam_name: "$exam.slug",
        subject_name: "$subject.slug",
        unit_name: "$unit.slug",
        chapter_name: "$chapter.slug",
        topic_name: "$slug",
        url: {
          $concat: [
            base,
            "/",
            "$exam.slug",
            "/",
            "$subject.slug",
            "/",
            "$unit.slug",
            "/",
            "$chapter.slug",
            "/",
            "$slug",
          ],
        },
      },
    },
  ];
}

function buildSubTopicPipeline(examId) {
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  return [
    { $match: { examId: new mongoose.Types.ObjectId(examId) } },
    {
      $lookup: {
        from: "subjects",
        localField: "subjectId",
        foreignField: "_id",
        as: "subject",
      },
    },
    { $unwind: "$subject" },
    {
      $lookup: {
        from: "units",
        localField: "unitId",
        foreignField: "_id",
        as: "unit",
      },
    },
    { $unwind: "$unit" },
    {
      $lookup: {
        from: "chapters",
        localField: "chapterId",
        foreignField: "_id",
        as: "chapter",
      },
    },
    { $unwind: "$chapter" },
    {
      $lookup: {
        from: "topics",
        localField: "topicId",
        foreignField: "_id",
        as: "topic",
      },
    },
    { $unwind: "$topic" },
    {
      $lookup: {
        from: "exams",
        localField: "examId",
        foreignField: "_id",
        as: "exam",
      },
    },
    { $unwind: "$exam" },
    {
      $project: {
        _id: 0,
        level: "subtopic",
        exam_name: "$exam.slug",
        subject_name: "$subject.slug",
        unit_name: "$unit.slug",
        chapter_name: "$chapter.slug",
        topic_name: "$topic.slug",
        subtopic_name: "$slug",
        url: {
          $concat: [
            base,
            "/",
            "$exam.slug",
            "/",
            "$subject.slug",
            "/",
            "$unit.slug",
            "/",
            "$chapter.slug",
            "/",
            "$topic.slug",
            "/",
            "$slug",
          ],
        },
      },
    },
  ];
}

function buildDefinitionPipeline(examId) {
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  return [
    { $match: { examId: new mongoose.Types.ObjectId(examId) } },
    {
      $lookup: {
        from: "subjects",
        localField: "subjectId",
        foreignField: "_id",
        as: "subject",
      },
    },
    { $unwind: "$subject" },
    {
      $lookup: {
        from: "units",
        localField: "unitId",
        foreignField: "_id",
        as: "unit",
      },
    },
    { $unwind: "$unit" },
    {
      $lookup: {
        from: "chapters",
        localField: "chapterId",
        foreignField: "_id",
        as: "chapter",
      },
    },
    { $unwind: "$chapter" },
    {
      $lookup: {
        from: "topics",
        localField: "topicId",
        foreignField: "_id",
        as: "topic",
      },
    },
    { $unwind: "$topic" },
    {
      $lookup: {
        from: "subtopics",
        localField: "subTopicId",
        foreignField: "_id",
        as: "subtopic",
      },
    },
    { $unwind: "$subtopic" },
    {
      $lookup: {
        from: "exams",
        localField: "examId",
        foreignField: "_id",
        as: "exam",
      },
    },
    { $unwind: "$exam" },
    {
      $project: {
        _id: 0,
        level: "definition",
        exam_name: "$exam.slug",
        subject_name: "$subject.slug",
        unit_name: "$unit.slug",
        chapter_name: "$chapter.slug",
        topic_name: "$topic.slug",
        subtopic_name: "$subtopic.slug",
        definition_name: "$slug",
        url: {
          $concat: [
            base,
            "/",
            "$exam.slug",
            "/",
            "$subject.slug",
            "/",
            "$unit.slug",
            "/",
            "$chapter.slug",
            "/",
            "$topic.slug",
            "/",
            "$subtopic.slug",
            "/",
            "$slug",
          ],
        },
      },
    },
  ];
}

export async function POST(request) {
  try {
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const body = await request.json();
    const examId = body?.examId;

    if (!examId) {
      return NextResponse.json(
        { success: false, message: "examId is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return NextResponse.json(
        { success: false, message: "Invalid examId" },
        { status: 400 }
      );
    }

    await connectDB();

    const [units, chapters, topics, subtopics, definitions] = await Promise.all([
      Unit.aggregate(buildUnitPipeline(examId)),
      Chapter.aggregate(buildChapterPipeline(examId)),
      Topic.aggregate(buildTopicPipeline(examId)),
      SubTopic.aggregate(buildSubTopicPipeline(examId)),
      Definition.aggregate(buildDefinitionPipeline(examId)),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        units,
        chapters,
        topics,
        subtopics,
        definitions,
      },
      counts: {
        units: units.length,
        chapters: chapters.length,
        topics: topics.length,
        subtopics: subtopics.length,
        definitions: definitions.length,
      },
    });
  } catch (error) {
    console.error("URL Export Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "URL export failed" },
      { status: 500 }
    );
  }
}
