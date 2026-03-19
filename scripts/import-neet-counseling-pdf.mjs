/**
 * Import NEET-UG counselling allotment PDF into MongoDB.
 *
 * Usage:
 *   node scripts/import-neet-counseling-pdf.mjs
 *   node scripts/import-neet-counseling-pdf.mjs --pdf=./docs/other.pdf --round=2
 *   node scripts/import-neet-counseling-pdf.mjs --dry-run
 *
 * Round 1 default PDF: docs/20250813289226788.pdf
 * Round 2 default PDF: docs/202509182057444522.pdf
 * Round 3 default PDF: docs/202510231856675154.pdf
 *
 *   node scripts/import-neet-counseling-pdf.mjs --round=3
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { PDFParse } from "pdf-parse";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

import {
  parseNeetCounselingPdfText,
  parseNeetCounselingRound2PdfText,
  parseNeetCounselingRound3PdfText,
} from "./neet-counseling-parser.mjs";
import NeetCounselingAllotment from "../models/NeetCounselingAllotment.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_R1 = path.join(__dirname, "..", "docs", "20250813289226788.pdf");
const PDF_R2 = path.join(__dirname, "..", "docs", "202509182057444522.pdf");
const PDF_R3 = path.join(__dirname, "..", "docs", "202510231856675154.pdf");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const roundArg = args.find((a) => a.startsWith("--round="));
const pdfArg = args.find((a) => a.startsWith("--pdf="));
const round = roundArg ? roundArg.split("=")[1] : "1";
const pdfPath = pdfArg
  ? path.resolve(pdfArg.split("=")[1])
  : round === "3"
    ? PDF_R3
    : round === "2"
      ? PDF_R2
      : PDF_R1;

async function main() {
  if (!fs.existsSync(pdfPath)) {
    console.error("PDF not found:", pdfPath);
    process.exit(1);
  }

  console.log("Reading PDF:", pdfPath);
  const buf = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buf });
  const textResult = await parser.getText();
  await parser.destroy();
  const text = textResult.text || "";
  console.log("Extracted text length:", text.length);

  const rows =
    round === "3"
      ? parseNeetCounselingRound3PdfText(text)
      : round === "2"
        ? parseNeetCounselingRound2PdfText(text)
        : parseNeetCounselingPdfText(text);
  console.log("Parsed rows:", rows.length, "(round", round + ")");
  const minExpected = round === "3" ? 500 : 1000;
  if (rows.length < minExpected) {
    console.warn("Warning: unusually few rows; check PDF format.");
  }
  if (rows[0]) console.log("Sample:", JSON.stringify(rows[0], null, 2));

  if (dryRun) {
    console.log("--dry-run: not writing to DB.");
    process.exit(0);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI missing in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const del = await NeetCounselingAllotment.deleteMany({ examSlug: "neet", round });
  console.log("Deleted existing round", round, "count:", del.deletedCount);

  const BATCH = 800;
  const year = "2025";
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({
      ...r,
      examSlug: "neet",
      round,
      sourceYear: year,
    }));
    await NeetCounselingAllotment.insertMany(batch, { ordered: false });
    inserted += batch.length;
    console.log("Inserted", inserted, "/", rows.length);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
