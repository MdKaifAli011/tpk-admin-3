import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import { verifyToken } from "@/lib/auth";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (e) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }
    if (!decoded?.userId && !decoded?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const count = await Lead.countDocuments({ status: { $in: ["new", "updated"] } });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("GET /api/lead/pending-count error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get pending lead count" },
      { status: 500 }
    );
  }
}
