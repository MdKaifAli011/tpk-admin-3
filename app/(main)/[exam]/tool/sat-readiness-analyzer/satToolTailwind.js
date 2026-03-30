/**
 * SAT Readiness Analyzer — Tailwind tokens aligned with the exam hub
 * (slate neutrals, indigo/violet accents, emerald success, amber/rose signals).
 *
 * Typography scale (tool body):
 * - Overlines / meta: 10–11px uppercase, wide tracking
 * - Body UI: 14px (text-sm), leading relaxed
 * - Section titles in cards: text-base semibold
 * - Report / emphasis: text-lg → text-xl, tight tracking
 * - Numbers: tabular-nums for aligned figures
 *
 * PDF generation is unchanged — see satReadinessPdf.js
 */

const selChevron =
  `[background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%2394a3b8' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")]`;

/** Shared: form field overlines */
export const stOverline =
  "text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px] sm:tracking-[0.06em]";

/** Root: flush with page — no gray panel */
export const stRoot =
  "isolate box-border w-full bg-transparent text-base font-sans leading-normal text-slate-800 antialiased [font-feature-settings:'kern'_1,'liga'_1]";

/** Full width of main column — no max-width cap */
export const stWrap = "w-full max-w-none px-0 py-2 sm:py-4";

export const stProgWrap = "mb-3 w-full min-w-0";

/** Stepper: dots + labels share one flex row so labels stay centered under numbers */
export const stProgTrackOuter =
  "w-full min-w-0 overflow-x-auto overflow-y-visible pb-0.5 [-webkit-overflow-scrolling:touch] sm:overflow-visible sm:pb-0";

export const stProgInner = "relative w-full min-w-[17.5rem] px-0.5 py-1 sm:min-w-0";

/** Full-width track behind dots (6%–94%) */
export const stProgLineBg =
  "pointer-events-none absolute left-[6%] right-[6%] top-[15px] z-0 h-[3px] rounded-full bg-slate-200 sm:top-[17px]";

/** Completed portion of the track — width set inline as % of container; above gray */
export const stProgLineFill =
  "pointer-events-none absolute left-[6%] top-[15px] z-[1] h-[3px] rounded-full bg-emerald-500 transition-[width] duration-500 ease-out sm:top-[17px]";

export const stProgStepsRow =
  "relative z-[1] flex w-full items-start justify-between gap-0.5 sm:gap-1";

export const stProgCol =
  "flex min-w-0 max-w-[20%] flex-1 flex-col items-center gap-1.5";

export const stProgDot =
  "relative z-[2] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-xs font-bold tabular-nums text-slate-500 transition-all duration-300 sm:h-9 sm:w-9 sm:text-sm";

/** `!` ensures these win over stProgDot (fixes “empty” completed circles) */
export const stProgDotActive =
  "!border-indigo-600 !bg-indigo-600 !text-white shadow-[0_0_0_3px_rgba(79,70,229,0.2)]";

export const stProgDotDone =
  "!border-emerald-600 !bg-emerald-600 !text-white shadow-sm";

export const stProgLbl =
  "w-full px-0.5 text-center text-[10px] font-medium leading-tight text-slate-600 transition-colors duration-300 sm:text-xs sm:leading-snug";

export const stProgLblActive = "font-semibold text-indigo-600";

export const stProgLblDone = "font-semibold text-emerald-600";

export const stCard =
  "rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-6";

/** Lead / unlock step — distinct indigo frame */
export const stCardLead =
  "rounded-xl border border-indigo-200/80 bg-gradient-to-b from-white to-indigo-50/[0.35] p-4 shadow-md ring-1 ring-indigo-100/50 sm:p-5";

export const stCh = "mb-5 flex items-start gap-3 sm:items-center";

export const stChIco =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl leading-none shadow-sm";

export const stChIcoB = "bg-indigo-50 ring-1 ring-indigo-100/80";

export const stChIcoG = "bg-amber-50 ring-1 ring-amber-100/80";

export const stChIcoGr = "bg-emerald-50 ring-1 ring-emerald-100/80";

export const stChTtl =
  "text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.35rem]";

export const stChTtlHi = "font-semibold text-indigo-600";

export const stChTtlHg = "font-semibold text-amber-600";

export const stChSub =
  "mt-1.5 text-base leading-relaxed text-slate-600";

export const stG2 =
  "grid grid-cols-1 gap-3 min-[481px]:grid-cols-2 min-[481px]:gap-4";

export const stFull = "col-span-full min-[481px]:col-span-2";

export const stFg = "flex flex-col gap-1.5";

export const stLabel = stOverline;

export const stInput =
  "block w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base font-normal leading-snug text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export const stSelect =
  `${stInput} cursor-pointer bg-[length:11px_7px] bg-[position:right_12px_center] bg-no-repeat pr-9 ${selChevron}`;

export const stCg =
  "mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5";

export const stCgTag =
  "flex items-center gap-1.5 text-[11px] font-medium leading-snug text-slate-600";

export const stCgDot = "inline-block h-1.5 w-1.5 shrink-0 rounded-full";

export const stTlist = "flex flex-col gap-2";

export const stTrow =
  "flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 py-2.5 pl-3 pr-3 transition-all duration-150 max-[480px]:flex-wrap border-l-[3px] border-l-transparent hover:border-indigo-200 hover:bg-white";

export const stTrowC = {
  1: "!border-l-rose-500 !bg-rose-50",
  2: "!border-l-amber-500 !bg-amber-50",
  3: "!border-l-amber-400 !bg-amber-50/90",
  4: "!border-l-emerald-500 !bg-emerald-50",
  5: "!border-l-emerald-600 !bg-emerald-50",
};

export const stTnum =
  "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-slate-200/90 text-[10px] font-bold text-slate-600";

export const stTinfo = "min-w-0 flex-1";

export const stTname =
  "truncate text-sm font-medium leading-snug text-slate-900";

export const stThint =
  "mt-0.5 truncate text-xs leading-snug text-slate-500";

export const stTsel =
  "!w-full min-[481px]:!w-[180px] shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2.5 text-sm font-medium leading-snug text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none bg-[length:11px_7px] bg-[position:right_10px_center] bg-no-repeat pr-9 " +
  selChevron;

export const stBtnRow =
  "mt-6 flex flex-wrap justify-end gap-3 max-[480px]:justify-stretch";

export const stBtn =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-5 py-3 text-base font-semibold leading-snug tracking-tight no-underline transition-all duration-200 sm:py-2.5 sm:text-sm";

export const stBtnGhost =
  "border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900";

export const stBtnBlue =
  "bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-indigo-600";

export const stBtnGold =
  "bg-amber-500 text-white shadow-md hover:bg-amber-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60";

export const stTeaser =
  "mb-4 rounded-xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/60 px-3 py-3 shadow-sm sm:px-4 sm:py-3.5";

export const stTeaserTop = "mb-3 flex items-start gap-3";

export const stTeaserH3 =
  "m-0 text-base font-semibold leading-snug tracking-tight text-slate-900 sm:text-[17px]";

export const stTeaserP =
  "m-0 text-sm leading-relaxed text-slate-600";

export const stPscores =
  "grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3";

export const stPscore =
  "min-w-0 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-center shadow-sm";

export const stPv =
  "block select-none text-[1.375rem] font-bold tabular-nums leading-none tracking-tight text-indigo-600 blur-[5px] sm:text-2xl";

export const stPl =
  "mt-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500";

export const stRh = "mb-3";

export const stRhMain = "min-w-0";

/** Title + badge on one row so the pill isn’t stranded far right on wide screens */
export const stRhTitleRow =
  "flex flex-wrap items-center gap-2 gap-y-1.5";

export const stRhH2 =
  "m-0 text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl";

export const stRhP =
  "m-0 mt-2 text-base leading-relaxed text-slate-600";

export const stRdyTag =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-emerald-800";

export const stSstrip =
  "mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4";

export const stSc =
  "min-w-0 rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5";

export const stScTot =
  "border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 to-violet-50/50";

export const stSlbl = `${stOverline} mb-1 block`;

export const stSval =
  "mb-1 block text-[2rem] font-bold tabular-nums leading-none tracking-tight sm:text-4xl";

export const stSvalM = "text-indigo-600";

export const stSvalE = "text-amber-600";

export const stSvalTot = "text-indigo-700";

export const stSsub =
  "block text-sm font-medium leading-none text-slate-500";

export const stIc =
  "mb-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] last:mb-0 sm:p-5";

export const stIcTtl =
  "mb-3 flex items-center gap-2.5 border-b border-slate-100 pb-3 text-base font-semibold leading-snug tracking-tight text-slate-900 sm:text-lg";

/** Icon tile for report section headings (replaces emoji) */
export const stIcTtlIco =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/80";

export const stGapPanel =
  "rounded-lg border border-indigo-100/80 bg-gradient-to-br from-slate-50/90 to-white p-3 sm:p-3.5";

export const stGapRow =
  "flex flex-wrap items-stretch gap-3 max-[520px]:flex-col";

export const stGapBw = "min-w-0 flex-1";

export const stGapLr =
  "mb-1.5 flex justify-between text-[11px] font-semibold leading-none text-slate-600 sm:text-xs";

export const stGapTrack =
  "h-2.5 overflow-hidden rounded-full border border-slate-200/90 bg-white shadow-inner";

export const stGapFill =
  "h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]";

export const stGapVr =
  "mt-1 flex justify-between text-[11px] font-medium tabular-nums text-slate-500 sm:text-xs";

export const stGapN =
  "flex min-w-[5.5rem] shrink-0 flex-col justify-center text-right sm:min-w-[6rem]";

export const stGapPts =
  "block text-xl font-bold tabular-nums leading-none tracking-tight sm:text-2xl";

export const stGpOver = "text-rose-600";

export const stGpUnder = "text-emerald-600";

export const stGapSub =
  "mt-1 block text-right text-[11px] font-medium leading-snug text-slate-600 sm:text-xs";

export const stWrow =
  "mt-3 flex items-start gap-2.5 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-3 py-2.5";

export const stWico =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100/90 text-emerald-700 ring-1 ring-emerald-200/80";

export const stWtxt = "min-w-0 flex-1";

export const stWtxtH4 =
  "m-0 text-sm font-semibold leading-snug text-slate-900";

export const stWtxtP =
  "m-0 mt-1.5 text-sm leading-relaxed text-slate-600";

export const stBkGrid =
  "grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 xl:gap-10";

export const stBkTtl =
  "mb-3 border-b border-slate-200 pb-2.5 text-sm font-semibold uppercase tracking-[0.05em] text-slate-800";

/** Grid: label | bar | % so bars align and whitespace is even; mobile stacks label then bar+row */
export const stTbrowBk =
  "mb-3 flex flex-col gap-2 last:mb-0 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(6rem,1.25fr)_2.75rem] sm:items-center sm:gap-x-4";

/** Unwraps into the grid on sm+ so track + % stay one row on narrow viewports */
export const stTbBarWrap =
  "flex min-w-0 items-center gap-3 sm:contents";

export const stTbn =
  "min-w-0 text-sm font-medium leading-snug text-slate-800 sm:text-[0.9375rem]";

export const stTbtrack =
  "h-2 w-full min-w-[4.5rem] overflow-hidden rounded-full border border-slate-200 bg-slate-100 sm:min-w-0";

export const stTbfill =
  "h-full rounded-full transition-[width] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export const stTbpct =
  "w-full shrink-0 text-left text-sm font-semibold tabular-nums text-slate-600 sm:w-auto sm:text-right";

export const stPlist = "flex flex-col gap-2";

export const stPi =
  "flex items-center gap-2 rounded-lg border-l-[3px] py-2 pl-2.5 pr-2";

export const stPiPcrit = "border-l-rose-500 bg-rose-50";

export const stPiPmed = "border-l-amber-500 bg-amber-50";

export const stPiPstr = "border-l-emerald-600 bg-emerald-50";

export const stPbadge =
  "shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide";

export const stBc = "bg-rose-100 text-rose-700";

export const stBm = "bg-amber-100 text-amber-800";

export const stBs = "bg-emerald-100 text-emerald-800";

export const stPn =
  "flex-1 text-sm font-medium leading-snug text-slate-900";

export const stPs =
  "text-xs font-medium leading-snug text-slate-500";

export const stDlrow =
  "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between";

export const stDlrowP =
  "m-0 max-w-md text-sm leading-relaxed text-slate-600";

export const stDlRowActions =
  "flex flex-wrap items-center justify-end gap-2.5";

export const stCaptchaWrap = "mt-4";

export const stCaptchaErr =
  "mt-2 hidden items-start gap-2 text-xs font-semibold leading-snug text-rose-600";

export const stCaptchaErrShow = "!flex";

export const stPdfNote =
  "mt-3 hidden items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3";

export const stPdfNoteShow = "!flex";

export const stPnIco =
  "flex shrink-0 items-center justify-center text-xl leading-none";

export const stPnTtl =
  "mb-1 text-sm font-semibold leading-snug text-amber-950";

export const stPnTxt =
  "text-sm leading-relaxed text-amber-950/90";

export const stPhoneRow = "flex items-stretch gap-2";

export const stPhoneCc =
  "w-[92px] shrink-0 cursor-default rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-sm font-medium text-slate-600";

export const stPhoneInput = "min-w-0 flex-1";

export const stLeadErr = "mt-3 text-sm font-semibold text-rose-600";

export function stTopicRow(value) {
  const v = value ? String(value) : "";
  const c = v && stTrowC[v] ? stTrowC[v] : "";
  return `${stTrow} ${c}`.trim();
}
