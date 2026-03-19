import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import NeetCounselingAllotment from "@/models/NeetCounselingAllotment";
import { requireAuth } from "@/middleware/authMiddleware";
import { parseCSV } from "@/utils/csvParser";

function normalizeHeader(h) {
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getAllowedKeysForRound(round) {
  const r = String(round).trim() || "1";
  const base = ["examslug", "round", "sourceyear", "serialno", "rank", "quota", "institute", "course", "allottedcategory", "candidatecategory", "remarks", "state", "institutetype"];
  const r1 = ["round1quota", "round1institute", "round1course", "round1status"];
  const r2 = ["round2quota", "round2institute", "round2course", "round2optionno", "round2outcome"];
  const r3 = ["round3quota", "round3institute", "round3course", "round3status", "round3optionno", "round3outcome"];
  if (r === "1") return new Set([...base, ...r1]);
  if (r === "2") return new Set([...base, ...r1, ...r2]);
  return new Set([...base, ...r1, ...r2, ...r3]);
}

const KEY_MAP = {
  examslug: "examSlug",
  round: "round",
  sourceyear: "sourceYear",
  serialno: "serialNo",
  rank: "rank",
  quota: "quota",
  institute: "institute",
  course: "course",
  allottedcategory: "allottedCategory",
  candidatecategory: "candidateCategory",
  remarks: "remarks",
  round1quota: "round1Quota",
  round1institute: "round1Institute",
  round1course: "round1Course",
  round1status: "round1Status",
  round2quota: "round2Quota",
  round2institute: "round2Institute",
  round2course: "round2Course",
  round2optionno: "round2OptionNo",
  round2outcome: "round2Outcome",
  round3quota: "round3Quota",
  round3institute: "round3Institute",
  round3course: "round3Course",
  round3status: "round3Status",
  round3optionno: "round3OptionNo",
  round3outcome: "round3Outcome",
  state: "state",
  institutetype: "instituteType",
};

function rowToDoc(row, roundOverride, yearOverride, allowedKeysSet) {
  const doc = {};
  Object.keys(row).forEach((k) => {
    const n = normalizeHeader(k);
    if (allowedKeysSet.has(n)) {
      const key = KEY_MAP[n] || n;
      let val = row[k] != null ? String(row[k]).trim() : "";
      if (key === "serialNo" || key === "rank") {
        const num = parseInt(val, 10);
        doc[key] = Number.isNaN(num) ? 0 : num;
      } else {
        doc[key] = val;
      }
    }
  });
  doc.examSlug = doc.examSlug || "neet";
  doc.round = roundOverride || doc.round || "1";
  doc.sourceYear = yearOverride || doc.sourceYear || "2025";
  if (doc.serialNo == null) doc.serialNo = 0;
  if (doc.rank == null) doc.rank = 0;
  const INSTITUTE_TYPES = ["aiims_ini", "deemed", "government", "private", "other"];
  const allModelKeys = [
    "examSlug", "round", "sourceYear", "serialNo", "rank", "quota", "institute", "course",
    "allottedCategory", "candidateCategory", "remarks",
    "round1Quota", "round1Institute", "round1Course", "round1Status",
    "round2Quota", "round2Institute", "round2Course", "round2OptionNo", "round2Outcome",
    "round3Quota", "round3Institute", "round3Course", "round3Status", "round3OptionNo", "round3Outcome",
    "state", "instituteType",
  ];
  const out = {};
  allModelKeys.forEach((k) => {
    let v = doc[k] !== undefined ? doc[k] : "";
    if (k === "instituteType" && (typeof v !== "string" || !INSTITUTE_TYPES.includes(v))) {
      v = "other";
    }
    out[k] = v;
  });
  return out;
}

export async function POST(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const round = (formData.get("round") || "1").trim() || "1";
    const year = (formData.get("year") || "2025").trim() || "2025";
    const replace = formData.get("replace") === "true" || formData.get("replace") === "1";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid file" },
        { status: 400 }
      );
    }

    const text = await file.text();
    let data;
    try {
      data = parseCSV(text);
    } catch (e) {
      return NextResponse.json(
        { success: false, message: "Invalid CSV: " + (e.message || "parse error") },
        { status: 400 }
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, message: "CSV has no data rows" },
        { status: 400 }
      );
    }

    const allowedKeysSet = getAllowedKeysForRound(round);
    const docs = data.map((row) => rowToDoc(row, round, year, allowedKeysSet));
    const errors = [];
    docs.forEach((d, i) => {
      if (d.rank < 1 && d.serialNo < 1) {
        errors.push(`Row ${i + 2}: rank or serialNo must be set`);
      }
    });
    if (errors.length > 50) {
      return NextResponse.json({
        success: false,
        message: `Too many validation errors (${errors.length}). First: ${errors[0]}`,
      }, { status: 400 });
    }
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: errors.slice(0, 5).join("; "),
      }, { status: 400 });
    }

    await connectDB();

    let deleted = 0;
    let insertedCount = 0;
    let modifiedCount = 0;

    if (replace) {
      const result = await NeetCounselingAllotment.deleteMany({
        examSlug: "neet",
        round,
        sourceYear: year,
      });
      deleted = result.deletedCount;
    }

    const BATCH = 1000;

    if (replace) {
      for (let i = 0; i < docs.length; i += BATCH) {
        const batch = docs.slice(i, i + BATCH);
        await NeetCounselingAllotment.insertMany(batch, { ordered: false });
        insertedCount += batch.length;
      }
    } else {
      for (let i = 0; i < docs.length; i += BATCH) {
        const batch = docs.slice(i, i + BATCH);
        const ops = batch.map((doc) => ({
          updateOne: {
            filter: {
              examSlug: "neet",
              round,
              sourceYear: year,
              serialNo: doc.serialNo,
            },
            update: { $set: doc },
            upsert: true,
          },
        }));
        const result = await NeetCounselingAllotment.bulkWrite(ops, { ordered: false });
        insertedCount += result.insertedCount ?? 0;
        modifiedCount += result.modifiedCount ?? 0;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: insertedCount + modifiedCount,
        inserted: insertedCount,
        updated: modifiedCount,
        replaced: deleted,
        total: insertedCount + modifiedCount,
      },
    });
  } catch (error) {
    console.error("NEET counseling import error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Import failed" },
      { status: 500 }
    );
  }
}
