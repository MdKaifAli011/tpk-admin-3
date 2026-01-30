import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// POST - Create new IP block
export async function POST(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ipAddress, reason, description, expiresAt, isActive } = await request.json();

    if (!ipAddress || !reason) {
      return NextResponse.json({ 
        error: 'IP address and reason are required' 
      }, { status: 400 });
    }

    // Validate IP address format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      return NextResponse.json({ 
        error: 'Invalid IP address format' 
      }, { status: 400 });
    }

    const db = await connectDB();
    
    const normalizedIp = String(ipAddress).trim().toLowerCase();

    // Check if IP is already blocked
    const existingBlock = await db.collection('ip_blocks').findOne({ 
      ipAddress: normalizedIp,
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (existingBlock) {
      return NextResponse.json({ 
        error: 'IP address is already blocked' 
      }, { status: 400 });
    }

    const ipBlock = {
      ipAddress: normalizedIp,
      reason,
      description: description || '',
      isActive: isActive !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      blockedBy: new ObjectId(admin.userId),
      blockedAt: new Date(),
      accessAttempts: 0,
      lastAccessAttempt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('ip_blocks').insertOne(ipBlock);

    return NextResponse.json({ 
      success: true, 
      data: { ...ipBlock, _id: result.insertedId }
    });

  } catch (error) {
    console.error('Error creating IP block:', error);
    return NextResponse.json({ 
      error: 'Failed to create IP block' 
    }, { status: 500 });
  }
}

// GET - Get all blocked IPs
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const status = searchParams.get('status'); // active, inactive, expired

    const db = await connectDB();

    // Build query
    let query = {};
    if (status === 'active') {
      query = {
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      };
    } else if (status === 'inactive') {
      query = { isActive: false };
    } else if (status === 'expired') {
      query = {
        isActive: true,
        expiresAt: { $lt: new Date() }
      };
    }

    // Get blocked IPs with pagination
    const skip = (page - 1) * limit;
    
    const [blockedIPs, totalCount] = await Promise.all([
      db.collection('ip_blocks')
        .find(query)
        .sort({ blockedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('ip_blocks').countDocuments(query)
    ]);

    // Populate blockedBy user info
    const blockedIPsWithUsers = await Promise.all(
      blockedIPs.map(async (ipBlock) => {
        if (ipBlock.blockedBy) {
          const blockedByUser = await db.collection('users').findOne(
            { _id: ipBlock.blockedBy },
            { name: 1, email: 1 }
          );
          ipBlock.blockedBy = blockedByUser;
        }
        return ipBlock;
      })
    );

    // Get statistics
    const stats = await db.collection('ip_blocks').aggregate([
      {
        $group: {
          _id: null,
          totalBlocked: { $sum: 1 },
          activeBlocks: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$isActive', true] },
                  { $or: [
                    { $eq: ['$expiresAt', null] },
                    { $gt: ['$expiresAt', new Date()] }
                  ]}
                ]},
                1, 0
              ]
            }
          },
          expiredBlocks: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$isActive', true] },
                  { $lt: ['$expiresAt', new Date()] }
                ]},
                1, 0
              ]
            }
          },
          inactiveBlocks: {
            $sum: {
              $cond: [{ $eq: ['$isActive', false] }, 1, 0]
            }
          },
          todayAttempts: {
            $sum: {
              $cond: [
                { $gte: ['$lastAccessAttempt', new Date(new Date().setHours(0,0,0,0))] },
                '$accessAttempts', 0
              ]
            }
          }
        }
      }
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: blockedIPsWithUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: stats[0] || {
        totalBlocked: 0,
        activeBlocks: 0,
        expiredBlocks: 0,
        inactiveBlocks: 0,
        todayAttempts: 0,
      }
    });

  } catch (error) {
    console.error('Error fetching blocked IPs:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch blocked IPs' 
    }, { status: 500 });
  }
}

// PUT - Update IP block
export async function PUT(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'IP block ID is required' }, { status: 400 });
    }

    const { ipAddress, reason, description, expiresAt, isActive } = await request.json();

    const db = await connectDB();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid IP block ID' }, { status: 400 });
    }

    // Validate IP address format if provided
    if (ipAddress) {
      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (!ipRegex.test(ipAddress)) {
        return NextResponse.json({ 
          error: 'Invalid IP address format' 
        }, { status: 400 });
      }
    }

    // Build update object
    const updateData = {};
    if (ipAddress) updateData.ipAddress = String(ipAddress).trim().toLowerCase();
    if (reason) updateData.reason = reason;
    if (description !== undefined) updateData.description = description;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    updateData.updatedAt = new Date();
    updateData.updatedBy = new ObjectId(admin.userId);

    const result = await db.collection('ip_blocks').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'IP block not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'IP block updated successfully' 
    });

  } catch (error) {
    console.error('Error updating IP block:', error);
    return NextResponse.json({ 
      error: 'Failed to update IP block' 
    }, { status: 500 });
  }
}

// DELETE - Delete IP block
export async function DELETE(request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'IP block ID is required' }, { status: 400 });
    }

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid IP block ID' }, { status: 400 });
    }

    const db = await connectDB();

    const result = await db.collection('ip_blocks').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'IP block not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'IP block deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting IP block:', error);
    return NextResponse.json({ 
      error: 'Failed to delete IP block' 
    }, { status: 500 });
  }
}
