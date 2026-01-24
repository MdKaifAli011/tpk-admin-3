import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DiscussionBanner from "@/models/DiscussionBanner";
import { verifyToken } from "@/lib/auth";

// GET: Fetch discussion banner by exam ID
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    if (!examId) {
      return NextResponse.json(
        { success: false, message: "Exam ID is required" },
        { status: 400 }
      );
    }

    const banner = await DiscussionBanner.findOne({ 
      examId, 
      isActive: true 
    }).populate('examId', 'name slug');

    return NextResponse.json({
      success: true,
      data: banner
    });

  } catch (error) {
    console.error("Error fetching discussion banner:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch banner" },
      { status: 500 }
    );
  }
}

// POST: Upload or update discussion banner
export async function POST(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();

    // Validate required fields
    if (!body.examId || !body.bannerImage) {
      return NextResponse.json(
        { success: false, message: "Exam ID and banner image are required" },
        { status: 400 }
      );
    }

    // Upsert banner (create if not exists, update if exists)
    const banner = await DiscussionBanner.findOneAndUpdate(
      { examId: body.examId },
      {
        examId: body.examId,
        bannerImage: body.bannerImage,
        altText: body.altText || 'Discussion Forum Banner',
        isActive: body.isActive !== undefined ? body.isActive : true
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true 
      }
    ).populate('examId', 'name slug');

    return NextResponse.json({
      success: true,
      data: banner,
      message: "Banner uploaded successfully"
    });

  } catch (error) {
    console.error("Error uploading discussion banner:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload banner" },
      { status: 500 }
    );
  }
}

// PUT: Update discussion banner
export async function PUT(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    if (!examId) {
      return NextResponse.json(
        { success: false, message: "Exam ID is required" },
        { status: 400 }
      );
    }

    const banner = await DiscussionBanner.findOneAndUpdate(
      { examId },
      body,
      { 
        new: true,
        runValidators: true 
      }
    ).populate('examId', 'name slug');

    if (!banner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: banner,
      message: "Banner updated successfully"
    });

  } catch (error) {
    console.error("Error updating discussion banner:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update banner" },
      { status: 500 }
    );
  }
}

// DELETE: Delete discussion banner
export async function DELETE(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    if (!examId) {
      return NextResponse.json(
        { success: false, message: "Exam ID is required" },
        { status: 400 }
      );
    }

    const banner = await DiscussionBanner.findOneAndDelete({ examId });

    if (!banner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Banner deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting discussion banner:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete banner" },
      { status: 500 }
    );
  }
}
