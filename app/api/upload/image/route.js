import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
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

// Base path for assets
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
const assetsBaseDir = path.join(process.cwd(), "public", "assets");

// Helper function to create slug from name
const createSlug = (name) => {
  if (!name) return "general";
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// NOTE: We no longer scan the target folder for existing files (readdir)
// because dynamic directory reads cause Turbopack to expand file patterns
// and produce overly-broad warnings. Instead generate a unique filename
// using timestamp + UUID which is safe and performant.

// Helper function to build folder path from context
const buildFolderPath = async (context) => {
  const pathParts = [];

  if (context.examId) {
    const exam = await Exam.findById(context.examId).select("name").lean();
    if (exam) {
      pathParts.push(createSlug(exam.name));
    }
  }

  if (context.subjectId) {
    const subject = await Subject.findById(context.subjectId)
      .select("name")
      .lean();
    if (subject) {
      pathParts.push(createSlug(subject.name));
    }
  }

  if (context.unitId) {
    const unit = await Unit.findById(context.unitId).select("name").lean();
    if (unit) {
      pathParts.push(createSlug(unit.name));
    }
  }

  if (context.chapterId) {
    const chapter = await Chapter.findById(context.chapterId)
      .select("name")
      .lean();
    if (chapter) {
      pathParts.push(createSlug(chapter.name));
    }
  }

  if (context.topicId) {
    const topic = await Topic.findById(context.topicId).select("name").lean();
    if (topic) {
      pathParts.push(createSlug(topic.name));
    }
  }

  if (context.subtopicId) {
    const subtopic = await SubTopic.findById(context.subtopicId)
      .select("name")
      .lean();
    if (subtopic) {
      pathParts.push(createSlug(subtopic.name));
    }
  }

  if (context.definitionId) {
    const definition = await Definition.findById(context.definitionId)
      .select("name")
      .lean();
    if (definition) {
      pathParts.push(createSlug(definition.name));
    }
  }

  // If no context, use "general" folder
  if (pathParts.length === 0) {
    pathParts.push("general");
  }

  return path.join(assetsBaseDir, ...pathParts);
};

export async function POST(request) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return errorResponse("Image file is required", 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse(
        "Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed.",
        400
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return errorResponse("File size exceeds 10MB limit", 400);
    }

    // Get context from form data
    const context = {
      examId: formData.get("examId") || null,
      subjectId: formData.get("subjectId") || null,
      unitId: formData.get("unitId") || null,
      chapterId: formData.get("chapterId") || null,
      topicId: formData.get("topicId") || null,
      subtopicId: formData.get("subtopicId") || null,
      definitionId: formData.get("definitionId") || null,
    };

    // Build folder path
    const folderPath = await buildFolderPath(context);

    // Create folder if it doesn't exist
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
    }

    // Determine file extension from MIME type
    const mimeToExt = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    const extension = mimeToExt[file.type] || "png";

    // Generate a unique filename (timestamp + UUID)
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    const filePath = path.join(folderPath, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Build runtime-served URL (use our uploads API so files added
    // at runtime are immediately accessible without rebuilding)
    const relativeToAssets = path
      .relative(assetsBaseDir, filePath)
      .replace(/\\/g, "/");
    const imageUrl = `${basePath}/api/uploads/${relativeToAssets}`;

    return successResponse(
      {
        url: imageUrl,
        filename: filename,
        path: relativeToAssets,
      },
      "Image uploaded successfully"
    );
  } catch (error) {
    console.error("Image upload error:", error);
    return handleApiError(error, "Failed to upload image");
  }
}

