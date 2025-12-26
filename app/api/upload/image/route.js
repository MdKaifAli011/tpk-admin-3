export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import UploadCounter from "@/models/UploadCounter";
import { randomUUID } from "crypto";
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

const buildFolderPath = async (context) => {
  const pathParts = [];

  if (context.examId) {
    const exam = await Exam.findById(context.examId).select("name").lean();
    if (exam) pathParts.push(createSlug(exam.name));
  }

  if (context.subjectId) {
    const subject = await Subject.findById(context.subjectId)
      .select("name")
      .lean();
    if (subject) pathParts.push(createSlug(subject.name));
  }

  if (context.unitId) {
    const unit = await Unit.findById(context.unitId).select("name").lean();
    if (unit) pathParts.push(createSlug(unit.name));
  }

  if (context.chapterId) {
    const chapter = await Chapter.findById(context.chapterId)
      .select("name")
      .lean();
    if (chapter) pathParts.push(createSlug(chapter.name));
  }

  if (context.topicId) {
    const topic = await Topic.findById(context.topicId).select("name").lean();
    if (topic) pathParts.push(createSlug(topic.name));
  }

  if (context.subtopicId) {
    const subtopic = await SubTopic.findById(context.subtopicId)
      .select("name")
      .lean();
    if (subtopic) pathParts.push(createSlug(subtopic.name));
  }

  if (context.definitionId) {
    const definition = await Definition.findById(context.definitionId)
      .select("name")
      .lean();
    if (definition) pathParts.push(createSlug(definition.name));
  }

  if (pathParts.length === 0) pathParts.push("general");

  return path.join(assetsBaseDir, ...pathParts);
};

// NOTE: avoid scanning or maintaining counters inside the project
// tree because dynamic file patterns can trigger Turbopack to
// include many files. Use a unique filename (timestamp + UUID).

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

    const folderPath = await buildFolderPath(context);
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
    }

    const originalName = file.name || "file";
    const extension = originalName.includes(".")
      ? originalName.split(".").pop().toLowerCase()
      : "bin";

    // Use DB-backed sequential filename per folder to generate
    // stable names like 1.png, 2.png, ... without scanning folders.
    const relativeFolder = path
      .relative(assetsBaseDir, folderPath)
      .replace(/\\/g, "/");

    // Atomically increment counter for this folder
    const counter = await UploadCounter.findOneAndUpdate(
      { path: relativeFolder },
      { $inc: { last: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const seqNumber = counter.last || 1;
    const filename = `${seqNumber}.${extension}`;
    const filePath = path.join(folderPath, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativeToAssets = path
      .relative(assetsBaseDir, filePath)
      .replace(/\\/g, "/");

    const fileUrl = `${basePath}/api/uploads/${relativeToAssets}`;

    return successResponse(
      { url: fileUrl, filename, path: relativeToAssets },
      "File uploaded successfully"
    );
  } catch (error) {
    console.error("Upload error:", error);
    return handleApiError(error, "Failed to upload file");
  }
}
