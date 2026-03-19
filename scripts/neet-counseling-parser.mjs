/**
 * Parse NEET-UG counselling allotment PDF text (MCC-style) into structured rows.
 */

const COURSE_RE = /\b(MBBS|BDS|B\.Sc Nursing)\b/;

const INDIAN_STATES = new Set([
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi (NCT)", "Delhi", "Puducherry",
  "Jammu And Kashmir", "Jammu and Kashmir", "Ladakh",
]);

function guessState(institute) {
  if (!institute) return "";
  const t = institute.replace(/\s+/g, " ");
  for (const s of INDIAN_STATES) {
    if (t.includes(s)) return s.replace(" (NCT)", "");
  }
  const m = t.match(/,\s*([A-Za-z\s]+),\s*\d{6}\s*$/);
  if (m) return m[1].trim().split(",")[0].trim();
  return "";
}

function guessInstituteType(quota, institute) {
  const q = (quota || "").toLowerCase();
  const i = (institute || "").toLowerCase();
  if (q.includes("deemed") || q.includes("paid seats")) return "deemed";
  if (/aiims|jipmer|ini\s|institute of national importance/i.test(i)) return "aiims_ini";
  if (q.includes("nri") || q.includes("non-resident")) return "private";
  if (
    i.includes("government medical") ||
    i.includes("govt.") ||
    i.includes("govt ") ||
    i.includes("medical college") && !i.includes("private")
  )
    return "government";
  if (i.includes("private") || i.includes("medical college")) return "private";
  return "other";
}

function splitCategories(tail) {
  const idx = tail.search(/\bAllotted\b/i);
  let catPart = tail;
  let remarks = "";
  if (idx >= 0) {
    catPart = tail.slice(0, idx).trim();
    remarks = tail.slice(idx).trim();
  }
  const words = catPart.split(/\s+/).filter(Boolean);
  let allottedCategory = "";
  let candidateCategory = "";
  if (words.length === 0) {
    return { allottedCategory, candidateCategory, remarks };
  }
  if (words.length === 2) {
    allottedCategory = words[0];
    candidateCategory = words[1];
  } else if (words.length === 4 && words[1] === "PwD" && words[3] === "PwD") {
    allottedCategory = `${words[0]} ${words[1]}`;
    candidateCategory = `${words[2]} ${words[3]}`;
  } else if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    allottedCategory = words.slice(0, mid).join(" ");
    candidateCategory = words.slice(mid).join(" ");
  } else {
    allottedCategory = words.join(" ");
  }
  return { allottedCategory, candidateCategory, remarks };
}

function extractQuotaAndInstitute(beforeCourse) {
  let text = beforeCourse.replace(/\s+/g, " ").trim();
  const prefixes = [
    ["Open Seat Quota ", "Open Seat Quota"],
    ["Non-Resident Indian ", "Non-Resident Indian"],
    ["Deemed/Paid Seats Quota ", "Deemed/Paid Seats Quota"],
    ["Deemed/Paid Seats ", "Deemed/Paid Seats"],
    ["Delhi University Quota ", "Delhi University Quota"],
    ["IP University Quota ", "IP University Quota"],
    ["B.Sc Nursing Delhi NCR ", "B.Sc Nursing Delhi NCR"],
    ["B.Sc Nursing All India ", "B.Sc Nursing All India"],
    ["B.Sc Nursing IP CW Quota ", "B.Sc Nursing IP CW Quota"],
    ["B.Sc Nursing Delhi NCR CW Quota ", "B.Sc Nursing Delhi NCR CW Quota"],
    ["All India ", "All India"],
    ["Internal - Puducherry UT Domicile ", "Internal - Puducherry UT Domicile"],
    ["Foreign Country Quota ", "Foreign Country Quota"],
  ];
  /** ESI multi-word */
  if (/^Employees State Insurance Scheme\(ESI\)\s/i.test(text)) {
    const rest = text.replace(/^Employees State Insurance Scheme\(ESI\)\s+/i, "");
    return { quota: "Employees State Insurance Scheme(ESI)", institute: rest.trim() };
  }
  const esiNorm = text.replace(/\s+/g, " ");
  if (/^Employees State Insurance Scheme\(ESI\)\s+/i.test(esiNorm)) {
    const m = esiNorm.match(/^Employees State Insurance Scheme\(ESI\)\s+(.+)/i);
    if (m) return { quota: "Employees State Insurance Scheme(ESI)", institute: m[1].trim() };
  }

  for (const [prefix, label] of prefixes) {
    if (text.startsWith(prefix) || text.startsWith(prefix.trimEnd())) {
      const inst = text.slice(prefix.length).trim();
      if (label === "Deemed/Paid Seats" && inst.startsWith("Quota ")) {
        return {
          quota: "Deemed/Paid Seats Quota",
          institute: inst.slice(6).trim(),
        };
      }
      return { quota: label, institute: inst };
    }
  }

  /** Normalized: Deemed/Paid Seats Quota X */
  const dq = text.match(/^Deemed\/Paid Seats Quota\s+(.+)/i);
  if (dq) return { quota: "Deemed/Paid Seats Quota", institute: dq[1].trim() };

  const ai = text.match(/^All India\s+(.+)/);
  if (ai) return { quota: "All India", institute: ai[1].trim() };

  return { quota: beforeCourse.slice(0, 80).split(",")[0].trim(), institute: text };
}

/**
 * @param {string} fullText - raw PDF text
 * @returns {Array<{serialNo:number,rank:number,quota:string,institute:string,course:string,allottedCategory:string,candidateCategory:string,remarks:string,state:string,instituteType:string}>}
 */
export function parseNeetCounselingPdfText(fullText) {
  let text = fullText.replace(/\r\n/g, "\n");
  text = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "\n");
  const lines = text.split("\n").map((l) => l.trim());

  const rows = [];
  let buf = [];
  let inTable = false;

  const flushRow = (chunk) => {
    if (!chunk.length) return;
    const first = chunk[0];
    const m = first.match(/^(\d+)\s+(\d+)\s+(.+)$/);
    if (!m) return;
    const serialNo = parseInt(m[1], 10);
    const rank = parseInt(m[2], 10);
    if (Number.isNaN(serialNo) || Number.isNaN(rank) || serialNo > 300000) return;

    const fullBody = [m[3], ...chunk.slice(1)].join(" ").replace(/\s+/g, " ").trim();
    const flat = fullBody;
    const courseMatch = flat.match(COURSE_RE);
    if (!courseMatch) return;

    const course = courseMatch[1];
    const courseIdx = flat.indexOf(courseMatch[0]);
    const beforeCourse = flat.slice(0, courseIdx).trim();
    const afterCourse = flat.slice(courseIdx + courseMatch[0].length).trim();

    const { quota, institute } = extractQuotaAndInstitute(beforeCourse);
    const { allottedCategory, candidateCategory, remarks } = splitCategories(afterCourse);
    const state = guessState(institute);
    const instituteType = guessInstituteType(quota, institute);

    rows.push({
      serialNo,
      rank,
      quota,
      institute,
      course,
      allottedCategory,
      candidateCategory,
      remarks,
      state,
      instituteType,
    });
  };

  for (const line of lines) {
    if (!line) continue;
    if (/^NEET-UG Counselling Seats Allotment/i.test(line)) continue;
    if (/^Quota Abbrevation|^Abbrevation Description|^SNo\s+Rank/i.test(line)) continue;
    if (/^Note\*?:/i.test(line)) continue;
    if (/^Allotted Category Abbrevations/i.test(line)) continue;
    if (/^SC Schedule|^ST Schedule|^GN Open|^BC Other/i.test(line)) continue;

    if (/^\d+\s+\d+\s+/.test(line)) {
      if (buf.length) flushRow(buf);
      buf = [line];
      inTable = true;
    } else if (inTable && buf.length) {
      buf.push(line);
    }
  }
  if (buf.length) flushRow(buf);

  /** Dedupe by serialNo, keep last */
  const bySerial = new Map();
  for (const r of rows) {
    bySerial.set(r.serialNo, r);
  }
  return Array.from(bySerial.values()).sort((a, b) => a.serialNo - b.serialNo);
}

/** Round 2 PDF: Round 1 seat + Round 2 result / upgrade */
function parseRound2RowFlat(flat) {
  const m = flat.match(/^(\d+)\s+(\d+)\s+(.+)$/);
  if (!m) return null;
  const serialNo = parseInt(m[1], 10);
  const rank = parseInt(m[2], 10);
  if (Number.isNaN(serialNo) || Number.isNaN(rank) || serialNo > 500000) return null;

  let rest = m[3].trim();
  const c1 = rest.match(/\b(MBBS|BDS|B\.Sc Nursing)\b/i);
  if (!c1) return null;

  const before1 = rest.slice(0, c1.index).trim();
  let after1 = rest.slice(c1.index + c1[0].length).trim();
  const r1course = c1[1];
  const { quota: r1q, institute: r1i } = extractQuotaAndInstitute(before1);

  let r1Status = "";
  if (after1.startsWith("Not Reported")) {
    r1Status = "Not Reported";
    after1 = after1.slice(14).trim();
  } else if (after1.startsWith("Reported")) {
    r1Status = "Reported";
    after1 = after1.slice(8).trim();
  }

  const dashM = after1.match(/^(-\s*){5,7}\s*(.+)$/);
  if (dashM) {
    const outcome = dashM[2].trim();
    return {
      serialNo,
      rank,
      quota: r1q,
      institute: r1i,
      course: r1course,
      allottedCategory: "",
      candidateCategory: "",
      remarks: outcome,
      round1Quota: r1q,
      round1Institute: r1i,
      round1Course: r1course,
      round1Status: r1Status,
      round2Quota: "",
      round2Institute: "",
      round2Course: "",
      round2OptionNo: "",
      round2Outcome: outcome,
      state: guessState(r1i),
      instituteType: guessInstituteType(r1q, r1i),
    };
  }

  const c2 = after1.match(/\b(MBBS|BDS|B\.Sc Nursing)\b/i);
  if (!c2) {
    return {
      serialNo,
      rank,
      quota: r1q,
      institute: r1i,
      course: r1course,
      allottedCategory: "",
      candidateCategory: "",
      remarks: after1,
      round1Quota: r1q,
      round1Institute: r1i,
      round1Course: r1course,
      round1Status: r1Status,
      round2Quota: "",
      round2Institute: "",
      round2Course: "",
      round2OptionNo: "",
      round2Outcome: after1,
      state: guessState(r1i),
      instituteType: guessInstituteType(r1q, r1i),
    };
  }

  const before2 = after1.slice(0, c2.index).trim();
  let after2 = after1.slice(c2.index + c2[0].length).trim();
  const r2course = c2[1];
  const { quota: r2q, institute: r2i } = extractQuotaAndInstitute(before2);

  let allottedCategory = "";
  let candidateCategory = "";
  let optionNo = "";
  let outcomeRemark = after2;

  const tailM = after2.match(
    /^(.+?)\s+(\d+)\s+(Upgraded|Fresh Allotted|Not Allotted\.?|Allotted)\s*$/i
  );
  if (tailM) {
    const catPart = tailM[1].trim();
    optionNo = tailM[2];
    outcomeRemark = tailM[3].trim();
    const words = catPart.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      allottedCategory = words[0];
      candidateCategory = words[1];
      if (words.length > 2 && /^\d+$/.test(words[words.length - 1])) {
        optionNo = words[words.length - 1];
        const restW = words.slice(0, -1);
        const mid = Math.max(1, Math.floor(restW.length / 2));
        allottedCategory = restW.slice(0, mid).join(" ");
        candidateCategory = restW.slice(mid).join(" ");
      }
    }
  }

  const remarksFinal =
    (allottedCategory ? `${allottedCategory} / ${candidateCategory} · ` : "") +
    (optionNo ? `Opt ${optionNo} · ` : "") +
    outcomeRemark;

  return {
    serialNo,
    rank,
    quota: r2q,
    institute: r2i,
    course: r2course,
    allottedCategory,
    candidateCategory,
    remarks: remarksFinal.trim() || after2,
    round1Quota: r1q,
    round1Institute: r1i,
    round1Course: r1course,
    round1Status: r1Status,
    round2Quota: r2q,
    round2Institute: r2i,
    round2Course: r2course,
    round2OptionNo: optionNo,
    round2Outcome: outcomeRemark,
    state: guessState(r2i),
    instituteType: guessInstituteType(r2q, r2i),
  };
}

function flushRound2Row(chunk, rows) {
  if (!chunk.length) return;
  const first = chunk[0];
  const m = first.match(/^(\d+)\s+(\d+)\s+(.+)$/);
  if (!m) return;
  const flat = [m[3], ...chunk.slice(1)].join(" ").replace(/\s+/g, " ").trim();
  const row = parseRound2RowFlat(`${m[1]} ${m[2]} ${flat}`);
  if (row) rows.push(row);
}

/**
 * @param {string} fullText
 * @returns {Array<object>}
 */
export function parseNeetCounselingRound2PdfText(fullText) {
  let text = fullText.replace(/\r\n/g, "\n");
  text = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "\n");
  const lines = text.split("\n").map((l) => l.trim());

  const rows = [];
  let buf = [];
  let inTable = false;
  let seenRound2Header = false;

  for (const line of lines) {
    if (!line) continue;
    if (/^Page No\.\s*\d+/i.test(line)) continue;
    if (/^NEET-UG Counselling Seats Allotment.*Round 2/i.test(line)) {
      seenRound2Header = true;
      continue;
    }
    if (/^Round 1\s+Round 2/i.test(line)) continue;
    if (/^SNo\s+Rank/i.test(line)) continue;
    if (/^Quota Abbrevation|^Abbrevation Description/i.test(line)) continue;
    if (/^Note\*?:/i.test(line)) continue;
    if (/^Allotted Category Abbrevations/i.test(line)) continue;
    if (/^BC Other|^EW General|^GN Open|^SC Schedule|^ST Schedule/i.test(line)) continue;

    if (/^\d+\s+\d+\s+/.test(line)) {
      if (buf.length) flushRound2Row(buf, rows);
      buf = [line];
      inTable = seenRound2Header || rows.length > 0;
    } else if (inTable && buf.length) {
      buf.push(line);
    }
  }
  if (buf.length) flushRound2Row(buf, rows);

  const bySerial = new Map();
  for (const r of rows) {
    bySerial.set(r.serialNo, r);
  }
  return Array.from(bySerial.values()).sort((a, b) => a.serialNo - b.serialNo);
}

export function isRound2CounselingPdf(fullText) {
  return (
    /Allotment\s+-\s*2025\s+Round\s*2/i.test(fullText) ||
    (/Round\s*2/i.test(fullText) && /Round\s*1\s+Round\s*2/i.test(fullText))
  );
}

/**
 * Auto-detect Round 1 vs Round 2 PDF layout.
 */
export function parseNeetCounselingPdfTextAuto(fullText) {
  if (isRound3CounselingPdf(fullText)) {
    return { round: "3", rows: parseNeetCounselingRound3PdfText(fullText) };
  }
  if (isRound2CounselingPdf(fullText)) {
    return { round: "2", rows: parseNeetCounselingRound2PdfText(fullText) };
  }
  return { round: "1", rows: parseNeetCounselingPdfText(fullText) };
}

/* ---------- Round 3 PDF: Rank (no S.No), R1 → R2 → R3 ---------- */

function parseSeatSegmentR3(pos) {
  pos = pos.replace(/\s+/g, " ").trim();
  if (pos.length < 8) return null;
  const cm = pos.match(/\b(MBBS|BDS|B\.Sc Nursing)\b/i);
  if (!cm || cm.index < 2) return null;
  const before = pos.slice(0, cm.index).trim();
  const course = cm[1];
  let after = pos.slice(cm.index + cm[0].length).trim();
  const { quota, institute } = extractQuotaAndInstitute(before);

  if (after.startsWith("Not Reported")) {
    return {
      quota,
      institute,
      course,
      status: "Not Reported",
      rest: after.slice(14).trim(),
      terminal: false,
      allottedCategory: "",
      candidateCategory: "",
      optionNo: "",
      outcome: "",
    };
  }
  if (after.startsWith("Reported")) {
    return {
      quota,
      institute,
      course,
      status: "Reported",
      rest: after.slice(8).trim(),
      terminal: false,
      allottedCategory: "",
      candidateCategory: "",
      optionNo: "",
      outcome: "",
    };
  }

  let m = after.match(
    /^(.+?)\s+(\d+)\s+(Upgraded|Fresh Allotted in \d+(?:nd|st|th|rd) Round|Not Allotted\.?)\s*$/i
  );
  if (m) {
    const catPart = m[1].trim();
    const optionNo = m[2];
    const outcome = m[3].trim();
    const words = catPart.split(/\s+/).filter(Boolean);
    let allottedCategory = "";
    let candidateCategory = "";
    if (words.length >= 2) {
      allottedCategory = words[0];
      candidateCategory = words[1];
      if (words.length > 2) {
        const mid = Math.floor(words.length / 2);
        allottedCategory = words.slice(0, mid).join(" ");
        candidateCategory = words.slice(mid).join(" ");
      }
    }
    return {
      quota,
      institute,
      course,
      status: outcome,
      rest: "",
      terminal: true,
      allottedCategory,
      candidateCategory,
      optionNo,
      outcome,
    };
  }

  m = after.match(/^(.+?)\s+(Fresh Allotted in .+)$/i);
  if (m) {
    const catPart = m[1].trim();
    const outcome = m[2].trim();
    const words = catPart.split(/\s+/).filter(Boolean);
    let allottedCategory = "";
    let candidateCategory = "";
    let optionNo = "";
    if (words.length >= 2 && /^\d+$/.test(words[words.length - 1])) {
      optionNo = words[words.length - 1];
      const w2 = words.slice(0, -1);
      const mid = Math.max(1, Math.floor(w2.length / 2));
      allottedCategory = w2.slice(0, mid).join(" ");
      candidateCategory = w2.slice(mid).join(" ");
    } else if (words.length >= 2) {
      allottedCategory = words[0];
      candidateCategory = words[1];
    }
    return {
      quota,
      institute,
      course,
      status: outcome,
      rest: "",
      terminal: true,
      allottedCategory,
      candidateCategory,
      optionNo,
      outcome,
    };
  }

  return null;
}

function pickSeg(s) {
  return {
    quota: s.quota || "",
    institute: s.institute || "",
    course: s.course || "",
    status: s.status || "",
  };
}

function parseRound3RankBody(rank, serialNo, bodyRaw) {
  const leadingDash = /^(-\s*){4,}/.test(bodyRaw.trim());
  let pos = bodyRaw.replace(/\s+/g, " ").trim();
  const segments = [];
  let trailing = "";

  for (let g = 0; g < 25; g++) {
    const dash = pos.match(/^(-\s*){4,18}\s*/);
    if (dash) {
      const after = pos.slice(dash[0].length).trim();
      const mb = after.search(/\b(MBBS|BDS|B\.Sc Nursing)\b/i);
      if (mb < 0 || mb > 400) {
        trailing = after;
        break;
      }
      pos = after;
      continue;
    }

    const seg = parseSeatSegmentR3(pos);
    if (!seg) {
      trailing = pos;
      break;
    }
    segments.push(seg);
    pos = seg.rest.trim();
    if (seg.terminal) break;
    if (!pos.length) break;
  }

  if (segments.length === 0) return null;

  const e = { quota: "", institute: "", course: "" };
  const r1 = { quota: "", institute: "", course: "", status: "" };
  const r2 = { quota: "", institute: "", course: "", status: "" };
  const r3 = { quota: "", institute: "", course: "", status: "", optionNo: "", outcome: "" };
  let allottedCategory = "";
  let candidateCategory = "";
  let remarks = trailing || "";

  const n = segments.length;
  const first = segments[0];
  const last = segments[n - 1];

  if (leadingDash && n === 1) {
    if (first.terminal) {
      Object.assign(r3, pickSeg(first));
      r3.optionNo = first.optionNo || "";
      r3.outcome = first.outcome || first.status;
      allottedCategory = first.allottedCategory;
      candidateCategory = first.candidateCategory;
      e.quota = first.quota;
      e.institute = first.institute;
      e.course = first.course;
      remarks =
        (first.outcome || "") +
        (first.optionNo ? ` · Opt ${first.optionNo}` : "");
    } else {
      Object.assign(r3, pickSeg(first));
      r3.status = first.status;
      e.quota = first.quota;
      e.institute = first.institute;
      e.course = first.course;
      remarks = trailing || first.status;
    }
  } else if (n === 1) {
    Object.assign(r1, pickSeg(first));
    r1.status = first.status;
    e.quota = first.quota;
    e.institute = first.institute;
    e.course = first.course;
    remarks = trailing || first.status;
  } else if (n === 2) {
    Object.assign(r1, pickSeg(segments[0]));
    r1.status = segments[0].status;
    if (segments[1].terminal) {
      const t = segments[1];
      Object.assign(r2, pickSeg(t));
      r2.status = t.outcome || t.status;
      r3.outcome = t.outcome;
      r3.optionNo = t.optionNo || "";
      allottedCategory = t.allottedCategory;
      candidateCategory = t.candidateCategory;
      e.quota = t.quota;
      e.institute = t.institute;
      e.course = t.course;
      remarks =
        [t.outcome, t.optionNo ? `Opt ${t.optionNo}` : "", trailing].filter(Boolean).join(" · ");
    } else {
      Object.assign(r2, pickSeg(segments[1]));
      r2.status = segments[1].status;
      e.quota = segments[1].quota;
      e.institute = segments[1].institute;
      e.course = segments[1].course;
      remarks = trailing || segments[1].status;
    }
  } else {
    Object.assign(r1, pickSeg(segments[0]));
    r1.status = segments[0].status;
    Object.assign(r2, pickSeg(segments[1]));
    r2.status = segments[1].status;
    const t = segments[2];
    Object.assign(r3, pickSeg(t));
    r3.optionNo = t.optionNo || "";
    r3.outcome = t.outcome || t.status;
    r3.status = t.terminal ? t.outcome : t.status;
    allottedCategory = t.allottedCategory || "";
    candidateCategory = t.candidateCategory || "";
    e.quota = t.quota;
    e.institute = t.institute;
    e.course = t.course;
    remarks =
      [t.outcome, t.optionNo ? `Opt ${t.optionNo}` : "", trailing].filter(Boolean).join(" · ");
  }

  const state = guessState(e.institute);
  const instituteType = guessInstituteType(e.quota, e.institute);

  return {
    serialNo,
    rank,
    quota: e.quota,
    institute: e.institute,
    course: e.course,
    allottedCategory,
    candidateCategory,
    remarks: remarks.trim() || "—",
    round1Quota: r1.quota,
    round1Institute: r1.institute,
    round1Course: r1.course,
    round1Status: r1.status,
    round2Quota: r2.quota,
    round2Institute: r2.institute,
    round2Course: r2.course,
    round2OptionNo: n === 2 && segments[1]?.terminal ? segments[1].optionNo || "" : "",
    round2Outcome:
      n === 3
        ? segments[1]?.status || ""
        : n === 2 && segments[1]?.terminal
          ? segments[1].outcome || ""
          : r2.status || "",
    round3Quota: r3.quota,
    round3Institute: r3.institute,
    round3Course: r3.course,
    round3Status: r3.status,
    round3OptionNo: r3.optionNo,
    round3Outcome: r3.outcome || trailing,
    state,
    instituteType,
  };
}

function flushRound3Row(buf, rows, serialRef) {
  if (!buf.length) return;
  const flat = buf.join("\n").replace(/\s+/g, " ").trim();
  const m = flat.match(/^(\d{1,7})\s+([\s\S]+)$/);
  if (!m) return;
  const rank = parseInt(m[1], 10);
  if (rank < 1 || rank > 2500000) return;
  if (/^\d{2}-\d{2}-202\d/.test(m[2].slice(0, 14))) return;
  const row = parseRound3RankBody(rank, serialRef.value++, m[2]);
  if (row) rows.push(row);
}

/**
 * @param {string} fullText
 * @returns {Array<object>}
 */
export function parseNeetCounselingRound3PdfText(fullText) {
  let text = fullText.replace(/\r\n/g, "\n");
  text = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "\n");
  const lines = text.split("\n").map((l) => l.trim());

  const rows = [];
  const buf = [];
  let inTable = false;
  const serialRef = { value: 1 };

  for (const line of lines) {
    if (!line) continue;
    if (/^Page No\.\s*\d+/i.test(line)) continue;
    if (/^Revised NEET-UG.*Round\s*3/i.test(line)) continue;
    if (/^Round 1\s+Round 2\s+Round 3/i.test(line)) continue;
    if (/^Rank\s+Allotted/i.test(line)) continue;
    if (/^Quota Abbrevation|^Abbrevation Description/i.test(line)) continue;
    if (/^Note\*?:/i.test(line)) continue;
    if (/^Allotted Category Abbrevations/i.test(line)) continue;
    if (/^BC Other|^EW General|^GN Open|^SC Schedule|^ST Schedule/i.test(line)) continue;

    const br = line.match(/^(\d{1,7})\s+(.+)$/);
    if (br) {
      const r = parseInt(br[1], 10);
      const rest = br[2].trim();
      if (r >= 1 && r <= 2500000 && !/^\d{2}-\d{2}-202\d/.test(rest)) {
        if (buf.length) flushRound3Row(buf, rows, serialRef);
        buf.length = 0;
        buf.push(line);
        inTable = true;
        continue;
      }
    }
    if (inTable && buf.length) buf.push(line);
  }
  if (buf.length) flushRound3Row(buf, rows, serialRef);

  return rows.sort((a, b) => a.serialNo - b.serialNo);
}

export function isRound3CounselingPdf(fullText) {
  return /Round\s*1\s+Round\s*2\s+Round\s*3/i.test(fullText) && /Round\s*3/i.test(fullText);
}
