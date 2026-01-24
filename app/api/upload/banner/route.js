export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { writeFile, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import { requireAction } from "@/middleware/authMiddleware";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";

const publicDir = path.join(process.cwd(), "public");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_BANNERS_PER_EXAM = 50;

/* ================= HELPERS ================= */
const createSlug = (name = "general") =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getFileExtension = (filename = "") =>
  path.extname(filename).toLowerCase() || ".png";

const generateImageName = (examSlug, ext, index) => {
  return `${examSlug}_ImageBanner${index + 1}${ext}`;
};

// Magic byte validation for security
const isValidImage = (buffer) => {
  const header = buffer.subarray(0, 8);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff]);
  const gif = Buffer.from([0x47, 0x49, 0x46, 0x38]);
  const webp = Buffer.from([0x52, 0x49, 0x46, 0x46]);

  return (
    png.equals(header.slice(0, 8)) ||
    jpeg.equals(header.slice(0, 3)) ||
    gif.equals(header.slice(0, 4)) ||
    webp.equals(header.slice(0, 4))
  );
};

/* ================= POST ================= */
export async function POST(request) {
  try {
    /* ===== AUTH ===== */
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, {
        status: authCheck.status || 403,
      });
    }

    await connectDB();

    /* ===== FORM DATA ===== */
    const formData = await request.formData();
    const file = formData.get("image");
    const examId = formData.get("examId");

    if (!file || !(file instanceof File)) {
      return errorResponse("Image file is required", 400);
    }

    if (!examId) {
      return errorResponse("Exam ID is required", 400);
    }

    /* ===== VALIDATION ===== */
    if (file.size > MAX_SIZE) {
      return errorResponse("File size exceeds 5MB", 400);
    }

    if (!file.type.startsWith("image/")) {
      return errorResponse("Only image files are allowed", 400);
    }

    /* ===== EXAM LOOKUP ===== */
    const exam = await Exam.findById(examId).select("name").lean();
    if (!exam) {
      return errorResponse("Exam not found", 404);
    }

    /* ===== IMAGE VALIDATION ===== */
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidImage(buffer)) {
      return errorResponse("Invalid image file", 400);
    }

    /* ===== DIRECTORY STRUCTURE ===== */
    const examSlug = createSlug(exam.name);
    const bannerDir = path.join(publicDir, "images", "banner", examSlug);

    // Create: public/images/banner/neet/
    if (!existsSync(bannerDir)) {
      await mkdir(bannerDir, { recursive: true });
    }

    /* ===== COUNT EXISTING BANNERS ===== */
    let files = await readdir(bannerDir);
    // Match: neet_ImageBanner1.png, neet_ImageBanner2.jpg, etc.
    const bannerFiles = files.filter((f) =>
      f.match(new RegExp(`^${examSlug}_ImageBanner\\d+\\.(png|jpg|jpeg|gif|webp)$`, 'i'))
    );
    
    const bannerCount = bannerFiles.length;
    if (bannerCount >= MAX_BANNERS_PER_EXAM) {
      return errorResponse(`Maximum ${MAX_BANNERS_PER_EXAM} banners per exam`, 400);
    }

    /* ===== GENERATE NEW FILENAME ===== */
    const ext = getFileExtension(file.name);
    const filename = generateImageName(examSlug, ext, bannerCount);
    const filePath = path.join(bannerDir, filename);

    console.log(`📤 Uploading: ${filename} → ${bannerDir}`);

    /* ===== SAVE FILE ===== */
    await writeFile(filePath, buffer);

    /* ===== RECALCULATE INDEX (sorted order) ===== */
    files = await readdir(bannerDir);
    const sortedBannerFiles = files
      .filter((f) => f.match(new RegExp(`^${examSlug}_ImageBanner\\d+\\.(png|jpg|jpeg|gif|webp)$`, 'i')))
      .sort((a, b) => {
        // Natural sort: ImageBanner1 < ImageBanner2 < ImageBanner10
        const numA = parseInt(a.match(/ImageBanner(\d+)/i)?.[1] || '0');
        const numB = parseInt(b.match(/ImageBanner(\d+)/i)?.[1] || '0');
        return numA - numB;
      });
    
    const bannerIndex = sortedBannerFiles.indexOf(filename);

    console.log(`✅ Saved: /images/banner/${examSlug}/${filename} (index: ${bannerIndex})`);

    /* ===== RESPONSE ===== */
    return successResponse(
      {
        url: `/images/banner/${examSlug}/${filename}`, // Frontend uses this
        filename, // neet_ImageBanner1.png
        examId,
        examName: exam.name,
        examSlug,
        size: file.size,
        bannerIndex,
        totalBanners: sortedBannerFiles.length,
      },
      "Banner uploaded successfully"
    );

  } catch (error) {
    console.error("💥 Banner upload error:", error);
    return handleApiError(error, "Failed to upload banner");
  }
}
