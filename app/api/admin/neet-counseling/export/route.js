import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import NeetCounselingAllotment from "@/models/NeetCounselingAllotment";
import { requireAuth } from "@/middleware/authMiddleware";
import { arrayToCSV } from "@/utils/csvParser";

const BASE_HEADERS = [
  "examSlug",
  "round",
  "sourceYear",
  "serialNo",
  "rank",
  "quota",
  "institute",
  "course",
  "allottedCategory",
  "candidateCategory",
  "remarks",
  "state",
  "instituteType",
];

const ROUND1_HEADERS = [
  "round1Quota",
  "round1Institute",
  "round1Course",
  "round1Status",
];

const ROUND2_HEADERS = [
  "round2Quota",
  "round2Institute",
  "round2Course",
  "round2OptionNo",
  "round2Outcome",
];

const ROUND3_HEADERS = [
  "round3Quota",
  "round3Institute",
  "round3Course",
  "round3Status",
  "round3OptionNo",
  "round3Outcome",
];

function getHeadersForRound(round) {
  const r = String(round).trim() || "1";
  if (r === "1") return [...BASE_HEADERS, ...ROUND1_HEADERS];
  if (r === "2") return [...BASE_HEADERS, ...ROUND1_HEADERS, ...ROUND2_HEADERS];
  return [...BASE_HEADERS, ...ROUND1_HEADERS, ...ROUND2_HEADERS, ...ROUND3_HEADERS];
}

export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const round = searchParams.get("round") || "1";
    const year = searchParams.get("year") || "2025";

    const CSV_HEADERS = getHeadersForRound(round);

    const filter = { examSlug: "neet", round, sourceYear: year };
    const limit = 100000;
    const docs = await NeetCounselingAllotment.find(filter)
      .sort({ serialNo: 1 })
      .limit(limit)
      .lean();

    const rows = docs.map((d) => {
      const row = {};
      CSV_HEADERS.forEach((h) => {
        let v = d[h];
        if (v === undefined || v === null) v = "";
        row[h] = v;
      });
      return row;
    });

    const csvContent =
      rows.length > 0
        ? arrayToCSV(rows, CSV_HEADERS)
        : CSV_HEADERS.join(",") + "\n";

    const filename = `neet-counseling-round${round}-${year}-${new Date().toISOString().split("T")[0]}.csv`;
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("NEET counseling export error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Export failed" },
      { status: 500 }
    );
  }
}
