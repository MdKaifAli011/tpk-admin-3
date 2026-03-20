export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import connectDB from "@/lib/mongodb";
import DiscussionUpload from "@/models/DiscussionUpload";
import Exam from "@/models/Exam";
import UploadCounter from "@/models/UploadCounter";
import { verifyStudentToken } from "@/lib/studentAuth";
import Student from "@/models/Student";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/self-study").replace(/\/+$/, "");
// Public origin for absolute image URLs (fixes broken images in production when basePath is used)
function getPublicOrigin() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (appUrl) {
    const base = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
    return base.replace(/\/+$/, "");
  }
  return null;
}
// public/discussion/user/[examName]/...
// public/discussion/guest/[examName]/...
const discussionStudentDir = path.join(process.cwd(), "public", "discussion", "user");
const discussionGuestDir = path.join(process.cwd(), "public", "discussion", "guest");

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/** For folder names (student name, etc.): safe alphanumeric + underscore, max 64 chars */
function sanitizeFolderName(name) {
  if (!name || typeof name !== "string") return "unknown";
  return name
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "_")
    .replace(/-+/g, "_")
    .substring(0, 64) || "user";
}

/** For exam folder and filename prefix: lowercase, hyphens, max 48 chars */
function sanitizeExamNameForFile(name) {
  if (!name || typeof name !== "string") return "exam";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 48) || "exam";
}

export async function POST(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get("authorization");
    const guestId = request.headers.get("x-guest-id") || "";
    const guestName = request.headers.get("x-guest-name") || "";

    let uploaderType = "guest";
    let uploaderId = (guestId || "").trim() || null;
    let displayName = (guestName || "").trim() || "Guest";
    let studentPublicId = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const studentAuth = await verifyStudentToken(request);
      if (!studentAuth.error && studentAuth.studentId) {
        uploaderType = "student";
        uploaderId = studentAuth.studentId;
        const student = await Student.findById(studentAuth.studentId).select(
          "firstName lastName publicId"
        ).lean();
        if (student) {
          displayName =
            [student.firstName, student.lastName].filter(Boolean).join("_") ||
            "Student";
          let resolvedPublicId = student.publicId;
          if (resolvedPublicId === null || resolvedPublicId === undefined) {
            // Assign numeric student id and persist in DB (no .save() - we didn't load password)
            const counter = await UploadCounter.findOneAndUpdate(
              { path: "student/publicId" },
              { $inc: { last: 1 } },
              { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            const nextId = counter?.last ?? 1;
            await Student.findByIdAndUpdate(studentAuth.studentId, {
              $set: { publicId: nextId },
            });
            resolvedPublicId = nextId;
          }
          studentPublicId =
            resolvedPublicId !== null && resolvedPublicId !== undefined
              ? String(resolvedPublicId)
              : null;
        } else {
          displayName = "Student";
        }
      }
    }

    // For students we must have numeric student ID only (never use ObjectId in path)
    if (uploaderType === "student" && !studentPublicId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to resolve student ID. Please try again.",
        },
        { status: 500 }
      );
    }

    if (!uploaderId) {
      return NextResponse.json(
        { success: false, message: "Please log in or use guest identity to upload images." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");
    const examIdParam = formData.get("examId"); // optional: for filename examName-discussion-imageN

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "File is required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "File size exceeds 10MB" },
        { status: 400 }
      );
    }

    const originalName = file.name || "image";
    const ext = originalName.includes(".")
      ? originalName.split(".").pop().toLowerCase()
      : "jpg";
    const extSafe = ["png", "jpeg", "jpg", "gif", "webp"].includes(ext) ? ext : "jpg";

    let filename;
    let examIdForDoc = null;
    let examNameForFile = null;
    let counterKeyBase = "discussion/general";

    if (examIdParam && String(examIdParam).trim()) {
      const exam = await Exam.findById(examIdParam).select("name slug").lean();
      examNameForFile = exam
        ? sanitizeExamNameForFile(exam.name || exam.slug || "exam")
        : "exam";
      counterKeyBase = `discussion/exam/${examIdParam}`;
      examIdForDoc = examIdParam;
    } else {
      examNameForFile = "general";
    }

    // File naming & counters:
    // Student: discussion/user/[examName]/{studentName}_{Timestamp}_image_{N}.png
    // Guest:   discussion/guest/[examName]/guest_{timestamp}_image{N}.png
    const examSegment = examNameForFile || "general";
    let targetDir;
    const timestamp = Date.now();
    if (uploaderType === "student") {
      const counter = await UploadCounter.findOneAndUpdate(
        { path: `${counterKeyBase}/student/${studentPublicId}` },
        { $inc: { last: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      const nextNum = counter?.last ?? 1;
      const namePart = sanitizeFolderName(displayName);
      filename = `${namePart}_${timestamp}_image_${nextNum}.${extSafe}`;
      targetDir = path.join(discussionStudentDir, examSegment);
    } else {
      const counter = await UploadCounter.findOneAndUpdate(
        { path: `${counterKeyBase}/guest/${examSegment}` },
        { $inc: { last: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      const nextNum = counter?.last ?? 1;
      filename = `guest_${timestamp}_image${nextNum}.${extSafe}`;
      targetDir = path.join(discussionGuestDir, examSegment);
    }
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativePath = path
      .relative(path.join(process.cwd(), "public"), filePath)
      .replace(/\\/g, "/");
    // Serve images via API so they load in the editor (avoids static-file stream issues)
    const pathUnderDiscussion = relativePath.startsWith("discussion/")
      ? relativePath.slice("discussion/".length)
      : relativePath;
    const pathOnly = `${basePath}/api/discussion/serve-image?path=${encodeURIComponent(pathUnderDiscussion)}`.replace(/\/+/g, "/");
    const origin = getPublicOrigin();
    const url = origin ? `${origin}${pathOnly}` : pathOnly;

    await DiscussionUpload.create({
      uploaderType,
      uploaderId,
      studentPublicId:
        uploaderType === "student" && studentPublicId
          ? Number(studentPublicId)
          : null,
      displayName,
      examId: examIdForDoc,
      fileName: filename,
      path: relativePath,
      url,
      mimeType: file.type || "",
      size: file.size,
    });

    return NextResponse.json({
      success: true,
      data: {
        url,
        path: relativePath,
        filename,
      },
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Discussion image upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to upload image",
      },
      { status: 500 }
    );
  }
}
