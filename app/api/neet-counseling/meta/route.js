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
    const base = { examSlug: "neet", round, sourceYear: year };

    const count = await NeetCounselingAllotment.countDocuments(base);
    const yearsAgg = await NeetCounselingAllotment.aggregate([
      { $match: { examSlug: "neet" } },
      { $group: { _id: "$sourceYear" } },
      { $match: { _id: { $nin: ["", null] } } },
      { $sort: { _id: -1 } },
      { $limit: 10 },
    ]);
    const years = (yearsAgg || []).map((x) => String(x._id)).filter(Boolean);

    if (count === 0) {
      return NextResponse.json({
        success: true,
        data: {
          count: 0,
          year,
          years,
          rankMin: null,
          rankMax: null,
          byCourse: [],
          byQuotaSample: [],
          nriCount: 0,
          states: [],
        },
      });
    }

    const [rankBounds, byCourse, nriCount, statesAgg] = await Promise.all([
      NeetCounselingAllotment.aggregate([
        { $match: base },
        { $group: { _id: null, min: { $min: "$rank" }, max: { $max: "$rank" } } },
      ]),
      NeetCounselingAllotment.aggregate([
        { $match: base },
        { $group: { _id: "$course", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ]),
      NeetCounselingAllotment.countDocuments({
        ...base,
        quota: { $regex: /non-resident|nri/i },
      }),
      NeetCounselingAllotment.aggregate([
        { $match: { ...base, state: { $nin: ["", null] } } },
        { $group: { _id: "$state", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 40 },
      ]),
    ]);

    const rb = rankBounds[0] || {};
    const collegeAgg = await NeetCounselingAllotment.aggregate([
      { $match: base },
      {
        $project: {
          shortName: {
            $trim: {
              input: { $arrayElemAt: [{ $split: ["$institute", ","] }, 0] },
            },
          },
        },
      },
      { $group: { _id: "$shortName" } },
      { $match: { _id: { $nin: ["", null] } } },
      { $count: "n" },
    ]);
    const uniqueCollegeNames = collegeAgg[0]?.n ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        count,
        year,
        years,
        rankMin: rb.min ?? null,
        rankMax: rb.max ?? null,
        uniqueCollegeNames,
        byCourse: byCourse.map((x) => ({ course: x._id, count: x.n })),
        nriCount,
        states: statesAgg.map((x) => ({ state: x._id, count: x.n })),
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
