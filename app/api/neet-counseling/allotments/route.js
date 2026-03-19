import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import NeetCounselingAllotment from "@/models/NeetCounselingAllotment";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const round = searchParams.get("round") || "1";
    const year = (searchParams.get("year") || "").trim() || "2025";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const q = (searchParams.get("q") || "").trim();
    const rankMin = searchParams.get("rankMin");
    const rankMax = searchParams.get("rankMax");
    const quota = (searchParams.get("quota") || "").trim();
    const course = (searchParams.get("course") || "").trim();
    const state = (searchParams.get("state") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const instituteType = (searchParams.get("instituteType") || "").trim();
    const sort = searchParams.get("sort") || "serial_asc";

    const filter = { examSlug: "neet", round, sourceYear: year };
    const andParts = [];

    const rMin = rankMin != null && rankMin !== "" ? parseInt(rankMin, 10) : null;
    const rMax = rankMax != null && rankMax !== "" ? parseInt(rankMax, 10) : null;
    if (rMin !== null && !Number.isNaN(rMin)) {
      filter.rank = { ...filter.rank, $gte: rMin };
    }
    if (rMax !== null && !Number.isNaN(rMax)) {
      filter.rank = { ...filter.rank, $lte: rMax };
    }

    if (quota && quota !== "all") {
      const map = {
        ai: "All India",
        open: "Open Seat Quota",
        nri: "Non-Resident Indian",
        deemed: "Deemed",
        du: "Delhi University",
        ip: "IP University",
        esi: "Employees State Insurance",
      };
      const key = map[quota.toLowerCase()] || quota;
      if (String(key).toLowerCase() === "deemed") {
        filter.quota = { $regex: /deemed|paid seats/i };
      } else {
        filter.quota = {
          $regex: new RegExp(String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        };
      }
    }

    if (course && course !== "all") {
      filter.course = course;
    }

    if (state && state !== "all") {
      filter.state = { $regex: new RegExp(state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };
    }

    if (instituteType && instituteType !== "all") {
      filter.instituteType = instituteType;
    }

    if (category && category !== "all") {
      const cat = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andParts.push({
        $or: [
          { allottedCategory: { $regex: new RegExp(cat, "i") } },
          { candidateCategory: { $regex: new RegExp(cat, "i") } },
        ],
      });
    }

    if (q.length >= 2) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const word = new RegExp(esc, "i");
      const searchFields =
        round === "3"
          ? [
              { institute: word },
              { quota: word },
              { remarks: word },
              { round1Institute: word },
              { round2Institute: word },
              { round3Institute: word },
            ]
          : [{ institute: word }, { quota: word }, { remarks: word }];
      andParts.push({ $or: searchFields });
    }

    if (andParts.length) {
      filter.$and = andParts;
    }

    let sortObj = { serialNo: 1 };
    if (sort === "rank_asc") sortObj = { rank: 1 };
    if (sort === "rank_desc") sortObj = { rank: -1 };

    const [items, total] = await Promise.all([
      NeetCounselingAllotment.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      NeetCounselingAllotment.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, message: e.message || "Server error" },
      { status: 500 }
    );
  }
}
