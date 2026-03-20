export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import UploadCounter from "@/models/UploadCounter";
import { requireAction } from "@/middleware/authMiddleware";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import connectDB from "@/lib/mongodb";

import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";

// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
const assetsBaseDir = path.join(process.cwd(), "public", "assets");

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const createSlug = (name) => {
  if (!name) return "general";
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Build folder path from hierarchy
const buildFolderPath = async (context) => {
  const parts = [];

  if (context.examId) {
    const exam = await Exam.findById(context.examId).select("name").lean();
    if (exam) parts.push(createSlug(exam.name));
  }

  if (context.subjectId) {
    const subject = await Subject.findById(context.subjectId)
      .select("name")
      .lean();
    if (subject) parts.push(createSlug(subject.name));
  }

  if (context.unitId) {
    const unit = await Unit.findById(context.unitId).select("name").lean();
    if (unit) parts.push(createSlug(unit.name));
  }

  if (context.chapterId) {
    const chapter = await Chapter.findById(context.chapterId)
      .select("name")
      .lean();
    if (chapter) parts.push(createSlug(chapter.name));
  }

  if (context.topicId) {
    const topic = await Topic.findById(context.topicId).select("name").lean();
    if (topic) parts.push(createSlug(topic.name));
  }

  if (context.subtopicId) {
    const subtopic = await SubTopic.findById(context.subtopicId)
      .select("name")
      .lean();
    if (subtopic) parts.push(createSlug(subtopic.name));
  }

  if (context.definitionId) {
    const definition = await Definition.findById(context.definitionId)
      .select("name")
      .lean();
    if (definition) parts.push(createSlug(definition.name));
  }

  if (parts.length === 0) parts.push("general");

  return path.join(assetsBaseDir, ...parts);
};

// 🔥 Build filename prefix based on deepest context
const buildFilePrefix = async (context) => {
  let examName = "";
  let targetName = "";

  if (context.examId) {
    const exam = await Exam.findById(context.examId).select("name").lean();
    if (exam) examName = createSlug(exam.name);
  }

  if (context.definitionId) {
    const d = await Definition.findById(context.definitionId)
      .select("name")
      .lean();
    if (d) targetName = createSlug(d.name);
  } else if (context.subtopicId) {
    const s = await SubTopic.findById(context.subtopicId).select("name").lean();
    if (s) targetName = createSlug(s.name);
  } else if (context.topicId) {
    const t = await Topic.findById(context.topicId).select("name").lean();
    if (t) targetName = createSlug(t.name);
  } else if (context.chapterId) {
    const c = await Chapter.findById(context.chapterId).select("name").lean();
    if (c) targetName = createSlug(c.name);
  } else if (context.unitId) {
    const u = await Unit.findById(context.unitId).select("name").lean();
    if (u) targetName = createSlug(u.name);
  } else if (context.subjectId) {
    const s = await Subject.findById(context.subjectId).select("name").lean();
    if (s) targetName = createSlug(s.name);
  }

  if (examName && targetName) {
    return `${examName}_${targetName}_testprepkart`;
  }

  if (examName) {
    return `${examName}_testprepkart`;
  }

  return `general_testprepkart`;
};

// --------------------------------------------------
// API
// --------------------------------------------------

export async function POST(request) {
  try {
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, {
        status: authCheck.status || 403,
      });
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return errorResponse("File is required", 400);
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse("File size exceeds 10MB", 400);
    }

    const context = {
      examId: formData.get("examId") || null,
      subjectId: formData.get("subjectId") || null,
      unitId: formData.get("unitId") || null,
      chapterId: formData.get("chapterId") || null,
      topicId: formData.get("topicId") || null,
      subtopicId: formData.get("subtopicId") || null,
      definitionId: formData.get("definitionId") || null,
    };

    // Folder
    const folderPath = await buildFolderPath(context);
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
    }

    // Extension
    const originalName = file.name || "file";
    const extension = originalName.includes(".")
      ? originalName.split(".").pop().toLowerCase()
      : "bin";

    // DB counter (per folder)
    const relativeFolder = path
      .relative(assetsBaseDir, folderPath)
      .replace(/\\/g, "/");

    const counter = await UploadCounter.findOneAndUpdate(
      { path: relativeFolder },
      { $inc: { last: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const seqNumber = counter.last || 1;

    // Filename
    const prefix = await buildFilePrefix(context);
    const filename = `${prefix}_${seqNumber}.${extension}`;

    // Save
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(folderPath, filename);
    await writeFile(filePath, buffer);

    // URL
    const relativeToAssets = path
      .relative(assetsBaseDir, filePath)
      .replace(/\\/g, "/");

    const fileUrl = `${basePath}/api/uploads/${relativeToAssets}`;

    return successResponse(
      { url: fileUrl, filename, path: relativeToAssets },
      "File uploaded successfully",
    );
  } catch (error) {
    console.error("Upload error:", error);
    return handleApiError(error, "Failed to upload file");
  }
}
