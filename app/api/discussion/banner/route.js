import { NextResponse } from "next/server";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";

const publicDir = path.join(process.cwd(), "public");
const MAX_BANNERS_PER_EXAM = 50;

/* ================= AUTH HELPER ================= */
async function verifyAdmin(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    return await verifyToken(token);
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/* ================= UTILS ================= */
function createSlug(name = "general") {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFileExtension(filename = "") {
  return path.extname(filename).toLowerCase() || ".png";
}

function generateImageName(examSlug, ext, index) {
  return `${examSlug}_ImageBanner${index + 1}${ext}`;
}

function getExamId(request) {
  const { searchParams } = new URL(request.url);
  try {
    const body = request.body ? JSON.parse(request.body) : {};
    return body.examId || searchParams.get("examId");
  } catch {
    return searchParams.get("examId");
  }
}

function validateExamId(examId) {
  return examId && typeof examId === "string" && examId.length >= 24;
}

/* ================= FILE OPERATIONS ================= */
async function getExamBanners(examId, examName) {
  const examSlug = createSlug(examName);
  const bannerDir = path.join(publicDir, "images", "banner", examSlug);
  
  if (!existsSync(bannerDir)) return { banners: [], defaultIndex: 0 };

  const files = await readdir(bannerDir);
  const bannerFiles = files
    .filter(f => f.match(new RegExp(`^${examSlug}_ImageBanner\\d+\\.(png|jpg|jpeg|gif|webp)$`, 'i')))
    .sort((a, b) => {
      const numA = parseInt(a.match(/ImageBanner(\d+)/i)?.[1] || '0');
      const numB = parseInt(b.match(/ImageBanner(\d+)/i)?.[1] || '0');
      return numA - numB;
    });

  const banners = bannerFiles.map((filename, index) => ({
    url: `/images/banner/${examSlug}/${filename}`,
    filename,
    altText: `Discussion Forum Banner`,
    isActive: true,
    index
  }));

  return { 
    banners, 
    defaultIndex: 0,
    totalBanners: banners.length,
    examSlug 
  };
}

/* ================= GET ================= */
export async function GET(request) {
  try {
    await connectDB(); // Keep for exam lookup
    const examId = getExamId(request);

    if (!validateExamId(examId)) {
      return NextResponse.json(
        { success: false, message: "Valid Exam ID is required" },
        { status: 400 }
      );
    }

    // Get exam name for directory structure
    const Exam = mongoose.model("Exam");
    const exam = await Exam.findById(examId).select("name").lean();
    if (!exam) {
      return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });
    }

    const { banners, defaultIndex, totalBanners, examSlug } = await getExamBanners(examId, exam.name);

    return NextResponse.json({ 
      success: true, 
      data: {
        examId,
        examName: exam.name,
        examSlug,
        banners,
        defaultBannerIndex: defaultIndex,
        totalBanners
      }
    });
  } catch (error) {
    console.error("GET /discussion/banner error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch banner collection" },
      { status: 500 }
    );
  }
}

/* ================= POST (SAVE BANNERS CONFIG) ================= */
export async function POST(request) {
  try {
    const user = await verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { examId, banners, defaultBannerIndex = 0 } = body;

    if (!validateExamId(examId)) {
      return NextResponse.json({ success: false, message: "Valid Exam ID required" }, { status: 400 });
    }

    if (!Array.isArray(banners) || banners.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "'banners' array required" 
      }, { status: 400 });
    }

    // Get exam name for directory
    const Exam = mongoose.model("Exam");
    const exam = await Exam.findById(examId).select("name").lean();
    if (!exam) {
      return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });
    }

    const examSlug = createSlug(exam.name);
    const bannerDir = path.join(publicDir, "images", "banner", examSlug);

    // Verify all banner files exist
    const missingBanners = [];
    for (const banner of banners) {
      const fullPath = path.join(bannerDir, banner.filename);
      if (!existsSync(fullPath)) {
        missingBanners.push(banner.filename);
      }
    }

    if (missingBanners.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Missing banner files: ${missingBanners.join(', ')}`
      }, { status: 400 });
    }

    // ✅ SUCCESS: All files exist, return banner collection
    const collection = {
      examId,
      examName: exam.name,
      examSlug,
      banners: banners.map((b, index) => ({
        url: `/images/banner/${examSlug}/${b.filename}`,
        filename: b.filename,
        altText: b.altText || "Discussion Forum Banner",
        isActive: b.isActive !== false
      })),
      defaultBannerIndex: Math.max(0, Math.min(defaultBannerIndex, banners.length - 1))
    };

    console.log(`✅ Banner config saved for ${exam.name}: ${banners.length} banners`);

    return NextResponse.json({
      success: true,
      data: collection,
      message: "Banner configuration saved successfully"
    });

  } catch (error) {
    console.error("POST /discussion/banner error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save banner configuration" },
      { status: 500 }
    );
  }
}

/* ================= PUT (SET DEFAULT/REMOVE) ================= */
export async function PUT(request) {
  try {
    const user = await verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");
    
    if (!validateExamId(examId)) {
      return NextResponse.json({ success: false, message: "Valid Exam ID required" }, { status: 400 });
    }

    const Exam = mongoose.model("Exam");
    const exam = await Exam.findById(examId).select("name").lean();
    if (!exam) {
      return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });
    }

    const { banners, defaultIndex } = await getExamBanners(examId, exam.name);
    const body = await request.json();
    let updated = false;

    if (body.action === "setDefault") {
      const index = parseInt(body.bannerIndex);
      if (index >= 0 && index < banners.length) {
        updated = true;
        console.log(`Set default banner ${index} for ${exam.name}`);
      }
    }

    if (body.action === "removeBanner") {
      const index = parseInt(body.bannerIndex);
      if (index >= 0 && index < banners.length) {
        // Delete physical file
        const examSlug = createSlug(exam.name);
        const bannerDir = path.join(publicDir, "images", "banner", examSlug);
        const filename = banners[index].filename;
        const filePath = path.join(bannerDir, filename);
        
        if (existsSync(filePath)) {
          await unlink(filePath);
          updated = true;
          console.log(`Deleted banner: ${filename}`);
        }
      }
    }

    if (!updated) {
      return NextResponse.json({ success: false, message: "No valid updates" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: await getExamBanners(examId, exam.name),
      message: "Banner updated successfully"
    });

  } catch (error) {
    console.error("PUT /discussion/banner error:", error);
    return NextResponse.json({ success: false, message: "Failed to update banner" }, { status: 500 });
  }
}
