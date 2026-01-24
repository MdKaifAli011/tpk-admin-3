import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// POST - Track a visit
export async function POST(request) {
  try {
    const { level, itemId, itemSlug, referrer, sessionId, userId, metadata } = await request.json();

    if (!level || !itemId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

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
        success: false, 
        blocked: true,
        message: 'IP is blocked from visit tracking' 
      });
    }

    // Check for existing visit from same IP in last hour (to avoid counting refreshes)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingVisit = await db.collection('visits').findOne({
      level,
      itemId,
      ipAddress: ip,
      visitDate: { $gte: oneHourAgo }
    });

    if (existingVisit) {
      return NextResponse.json({ 
        success: true, 
        message: 'Visit already tracked recently',
        existing: true 
      });
    }

    // Create new visit record
    const visit = {
      level,
      itemId,
      itemSlug,
      ipAddress: ip,
      userAgent,
      referrer: referrer || 'direct',
      visitDate: new Date(),
      sessionId: sessionId || `session_${Date.now()}`,
      userId: userId || null,
      isActive: true,
      metadata: metadata || {},
      createdAt: new Date()
    };

    const result = await db.collection('visits').insertOne(visit);

    // Update visit statistics (for faster querying)
    await updateVisitStats(db, level, itemId);

    return NextResponse.json({ 
      success: true, 
      data: { ...visit, _id: result.insertedId },
      message: 'Visit tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking visit:', error);
    return NextResponse.json({ 
      error: 'Failed to track visit' 
    }, { status: 500 });
  }
}

// GET - Get visit statistics for a specific item
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const itemId = searchParams.get('itemId');

    if (!level || !itemId) {
      return NextResponse.json({ error: 'Missing level or itemId' }, { status: 400 });
    }

    const db = await connectDB();

    // Get comprehensive visit statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalVisits,
      uniqueVisits,
      todayVisits,
      weeklyVisits,
      monthlyVisits,
      topReferrers,
      recentVisits
    ] = await Promise.all([
      // Total visits
      db.collection('visits').countDocuments({ level, itemId }),
      
      // Unique visits (by IP)
      db.collection('visits').distinct('ipAddress', { level, itemId }),
      
      // Today's visits
      db.collection('visits').countDocuments({ 
        level, 
        itemId, 
        visitDate: { $gte: today } 
      }),
      
      // Weekly visits
      db.collection('visits').countDocuments({ 
        level, 
        itemId, 
        visitDate: { $gte: weekAgo } 
      }),
      
      // Monthly visits
      db.collection('visits').countDocuments({ 
        level, 
        itemId, 
        visitDate: { $gte: monthAgo } 
      }),
      
      // Top referrers
      db.collection('visits').aggregate([
        { $match: { level, itemId } },
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray(),
      
      // Recent visits
      db.collection('visits').find({ level, itemId })
        .sort({ visitDate: -1 })
        .limit(20)
        .toArray()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalVisits,
        uniqueVisits: uniqueVisits.length,
        todayVisits,
        weeklyVisits,
        monthlyVisits,
        topReferrers: topReferrers.map(r => ({ 
          source: r._id === 'direct' ? 'Direct Access' : r._id, 
          count: r.count 
        })),
        recentVisits: recentVisits.map(visit => ({
          ipAddress: visit.ipAddress,
          visitDate: visit.visitDate,
          referrer: visit.referrer,
          userAgent: visit.userAgent.substring(0, 100) + '...'
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching visit statistics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch visit statistics' 
    }, { status: 500 });
  }
}

// Helper function to update visit statistics
async function updateVisitStats(db, level, itemId) {
  try {
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Update daily statistics
    await db.collection('visit_stats').updateOne(
      { 
        level, 
        itemId, 
        date: todayKey 
      },
      {
        $inc: { visits: 1 },
        $setOnInsert: { 
          level, 
          itemId, 
          date: todayKey,
          createdAt: new Date()
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

    // Update overall statistics
    await db.collection('visit_stats').updateOne(
      { 
        level, 
        itemId, 
        date: 'total' 
      },
      {
        $inc: { visits: 1 },
        $setOnInsert: { 
          level, 
          itemId, 
          date: 'total',
          createdAt: new Date()
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

  } catch (error) {
    console.error('Error updating visit stats:', error);
  }
}
