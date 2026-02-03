import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logger } from "@/utils/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 3600; // 1 hour – for 1L+ docs per level, batched to avoid DB overload

const CRON_SECRET = process.env.CRON_SECRET;

// Batch size for bulk updates – larger = fewer round-trips but more DB load per batch
const BATCH_SIZE = 1000;
// Delay between batches (ms) – keeps DB load low; ~1hr budget for 7 levels × many entities
const DELAY_BETWEEN_BATCHES_MS = 2500;

// Level -> MongoDB collection name (Mongoose default plural)
const LEVEL_COLLECTIONS = {
  exam: "exams",
  subject: "subjects",
  unit: "units",
  chapter: "chapters",
  topic: "topics",
  subtopic: "subtopics",
  definition: "definitions",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Only allow run between 3:00 AM and 3:59 AM (server time).
 */
function isWithinCronWindow() {
  const now = new Date();
  return now.getHours() === 3;
}

/**
 * GET /api/cron/update-visit-stats
 * Runs once in the 3–4 AM window. Updates only entities that have visit data (in
 * visit_stats or visits), not every document in the DB – so only “visited” items
 * get their visitStats refreshed. Uses aggregations + batched bulk updates.
 *
 * TEST: ?test=1 with secret to run anytime.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const tokenFromQuery = searchParams.get("secret");
    const token = tokenFromHeader || tokenFromQuery;
    const isTestRun = searchParams.get("test") === "1" || searchParams.get("dryRun") === "1";

    if (!CRON_SECRET || token !== CRON_SECRET) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message:
            "Missing or invalid secret. Send CRON_SECRET via header: Authorization: Bearer <secret> or query: ?secret=<secret>. Use ?test=1 to run outside 3–4 AM.",
        },
        { status: 401 }
      );
    }

    if (!isTestRun && !isWithinCronWindow()) {
      const serverNow = new Date();
      logger.info("cron update-visit-stats rejected – outside window", {
        serverTime: serverNow.toISOString(),
        hour: serverNow.getHours(),
      });
      return NextResponse.json(
        {
          ok: false,
          message:
            "Cron only runs between 3:00 AM and 3:59 AM (server time). To run now, add &test=1 to your URL.",
          runNowHint: "Use: .../update-visit-stats?secret=YOUR_SECRET&test=1",
          serverTime: serverNow.toISOString(),
          serverHour: serverNow.getHours(),
        },
        { status: 400 }
      );
    }

    const startMs = Date.now();
    logger.info("cron update-visit-stats running (batched)", { testRun: isTestRun });

    const db = await connectDB();
    const now = new Date();
    const todayKey = now.toISOString().split("T")[0];

    const results = { processed: 0, errors: 0, byLevel: {} };

    for (const [level, collectionName] of Object.entries(LEVEL_COLLECTIONS)) {
      const levelStartMs = Date.now();
      const collection = db.collection(collectionName);
      const visitStatsCol = db.collection("visit_stats");
      const visitsCol = db.collection("visits");

      // 1) Aggregation: visit_stats total + today per itemId (only items with visit data)
      const statsFromVisitStats = await visitStatsCol
        .aggregate([
          { $match: { level, date: { $in: ["total", todayKey] } } },
          {
            $group: {
              _id: "$itemId",
              total: { $sum: { $cond: [{ $eq: ["$date", "total"] }, "$visits", 0] } },
              today: { $sum: { $cond: [{ $eq: ["$date", todayKey] }, "$visits", 0] } },
            },
          },
        ])
        .toArray();

      // 2) Aggregation: unique IP count per itemId from visits
      const uniqueFromVisits = await visitsCol
        .aggregate([
          { $match: { level } },
          { $group: { _id: "$itemId", ips: { $addToSet: "$ipAddress" } } },
          { $project: { itemId: "$_id", uniqueCount: { $size: "$ips" } } },
        ])
        .toArray();

      const statsByItemId = {};
      const key = (v) => (v != null ? String(v) : "");
      for (const row of statsFromVisitStats) {
        statsByItemId[key(row._id)] = { totalVisits: row.total, todayVisits: row.today, uniqueVisits: 0 };
      }
      for (const row of uniqueFromVisits) {
        const k = key(row.itemId ?? row._id);
        if (!statsByItemId[k]) statsByItemId[k] = { totalVisits: 0, todayVisits: 0, uniqueVisits: 0 };
        statsByItemId[k].uniqueVisits = row.uniqueCount ?? 0;
      }

      // 3) Only update entities that have visit data (no update for never-visited items)
      const visitedItemIds = Object.keys(statsByItemId);
      if (visitedItemIds.length === 0) {
        results.byLevel[level] = { processed: 0, errors: 0 };
        continue;
      }

      const objectIds = [];
      for (const id of visitedItemIds) {
        try {
          objectIds.push(new ObjectId(id));
        } catch {
          // skip invalid ObjectIds
        }
      }
      if (objectIds.length === 0) {
        results.byLevel[level] = { processed: 0, errors: 0 };
        continue;
      }

      const idDocs = await collection.find({ _id: { $in: objectIds } }).project({ _id: 1 }).toArray();
      const ids = idDocs.map((d) => ({ _id: d._id, itemId: d._id.toString() }));

      // 4) Batched bulk updates (only visited entities)
      let levelProcessed = 0;
      let levelErrors = 0;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const chunk = ids.slice(i, i + BATCH_SIZE);
        const ops = chunk.map(({ _id, itemId }) => {
          const s = statsByItemId[itemId] || { totalVisits: 0, todayVisits: 0, uniqueVisits: 0 };
          return {
            updateOne: {
              filter: { _id: new ObjectId(_id) },
              update: {
                $set: {
                  visitStats: {
                    totalVisits: s.totalVisits,
                    todayVisits: s.todayVisits,
                    uniqueVisits: s.uniqueVisits,
                    lastUpdated: now,
                  },
                },
              },
            },
          };
        });

        try {
          await collection.bulkWrite(ops, { ordered: false });
          levelProcessed += chunk.length;
          results.processed += chunk.length;
        } catch (err) {
          logger.error("cron visit-stats batch failed", { level, batchIndex: i / BATCH_SIZE, error: err.message });
          levelErrors += chunk.length;
          results.errors += chunk.length;
        }

        if (i + BATCH_SIZE < ids.length) {
          await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
      }

      results.byLevel[level] = { processed: levelProcessed, errors: levelErrors, visitedOnly: ids.length };
      const levelDurationMs = Date.now() - levelStartMs;
      logger.info("cron update-visit-stats level done (visited only)", {
        level,
        updatedCount: ids.length,
        durationMs: levelDurationMs,
        durationReadable: `${(levelDurationMs / 1000).toFixed(2)}s`,
      });
    }

    const durationMs = Date.now() - startMs;
    const durationSec = (durationMs / 1000).toFixed(2);
    logger.info("cron update-visit-stats finished", {
      durationMs,
      durationReadable: `${durationSec}s`,
      totalEntities: results.processed,
      errors: results.errors,
    });

    return NextResponse.json({
      ok: true,
      message: isTestRun
        ? "Visit stats updated (visited entities only – test run)"
        : "Visit stats updated (visited entities only)",
      testRun: isTestRun,
      results,
      durationMs,
      durationReadable: `${durationSec}s`,
      totalEntities: results.processed,
      note: "Only entities with visit data (in visit_stats or visits) are updated; never-visited items are skipped.",
      batchSize: BATCH_SIZE,
      delayBetweenBatchesMs: DELAY_BETWEEN_BATCHES_MS,
    });
  } catch (error) {
    logger.error("cron update-visit-stats failed", { error: error?.message });
    return NextResponse.json(
      { ok: false, error: error.message || "Cron failed" },
      { status: 500 }
    );
  }
}
