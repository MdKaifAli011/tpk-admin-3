import mongoose from "mongoose";

const neetCounselingAllotmentSchema = new mongoose.Schema(
  {
    examSlug: { type: String, required: true, default: "neet", index: true },
    round: { type: String, required: true, index: true }, // e.g. "1"
    sourceYear: { type: String, default: "2025" },
    serialNo: { type: Number, required: true, index: true },
    rank: { type: Number, required: true, index: true },
    quota: { type: String, default: "" },
    institute: { type: String, default: "" },
    course: { type: String, default: "" },
    allottedCategory: { type: String, default: "" },
    candidateCategory: { type: String, default: "" },
    remarks: { type: String, default: "" },
    /** Round 2 PDF only: prior seat + Round 2 outcome */
    round1Quota: { type: String, default: "" },
    round1Institute: { type: String, default: "" },
    round1Course: { type: String, default: "" },
    round1Status: { type: String, default: "" },
    round2Quota: { type: String, default: "" },
    round2Institute: { type: String, default: "" },
    round2Course: { type: String, default: "" },
    round2OptionNo: { type: String, default: "" },
    round2Outcome: { type: String, default: "" },
    /** Round 3 PDF (R1 → R2 → R3 journey); rank-only rows use serialNo as import order */
    round3Quota: { type: String, default: "" },
    round3Institute: { type: String, default: "" },
    round3Course: { type: String, default: "" },
    round3Status: { type: String, default: "" },
    round3OptionNo: { type: String, default: "" },
    round3Outcome: { type: String, default: "" },
    /** City/state hint parsed from address */
    state: { type: String, default: "", index: true },
    instituteType: {
      type: String,
      enum: ["aiims_ini", "deemed", "government", "private", "other"],
      default: "other",
    },
  },
  { timestamps: true }
);

neetCounselingAllotmentSchema.index({ examSlug: 1, round: 1, rank: 1 });
neetCounselingAllotmentSchema.index({ examSlug: 1, round: 1, sourceYear: 1 });
neetCounselingAllotmentSchema.index({ examSlug: 1, round: 1, quota: 1 });
neetCounselingAllotmentSchema.index({ examSlug: 1, round: 1, course: 1 });

export default mongoose.models.NeetCounselingAllotment ||
  mongoose.model("NeetCounselingAllotment", neetCounselingAllotmentSchema);
