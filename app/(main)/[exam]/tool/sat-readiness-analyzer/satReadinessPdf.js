/**
 * Client-only: generates SAT Readiness PDF using global `window.jspdf` (jsPDF UMD).
 * @param {object} satReport — same shape as built in SatReadinessAnalyzerClient
 */
export function downloadSatReadinessPdf(satReport) {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) throw new Error("jsPDF not loaded");

  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const PW = 612;
  const PH = 792;
  const ML = 48;
  const MR = 48;
  const TW = 516;
  let y = 0;

  const h2r = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const sf = (h) => {
    const [r, g, b] = h2r(h);
    doc.setFillColor(r, g, b);
  };
  const ss = (h) => {
    const [r, g, b] = h2r(h);
    doc.setDrawColor(r, g, b);
  };
  const st = (h) => {
    const [r, g, b] = h2r(h);
    doc.setTextColor(r, g, b);
  };
  const np = () => {
    doc.addPage();
    sf("#F4F6FB");
    doc.rect(0, 0, PW, 24, "F");
    st("#9CA3AF");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("SAT Readiness Report", ML, 16);
    doc.text(satReport.fname, PW - MR, 16, { align: "right" });
    y = 40;
  };
  const cy = (n) => {
    if (y + n > PH - 44) np();
  };

  sf("#FFFFFF");
  doc.rect(0, 0, PW, PH, "F");
  sf("#3B6FF0");
  doc.rect(0, 0, PW, 5, "F");
  sf("#F4F6FB");
  doc.rect(0, 5, PW, 58, "F");
  y = 30;
  st("#111827");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SAT Readiness Report", ML, y);
  st("#6B7280");
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`For ${satReport.fname}  -  ${satReport.date}`, ML, y + 16);
  y = 80;

  const cW = (TW - 20) / 3;
  [
    { label: "Math", val: satReport.mathScore, sub: "/800", col: "#3B6FF0" },
    { label: "Reading & Writing", val: satReport.engScore, sub: "/800", col: "#E6930A" },
    { label: "Total Score", val: satReport.total, sub: "/1600", col: "#2755CC" },
  ].forEach((c, i) => {
    const cx = ML + i * (cW + 10);
    sf("#F4F6FB");
    doc.roundedRect(cx, y, cW, 66, 5, 5, "F");
    ss("#E4E8F0");
    doc.setLineWidth(0.8);
    doc.roundedRect(cx, y, cW, 66, 5, 5, "S");
    const [r, g, b] = h2r(c.col);
    doc.setFillColor(r, g, b);
    doc.roundedRect(cx, y, cW, 3, 2, 2, "F");
    st("#6B7280");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(c.label.toUpperCase(), cx + cW / 2, y + 16, { align: "center" });
    doc.setTextColor(r, g, b);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(String(c.val), cx + cW / 2, y + 44, { align: "center" });
    st("#9CA3AF");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(c.sub, cx + cW / 2, y + 58, { align: "center" });
  });
  y += 80;

  cy(64);
  sf("#F8F9FC");
  doc.roundedRect(ML, y, TW, 54, 5, 5, "F");
  ss("#E4E8F0");
  doc.setLineWidth(0.6);
  doc.roundedRect(ML, y, TW, 54, 5, 5, "S");
  st("#111827");
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("Gap Analysis", ML + 12, y + 16);
  const bX = ML + 12;
  const bY = y + 25;
  const bW = TW - 120;
  const bH = 7;
  sf("#E4E8F0");
  doc.roundedRect(bX, bY, bW, bH, 3, 3, "F");
  sf(satReport.gap > 80 ? "#E84646" : satReport.gap > 0 ? "#F59E0B" : "#18A876");
  doc.roundedRect(bX, bY, bW * Math.min(1, satReport.total / 1600), bH, 3, 3, "F");
  st("#9CA3AF");
  doc.setFontSize(7.5);
  doc.text(String(satReport.total), bX, bY + 18);
  doc.text(`Target: ${satReport.target}`, bX + bW, bY + 18, { align: "right" });
  const [gr, gg, gb] = h2r(satReport.gap > 0 ? "#E84646" : "#18A876");
  doc.setTextColor(gr, gg, gb);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(
    satReport.gap > 0 ? `${satReport.gap} pts gap` : `+${Math.abs(satReport.gap)} pts above`,
    PW - MR,
    y + 32,
    { align: "right" }
  );
  y += 68;

  cy(50);
  sf("#EDFAF5");
  doc.roundedRect(ML, y, TW, 40, 5, 5, "F");
  ss("#B3EDD9");
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, TW, 40, 5, 5, "S");
  st("#18A876");
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text(satReport.wHead, ML + 12, y + 15);
  st("#374151");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(satReport.wDetailText, TW - 24), ML + 12, y + 28);
  y += 52;

  const dSec = (title, col) => {
    cy(26);
    const [r, g, b] = h2r(col);
    doc.setFillColor(r, g, b);
    doc.rect(ML, y, 2.5, 16, "F");
    st("#111827");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, ML + 9, y + 12);
    y += 24;
  };
  const dBar = (name, conf) => {
    cy(18);
    const p = (conf - 1) / 4;
    const bW2 = TW - 168;
    st("#374151");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(name, ML, y + 7);
    sf("#E4E8F0");
    doc.roundedRect(ML + 162, y, bW2, 7, 3, 3, "F");
    sf(conf <= 2 ? "#E84646" : conf === 3 ? "#F59E0B" : "#18A876");
    doc.roundedRect(ML + 162, y, bW2 * p, 7, 3, 3, "F");
    st("#9CA3AF");
    doc.setFontSize(7.5);
    doc.text(`${Math.round(p * 100)}%`, ML + 162 + bW2 + 5, y + 7);
    y += 16;
  };

  dSec("Math - Topic Breakdown", "#3B6FF0");
  satReport.mathDetails.forEach((t) => dBar(t.name, t.conf));
  y += 8;
  dSec("Reading & Writing - Topic Breakdown", "#E6930A");
  satReport.engDetails.forEach((t) => dBar(t.name, t.conf));
  y += 8;

  const pri = [
    ...satReport.mathDetails
      .filter((t) => t.conf <= 2)
      .map((t) => Object.assign({}, t, { sec: "Math", lv: "crit" })),
    ...satReport.engDetails
      .filter((t) => t.conf <= 2)
      .map((t) => Object.assign({}, t, { sec: "English", lv: "crit" })),
    ...satReport.mathDetails
      .filter((t) => t.conf === 3)
      .map((t) => Object.assign({}, t, { sec: "Math", lv: "med" })),
    ...satReport.engDetails
      .filter((t) => t.conf === 3)
      .map((t) => Object.assign({}, t, { sec: "English", lv: "med" })),
  ].slice(0, 10);
  if (pri.length) {
    dSec("Priority Topics", "#E84646");
    pri.forEach((t) => {
      cy(18);
      sf(t.lv === "crit" ? "#FEF0F0" : "#FFFBEB");
      doc.roundedRect(ML, y, TW, 14, 3, 3, "F");
      const [r, g, b] = h2r(t.lv === "crit" ? "#E84646" : "#F59E0B");
      doc.setFillColor(r, g, b);
      doc.rect(ML, y, 2, 14, "F");
      doc.setTextColor(r, g, b);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(t.lv === "crit" ? "NEEDS WORK" : "IMPROVE", ML + 7, y + 9);
      st("#111827");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(t.name, ML + 62, y + 9);
      st("#9CA3AF");
      doc.setFontSize(7.5);
      doc.text(t.sec, PW - MR, y + 9, { align: "right" });
      y += 18;
    });
  }

  const str = [
    ...satReport.mathDetails.filter((t) => t.conf >= 4).map((t) => Object.assign({}, t, { sec: "Math" })),
    ...satReport.engDetails.filter((t) => t.conf >= 4).map((t) => Object.assign({}, t, { sec: "English" })),
  ];
  if (str.length) {
    dSec("Strong Areas", "#18A876");
    str.forEach((t) => {
      cy(18);
      sf("#EDFAF5");
      doc.roundedRect(ML, y, TW, 14, 3, 3, "F");
      sf("#18A876");
      doc.rect(ML, y, 2, 14, "F");
      st("#18A876");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("STRONG", ML + 7, y + 9);
      st("#111827");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(t.name, ML + 46, y + 9);
      st("#9CA3AF");
      doc.setFontSize(7.5);
      doc.text(t.sec, PW - MR, y + 9, { align: "right" });
      y += 18;
    });
  }

  const tp = doc.internal.getNumberOfPages();
  for (let p = 1; p <= tp; p++) {
    doc.setPage(p);
    sf("#F4F6FB");
    doc.rect(0, PH - 24, PW, 24, "F");
    ss("#E4E8F0");
    doc.setLineWidth(0.4);
    doc.line(0, PH - 24, PW, PH - 24);
    st("#9CA3AF");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("SAT Readiness Analyzer", ML, PH - 9);
    doc.text(`Page ${p} of ${tp}`, PW - MR, PH - 9, { align: "right" });
  }

  doc.save(`SAT_Report_${(satReport.fname || "Student").replace(/\s+/g, "_")}.pdf`);
}
