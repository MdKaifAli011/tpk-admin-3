import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { logger } from '@/utils/logger';

export const dynamic = 'force-dynamic';

// POST - Check if IP is blocked
export async function POST(request) {
  logger.info('VisitTracking check-ip hit');
  try {
    // Get client IP (normalize for comparison with stored blocks)
    const forwarded = request.headers.get('x-forwarded-for');
    const rawIp = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
    const ip = String(rawIp).trim().toLowerCase();

    const db = await connectDB();

    // Check if IP is blocked
    const blockedIP = await db.collection('ip_blocks').findOne({
      ipAddress: ip,
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (blockedIP) {
      // Update access attempt for blocked IP
      await db.collection('ip_blocks').updateOne(
        { _id: blockedIP._id },
        {
          $inc: { accessAttempts: 1 },
          $set: { lastAccessAttempt: new Date() }
        }
      );

      return NextResponse.json({ 
        success: true,
        isBlocked: true,
        ipAddress: ip,
        blockedReason: blockedIP.reason,
        message: 'IP is blocked from visit tracking',
        saved: true,
        checked: true
      });
    }

    return NextResponse.json({ 
      success: true,
      isBlocked: false,
      ipAddress: ip,
      message: 'IP is allowed for visit tracking',
      saved: true,
      checked: true
    });

  } catch (error) {
    logger.error('Error checking IP', { error: error?.message });
    return NextResponse.json({ 
      success: false,
      error: 'Failed to check IP status' 
    }, { status: 500 });
  }
}
