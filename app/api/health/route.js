import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";

/**
 * GET /api/health
 * For VPS/load balancer health checks. No auth required.
 * With basePath: https://yourdomain.com/self-study/api/health
 */
export async function GET() {
  try {
    await connectDB();
    const dbState = mongoose.connection.readyState;
    const dbStatus =
      dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

    return NextResponse.json({
      status: dbState === 1 ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: Math.round(process.uptime()),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error?.message || "Health check failed",
      },
      { status: 500 }
    );
  }
}
